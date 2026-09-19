export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const checkpoints=[{name:'North Island',x:0,y:730,z:-1300},{name:'Lagoon Bay',x:850,y:800,z:-2900},{name:'Summit Point',x:1800,y:1050,z:-4600}];
export function initialState(altitude=730){return {x:0,y:altitude,z:1700,pitch:0,roll:0,heading:0,speed:57.6,throttle:.65,time:0,distance:0,checkpoint:0,crashed:false,stall:false};}
export function step(s,input,dt,ground=()=>0){
 dt=clamp(dt,0,.05); if(s.crashed)return s;
 s.throttle=clamp(s.throttle+(input.throttle||0)*dt*.25,0,1);
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
