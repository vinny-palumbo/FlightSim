import {JSBSimSdk,TrimMode} from '@0x62/jsbsim-wasm';
import {Euler,Matrix4,Quaternion,Vector3} from 'three';
import {clamp,initialState} from './flight-state.js';

const FT=.3048, DEG=Math.PI/180, STEP=1/120;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Earth-fixed coordinates match Cesium's WGS84 world; no flat-Earth position integration.
export function earthFrame(lat,lon){
 const p=lat*DEG,l=lon*DEG,sp=Math.sin(p),cp=Math.cos(p),sl=Math.sin(l),cl=Math.cos(l);
 const east=new Vector3(-sl,cl,0),up=new Vector3(cp*cl,cp*sl,sp),north=new Vector3(-sp*cl,-sp*sl,cp);
 const n=6378137/Math.sqrt(1-6.69437999014e-3*sp*sp);
 return {east,up,north,origin:new Vector3(n*cp*cl,n*cp*sl,n*(1-6.69437999014e-3)*sp)};
}
const inFrame=(v,f)=>new Vector3(v.dot(f.east),v.dot(f.up),-v.dot(f.north));

export class JSBSimFlight {
 static async create({aircraftModel='c172p',moduleUrl='/jsbsim/jsbsim_wasm.mjs',wasmUrl='/jsbsim/jsbsim_wasm.wasm',data,fetcher=fetch}={}){
  if(!['c172p','f16'].includes(aircraftModel))throw Error('Unsupported aircraft model');
  // An absolute URL keeps Vite from rewriting this public runtime as a source import.
  if(typeof window!=='undefined'){moduleUrl=new URL(moduleUrl,window.location.href);wasmUrl=new URL(wasmUrl,window.location.href);}
  const sdk=await JSBSimSdk.create({moduleUrl,wasmUrl,log:{console:false}});
  try{
   sdk.setDebugLevel(0);sdk.disableOutput();
   if(!data){const response=await fetcher(`/jsbsim/${aircraftModel}.json`);if(!response.ok)throw Error('Aircraft data download failed');data=await response.json();}
   for(const [path,xml] of Object.entries(data))sdk.writeDataFile(path,xml);
   if(!sdk.loadModel(aircraftModel))throw Error(`JSBSim ${aircraftModel} model failed to load`);
   sdk.setDt(STEP);
   return new JSBSimFlight(sdk,aircraftModel);
  }catch(error){sdk.destroy();throw error;}
 }
 constructor(sdk,aircraftModel='c172p'){this.aircraftModel=aircraftModel;this.jet=aircraftModel==='f16';this.sdk=sdk;this.state=initialState();this.accumulator=0;this.initialized=false;this.destroyed=false;}
 get(name){return this.sdk.getPropertyValue(name);}
 set(name,value){this.sdk.setPropertyValue(name,value);}
 reset(location={lat:37.795,lon:-122.46,altitude:1100}){
  if(this.destroyed)throw Error('Flight engine is disposed');
  const acrobatic=this.state.acrobatic;this.initialized=false;
  this.sdk.resetToInitialConditions(2);this.sdk.setDt(STEP);this.sdk.disableOutput();
  this.location={...location,altitude:location.altitude??1100};
  this.frame=earthFrame(location.lat,location.lon);this.accumulator=0;
  // Initialize airborne, engine running, and trimmed. These writes are reset-only.
  for(const [name,value] of Object.entries({
   'ic/lat-geod-deg':location.lat,'ic/long-gc-deg':location.lon,'ic/h-sl-ft':this.location.altitude/FT,
   'ic/vc-kts':this.jet?350:95,'ic/psi-true-deg':0,'ic/phi-deg':0,'ic/theta-deg':0,'ic/gamma-deg':0,
   'ic/p-rad_sec':0,'ic/q-rad_sec':0,'ic/r-rad_sec':0,
   'ic/terrain-elevation-ft':0,'fcs/throttle-cmd-norm':.65,'fcs/mixture-cmd-norm':1,
   'fcs/elevator-cmd-norm':0,'fcs/aileron-cmd-norm':0,'fcs/rudder-cmd-norm':0,
   'fcs/pitch-trim-cmd-norm':0,'fcs/roll-trim-cmd-norm':0,'fcs/yaw-trim-cmd-norm':0,
   'fcs/flap-cmd-norm':0,'propulsion/magneto_cmd':3,
   ...(this.jet?{'gear/gear-cmd-norm':0,'gear/gear-pos-norm':0,'fcs/speedbrake-cmd-norm':0}:{}),
  }))this.set(name,value);
  if(!this.sdk.runIc())throw Error('JSBSim initial conditions failed');
  this.set('propulsion/set-running',-1);
  if(!this.jet)this.set('fcs/mixture-cmd-norm',clamp(.9*this.get('atmosphere/P-psf')/2116.22,.2,1));
  this.sdk.doTrim(TrimMode.tFull);
  this.trim={elevator:this.get('fcs/elevator-cmd-norm'),aileron:this.get('fcs/aileron-cmd-norm'),rudder:this.get('fcs/rudder-cmd-norm'),pitch:this.get('attitude/theta-rad')};
  this.controls={...this.trim};
  this.state=initialState(this.location.altitude);this.state.acrobatic=acrobatic;
  this.state.throttle=this.get('fcs/throttle-cmd-norm');
  this.initialized=true;this.readState();return this.state;
 }
 setAcrobatic(enabled){this.state.acrobatic=!!enabled;}
 advance(input,dt){
  if(!this.initialized||this.destroyed||this.state.crashed)return this.state;
  this.accumulator+=clamp(dt,0,.1);
  while(this.accumulator+1e-10>=STEP){
   this.applyControls(input);if(!this.sdk.run())throw Error('JSBSim stopped unexpectedly');
   this.readState();this.accumulator-=STEP;
   if(this.state.crashed){this.accumulator=0;break;}
  }
  return this.state;
 }
 applyControls(input){
  const s=this.state,pitch=clamp(input.pitch||0,-1,1),roll=clamp(input.roll||0,-1,1),yaw=clamp(input.yaw||0,-1,1);
  s.throttle=clamp(s.throttle+clamp(input.throttle||0,-1,1)*STEP*.25,0,1);
  let elevator,aileron,rudder;
  if(s.acrobatic){
   elevator=this.trim.elevator-pitch*.85;aileron=this.trim.aileron+roll*.95;rudder=this.trim.rudder-yaw*.65;
  }else{
   // Assistance moves control surfaces only. JSBSim owns all forces and motion.
   const targetPitch=this.trim.pitch+pitch*.28;
   elevator=this.trim.elevator+1.3*(s.pitch-targetPitch)+.8*s.pitchRate;
   aileron=this.trim.aileron+1.5*wrap(roll*.8-s.roll)-.35*s.rollRate;
   rudder=this.trim.rudder-yaw*.6+this.get('aero/beta-rad')*.6;
  }
  for(const [control,target] of Object.entries({elevator,aileron,rudder})){
   this.controls[control]+=(clamp(target,-1,1)-this.controls[control])*(1-Math.exp(-8*STEP));
   this.set(`fcs/${control}-cmd-norm`,this.controls[control]);
  }
  this.set('fcs/throttle-cmd-norm',s.throttle);
  if(!this.jet)this.set('fcs/mixture-cmd-norm',clamp(.9*this.get('atmosphere/P-psf')/2116.22,.2,1));
 }
 readState(){
  const s=this.state,oldTime=s.time;
  const lat=this.get('position/lat-geod-deg'),lon=this.get('position/long-gc-deg');
  const ecef=new Vector3(this.get('position/ecef-x-ft'),this.get('position/ecef-y-ft'),this.get('position/ecef-z-ft')).multiplyScalar(FT);
  const local=inFrame(ecef.sub(this.frame.origin),this.frame);
  s.x=local.x;s.sceneY=local.y;s.z=local.z;s.y=this.get('position/h-sl-ft')*FT;
  s.latitude=lat;s.longitude=lon;
  s.pitch=this.get('attitude/theta-rad');s.roll=this.get('attitude/phi-rad');s.heading=this.get('attitude/psi-rad');
  const current=earthFrame(lat,lon);
  const frameRotation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(inFrame(current.east,this.frame),inFrame(current.up,this.frame),inFrame(current.north.clone().negate(),this.frame)));
  s.attitude.copy(frameRotation).multiply(new Quaternion().setFromEuler(new Euler(s.pitch,-s.heading,-s.roll,'YXZ')));
  s.velocity.set(this.get('velocities/v-east-fps')*FT,-this.get('velocities/v-down-fps')*FT,-this.get('velocities/v-north-fps')*FT);
  s.speed=this.get('velocities/vc-kts')/1.94384;s.trueAirspeed=this.get('velocities/vt-fps')*FT;
  s.pitchRate=this.get('velocities/q-rad_sec');s.rollRate=this.get('velocities/p-rad_sec');s.yawRate=this.get('velocities/r-rad_sec');
  s.angleOfAttack=this.get('aero/alpha-rad');s.loadFactor=this.get('accelerations/Nz');
  s.rpm=this.jet?0:this.get('propulsion/engine/propeller-rpm');s.enginePower=clamp(this.jet?this.get('propulsion/engine/n2')/100:s.rpm/2700,0,1);
  s.aircraftModel=this.aircraftModel;s.mach=this.get('velocities/mach');
  s.stall=this.jet?Math.abs(s.angleOfAttack)>.5:this.get('systems/stall-warn-norm')>=1||s.angleOfAttack<-.087;
  s.time=this.get('simulation/sim-time-sec');s.distance+=s.trueAirspeed*Math.max(0,s.time-oldTime);
  // Scenery mesh contacts are not supplied to JSBSim. Stop at its sea-level surface.
  s.crashed=this.get('position/h-agl-ft')<5||this.get('gear/unit[0]/WOW')>0;
  if(![s.x,s.y,s.z,s.speed,s.pitch,s.roll,s.heading,s.rpm].every(Number.isFinite))throw Error('JSBSim produced invalid flight data');
 }
 destroy(){if(this.destroyed)return;this.destroyed=true;this.sdk.destroy();}
}
