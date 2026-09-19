import { registerFlightTools } from './flight-tools';
import { updateFlightCamera } from './camera';
import { loadAircraft, disposeAircraft } from './aircraft';
import { createAircraftEnvironment, improveAircraftMaterials } from './aircraft-lighting';
import * as T from 'three';
import { createPlane } from './world';
import { initialState,step } from './physics';

export class FlightEngine{
 constructor(host,onUpdate,onError){
  this.host=host;this.onUpdate=onUpdate;this.onError=onError;this.state=initialState();this.keys=new Set();this.running=false;this.cameraMode=0;this.mode='setup';this.spawnAltitude=1100;this.aircraftStatus='loading';
  this.scene=new T.Scene();this.scene.background=new T.Color(0x88b8d5);this.scene.fog=new T.FogExp2(0x96bdcc,.000042);
  this.scene.add(new T.HemisphereLight(0xc7e7ff,0x637257,1.3));const sun=new T.DirectionalLight(0xffeed7,2.5);sun.position.set(-2000,5000,1000);this.scene.add(sun);
  this.plane=createPlane();this.scene.add(this.plane);

  this.camera=new T.PerspectiveCamera(55,1,1,130000);this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.75),2));this.renderer.setClearColor(0,0);this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;host.appendChild(this.renderer.domElement);this.aircraftEnvironment=createAircraftEnvironment(this.renderer);
  this.resize=()=>{const w=host.clientWidth,h=host.clientHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);};this.resize();this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
  this.keydown=e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();this.keys.add(e.code);if(e.repeat)return;if(e.code==='Space')this.toggle();if(e.code==='KeyC')this.cycleCamera();if(e.code==='KeyR')this.reset();};
  this.keyup=e=>this.keys.delete(e.code);this.blur=()=>{this.keys.clear();this.running=false;this.emit();};window.addEventListener('keydown',this.keydown);window.addEventListener('keyup',this.keyup);window.addEventListener('blur',this.blur);this.last=performance.now();this.frame(this.last);this.loadCessna();this.unregisterFlightTools=registerFlightTools(this);
 }
 async loadCessna(){
  try {
   const plane=await loadAircraft();
   if(this.disposed){disposeAircraft(plane);return;}
   improveAircraftMaterials(plane,this.renderer,this.aircraftEnvironment);
   const previous=this.plane;
   plane.position.copy(previous.position);plane.quaternion.copy(previous.quaternion);plane.visible=previous.visible;
   this.scene.add(plane);this.scene.remove(previous);this.plane=plane;disposeAircraft(previous);
   this.aircraftStatus='cessna';this.emit();
  } catch {
   if(this.disposed)return;
   this.aircraftStatus='fallback';this.onError('The Cessna could not load. The original aircraft is available; reload to try again.');this.emit();
  }
 }
 emit(){this.onUpdate({...this.state,aircraftStatus:this.aircraftStatus,running:this.running,cameraMode:this.cameraMode,mode:this.mode});}
 toggle(){if(!this.google)return;if(this.state.crashed)this.reset();this.running=!this.running;this.emit();}
 cycleCamera(){this.cameraMode=(this.cameraMode+1)%3;this.emit();}
 reset(){this.state=initialState(this.spawnAltitude);this.running=false;this.keys.clear();this.emit();}
 input(){const k=this.keys;return {pitch:Number(k.has('ArrowDown'))-Number(k.has('ArrowUp')),roll:Number(k.has('ArrowRight'))-Number(k.has('ArrowLeft')),yaw:Number(k.has('KeyD'))-Number(k.has('KeyA')),throttle:Number(k.has('KeyW'))-Number(k.has('KeyS'))};}
 frame=(now)=>{
  if(this.disposed)return;this.raf=requestAnimationFrame(this.frame);const dt=Math.min((now-this.last)/1000,.05);this.last=now;const s=this.state;
  if(this.running&&this.google){step(s,this.input(),dt,()=>-10000);if(s.crashed)this.running=false;}
  this.plane.position.set(s.x,s.y,s.z);this.plane.rotation.set(s.pitch,-s.heading,-s.roll,'YXZ');this.plane.userData.prop.rotation.z+=this.running?dt*(30+s.throttle*50):0;

  updateFlightCamera(this.camera,this.plane.position,s,this.cameraMode);this.plane.visible=!!this.google&&this.cameraMode!==1;
  if(this.google)this.syncGoogle();this.renderer.render(this.scene,this.camera);
  if(now-(this.lastEmit||0)>90){this.emit();this.lastEmit=now;}
 }
 async connectGoogle(key,location){
  this.running=false;this.emit();const C=await import('cesium');await import('cesium/Build/Cesium/Widgets/widgets.css');if(this.disposed)return;
  const tiles=await C.createGooglePhotorealistic3DTileset({key,onlyUsingWithGoogleGeocoder:true},{
   showCreditsOnScreen:true,
   // Request finer city geometry instead of waiting for a stationary camera.
   maximumScreenSpaceError:6,
   cullRequestsWhileMoving:false,
   foveatedTimeDelay:0,
   foveatedConeSize:.35,
   // Keep distant-horizon savings, but reduce how much detail is sacrificed.
   dynamicScreenSpaceError:true,
   dynamicScreenSpaceErrorFactor:8,
   enableCollision:false
  });
  if(this.disposed){tiles.destroy();return;}
  this.disconnectGoogle();const container=document.createElement('div');container.className='google-scene';this.host.prepend(container);
  try{
   const viewer=new C.Viewer(container,{globe:false,baseLayer:false,geocoder:false,animation:false,timeline:false,baseLayerPicker:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,skyBox:false,requestRenderMode:false});
   viewer.scene.primitives.add(tiles);viewer.scene.screenSpaceCameraController.enableInputs=false;viewer.scene.backgroundColor=C.Color.fromCssColorString('#88b8d5');
   tiles.tileFailed.addEventListener(()=>{if(!this.tileError){this.tileError=true;this.running=false;this.onError('Some Google tiles could not load. Check API restrictions, billing, quota, and network access.');}});
   this.google={C,viewer,container,transform:C.Transforms.eastNorthUpToFixedFrame(C.Cartesian3.fromDegrees(location.lon,location.lat,0))};
   this.mode='google';this.spawnAltitude=location.altitude??1100;this.scene.background=null;this.scene.fog=null;this.reset();
  }catch(error){container.remove();if(!tiles.isDestroyed())tiles.destroy();throw error;}
 }
 syncGoogle(){const {C,viewer,transform}=this.google;const point=v=>new C.Cartesian3(v.x,-v.z,v.y);const direction=new T.Vector3();this.camera.getWorldDirection(direction);const up=new T.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);
  viewer.camera.setView({destination:C.Matrix4.multiplyByPoint(transform,point(this.camera.position),new C.Cartesian3()),orientation:{direction:C.Matrix4.multiplyByPointAsVector(transform,point(direction),new C.Cartesian3()),up:C.Matrix4.multiplyByPointAsVector(transform,point(up),new C.Cartesian3())}});
  viewer.camera.frustum.fov=this.camera.aspect>1?2*Math.atan(Math.tan(T.MathUtils.degToRad(55)/2)*this.camera.aspect):T.MathUtils.degToRad(55);
 }
 disconnectGoogle(){if(this.google){this.google.viewer.destroy();this.google.container.remove();this.google=null;}this.tileError=false;this.mode='setup';this.scene.background=new T.Color(0x88b8d5);this.scene.fog=new T.FogExp2(0x96bdcc,.000042);}
 destroy(){this.disposed=true;this.unregisterFlightTools?.();cancelAnimationFrame(this.raf);this.observer.disconnect();window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);this.disconnectGoogle();disposeAircraft(this.scene);this.aircraftEnvironment.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
