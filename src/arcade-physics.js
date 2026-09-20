import { Euler, Quaternion, Vector3 } from 'three';

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
// One illustrative light-aircraft model for BOTH control modes. SI units.
export const AIRFRAME = Object.freeze({mass:1100, wingArea:16.2, gravity:9.81, stallAngle:.29,
  liftSlope:4.8, trimLift:.36, staticThrust:2150, propulsivePower:95000,
  pitchInertia:1800, yawInertia:4000, rollInertia:3000});
const FIXED_STEP = 1 / 120;
const approach = (value, target, response, dt) => value + (target - value) * (1 - Math.exp(-response * dt));
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const densityAt = altitude => 1.225 * Math.exp(-Math.max(0, altitude) / 10000);
const rotationalEnergy = s => .5 * (AIRFRAME.pitchInertia*s.pitchRate**2 + AIRFRAME.yawInertia*s.yawRate**2 + AIRFRAME.rollInertia*s.rollRate**2);
export const mechanicalEnergy = s => .5*AIRFRAME.mass*s.velocity.lengthSq() + AIRFRAME.mass*AIRFRAME.gravity*s.y + rotationalEnergy(s);
export const checkpoints = [{name:'North Island',x:0,y:730,z:-1300},{name:'Lagoon Bay',x:850,y:800,z:-2900},{name:'Summit Point',x:1800,y:1050,z:-4600}];

export function initialState(altitude = 730) {
  return {
    x:0, y:altitude, z:1700, pitch:0, roll:0, heading:0, attitude:new Quaternion(),
    speed:57.6, throttle:.65, enginePower:.65, velocity:new Vector3(0,0,-57.6),
    pitchRate:0, rollRate:0, yawRate:0, angleOfAttack:0, loadFactor:1,
    time:0, distance:0, checkpoint:0, crashed:false, stall:false,
  };
}

export function setAcrobatic(s, enabled) {
  // Change the control law only. Never teleport attitude or reset angular momentum.
  s.acrobatic = enabled;
}

export function airLoads(s, velocity=s.velocity, altitude=s.y) {
  const forward = new Vector3(0,0,-1).applyQuaternion(s.attitude);
  const up = new Vector3(0,1,0).applyQuaternion(s.attitude);
  const right = new Vector3(1,0,0).applyQuaternion(s.attitude);
  const speed = velocity.length();
  const airflow = speed>1e-8 ? velocity.clone().divideScalar(speed) : new Vector3();
  const along = velocity.dot(forward);
  const aoa = speed>1e-8 ? Math.atan2(-velocity.dot(up), along) : 0;
  const density = densityAt(altitude);
  const pressureArea = .5*density*speed*speed*AIRFRAME.wingArea;
  const excess = Math.max(0, Math.abs(aoa)-AIRFRAME.stallAngle);
  const attached = Math.exp(-excess*8);
  const cl = (AIRFRAME.trimLift+AIRFRAME.liftSlope*clamp(aoa,-AIRFRAME.stallAngle,AIRFRAME.stallAngle))*attached
    + .65*Math.sin(2*aoa)*(1-attached);
  const liftDirection = up.clone().addScaledVector(airflow,-up.dot(airflow)).normalize();
  const lift = liftDirection.multiplyScalar(pressureArea*cl);
  const drag = airflow.clone().multiplyScalar(-pressureArea*(.028+.055*cl*cl+.85*(1-attached)));
  const side = right.clone().multiplyScalar(-velocity.dot(right)*speed*density*3.5);
  // Finite static thrust and finite engine power; neither mode gets a boost.
  const thrustMagnitude = s.enginePower*Math.min(AIRFRAME.staticThrust*density/1.225, AIRFRAME.propulsivePower/Math.max(speed,1));
  const thrust = forward.clone().multiplyScalar(thrustMagnitude);
  return {lift,drag,side,thrust,aoa,forward,up,right,airflow,speed,density};
}

function integrate(s, input, dt, ground) {
  s.throttle=clamp(s.throttle+clamp(input.throttle||0,-1,1)*dt*.25,0,1);
  s.enginePower=approach(s.enginePower,s.throttle,1.8,dt);
  const loads=airLoads(s);
  const pitchInput=clamp(input.pitch||0,-1,1),rollInput=clamp(input.roll||0,-1,1),yawInput=clamp(input.yaw||0,-1,1);
  // Normal mode is a bounded attitude-assist controller, using the same airframe.
  // In acrobatics the pilot commands rates directly. Neither controller imposes angles.
  const desiredPitch=s.acrobatic ? pitchInput*.85 : clamp((pitchInput*.65-s.pitch)*1.8,-.38,.38);
  const desiredRoll=s.acrobatic ? rollInput*2.2 : clamp(wrap(rollInput*1.02-s.roll)*2.4,-1.6,1.6);
  const sideslip=Math.atan2(s.velocity.dot(loads.right),Math.max(1,Math.abs(s.velocity.dot(loads.forward))));
  const desiredYaw=yawInput*.5+sideslip*1.8;
  // Aerodynamic control moments and rate damping vanish as airflow vanishes.
  const authority=loads.density/1.225*(loads.speed/57.6)**2;
  const oldRotationEnergy=rotationalEnergy(s);
  const previousSpin=new Vector3(s.pitchRate,-s.yawRate,-s.rollRate);
  const torque=new Vector3(
    AIRFRAME.pitchInertia*authority*(5*(desiredPitch-s.pitchRate)-loads.aoa*.6),
    -AIRFRAME.yawInertia*authority*4*(desiredYaw-s.yawRate),
    -AIRFRAME.rollInertia*authority*6*(desiredRoll-s.rollRate));
  const angularMomentum=new Vector3(previousSpin.x*AIRFRAME.pitchInertia,previousSpin.y*AIRFRAME.yawInertia,previousSpin.z*AIRFRAME.rollInertia);
  const angularAcceleration=torque.sub(previousSpin.clone().cross(angularMomentum));
  angularAcceleration.set(angularAcceleration.x/AIRFRAME.pitchInertia,angularAcceleration.y/AIRFRAME.yawInertia,angularAcceleration.z/AIRFRAME.rollInertia);
  const spin=previousSpin.clone().addScaledVector(angularAcceleration,dt);
  s.pitchRate=spin.x;s.yawRate=-spin.y;s.rollRate=-spin.z;
  const meanSpin=previousSpin.clone().add(spin).multiplyScalar(.5),rate=meanSpin.length();
  if(rate)s.attitude.multiply(new Quaternion().setFromAxisAngle(meanSpin.divideScalar(rate),rate*dt)).normalize();
  const angles=new Euler().setFromQuaternion(s.attitude,'YXZ');
  s.pitch=angles.x;s.roll=-angles.z;
  const direction=new Vector3(0,0,-1).applyQuaternion(s.attitude);
  if(Math.hypot(direction.x,direction.z)>.001)s.heading=Math.atan2(direction.x,-direction.z);

  // Positive rotational work comes from the airstream, not free control energy.
  const rotationWork=Math.max(0,rotationalEnergy(s)-oldRotationEnergy);
  const acceleration=(velocity,altitude)=>{
    const f=airLoads(s,velocity,altitude);
    const a=new Vector3(0,-AIRFRAME.gravity,0).addScaledVector(f.lift,1/AIRFRAME.mass)
      .addScaledVector(f.drag,1/AIRFRAME.mass).addScaledVector(f.side,1/AIRFRAME.mass).addScaledVector(f.thrust,1/AIRFRAME.mass);
    if(f.speed>1e-6)a.addScaledVector(f.airflow,-rotationWork/(dt*f.speed*AIRFRAME.mass));
    return {a,f};
  };
  // Midpoint forces and trapezoidal position integration avoid Euler energy gain.
  const before=s.velocity.clone();
  const first=acceleration(before,s.y);
  const middleVelocity=before.clone().addScaledVector(first.a,dt*.5);
  const middle=acceleration(middleVelocity,s.y+before.y*dt*.5);
  s.velocity.addScaledVector(middle.a,dt);
  const average=before.add(s.velocity).multiplyScalar(.5);
  s.x+=average.x*dt;s.y+=average.y*dt;s.z+=average.z*dt;
  s.speed=s.velocity.length();
  s.angleOfAttack=middle.f.aoa;
  s.loadFactor=middle.f.lift.dot(middle.f.up)/(AIRFRAME.mass*AIRFRAME.gravity);
  // A stall depends on angle of attack, not a universal speed threshold.
  s.stall=Math.abs(s.angleOfAttack)>AIRFRAME.stallAngle*(s.stall?.8:1);
  s.time+=dt;s.distance+=average.length()*dt;
  const floor=ground(s.x,s.z)+4;
  if(s.y<floor){s.crashed=true;s.y=floor;}
}

export function step(s,input,dt,ground=()=>0) {
  if(s.crashed)return s;
  let remaining=clamp(dt,0,.1);
  while(remaining>1e-8&&!s.crashed){const h=Math.min(FIXED_STEP,remaining);integrate(s,input,h,ground);remaining-=h;}
  return s;
}

export function passCheckpoint(s) {
  const p=checkpoints[s.checkpoint];
  if(p&&Math.hypot(s.x-p.x,s.y-p.y,s.z-p.z)<145){s.checkpoint++;return true;}
  return false;
}
