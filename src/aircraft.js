import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const aircraftUrl = '/models/cessna-172.gltf';

// Repaint exterior materials before lighting, retaining the original texture
// detail, normal maps, and dark trim. Cabin and glass use separate materials.
function applyLivery(model) {
  const materials = new Set();
  model.traverse(object => {
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
      if (['Main', 'Altbody', 'xtra'].includes(material.name)) materials.add(material);
    }
  });
  for (const material of materials) {
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        vec3 paint = diffuseColor.rgb;
        float blueMask = smoothstep(0.025, 0.10, paint.b - max(paint.r, paint.g));
        float neutralMask = 1.0 - smoothstep(0.035, 0.12, max(paint.r, max(paint.g, paint.b)) - min(paint.r, min(paint.g, paint.b)));
        float whiteMask = neutralMask * smoothstep(0.20, 0.42, min(paint.r, min(paint.g, paint.b)));
        vec3 whitePaint = vec3(clamp(0.63 + paint.b * 0.65, 0.0, 0.94));
        vec3 goldenPaint = vec3(1.0, 0.40, 0.012) * clamp(paint.r / 0.60, 0.0, 1.0);
        diffuseColor.rgb = mix(mix(paint, goldenPaint, whiteMask), whitePaint, blueMask);
      `);
    };
    material.customProgramCacheKey = () => 'aeronaut-white-gold-v1';
    material.needsUpdate = true;
  }
}

// The source's outer nodes contain Sketchfab presentation transforms. The
// original FBX RootNode is already upright, with its nose along local -Z.
export function prepareAircraft(gltf) {
  const model = gltf.scene.getObjectByName('RootNode');
  const prop = model?.getObjectByName('propelting');
  if (!model || !prop) throw new Error('The Cessna model is missing its aircraft or propeller node.');
  model.removeFromParent();
  applyLivery(model);
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

export function prepareRafale(gltf){
  const model=gltf.scene;
  // Source nose is +X and up is +Y. Flight rendering uses nose -Z.
  model.rotation.y=Math.PI/2;
  for(const name of ['Rafale-landingOn_6','Rafale-landingOnLight_7'])model.getObjectByName(name)?.removeFromParent();
  const bounds=new Box3().setFromObject(model),scale=15.27/bounds.getSize(new Vector3()).z;
  model.scale.multiplyScalar(scale);model.position.addScaledVector(bounds.getCenter(new Vector3()),-scale);
  const plane=new Group();plane.name='Rafale M — bohmerang';plane.add(model);plane.userData.cameraScale=1.3;
  plane.updateMatrixWorld(true);return plane;
}

export async function loadAircraft(aircraft='cessna') {
  const gltf=await new GLTFLoader().loadAsync(aircraft==='rafale'?'/models/rafale-m.glb':aircraftUrl);
  return aircraft==='rafale'?prepareRafale(gltf):prepareAircraft(gltf);
}

export function disposeAircraft(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
      materials.add(material);
      // The environment is shared between aircraft and owned by the renderer.
      for (const [key,value] of Object.entries(material)) if (key!=='envMap'&&value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => { texture.dispose(); texture.source?.data?.close?.(); });
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
