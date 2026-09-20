import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {FlightPhysics} from '../src/flight-physics.js';
import {initialState,step,setAcrobatic} from '../src/arcade-physics.js';
import {JSBSimFlight} from '../src/jsbsim-flight.js';
const location={lat:39.7392,lon:-104.9903,altitude:2800};
const data=JSON.parse(await readFile(new URL('../public/jsbsim/c172p.json',import.meta.url),'utf8'));
const createRealistic=()=>JSBSimFlight.create({data,moduleUrl:new URL('../public/jsbsim/jsbsim_wasm.mjs',import.meta.url),wasmUrl:new URL('../public/jsbsim/jsbsim_wasm.wasm',import.meta.url)});

test('Arcade is default, needs no WASM, and retains previous normal and acrobatic flight',()=>{
 const f=new FlightPhysics({createRealistic:()=>{throw Error('Should not load');}});
 assert.equal(f.model,'arcade');assert.equal(f.initialized,false);
 for(const acro of [false,true]){
  f.setAcrobatic(acro);f.reset(location);const prior=initialState(location.altitude);setAcrobatic(prior,acro);
  for(let i=0;i<120;i++){const input={pitch:.2,roll:.3,yaw:.1,throttle:.1};f.advance(input,1/60);step(prior,input,1/60,()=>-10000);}
  assert.equal(f.state.y,prior.y);assert.equal(f.state.z,prior.z);assert.equal(f.state.speed,prior.speed);assert.ok(f.state.attitude.equals(prior.attitude));
  assert.equal(f.state.sceneY,f.state.y);assert.ok(f.state.rpm>0);
 }
 f.destroy();
});

test('switching both ways resets at the selected departure and preserves Acrobatic',async()=>{
 const f=new FlightPhysics({createRealistic});
 try{
  f.reset(location);f.setAcrobatic(true);f.advance({roll:1},.1);
  await f.setModel('realistic');assert.equal(f.model,'realistic');assert.equal(f.state.physicsEngine,'JSBSim');
  assert.equal(f.state.time,0);assert.ok(f.state.acrobatic&&f.initialized);assert.ok(Math.abs(f.state.y-2800)<.1);
  f.advance({},.1);assert.ok(f.state.time>0);const sdkFlight=f.active;
  await f.setModel('arcade');assert.equal(f.model,'arcade');assert.ok(sdkFlight.destroyed);
  assert.equal(f.state.time,0);assert.equal(f.state.y,2800);assert.ok(f.state.acrobatic);
  f.advance({pitch:1},.1);assert.ok(f.state.time>0);
 }finally{f.destroy();}
});

test('a failed realistic download leaves Arcade usable and allows a retry',async()=>{
 let fail=true;const f=new FlightPhysics({createRealistic:()=>{if(fail)throw Error('offline');return createRealistic();}});
 try{
  f.reset(location);const before=f.state;
  await assert.rejects(f.setModel('realistic'),/offline/);
  assert.equal(f.state,before);assert.equal(f.model,'arcade');assert.equal(f.switching,false);
  f.advance({},.1);assert.ok(f.state.time>0);fail=false;
  await f.setModel('realistic');assert.equal(f.model,'realistic');
 }finally{f.destroy();}
});

test('physics selection before scenery leaves flight uninitialized, and disposal cancels loading',async()=>{
 const f=new FlightPhysics({createRealistic});await f.setModel('realistic');assert.equal(f.initialized,false);f.destroy();
 let finish;const pending=new FlightPhysics({createRealistic:()=>new Promise(resolve=>{finish=resolve;})});
 const switchTask=pending.setModel('realistic');pending.destroy();
 let cleaned=false;finish({destroy:()=>{cleaned=true;}});
 await assert.rejects(switchTask,/closed/);assert.ok(cleaned);
});
