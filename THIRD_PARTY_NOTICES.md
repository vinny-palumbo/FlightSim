# Third-party components and assets

Third-party material retains its own license, independently of any license for
Aeronaut's original application code. Do not apply an application-code license
to the entire repository without these exceptions.

| Component | Location | License and notices |
| --- | --- | --- |
| Plane / Cessna model by osmosikum, including original and extracted textures and geometry | `assets/cessna-172-original.glb`, `public/models/cessna-*` | CC BY 4.0; [attribution and modifications](public/models/LICENSE.md) |
| Rafale M model by bohmerang and its visual adaptations | `public/models/rafale-m.glb` | CC BY-NC-SA 4.0; [attribution and modifications](public/models/LICENSE.md). Noncommercial use; adaptations retain the same license. |
| JSBSim engine and rebuilt WebAssembly runtime | `public/jsbsim/jsbsim_wasm.*`, `public/jsbsim/source/` | [LGPL 2.1](public/jsbsim/LICENSE-JSBSim.txt); [source, versions, and rebuild instructions](public/jsbsim/NOTICE.md) |
| JSBSim browser SDK and wrapper | `@0x62/jsbsim-wasm`, corresponding wrapper source under `public/jsbsim/source/` | [MIT](public/jsbsim/LICENSE-SDK.txt); the engine retains its LGPL license |
| Cessna aircraft, engine, and propeller definitions | `public/jsbsim/c172p.json` | Upstream notices are embedded in the XML; see [runtime notices](public/jsbsim/NOTICE.md) |
| F-16 aircraft and engine definitions | `public/jsbsim/f16.json` | [GPL](public/jsbsim/LICENSE-F16.txt); editable source and notices are included |

The source archives and generated bindings under `public/jsbsim/source/` are
intentional distribution files. Keep them and their license notices available
when distributing the corresponding runtime. See [BUILD.md](public/jsbsim/source/BUILD.md).

React, Three.js, CesiumJS, Vite, and other npm dependencies retain their upstream
licenses. `package-lock.json` records the installed dependency versions and
available license metadata; their packages contain the applicable license texts.

Google Photorealistic 3D Tiles are streamed from Google and are not included in
this repository or covered by an application-code license. The app requires
the user's own API key and preserves Google's on-screen attribution.
