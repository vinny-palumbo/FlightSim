import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {Vector3,PerspectiveCamera} from 'three';
import {JSBSimFlight} from '../src/jsbsim-flight.js';
import {updateFlightCamera} from '../src/camera.js';
const data=JSON.parse(await readFile(new URL('../public/jsbsim/c172p.json',import.meta.url),'utf8'));
const options={data,moduleUrl:new URL('../public/jsbsim/jsbsim_wasm.mjs',import.meta.url),wasmUrl:new URL('../public/jsbsim/jsbsim_wasm.wasm',import.meta.url)};
const create=()=>JSBSimFlight.create(options);
const advance=(f,input,seconds,hz=120)=>{for(let i=0;i<seconds*hz;i++)f.advance(input,1/hz);return f.state;};

test('shipped WASM Cessna holds trimmed cruise at sea-level and mountain destinations',async()=>{
 const f=await create();try{
  for(const location of [{lat:37.795,lon:-122.46,altitude:1100},{lat:39.7392,lon:-104.9903,altitude:2800},{lat:36.1069,lon:-112.1129,altitude:3000},{lat:35.6812,lon:139.7671,altitude:1100}]){
   const s=f.reset(location);assert.ok(Math.abs(s.x)<.01&&Math.abs(s.z)<.01&&Math.abs(s.sceneY-location.altitude)<.1);
   assert.ok(s.rpm>1500&&s.throttle>0&&s.throttle<1);
   advance(f,{},20);assert.ok(Math.abs(s.y-location.altitude)<3);
   assert.ok(Math.abs(s.speed*1.94384-95)<1&&!s.stall&&!s.crashed);
   assert.ok(s.z<-800&&Math.abs(s.x)<5);
  }
 }finally{f.destroy();}
});
test('pitch, roll and rudder inputs have the expected directions',async()=>{
 const f=await create();try{
  const level=()=>f.reset();
  level();const climb=advance(f,{pitch:1},3);assert.ok(climb.pitch>.1&&climb.y>1110&&climb.speed*1.94384<95);
  level();const dive=advance(f,{pitch:-1},3);assert.ok(dive.pitch<-.1&&dive.y<1090&&dive.speed*1.94384>95);
  level();const right=advance(f,{roll:1},3);assert.ok(right.roll>.3&&right.x>2);
  level();const left=advance(f,{roll:-1},3);assert.ok(left.roll<-.3&&left.x< -2);
  level();const yaw=advance(f,{yaw:1},1);assert.ok(yaw.heading>.03&&yaw.heading<1);
 }finally{f.destroy();}
});
test('mode changes preserve all physical state and both modes run JSBSim',async()=>{
 const f=await create();try{
  f.reset();advance(f,{roll:1},2);
  const q=f.state.attitude.clone(),v=f.state.velocity.clone(),time=f.state.time;
  f.setAcrobatic(true);f.setAcrobatic(false);
  assert.ok(f.state.attitude.equals(q)&&f.state.velocity.equals(v));assert.equal(f.state.time,time);
  const thrust=f.get('propulsion/engine/thrust-lbs');f.setAcrobatic(true);assert.equal(f.get('propulsion/engine/thrust-lbs'),thrust);
  advance(f,{pitch:1,roll:.3},2);
  assert.ok(Math.abs(f.state.time-f.get('simulation/sim-time-sec'))<1e-8);
  assert.equal(f.state.pitch,f.get('attitude/theta-rad'));
  assert.equal(f.state.roll,f.get('attitude/phi-rad'));
  assert.ok(f.state.attitude.clone().invert().length()>.999);
 }finally{f.destroy();}
});
test('throttle drives the modeled engine and coast flight loses speed',async()=>{
 const f=await create();try{
  f.reset();const initial=f.state.rpm;
  advance(f,{throttle:-1},8);assert.equal(f.state.throttle,0);assert.ok(f.state.rpm<initial&&f.state.speed*1.94384<95);
  advance(f,{throttle:1},5);assert.equal(f.state.throttle,1);assert.ok(f.state.rpm>1000);
 }finally{f.destroy();}
});
test('fixed-time accumulator gives consistent flight at 30/60/144 FPS',async()=>{
 const f=await create();try{
  const values=[];
  for(const hz of [30,60,144]){f.reset();const s=advance(f,{roll:.3,pitch:.15},8,hz);values.push([s.x,s.y,s.z,s.speed,s.time]);}
  for(const a of values.slice(1))for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-values[0][i])<1e-5);
 }finally{f.destroy();}
});
test('reset restores a new trimmed departure and retains the mode',async()=>{
 const f=await create();try{
  f.reset();f.setAcrobatic(true);advance(f,{pitch:.4,roll:.2},2);
  const s=f.reset({lat:45.5017,lon:-73.5673,altitude:1100});
  assert.equal(s.time,0);assert.ok(s.acrobatic&&!s.crashed);assert.ok(Math.abs(s.x)<.01&&Math.abs(s.z)<.01);
  assert.ok(Math.abs(s.y-1100)<.01&&Math.abs(s.roll)<.01&&s.rpm>1500);
 }finally{f.destroy();}
});
test('acrobatic chase camera stays attached to the actual WASM attitude',async()=>{
 const f=await create();try{
  f.reset({lat:40,lon:-100,altitude:3000});f.setAcrobatic(true);
  const camera=new PerspectiveCamera(55,.6,1,130000);
  for(let i=0;i<500;i++){
   f.advance({pitch:.4,roll:.7},1/120);const s=f.state,p=new Vector3(s.x,s.sceneY,s.z);
   updateFlightCamera(camera,p,s,0);camera.updateMatrixWorld();const screen=p.clone().project(camera);
   assert.ok(Math.abs(screen.x)<1e-6&&Math.abs(screen.y)<1e-6);
   const offset=camera.position.clone().sub(p).applyQuaternion(s.attitude.clone().invert());
   assert.ok(Math.abs(offset.x)<1e-6&&offset.z>0);
  }
 }finally{f.destroy();}
});
test('missing aircraft data fails visibly instead of using placeholder physics',async()=>{
 await assert.rejects(()=>JSBSimFlight.create({...options,data:{}}),/model failed/);
});
