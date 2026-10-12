// 损失面做成台面上的一块实体地形模型：分层设色 + 等高线的顶面、层板侧壁、底座。
// 模型坐标 (x, y) ∈ [-4, 4]² → 世界坐标：观众站在 -z 看 +z，模型 x 向右、y 向远处。
import * as THREE from 'three';
import { paint, at, merge, prbox, canvasTexture } from '../../exploded/kit/util.js';
import { loss, RANGE } from './model.js';
import { TERRAIN, MODEL } from './palette.js';

export const S = 0.55; // 模型 1 个单位 = 世界 0.55
export const CENTER = new THREE.Vector3(0, 0, 0.55);
const PLINTH = 0.18; // 底座顶面高度
const LV = -1.0; // 这个 loss 落在底座顶面上（全局最低约 −0.90，略高于底座）
const HS = 0.5; // 1 个 loss 单位 = 世界 0.5 高
const SEG = 128;
const W = 2 * RANGE * S;

export const heightOf = (l) => PLINTH + (l - LV) * HS;
export const toWorld = (x, y, l = loss(x, y), v = new THREE.Vector3()) => v.set(CENTER.x - x * S, heightOf(l), CENTER.z + y * S);
export const toModel = (p) => [-(p.x - CENTER.x) / S, (p.z - CENTER.z) / S];

function topTexture() {
  const N = 768;
  return canvasTexture(N, N, (c) => {
    const img = c.createImageData(N, N);
    const ramp = TERRAIN.ramp.map((h) => new THREE.Color(h));
    const band = new Int16Array(N * N);
    const col = new THREE.Color();
    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        // 画布像素 → 模型坐标（与 PlaneGeometry 的 uv 和 toWorld 的镜像一致）
        const l = loss((0.5 - px / N) * 2 * RANGE, (py / N - 0.5) * 2 * RANGE);
        const t = Math.min(1, Math.max(0, (l - LV) / 3.4)) ** 0.75 * (ramp.length - 1);
        const k = Math.min(ramp.length - 2, Math.floor(t));
        col.copy(ramp[k]).lerp(ramp[k + 1], t - k);
        const o = (py * N + px) * 4;
        img.data[o] = col.r * 255; img.data[o + 1] = col.g * 255; img.data[o + 2] = col.b * 255; img.data[o + 3] = 255;
        band[py * N + px] = Math.floor(l / 0.2);
      }
    }
    c.putImageData(img, 0, 0);
    // 等高线：每 0.2 一条，整数 loss 加粗
    for (let py = 0; py < N - 1; py++) {
      for (let px = 0; px < N - 1; px++) {
        const b = band[py * N + px];
        const r = band[py * N + px + 1];
        const d = band[(py + 1) * N + px];
        if (b === r && b === d) continue;
        const major = Math.max(b, r, d) % 5 === 0;
        c.fillStyle = major ? TERRAIN.contourMajor : TERRAIN.contour;
        c.fillRect(px, py, major ? 2 : 1.4, major ? 2 : 1.4);
      }
    }
    // 坐标网格：每 1 个模型单位
    c.strokeStyle = TERRAIN.grid;
    c.lineWidth = 1.2;
    for (let k = -RANGE + 1; k < RANGE; k++) {
      const p = N * (0.5 + k / (2 * RANGE));
      c.beginPath(); c.moveTo(p, 0); c.lineTo(p, N); c.moveTo(0, p); c.lineTo(N, p); c.stroke();
    }
  });
}

export function buildTerrain(scene) {
  const group = new THREE.Group();
  // 顶面
  const geo = new THREE.PlaneGeometry(W, W, SEG, SEG).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightOf(loss(-pos.getX(i) / S, pos.getZ(i) / S)));
  geo.computeVertexNormals();
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: topTexture().tex, roughness: 0.72, metalness: 0.02 }));
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 侧壁：沿四条边从顶面轮廓落到底座，上浅下深两层
  const verts = [];
  const cols = [];
  const hi = new THREE.Color(MODEL.side);
  const lo = new THREE.Color(MODEL.sideDark);
  const edge = (fx) => {
    for (let i = 0; i < SEG; i++) {
      const [x0, z0] = fx(i / SEG);
      const [x1, z1] = fx((i + 1) / SEG);
      const y0 = heightOf(loss(-x0 / S, z0 / S));
      const y1 = heightOf(loss(-x1 / S, z1 / S));
      verts.push(x0, y0, z0, x0, PLINTH, z0, x1, y1, z1, x1, y1, z1, x0, PLINTH, z0, x1, PLINTH, z1);
      for (const c of [hi, lo, hi, hi, lo, lo]) cols.push(c.r, c.g, c.b);
    }
  };
  const h = W / 2;
  edge((t) => [-h + t * W, -h]);
  edge((t) => [h, -h + t * W]);
  edge((t) => [h - t * W, h]);
  edge((t) => [-h, h - t * W]);
  const skirt = new THREE.BufferGeometry();
  skirt.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  skirt.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  skirt.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((verts.length / 3) * 2), 2));
  skirt.computeVertexNormals();
  const base = merge([
    skirt,
    prbox(MODEL.plinth, W + 0.3, PLINTH, W + 0.3, 0, PLINTH / 2, 0, 0.04),
    at(paint(new THREE.BoxGeometry(W + 0.34, 0.025, W + 0.34), MODEL.plinthTrim), 0, PLINTH - 0.03, 0),
  ]);
  const body = new THREE.Mesh(base, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide }));
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  group.position.copy(CENTER);
  scene.add(group);
  return { group, top, box: new THREE.Box3().setFromObject(group) };
}
