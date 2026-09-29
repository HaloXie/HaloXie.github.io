// 教学叠加层（只在主画面，不进照片）：景深板、进光锥、光束浮尘。
import * as THREE from 'three';
import { damp, glow, CYAN, ORANGE } from '../kit/util.js';
import { focusPlaneHalf, FOCUS_M, mToUnits } from './optics.js';
import { AXIS, softDot } from './diorama.js';

const STAGE_TOP = 0.15;
const STAGE_FAR = 8.3; // 景深板远界画到布景后沿为止（超焦距以外的「∞」也截在这里）

// 景深板：一段视锥体，从近界到远界。截面 = 画框在该距离上的大小（对焦平面画框 × d / s）。
export function buildDofBoard(scene) {
  const g = new THREE.Group();
  scene.add(g);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: glow(CYAN, 1.4), transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const slab = new THREE.Mesh(geo, mat);
  const edgeGeo = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({ color: glow(CYAN, 2.2), transparent: true, opacity: 0.8 });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  const focusMat = new THREE.MeshBasicMaterial({ color: glow(ORANGE, 2), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const focus = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), focusMat);
  focus.rotation.y = Math.PI / 2;
  g.add(slab, edges, focus);
  for (const o of [slab, edges, focus]) o.userData.noDepth = true;
  const base = geo.attributes.position.array.slice();
  const ebase = edgeGeo.attributes.position.array.slice();
  const cur = { near: mToUnits(FOCUS_M) * 0.95, far: mToUnits(FOCUS_M) * 1.05 };
  let pulse = 0;
  let vis = 1;
  let want = 1;
  const s = mToUnits(FOCUS_M);
  const half = focusPlaneHalf();

  // 单位立方体顶点 → 视锥体：x ∈ [-0.5, 0.5] 映射到 [near, far]，y/z 按距离缩放画框
  function shape(attr, src, near, far) {
    const a = attr.array;
    for (let i = 0; i < a.length; i += 3) {
      const d = src[i] < 0 ? near : far;
      const k = d / s;
      a[i] = AXIS.x + d;
      a[i + 1] = Math.max(STAGE_TOP, AXIS.y + src[i + 1] * 2 * half.hh * k);
      a[i + 2] = AXIS.z + src[i + 2] * 2 * half.hw * k;
    }
    attr.needsUpdate = true;
  }
  return {
    group: g,
    get range() { return { ...cur }; },
    pulse() { pulse = 1; },
    show(v) { want = v ? 1 : 0; },
    // board = optics.dofBoardUnits(N)
    update(dt, board) {
      const far = Math.min(STAGE_FAR - AXIS.x, board.far);
      cur.near = damp(cur.near, board.near, 10, dt);
      cur.far = damp(cur.far, far, 10, dt);
      shape(geo.attributes.position, base, cur.near, cur.far);
      shape(edgeGeo.attributes.position, ebase, cur.near, cur.far);
      geo.computeBoundingSphere();
      edgeGeo.computeBoundingSphere();
      pulse = Math.max(0, pulse - dt * 0.35);
      vis = damp(vis, want, 8, dt);
      mat.opacity = (0.07 + pulse * 0.16) * vis;
      edgeMat.opacity = (0.35 + pulse * 0.6) * vis;
      focusMat.opacity = (0.18 + pulse * 0.2) * vis;
      focus.position.set(AXIS.x + s, AXIS.y, AXIS.z);
      focus.scale.set(half.hw * 2, half.hh * 2, 1);
      g.visible = vis > 0.02;
    },
  };
}

// 进光锥：从人偶胸口发出、铺满入瞳的光锥（示意）。底面半径跟随光圈叶片的孔。
export function buildLightCone(scene) {
  const geo = new THREE.CylinderGeometry(1, 0.0, 1, 40, 1, true);
  geo.translate(0, -0.5, 0);
  geo.rotateZ(Math.PI / 2); // 轴沿 +x：顶点在 x = 1（主体），底面在 x = 0（镜头）
  const mat = new THREE.MeshBasicMaterial({ color: glow(0xffe2b0, 1.2), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const cone = new THREE.Mesh(geo, mat);
  cone.userData.noDepth = true;
  scene.add(cone);
  const q = new THREE.Quaternion();
  const d = new THREE.Vector3();
  let vis = 1;
  let want = 1;
  return {
    mesh: cone,
    show(v) { want = v ? 1 : 0; },
    // from = 镜头前端世界坐标，to = 主体点，r = 孔半径（世界单位），k = 曝光增益（亮度）
    update(dt, from, to, r, k) {
      d.subVectors(to, from);
      const len = d.length();
      q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
      cone.position.copy(from);
      cone.quaternion.copy(q);
      cone.scale.set(len, r, r);
      vis = damp(vis, want, 8, dt);
      mat.opacity = Math.min(0.26, 0.05 + 0.05 * Math.log2(1 + k * 2)) * vis;
      cone.visible = vis > 0.02;
    },
  };
}

// 光束浮尘：落在光锥附近的点更亮
export function buildDust(scene, box) {
  const N = 140;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    seed[i * 3] = Math.random();
    seed[i * 3 + 1] = Math.random();
    seed[i * 3 + 2] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.035, map: softDot(), color: glow(0xffe8c8, 1.6), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.noDepth = true;
  scene.add(pts);
  const size = box.getSize(new THREE.Vector3());
  return {
    update(t) {
      for (let i = 0; i < N; i++) {
        const a = seed[i * 3];
        const b = seed[i * 3 + 1];
        const c = seed[i * 3 + 2];
        pos[i * 3] = box.min.x + ((a + t * 0.012 * (0.5 + b)) % 1) * size.x;
        pos[i * 3 + 1] = box.min.y + (b + 0.03 * Math.sin(t * 0.7 + a * 9)) * size.y;
        pos[i * 3 + 2] = box.min.z + (c + 0.03 * Math.cos(t * 0.5 + b * 7)) * size.z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
