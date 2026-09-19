import { Euler, Quaternion, Vector3 } from 'three';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function setAcrobatic(s, enabled) {
 if (!!s.acrobatic === enabled) return;
 s.acrobatic=enabled;
 if(enabled){
  s.attitude=new Quaternion().setFromEuler(new Euler(s.pitch,-s.heading,-s.roll,'YXZ'));
  s.acroCameraHeading=s.heading;
 }else{
  // Return to stable, upright normal flight at the current position.
  s.pitch=clamp(s.pitch,-.65,.65);s.roll=0;delete s.attitude;
 }
}
export const checkpoints=[{name:'North Island',x:0,y:730,z:-1300},{name:'Lagoon Bay',x:850,y:800,z:-2900},{name:'Summit Point',x:1800,y:1050,z:-4600}];
export function initialState(altitude=730){return {x:0,y:altitude,z:1700,pitch:0,roll:0,heading:0,speed:57.6,throttle:.65,time:0,distance:0,checkpoint:0,crashed:false,stall:false};}
export function step(s,input,dt,ground=()=>0){
 dt=clamp(dt,0,.05); if(s.crashed)return s;
 s.throttle=clamp(s.throttle+(input.throttle||0)*dt*.25,0,1);
 if(s.acrobatic){
  // Body-local rotation avoids Euler singularities through vertical/inverted flight.
  const spin=new Vector3((input.pitch||0)*1.25,-(input.yaw||0)*.65,-(input.roll||0)*2.2);
  const rate=spin.length();
  if(rate)s.attitude.multiply(new Quaternion().setFromAxisAngle(spin.divideScalar(rate),rate*dt)).normalize();
  const forward=new Vector3(0,0,-1).applyQuaternion(s.attitude);
  const angles=new Euler().setFromQuaternion(s.attitude,'YXZ');
  s.pitch=angles.x;s.roll=-angles.z;
  if(Math.hypot(forward.x,forward.z)>.001)s.heading=Math.atan2(forward.x,-forward.z);
  // Arcade energy assist keeps sustained loops controllable without stalling.
  s.speed=clamp(s.speed+((42+s.throttle*78-s.speed)*.65-forward.y*5)*dt,35,125);
  s.stall=false;
  s.x+=forward.x*s.speed*dt;s.y+=forward.y*s.speed*dt;s.z+=forward.z*s.speed*dt;
  s.time+=dt;s.distance+=s.speed*dt;
  if(s.y<ground(s.x,s.z)+4){s.crashed=true;s.y=ground(s.x,s.z)+4;}
  return s;
 }
 s.roll+=((input.roll||0)*1.02-s.roll)*Math.min(1,dt*2.4);
 s.pitch=clamp(s.pitch+(input.pitch||0)*dt*.32,-.65,.65);
 if(!input.pitch)s.pitch*=Math.exp(-dt*.28);
 s.heading+=(Math.tan(s.roll)*9.81/Math.max(28,s.speed)+(input.yaw||0)*.12)*dt;
 s.speed=clamp(s.speed+(s.throttle*8.5-1.5-.00075*s.speed*s.speed-Math.sin(s.pitch)*9.81)*dt,12,120);
 s.stall=s.speed<28;
 const vertical=Math.sin(s.pitch)*s.speed-(s.stall?(28-s.speed)*1.7:0);
 const horizontal=Math.cos(s.pitch)*s.speed;
 s.x+=Math.sin(s.heading)*horizontal*dt;s.z-=Math.cos(s.heading)*horizontal*dt;s.y+=vertical*dt;
 s.time+=dt;s.distance+=s.speed*dt;
 if(s.y<ground(s.x,s.z)+4){s.crashed=true;s.y=ground(s.x,s.z)+4;}
 return s;
}
export function passCheckpoint(s){const p=checkpoints[s.checkpoint];if(p&&Math.hypot(s.x-p.x,s.y-p.y,s.z-p.z)<145){s.checkpoint++;return true;}return false;}
