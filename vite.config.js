import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
export default defineConfig({optimizeDeps:{exclude:['@0x62/jsbsim-wasm']},define:{CESIUM_BASE_URL:JSON.stringify('/cesium/')},plugins:[viteStaticCopy({targets:['Workers','ThirdParty','Assets','Widgets'].map(name=>({src:`node_modules/cesium/Build/Cesium/${name}`,dest:'cesium'}))})],server:{port:5173,strictPort:true},build:{chunkSizeWarningLimit:6000}});
