import { Vector3 } from 'three';

export function updateFlightCamera(camera, position, state, mode) {
  const { heading, pitch } = state;
  const forward = new Vector3(Math.sin(heading) * Math.cos(pitch), Math.sin(pitch), -Math.cos(heading) * Math.cos(pitch));
  camera.up.set(0, 1, 0);
  if(state.acrobatic&&state.attitude){
    const direction=new Vector3(0,0,-1).applyQuaternion(state.attitude);
    if(mode===1){
      const up=new Vector3(0,1,0).applyQuaternion(state.attitude);
      camera.up.copy(up);
      camera.position.copy(position).addScaledVector(direction,3).addScaledVector(up,1.4);
      camera.lookAt(camera.position.clone().add(direction));
    }else{
      // Stable horizon and centered aircraft throughout loops and rolls.
      const distance=Math.max(29,24/camera.aspect), angle=state.acroCameraHeading||0;
      camera.position.copy(position).add(mode===2?new Vector3(45,25,55):new Vector3(-Math.sin(angle)*distance,distance*.3,Math.cos(angle)*distance));
      camera.lookAt(position);
    }
    return;
  }
  if (mode === 0) {
    // Original level chase position and pitch-driven look-ahead.
    const distance = Math.max(25, 22 / camera.aspect);
    camera.position.copy(position).add(new Vector3(-Math.sin(heading) * distance, distance * .28, Math.cos(heading) * distance));
    // Retain the original chase setup with a gentler pitch response.
    // A shallow look-ahead lets the aircraft move in frame without following
    // its nose all the way toward the sky. No framing clamp or pitch orbit.
    const lookPitch = pitch * .07;
    const lookForward = new Vector3(Math.sin(heading) * Math.cos(lookPitch), Math.sin(lookPitch), -Math.cos(heading) * Math.cos(lookPitch));
    const target = position.clone().addScaledVector(lookForward, 100);
    // Smoothly leave room for a lowered wing during steep banking.
    target.y -= 24 * Math.sin(state.roll || 0) ** 2;
    camera.lookAt(target);
  } else if (mode === 1) {
    camera.position.copy(position).addScaledVector(forward, 3).add(new Vector3(0, 1.4, 0));
    camera.lookAt(position.clone().addScaledVector(forward, 100));
  } else {
    camera.position.copy(position).add(new Vector3(55, 25, 65));
    camera.lookAt(position.clone().addScaledVector(forward, 100));
  }
}



