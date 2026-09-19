import { Euler, Quaternion, Vector3 } from 'three';

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const GRAVITY = 9.81;
const MASS = 1100;
const WING_AREA = 16.2;
const FIXED_STEP = 1 / 120;
const approach = (value, target, response, dt) => value + (target - value) * (1 - Math.exp(-response * dt));
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export const checkpoints = [{name:'North Island',x:0,y:730,z:-1300},{name:'Lagoon Bay',x:850,y:800,z:-2900},{name:'Summit Point',x:1800,y:1050,z:-4600}];

export function initialState(altitude = 730) {
  return {
    x: 0, y: altitude, z: 1700, pitch: 0, roll: 0, heading: 0,
    speed: 57.6, throttle: .65, enginePower: .65, velocity: new Vector3(0, 0, -57.6),
    pitchRate: 0, rollRate: 0, yawRate: 0, angleOfAttack: 0, loadFactor: 1,
    time: 0, distance: 0, checkpoint: 0, crashed: false, stall: false,
  };
}

export function setAcrobatic(s, enabled) {
  if (!!s.acrobatic === enabled) return;
  s.acrobatic = enabled;
  s.pitchRate = s.rollRate = s.yawRate = 0;
  if (enabled) {
    s.attitude = new Quaternion().setFromEuler(new Euler(s.pitch, -s.heading, -s.roll, 'YXZ'));
  } else {
    // Upright recovery preserves position, airspeed, and momentum.
    s.pitch = clamp(s.pitch, -.65, .65);
    s.roll = 0;
    delete s.attitude;
  }
}

function integrate(s, input, dt, ground) {
  s.throttle = clamp(s.throttle + clamp(input.throttle || 0, -1, 1) * dt * .25, 0, 1);
  s.enginePower = approach(s.enginePower, s.throttle, 1.8, dt);
  const pitchInput = clamp(input.pitch || 0, -1, 1);
  const rollInput = clamp(input.roll || 0, -1, 1);
  const yawInput = clamp(input.yaw || 0, -1, 1);
  const authority = clamp(s.speed / 48, .18, 1.15);
  let attitude;
  if (s.acrobatic) {
    s.pitchRate = approach(s.pitchRate, pitchInput * .85 * authority, 5, dt);
    s.rollRate = approach(s.rollRate, rollInput * 2.2 * authority, 6, dt);
    s.yawRate = approach(s.yawRate, yawInput * .5 * authority, 4, dt);
    const spin = new Vector3(s.pitchRate, -s.yawRate, -s.rollRate);
    const rate = spin.length();
    if (rate) s.attitude.multiply(new Quaternion().setFromAxisAngle(spin.divideScalar(rate), rate * dt)).normalize();
    attitude = s.attitude;
    const angles = new Euler().setFromQuaternion(attitude, 'YXZ');
    s.pitch = angles.x;
    s.roll = -angles.z;
  } else {
    const pitchTarget = pitchInput * .38 - (pitchInput ? 0 : s.pitch * .18);
    s.pitchRate = approach(s.pitchRate, pitchTarget * authority, 4, dt);
    s.rollRate = approach(s.rollRate, clamp((rollInput * 1.02 - s.roll) * 2.4, -1.6, 1.6) * authority, 5, dt);
    s.pitch = clamp(s.pitch + s.pitchRate * dt, -.65, .65);
    s.roll = clamp(s.roll + s.rollRate * dt, -1.02, 1.02);
    // Coordinated-turn assistance is retained for normal exploration flight.
    const bankTurn = Math.tan(s.roll) * GRAVITY / Math.max(25, s.speed);
    s.yawRate = approach(s.yawRate, bankTurn + yawInput * .25 * authority, 3, dt);
    s.heading = wrap(s.heading + s.yawRate * dt);
    attitude = new Quaternion().setFromEuler(new Euler(s.pitch, -s.heading, -s.roll, 'YXZ'));
  }

  const forward = new Vector3(0, 0, -1).applyQuaternion(attitude);
  const up = new Vector3(0, 1, 0).applyQuaternion(attitude);
  const right = new Vector3(1, 0, 0).applyQuaternion(attitude);
  if (s.acrobatic && Math.hypot(forward.x, forward.z) > .001) s.heading = Math.atan2(forward.x, -forward.z);
  const velocity = s.velocity;
  const speed = velocity.length();
  const airflow = velocity.clone().divideScalar(Math.max(speed, .01));
  const along = velocity.dot(forward);
  const aoa = Math.atan2(-velocity.dot(up), Math.max(.01, along));
  s.angleOfAttack = aoa;
  const density = 1.225 * Math.exp(-Math.max(0, s.y) / 10000);
  const pressureArea = .5 * density * speed * speed * WING_AREA;
  // Broad, forgiving lift curve for aerobatics; both modes lose lift at excessive AoA.
  const stallAngle = s.acrobatic ? .42 : .29;
  const excess = Math.max(0, Math.abs(aoa) - stallAngle);
  const attached = Math.exp(-excess * 8);
  const slope = s.acrobatic ? 6 : 4.8;
  const liftCoefficient = (.36 + slope * clamp(aoa, -stallAngle, stallAngle)) * attached
    + .65 * Math.sin(2 * aoa) * (1 - attached);
  const liftDirection = up.clone().addScaledVector(airflow, -up.dot(airflow)).normalize();
  const lift = clamp(pressureArea * liftCoefficient, -MASS * GRAVITY * 8, MASS * GRAVITY * 8);
  const dragCoefficient = .028 + .055 * liftCoefficient * liftCoefficient + .85 * (1 - attached);
  const drag = pressureArea * dragCoefficient;
  const sideSpeed = velocity.dot(right);
  const sideForce = -sideSpeed * Math.max(10, speed) * density * 3.5;
  const thrust = s.enginePower * (s.acrobatic ? 3000 : 1850) * clamp(1 - speed / 220, .25, 1);
  const acceleration = new Vector3(0, -GRAVITY, 0)
    .addScaledVector(liftDirection, lift / MASS)
    .addScaledVector(airflow, -drag / MASS)
    .addScaledVector(right, sideForce / MASS)
    .addScaledVector(forward, thrust / MASS);
  velocity.addScaledVector(acceleration, dt);
  s.x += velocity.x * dt;
  s.y += velocity.y * dt;
  s.z += velocity.z * dt;
  s.speed = velocity.length();
  s.loadFactor = lift / (MASS * GRAVITY);
  // Hysteresis avoids a flashing warning at the edge of the stall envelope.
  s.stall = s.stall ? Math.abs(aoa) > stallAngle * .8 || speed < 23 : Math.abs(aoa) > stallAngle || speed < 21;
  s.time += dt;
  s.distance += s.speed * dt;
  const floor = ground(s.x, s.z) + 4;
  if (s.y < floor) { s.crashed = true; s.y = floor; }
}

export function step(s, input, dt, ground = () => 0) {
  if (s.crashed) return s;
  // Small deterministic substeps keep low frame rates from destabilizing lift/stalls.
  let remaining = clamp(dt, 0, .1);
  while (remaining > 1e-8 && !s.crashed) {
    const h = Math.min(FIXED_STEP, remaining);
    integrate(s, input, h, ground);
    remaining -= h;
  }
  return s;
}

export function passCheckpoint(s) {
  const p = checkpoints[s.checkpoint];
  if (p && Math.hypot(s.x - p.x, s.y - p.y, s.z - p.z) < 145) { s.checkpoint++; return true; }
  return false;
}
