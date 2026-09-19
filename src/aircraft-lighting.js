import { BackSide, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry } from 'three';

// A soft outdoor reflection environment, generated locally without an HDR download.
export function createAircraftEnvironment(renderer) {
  const sky = new Scene();
  const dome = new Mesh(new SphereGeometry(100, 32, 16), new ShaderMaterial({
    side: BackSide,
    vertexShader: `varying vec3 direction;
      void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 direction;
      void main(){
        vec3 d=normalize(direction);
        vec3 horizon=vec3(0.7,0.82,1.0);
        vec3 sky=mix(horizon,vec3(0.22,0.43,0.8),sqrt(max(d.y,0.0)));
        vec3 ground=mix(horizon,vec3(0.10,0.14,0.16),sqrt(max(-d.y,0.0)));
        vec3 light=mix(ground,sky,step(0.0,d.y));
        float sun=pow(max(dot(d,normalize(vec3(-2.0,5.0,1.0))),0.0),160.0);
        gl_FragColor=vec4(light+vec3(5.0,4.4,3.6)*sun,1.0);
      }`
  }));
  sky.add(dome);
  const generator = new PMREMGenerator(renderer);
  const environment = generator.fromScene(sky, .04);
  generator.dispose();dome.geometry.dispose();dome.material.dispose();
  return environment;
}

export function improveAircraftMaterials(plane, renderer, environment) {
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  plane.traverse(object => {
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
      for (const value of Object.values(material)) if (value?.isTexture) {
        value.anisotropy = anisotropy;
        value.needsUpdate = true;
      }
      material.envMap = environment.texture;
      material.envMapIntensity = .85;
      material.needsUpdate = true;
    }
  });
}
