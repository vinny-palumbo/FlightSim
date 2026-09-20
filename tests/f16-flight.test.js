import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {JSBSimFlight} from '../src/jsbsim-flight.js';
import {FlightPhysics} from '../src/flight-physics.js';
const runtime={moduleUrl:new URL('../public/jsbsim/jsbsim_wasm.mjs',import.meta.url),wasmUrl:new URL('../public/jsbsim/jsbsim_wasm.wasm',import.meta.url)};
const createRealistic=async(aircraftModel)=>JSBSimFlight.create({...runtime,aircraftModel,data:JSON.parse(await readFile(new URL(`../public/jsbsim/${aircraftModel}.json`,import.meta.url),'utf8'))});
const advance=(f,input,seconds)=>{for(let i=0;i<seconds*120;i++)f.advance(input,1/120);return f.state;};
test('shipped F-16 model trims and cruises at coastal and mountain departures with gear up',async()=>{
 const f=await createRealistic('f16');try{
  for(const altitude of [1100,2800,3000]){
   f.reset({lat:37.795,lon:-122.46,altitude});advance(f,{},20);
   assert.ok(Math.abs(f.state.y-altitude)<2);assert.ok(Math.abs(f.state.speed*1.94384-350)<1);
   assert.equal(f.get('gear/gear-pos-norm'),0);assert.ok(f.get('propulsion/engine/thrust-lbs')>2000&&!f.state.crashed);
  }
 }finally{f.destroy();}
});
test('F-16 pitch, bank, rudder and afterburner respond to controls in both modes',async()=>{
 const f=await createRealistic('f16');try{
  for(const acro of [false,true]){
   const reset=()=>{f.reset();f.setAcrobatic(acro);};
   reset();assert.ok(advance(f,{pitch:1},2).pitch>.1);
   reset();assert.ok(advance(f,{pitch:-1},2).pitch<-.1);
   reset();assert.ok(advance(f,{roll:1},.5).roll>.1);
   reset();assert.ok(advance(f,{roll:-1},.5).roll<-.1);
   reset();const s=advance(f,{yaw:1},2);assert.ok(s.heading>0&&s.heading<.1);
   reset();advance(f,{throttle:1},4);assert.equal(f.state.throttle,1);assert.ok(f.get('propulsion/engine/thrust-lbs')>20000&&f.state.speed*1.94384>370);
  }
 }finally{f.destroy();}
});
test('Rafale selects real F-16 physics, and returning to Cessna restores its physics preference',async()=>{
 const f=new FlightPhysics({createRealistic});try{
  const departure={lat:45.5017,lon:-73.5673,altitude:1100};f.reset(departure);f.setAcrobatic(true);
  await f.setAircraft('rafale');assert.equal(f.model,'realistic');assert.equal(f.active.aircraftModel,'f16');assert.ok(f.state.acrobatic);
  assert.ok(Math.abs(f.state.speed*1.94384-350)<1);await assert.rejects(f.setModel('arcade'),/F-16/);
  await f.setAircraft('cessna');assert.equal(f.model,'arcade');assert.equal(f.state.time,0);
  await f.setModel('realistic');await f.setAircraft('rafale');await f.setAircraft('cessna');
  assert.equal(f.model,'realistic');assert.equal(f.active.aircraftModel,'c172p');assert.ok(Math.abs(f.state.speed*1.94384-95)<1);
 }finally{f.destroy();}
});
