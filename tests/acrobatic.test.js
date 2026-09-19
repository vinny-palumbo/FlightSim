import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera, Vector3} from 'three';
import {initialState, setAcrobatic, step} from '../src/physics.js';
import {updateFlightCamera} from '../src/camera.js';
for(const control of ['pitch','roll']){
 test(`Acrobatics can complete a full ${control} revolution with momentum`,()=>{
  const s=initialState(3000);s.speed=85;s.velocity.set(0,0,-85);s.throttle=1;setAcrobatic(s,true);
  let rotation=0,frames=0;
  while(rotation<Math.PI*2&&frames++<2400){
   step(s,{[control]:1},1/120,()=>-10000);
   rotation+=s[`${control}Rate`]/120;
  }
  assert.ok(rotation>=Math.PI*2,'full revolution completed');
  assert.ok(Math.abs(s.attitude.w)>.999);
  assert.ok([s.x,s.y,s.z,s.heading,s.speed].every(Number.isFinite));
  assert.ok(s.speed>0);
 });
}
test('Acrobatic chase camera keeps the aircraft centered during combined maneuvers',()=>{
 const s=initialState(3000);setAcrobatic(s,true);
 const camera=new PerspectiveCamera(55,.6,1,130000);
 for(let i=0;i<1000;i++){
  step(s,{pitch:1,roll:1,yaw:.2},.016);
  const p=new Vector3(s.x,s.y,s.z);updateFlightCamera(camera,p,s,0);camera.updateMatrixWorld();
  const screen=p.clone().project(camera);
  assert.ok(Math.abs(screen.x)<.001&&Math.abs(screen.y)<.001);
  const localOffset=camera.position.clone().sub(p).applyQuaternion(s.attitude.clone().invert());
  assert.ok(Math.abs(localOffset.x)<.001&&localOffset.z>0, 'camera stays behind the aircraft');
  const planeUp=new Vector3(0,1,0).applyQuaternion(s.attitude);
  assert.ok(camera.up.dot(planeUp)>.99999, 'camera rolls with the aircraft');
 }
 setAcrobatic(s,false);assert.ok(!s.attitude&&!s.acrobatic&&s.roll===0&&Math.abs(s.pitch)<=.65);
 step(s,{},.016);assert.ok(Number.isFinite(s.y));
});
