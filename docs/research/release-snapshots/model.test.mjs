import assert from 'node:assert/strict';
import {evaluate} from '../../../labs/release-snapshots/model.mjs';
// Oracle: design contract — load failure retains the last success, never the desired pointer.
for (const previous of ['r0','r1','r2']) for (const desired of ['r0','r1','r2']) for (const success of [true,false]) {
  const result=evaluate({previous,desired,success,target:0,prediction:0});
  assert.equal(result.loaded,success?desired:previous);
  assert.equal(result.a+result.b,100);
}
const rollback=evaluate({previous:'r2',desired:'r1',success:true,target:0,prediction:0});
assert.equal(rollback.b,50);assert.equal(rollback.goalMet,false);assert.equal(rollback.predictionMet,false);
assert.equal(evaluate({previous:'r2',desired:'r0',success:true,target:0,prediction:0}).goalMet,true);
assert.equal(evaluate({previous:'r0',desired:'r1',success:true,target:50,prediction:50}).goalMet,true);
assert.equal(evaluate({previous:'r1',desired:'r2',success:false,target:100,prediction:50}).b,50);
assert.throws(()=>evaluate({previous:'bad',desired:'r1',success:true,target:0,prediction:0}),TypeError);
assert.throws(()=>evaluate({previous:'r0',desired:'r1',success:'no',target:0,prediction:0}),TypeError);
const same=evaluate({previous:'r1',desired:'r1',success:false,target:50,prediction:50});
assert.equal(same.retained,true);assert.equal(same.goalMet,true);
console.log('All model assertions passed, including same-version load failure');
