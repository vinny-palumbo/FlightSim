import {copyFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('public/jsbsim/',root),{recursive:true});
for(const file of ['jsbsim_wasm.mjs','jsbsim_wasm.wasm']){
 await copyFile(new URL(`node_modules/@0x62/jsbsim-wasm/dist/wasm/${file}`,root),new URL(`public/jsbsim/${file}`,root));
}
