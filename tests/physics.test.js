import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,step,passCheckpoint,checkpoints,setAcrobatic} from '../src/physics.js';
const advance=(s,input,seconds,hz=120)=>{for(let i=0;i<Math.round(seconds*hz);i++)step(s,input,1/hz,()=>-10000);return s;};

test('trimmed cruise remains stable without exact altitude locking',()=>{
 const s=advance(initialState(1100),{},30);
 assert.ok(s.z<100&&Math.abs(s.y-1100)<20&&s.speed>50&&s.speed<65&&!s.stall);
});
test('banking turns right and requires lift to hold altitude',()=>{
 const s=advance(initialState(1100),{roll:1},5);
 assert.ok(s.heading>0&&s.x>0&&s.y<1100);
});
test('climbing trades airspeed for height and diving gains speed',()=>{
 const climb=advance(initialState(),{pitch:1},3),level=advance(initialState(),{},3),dive=advance(initialState(),{pitch:-1},3);
 assert.ok(climb.y>level.y&&climb.speed<level.speed);
 assert.ok(dive.y<level.y&&dive.speed>level.speed);
});
test('power changes spool smoothly and idle flight settles into a glide',()=>{
 const s=initialState(1100);s.throttle=1;step(s,{},1/60);
 assert.ok(s.enginePower>.65&&s.enginePower<1);
 advance(s,{throttle:-1},60);
 assert.equal(s.throttle,0);assert.ok(s.y<1100&&s.speed>25&&!s.stall);
 advance(s,{throttle:1},10);assert.equal(s.throttle,1);
});
test('prolonged nose-up stall recovers by lowering nose and applying power',()=>{
 const s=advance(initialState(3000),{pitch:1,throttle:-1},12);
 assert.ok(s.stall&&s.velocity.y<0);
 advance(s,{pitch:-1,throttle:1},8);
 assert.ok(!s.stall&&s.speed>45);
});
test('momentum survives a sudden orientation/mode change',()=>{
 const s=initialState();setAcrobatic(s,true);
 advance(s,{yaw:1},.5);
 const forwardX=Math.sin(s.heading)*s.speed;
 assert.ok(Math.abs(forwardX-s.velocity.x)>1);
 const before=s.velocity.clone();setAcrobatic(s,false);
 assert.ok(s.velocity.equals(before));
});
test('control rates accelerate and decay instead of jumping instantly',()=>{
 const s=initialState();setAcrobatic(s,true);step(s,{roll:1},1/60);
 assert.ok(s.rollRate>0&&s.rollRate<.5);
 advance(s,{roll:1},1);const rate=s.rollRate;
 step(s,{},1/60);assert.ok(s.rollRate>0&&s.rollRate<rate);
 advance(s,{},2);assert.ok(Math.abs(s.rollRate)<.001);
});
test('physics agrees at 30, 60, and 144 frames per second',()=>{
 const results=[30,60,144].map(hz=>advance(initialState(2000),{pitch:.2,roll:.3,throttle:.1},10,hz));
 for(const s of results.slice(1)){
  assert.ok(Math.hypot(s.x-results[0].x,s.y-results[0].y,s.z-results[0].z)<1);
  assert.ok(Math.abs(s.speed-results[0].speed)<.1);
 }
});
test('terrain contact stops the flight',()=>{
 const s=initialState(3);step(s,{},1/60);assert.ok(s.crashed);
 const z=s.z;step(s,{},1/60);assert.equal(s.z,z);
});
test('checkpoints must be reached in order',()=>{
 const s=initialState();Object.assign(s,checkpoints[1]);assert.equal(passCheckpoint(s),false);
 Object.assign(s,checkpoints[0]);assert.equal(passCheckpoint(s),true);assert.equal(s.checkpoint,1);
});
