import {initialState,step,setAcrobatic} from './arcade-physics.js';

export class ArcadeFlight {
 constructor(){this.state=initialState(1100);this.initialized=false;this.syncState();}
 syncState(){const s=this.state;s.physicsEngine='Arcade';s.sceneY=s.y;s.rpm=(30+s.enginePower*50)*30/Math.PI;}
 reset(location){const acrobatic=!!this.state.acrobatic;this.state=initialState(location.altitude??1100);setAcrobatic(this.state,acrobatic);this.initialized=true;this.syncState();return this.state;}
 setAcrobatic(enabled){setAcrobatic(this.state,enabled);}
 advance(input,dt){if(this.initialized)step(this.state,input,dt,()=>-10000);this.syncState();return this.state;}
 destroy(){this.initialized=false;}
}

// Keep Arcade independent of the optional WASM download. Switching models starts
// a fresh flight: their state representations cannot safely be interchanged.
export class FlightPhysics {
 constructor({createRealistic=async(aircraftModel)=>{const {JSBSimFlight}=await import('./jsbsim-flight.js');return JSBSimFlight.create({aircraftModel});}}={}){
  this.active=new ArcadeFlight();this.model='arcade';this.aircraft='cessna';this.cessnaModel='arcade';this.createRealistic=createRealistic;this.switching=false;this.destroyed=false;
 }
 get state(){return this.active.state;}
 get initialized(){return this.active.initialized;}
 reset(location){if(this.switching)throw Error('Physics is still loading');this.location={...location};return this.active.reset(location);}
 setAcrobatic(enabled){this.active.setAcrobatic(enabled);}
 advance(input,dt){return this.switching?this.state:this.active.advance(input,dt);}
 async setModel(model){
  if(!['arcade','realistic'].includes(model))throw Error('Unknown flight physics');
  if(this.aircraft==='rafale'&&model!=='realistic')throw Error('Rafale uses F-16 physics');
  await this.configure(model,this.aircraft);
  if(this.aircraft==='cessna')this.cessnaModel=model;
 }
 async setAircraft(aircraft){
  if(!['cessna','rafale'].includes(aircraft))throw Error('Unknown aircraft');
  await this.configure(aircraft==='rafale'?'realistic':this.cessnaModel,aircraft);
 }
 async configure(model,aircraft){
  if(this.destroyed||this.switching)throw Error('Flight physics is unavailable');
  if(model===this.model&&aircraft===this.aircraft)return;
  this.switching=true;let next;
  try{
   next=model==='arcade'?new ArcadeFlight():await this.createRealistic(aircraft==='rafale'?'f16':'c172p');
   if(this.destroyed)throw Error('Flight has closed');
   next.setAcrobatic(!!this.state.acrobatic);
   if(this.initialized)next.reset(this.location);
   const previous=this.active;this.active=next;this.model=model;this.aircraft=aircraft;next=null;previous.destroy();
  }finally{next?.destroy();this.switching=false;}
 }
 destroy(){this.destroyed=true;this.active.destroy();}
}
