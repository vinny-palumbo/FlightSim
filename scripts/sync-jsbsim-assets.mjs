import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
// Vendored runtime is rebuilt with exceptions enabled throughout JSBSim.
// Do not replace it with npm's binary: that build cannot load the F-16 FCS.
for(const file of ['jsbsim_wasm.mjs','jsbsim_wasm.wasm']){
 const contents=await readFile(new URL(`public/jsbsim/${file}`,root));
 if(contents.length<1000)throw Error(`Missing JSBSim runtime: ${file}`);
}
