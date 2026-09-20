import {Quaternion,Vector3} from 'three';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function initialState(altitude=1100){
 return {x:0,y:altitude,sceneY:altitude,z:0,pitch:0,roll:0,heading:0,attitude:new Quaternion(),velocity:new Vector3(),speed:0,trueAirspeed:0,throttle:.65,enginePower:0,rpm:0,pitchRate:0,rollRate:0,yawRate:0,angleOfAttack:0,loadFactor:1,time:0,distance:0,crashed:false,stall:false,acrobatic:false,physicsEngine:'JSBSim'};
}
