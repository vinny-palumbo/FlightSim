import { Euler, Quaternion, Vector3 } from 'three';

// Eye positions in the normalized aircraft's local coordinates (meters).
export const cockpitViews = {
  cessna: { position: new Vector3(-.24, .42, -1.65), lookDown: .10 },
  rafale: { position: new Vector3(0, -.27, -3.45), lookDown: .10 },
};

export function updateFlightCamera(camera, position, state, mode, aircraftScale = 1, cockpit = cockpitViews.cessna) {
  const { heading, pitch } = state;
  const near = mode === 1 ? .03 : 1;
  if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
  if (mode === 1) {
    // Stay at the pilot's seat through bank, inverted flight, and mode changes.
    const attitude = state.attitude ?? new Quaternion().setFromEuler(new Euler(pitch, -heading, -(state.roll || 0), 'YXZ'));
    camera.position.copy(cockpit.position).applyQuaternion(attitude).add(position);
    camera.up.set(0, 1, 0).applyQuaternion(attitude);
    const direction = new Vector3(0, -Math.sin(cockpit.lookDown), -Math.cos(cockpit.lookDown)).applyQuaternion(attitude);
    camera.lookAt(camera.position.clone().add(direction));
    return;
  }
  const forward = new Vector3(Math.sin(heading) * Math.cos(pitch), Math.sin(pitch), -Math.cos(heading) * Math.cos(pitch));
  camera.up.set(0, 1, 0);
  if(state.attitude&&(state.acrobatic||Math.abs(state.roll)>1.1||Math.abs(state.pitch)>.7)){
    const direction=new Vector3(0,0,-1).applyQuaternion(state.attitude);
    if(mode===0){
      // Attach the chase offset and up vector to the aircraft through every attitude.
      const distance=Math.max(29,24/camera.aspect)*aircraftScale;
      const up=new Vector3(0,1,0).applyQuaternion(state.attitude);
      camera.up.copy(up);
      camera.position.copy(position).addScaledVector(direction,-distance).addScaledVector(up,distance*.3);
      camera.lookAt(position);
    }else{
      camera.position.copy(position).add(new Vector3(45,25,55).multiplyScalar(aircraftScale));
      camera.lookAt(position);
    }
    return;
  }
  if (mode === 0) {
    // Original level chase position and pitch-driven look-ahead.
    const distance = Math.max(25, 22 / camera.aspect)*aircraftScale;
    camera.position.copy(position).add(new Vector3(-Math.sin(heading) * distance, distance * .28, Math.cos(heading) * distance));
    // The longer jet needs a centered target to keep its nose and tail in view.
    if(aircraftScale>1){camera.lookAt(position);return;}
    // Retain the original chase setup with a gentler pitch response.
    // A shallow look-ahead lets the aircraft move in frame without following
    // its nose all the way toward the sky. No framing clamp or pitch orbit.
    const lookPitch = pitch * .07;
    const lookForward = new Vector3(Math.sin(heading) * Math.cos(lookPitch), Math.sin(lookPitch), -Math.cos(heading) * Math.cos(lookPitch));
    const target = position.clone().addScaledVector(lookForward, 100);
    // Smoothly leave room for a lowered wing during steep banking.
    target.y -= 24 * Math.sin(state.roll || 0) ** 2;
    camera.lookAt(target);
  } else {
    camera.position.copy(position).add(new Vector3(55, 25, 65).multiplyScalar(aircraftScale));
    camera.lookAt(position.clone().addScaledVector(forward, 100));
  }
}



