import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareAircraft, updateAircraftView } from '../src/aircraft.js';
import { updateFlightCamera } from '../src/camera.js';

// Parse the actual shipped geometry and hierarchy. Image decoding/rendering is
// checked in the browser; Node doesn't provide a browser image decoder.
const bytes = await readFile(new URL('../assets/cessna-172-original.glb', import.meta.url));
const loader = new GLTFLoader();
loader.register(() => ({ name: 'GeometryOnly', loadTexture: () => Promise.resolve(null) }));
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const plane = prepareAircraft(gltf);
const prop = plane.userData.prop;

test('Cessna cockpit glass clears the view and restores its exterior appearance', () => {
  let glass;
  plane.traverse(object => { if (object.material?.name === 'windows') glass = object.material; });
  assert.ok(glass);
  const original = { opacity: glass.opacity, depthWrite: glass.depthWrite };
  for (let cycle = 0; cycle < 2; cycle++) {
    updateAircraftView(plane, true);
    updateAircraftView(plane, true);
    assert.equal(glass.opacity, original.opacity * .12);
    assert.equal(glass.depthWrite, false);
    updateAircraftView(plane, false);
    assert.equal(glass.opacity, original.opacity);
    assert.equal(glass.depthWrite, original.depthWrite);
  }
});

test('Cessna is centered, correctly scaled, and faces the flight direction', () => {
  const bounds = new Box3().setFromObject(plane);
  assert.ok(Math.abs(bounds.getSize(new Vector3()).x - 11) < 1e-6);
  assert.ok(bounds.getCenter(new Vector3()).length() < 1e-6);
  assert.ok(prop.getWorldPosition(new Vector3()).z < -3);
  assert.ok(plane.getObjectByName('halerorvert').getWorldPosition(new Vector3()).y > 1);
  assert.equal(gltf.asset.extras.author, 'osmosikum (https://sketchfab.com/osmosikum)');
});

test('Cessna stays in frame at flight limits throughout a propeller rotation', () => {
  const bounds = new Box3();
  for (let phase = 0; phase < 16; phase++) {
    prop.rotation.z = phase * Math.PI / 8;
    bounds.union(new Box3().setFromObject(plane));
  }
  prop.rotation.z = 0;
  for (const aspect of [390 / 844, .75, 1, 16 / 9, 2.4]) {
    const camera = new PerspectiveCamera(55, aspect, 1, 130000);
    for (const pitch of [-.65, -.3, 0, .3, .65]) for (const roll of [-1.02, -.7, 0, .7, 1.02]) for (const heading of [0, 1.5, 3.14, 5]) {
      plane.position.set(150, 730, -300);
      plane.rotation.set(pitch, -heading, -roll, 'YXZ');
      plane.updateMatrixWorld(true);
      updateFlightCamera(camera, plane.position, { pitch, roll, heading }, 0);
      camera.updateMatrixWorld(true);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const screen = new Vector3(x, y, z).applyMatrix4(plane.matrixWorld).project(camera);
        assert.ok(Math.abs(screen.x) < .95 && Math.abs(screen.y) < .95 && screen.z > -1 && screen.z < 1,
          `Cessna clipped: aspect=${aspect}, pitch=${pitch}, roll=${roll}`);
      }
    }
  }
});
