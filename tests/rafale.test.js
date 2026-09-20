import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3,Vector3,PerspectiveCamera,Quaternion,Euler} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareRafale} from '../src/aircraft.js';
import {updateFlightCamera} from '../src/camera.js';
const bytes=await readFile(new URL('../public/models/rafale-m.glb',import.meta.url));
const loader=new GLTFLoader();loader.register(()=>({name:'GeometryOnly',loadTexture:()=>Promise.resolve(null)}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const plane=prepareRafale(gltf),bounds=new Box3().setFromObject(plane);
test('Rafale retains attribution, faces forward, is centered, and has gear up',()=>{
 assert.equal(gltf.asset.extras.author,'bohmerang (https://sketchfab.com/bohmerang)');
 assert.ok(bounds.getCenter(new Vector3()).length()<1e-5);
 assert.ok(Math.abs(bounds.getSize(new Vector3()).z-15.27)<1e-5);
 const canopy=new Box3().setFromObject(plane.getObjectByName('Rafale-canopy_1')).getCenter(new Vector3());
 assert.ok(canopy.z<0&&canopy.y>bounds.min.y);assert.equal(plane.getObjectByName('Rafale-landingOn_6'),undefined);
 assert.equal(plane.userData.prop,undefined);
});
test('Rafale fits chase camera in normal and acrobatic attitudes on narrow and wide screens',()=>{
 for(const aspect of [390/844,1,16/9])for(const acrobatic of [false,true])for(const pitch of [-.6,0,.6])for(const roll of [-1,0,1]){
  const camera=new PerspectiveCamera(55,aspect,1,130000),attitude=new Quaternion().setFromEuler(new Euler(pitch,0,-roll,'YXZ'));
  plane.position.set(0,1000,0);plane.quaternion.copy(attitude);plane.updateMatrixWorld(true);
  updateFlightCamera(camera,plane.position,{pitch,roll,heading:0,attitude,acrobatic},0,plane.userData.cameraScale);camera.updateMatrixWorld(true);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const screen=new Vector3(x,y,z).applyMatrix4(plane.matrixWorld).project(camera);
   assert.ok(Math.abs(screen.x)<.95&&Math.abs(screen.y)<.95,`clipped ${aspect} ${acrobatic} ${pitch} ${roll}`);
  }
 }
});
