# JSBSim runtime notices and source

Aeronaut uses JSBSim, copyright the JSBSim Development Team and individual contributors, distributed under the GNU Lesser General Public License version 2.1. It is supplied without warranty. See [the complete JSBSim license](LICENSE-JSBSim.txt). Aircraft and engine XML retain their upstream author and copyright notices inside `c172p.json`.

The browser SDK and WebAssembly bindings are `@0x62/jsbsim-wasm` version `1.2.4-beta.4`, distributed under the [MIT license](LICENSE-SDK.txt). Its JSBSim binary remains LGPL-licensed. Aeronaut rebuilds `jsbsim_wasm.mjs` and `jsbsim_wasm.wasm` from the corresponding source with Emscripten 3.1.69 and `-fexceptions` applied to all C++ compilation units. This fixes exception handling required by the F-16 flight-control configuration and provides the following corresponding source:

- [JSBSim 1.2.4 source archive](source/jsbsim-1.2.4.tar.gz), commit `1a2e114d79af2430db02a4f7a4a85328cdc5d403` from https://github.com/JSBSim-Team/jsbsim.
- [WASM wrapper source archive](source/jsbsim-wasm-1.2.4-beta.4.tar.gz), tag `v1.2.4-beta.4`, commit `6c09d246ac31a6aa6643608c611a5cdb24231d44` from https://github.com/0x62/jsbsim-wasm. This includes bindings, build scripts, configuration, and upstream compatibility patches.

The JSBSim definitions used are `aircraft/c172p/c172p.xml`, `engine/eng_io320.xml`, and `engine/prop_75in2f.xml`. Aeronaut embeds their unmodified contents in a JSON download. The flight adapter, automatic mixture, control assistance, and rendering are application code outside the JSBSim library.

## Rebuilding and replacing the library

The engine archive contains commit `1a2e114d79af2430db02a4f7a4a85328cdc5d403` (its startup banner identifies itself as 1.2.5.dev1). Use the wrapper source archive above and the [exact generated bindings used by this build](source/FGFDMExecBindings.cpp). See [BUILD.md](source/BUILD.md) for complete build commands. No aerodynamic coefficients or JSBSim engine source were changed, apart from the wrapper's included Emscripten compatibility patch. Exception handling is enabled throughout the compiled library, rather than only in its binding entrypoint.

To use a modified runtime, replace both files under `public/jsbsim`. Predev/prebuild validates these vendored files without overwriting them. No signature or technical restriction prevents replacing or debugging the LGPL library.

## F-16 aircraft definition

The F-16A model is by Erik Hofman and contributors and declares the GNU General Public License. See [GPL text](LICENSE-F16.txt). `f16.json` contains the unmodified upstream `aircraft/f16/f16.xml`, its `Systems/pushback.xml` and `Systems/hook.xml`, `engine/F100-PW-229.xml`, and `engine/direct.xml`. Their complete editable XML source and original notices are included in that JSON and in the JSBSim source archive. Flight starts airborne at 350 knots calibrated airspeed with gear retracted. The model's original fly-by-wire logic and throttle/afterburner mapping are retained. The visible Rafale mesh does not imply Rafale aerodynamic accuracy.

## Runtime checksums (SHA-256)

- `jsbsim_wasm.mjs`: `f57e32a993a8e88e074aaa45a6da6942f368a17e9a99a3d83b166db0ae2e5db7`
- `jsbsim_wasm.wasm`: `906d5300a49cfe7bb91d2056d9b3c7a7324c0f14d625b91fd8259cb51593a81f`
