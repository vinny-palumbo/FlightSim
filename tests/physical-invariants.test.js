import test from 'node:test';
import assert from 'node:assert/strict';
import {Euler,Quaternion,Vector3} from 'three';
import {AIRFRAME,airLoads,initialState,mechanicalEnergy,setAcrobatic,step} from '../src/physics.js';

test('both modes have identical aerodynamic forces, stall envelope, and engine power',()=>{
 for(const speed of [0,20,60,120])for(const pitch of [-1,-.35,0,.35,1,Math.PI]){
  const s=initialState(2000);s.velocity.set(0,0,-speed);s.attitude.setFromEuler(new Euler(pitch,0,0));
  const normal=airLoads(s);setAcrobatic(s,true);const acro=airLoads(s);
  for(const key of ['lift','drag','side','thrust'])assert.ok(normal[key].equals(acro[key]));
  assert.equal(normal.aoa,acro.aoa);
 }
});
test('lift does no work, drag and sideslip dissipate energy, thrust has a power limit',()=>{
 for(const pitch of [-1.5,-.4,0,.4,1.5,Math.PI])for(const speed of [10,40,80,180]){
  const s=initialState();s.velocity.set(12,-4,-speed);s.attitude.setFromEuler(new Euler(pitch,.2,.7));
  const f=airLoads(s);
  assert.ok(Math.abs(f.lift.dot(s.velocity))<1e-6);
  assert.ok(f.drag.dot(s.velocity)<=0&&f.side.dot(s.velocity)<=0);
  assert.ok(f.thrust.dot(s.velocity)<=s.enginePower*AIRFRAME.propulsivePower+1e-6);
 }
});
test('stall is detected at excessive angle of attack even at high airspeed, in either mode',()=>{
 for(const acro of [false,true]){
  const s=initialState(3000);setAcrobatic(s,acro);s.velocity.set(0,0,-100);s.speed=100;
  s.attitude.setFromEuler(new Euler(.5,0,0));s.pitch=.5;
  step(s,{},1/120,()=>-10000);assert.ok(s.stall&&s.speed>90);
 }
});
test('at zero airflow there is gravity but no lift or aerodynamic control authority',()=>{
 for(const acro of [false,true]){
  const s=initialState(3000);s.velocity.set(0,0,0);s.speed=0;s.throttle=0;s.enginePower=0;setAcrobatic(s,acro);
  assert.equal(airLoads(s).lift.length(),0);
  step(s,{pitch:1,roll:1,yaw:1},1/120,()=>-10000);
  assert.equal(s.pitchRate,0);assert.equal(s.rollRate,0);assert.equal(s.yawRate,0);
  assert.ok(Math.abs(s.velocity.y+AIRFRAME.gravity/120)<1e-5);
 }
});
test('switching modes cannot alter attitude, linear/angular momentum, or energy',()=>{
 const s=initialState(3000);s.attitude.setFromEuler(new Euler(1.1,.3,2.5));s.pitchRate=.4;s.rollRate=1.2;s.yawRate=-.3;
 const q=s.attitude.clone(),v=s.velocity.clone(),energy=mechanicalEnergy(s);
 for(let i=0;i<100;i++){
  setAcrobatic(s,i%2===0);
  assert.ok(s.attitude.equals(q)&&s.velocity.equals(v));assert.equal(mechanicalEnergy(s),energy);
 }
});
for(const acro of [false,true]){
 test(`unpowered ${acro?'acrobatic':'normal'} flight never gains mechanical energy during maneuvers`,()=>{
  const s=initialState(10000);s.throttle=0;s.enginePower=0;setAcrobatic(s,acro);
  let energy=mechanicalEnergy(s);
  for(let i=0;i<120*60;i++){
   const t=i/120;step(s,{pitch:Math.sin(t*.7)*.8,roll:Math.sin(t*.6),yaw:Math.cos(t*.4)*.3},1/120,()=>-100000);
   const next=mechanicalEnergy(s);assert.ok(Number.isFinite(next)&&next<=energy+.01);energy=next;
  }
 });
}
test('normal-mode recovery from inverted flight is gradual',()=>{
 const s=initialState(4000);s.attitude.setFromAxisAngle(new Vector3(0,0,1),Math.PI);s.roll=-Math.PI;
 setAcrobatic(s,false);const q=s.attitude.clone();step(s,{},1/120,()=>-10000);
 assert.ok(s.attitude.angleTo(q)<.01);
 for(let i=0;i<120*8;i++)step(s,{},1/120,()=>-10000);
 assert.ok(Math.abs(s.roll)<.2&&Math.abs(s.pitch)<.2);
});
