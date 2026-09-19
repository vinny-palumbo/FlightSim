import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { createPlane } from '../src/world.js';
import { updateFlightCamera } from '../src/camera.js';

test('ordinary cruise retains the original chase position and viewing angle', () => {
  const bounds = new Box3().setFromObject(createPlane());
  const position = new Vector3(150,730,-300);
  const state = {heading:1.2,pitch:0,roll:0};
  const camera = new PerspectiveCamera(55,16/9,1,130000);
  const original = camera.clone();
  original.position.copy(position).add(new Vector3(-Math.sin(state.heading)*25,7,Math.cos(state.heading)*25));
  original.lookAt(position.clone().add(new Vector3(Math.sin(state.heading)*100,0,-Math.cos(state.heading)*100)));
  updateFlightCamera(camera,position,state,0);
  assert.ok(camera.position.distanceTo(original.position)<1e-9);
  assert.ok(1-Math.abs(camera.quaternion.dot(original.quaternion))<1e-12);
});

test('whole aircraft stays inside chase view at pitch and bank limits', () => {
  const plane = createPlane();
  const bounds = new Box3().setFromObject(plane);
  for (const aspect of [390/844, .75, 1, 16/9, 2.4]) {
    const camera = new PerspectiveCamera(55, aspect, 1, 130000);
    for (const pitch of Array.from({length:27},(_,i)=>-.65+i*.05)) for (const roll of [-1.02,-.7,-.3,0,.3,.7,1.02]) for (const heading of [0, 1.5, 3.14, 5]) {
      const state = {pitch, roll, heading};
      plane.position.set(150, 730, -300);
      plane.rotation.set(pitch, -heading, -roll, 'YXZ');
      plane.updateMatrixWorld(true);
      updateFlightCamera(camera, plane.position, state, 0);
      const distance = Math.max(25,22/aspect);
      const originalPosition = plane.position.clone().add(new Vector3(-Math.sin(heading)*distance,distance*.28,Math.cos(heading)*distance));
      assert.ok(camera.position.distanceTo(originalPosition)<1e-9,'Camera must not orbit with pitch');
      camera.updateMatrixWorld(true);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const screen = new Vector3(x,y,z).applyMatrix4(plane.matrixWorld).project(camera);
        assert.ok(Math.abs(screen.x)<.95 && Math.abs(screen.y)<.95 && screen.z>-1 && screen.z<1,
          `Clipped at aspect=${aspect}, pitch=${pitch}, roll=${roll}: ${screen.toArray()}`);
      }
    }
  }
});

test('nose-up response stays gentle and continuous through maximum pitch', () => {
  const camera = new PerspectiveCamera(55,16/9,1,130000);
  const position = new Vector3(0,730,0);
  let previous;
  for (let i=0;i<=65;i++) {
    updateFlightCamera(camera,position,{heading:0,pitch:i*.01,roll:0},0);
    const direction = camera.getWorldDirection(new Vector3());
    const angle = Math.atan2(direction.y,-direction.z);
    if (previous !== undefined) {
      assert.ok(angle>previous,'Pitch response should not hit a hard stop');
      assert.ok(angle-previous<.001,'Camera should respond gently');
    }
    previous=angle;
  }
});
