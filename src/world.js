import * as T from 'three';
const islands=[[-3300,-1600,2200,1250,660],[2800,-2300,2400,2000,1150],[-4500,-7200,2300,2300,950],[4500,-8500,3000,2500,1350],[1200,-14500,3400,2300,1500],[-2200,3500,1900,1700,600]];
export function terrainHeight(x,z){let h=-40;for(const [cx,cz,rx,rz,peak] of islands){const d=Math.hypot((x-cx)/rx,(z-cz)/rz);if(d<1){const ridge=.78+.15*Math.sin(x*.004)+.12*Math.cos(z*.005)+.06*Math.sin((x+z)*.013);h=Math.max(h,Math.pow(1-d,1.5)*peak*ridge-12);}}return h;}
export function createWorld(){
 const group=new T.Group();
 const sky=new T.Mesh(new T.SphereGeometry(110000,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vDirection; void main(){float h=normalize(vDirection).y; vec3 low=vec3(.66,.80,.86); vec3 high=vec3(.14,.38,.66); gl_FragColor=vec4(mix(low,high,pow(max(h,0.),.6)),1.);}'}));group.add(sky);
 const oceanMaterial=new T.MeshPhongMaterial({color:0x155a78,shininess:90,specular:0x79b9ca});
 oceanMaterial.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vOcean;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOcean=position;');shader.fragmentShader='varying vec3 vOcean;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat ripple=sin(vOcean.x*.053+sin(vOcean.y*.03)*2.)*sin(vOcean.y*.18+vOcean.x*.018); diffuseColor.rgb *= .96 + .09*ripple;');};
 const ocean=new T.Mesh(new T.PlaneGeometry(120000,120000),oceanMaterial);ocean.rotation.x=-Math.PI/2;group.add(ocean);
 const geo=new T.PlaneGeometry(28000,32000,210,240);geo.rotateX(-Math.PI/2);geo.translate(0,0,-6500);const pos=geo.attributes.position;const colors=[];
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=terrainHeight(x,z);pos.setY(i,h);let c=new T.Color(h<5?0xd4c79d:h<60?0x729a70:h<420?0x53785d:0x6c7c77);c.multiplyScalar(.94+.08*Math.sin(x*.023+z*.018));colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();group.add(new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1})));
 const texture=new T.TextureLoader().load('/cloud.png');texture.colorSpace=T.SRGBColorSpace;
 for(let i=0;i<32;i++){const cloud=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,opacity:.65,depthWrite:false,fog:true}));cloud.position.set(Math.sin(i*83)*18000,2300+(i%5)*350,-10000+Math.cos(i*17)*17000);cloud.scale.set(2100+(i%4)*500,1100,1);group.add(cloud);}
 return group;
}
export function createPlane(){
 const plane=new T.Group();const white=new T.MeshStandardMaterial({color:0xf1f3ed,metalness:.18,roughness:.38});const orange=new T.MeshStandardMaterial({color:0xff792c,roughness:.4});const glass=new T.MeshStandardMaterial({color:0x234b62,metalness:.45,roughness:.2});const dark=new T.MeshStandardMaterial({color:0x26343a});
 function box(w,h,d,x,y,z,mat=white){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);plane.add(m);return m;}
 const fuselage=new T.Mesh(new T.SphereGeometry(1,24,16),white);fuselage.scale.set(.8,.82,4.4);plane.add(fuselage);
 const cabin=new T.Mesh(new T.SphereGeometry(1,20,12),glass);cabin.scale.set(.73,.62,1.45);cabin.position.set(0,.55,-.7);plane.add(cabin);
 box(12.6,.15,1.8,0,1,-.2);box(.75,.16,1.8,-6.25,1,-.2,orange);box(.75,.16,1.8,6.25,1,-.2,orange);
 box(4.3,.12,1,0,.45,3.3);box(.45,.13,1,-2.1,.45,3.3,orange);box(.45,.13,1,2.1,.45,3.3,orange);box(.12,1.65,1.3,0,1.03,3.25,orange);
 box(.035,.7,1.9,-.77,0,1.4,orange);box(.035,.7,1.9,.77,0,1.4,orange);
 for(const side of [-1,1]){const strut=box(.065,2.6,.065,side*2,-.1,0,dark);strut.rotation.z=side*-.88;box(.16,1,.16,side*.9,-1,1.4,dark);const wheel=new T.Mesh(new T.CylinderGeometry(.33,.33,.22,16),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*.9,-1.55,1.4);plane.add(wheel);}
 const nose=new T.Mesh(new T.SphereGeometry(.65,16,12),orange);nose.scale.set(1,1,1.5);nose.position.z=-3.65;plane.add(nose);
 const prop=box(.12,3,.08,0,0,-4.6,dark);plane.userData.prop=prop;return plane;
}
