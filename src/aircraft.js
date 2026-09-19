import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const aircraftUrl = '/models/cessna-172.gltf';

// The source's outer nodes contain Sketchfab presentation transforms. The
// original FBX RootNode is already upright, with its nose along local -Z.
export function prepareAircraft(gltf) {
  const model = gltf.scene.getObjectByName('RootNode');
  const prop = model?.getObjectByName('propelting');
  if (!model || !prop) throw new Error('The Cessna model is missing its aircraft or propeller node.');
  model.removeFromParent();
  const plane = new Group();
  plane.name = 'Cessna 172 — osmosikum';
  plane.add(model);
  const bounds = new Box3().setFromObject(model);
  const scale = 11 / bounds.getSize(new Vector3()).x;
  model.scale.multiplyScalar(scale);
  model.position.addScaledVector(bounds.getCenter(new Vector3()), -scale);
  plane.userData.prop = prop;
  // Fly using the simulator's physics; the source clip also animates the
  // entire airplane. Spin only its separate propeller during flight.
  plane.updateMatrixWorld(true);
  return plane;
}

export async function loadAircraft() {
  return prepareAircraft(await new GLTFLoader().loadAsync(aircraftUrl));
}

export function disposeAircraft(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => { texture.dispose(); texture.source?.data?.close?.(); });
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
