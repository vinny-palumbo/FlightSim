# JSBSim runtime notices and source

Aeronaut uses JSBSim, copyright the JSBSim Development Team and individual contributors, distributed under the GNU Lesser General Public License version 2.1. It is supplied without warranty. See [the complete JSBSim license](LICENSE-JSBSim.txt). Aircraft and engine XML retain their upstream author and copyright notices inside `c172p.json`.

The browser SDK and WebAssembly bindings are `@0x62/jsbsim-wasm` version `1.2.4-beta.4`, distributed under the [MIT license](LICENSE-SDK.txt). Its JSBSim binary remains LGPL-licensed. Aeronaut copies the package's `jsbsim_wasm.mjs` and `jsbsim_wasm.wasm` unchanged and provides the following corresponding source:

- [JSBSim 1.2.4 source archive](source/jsbsim-1.2.4.tar.gz), commit `1a2e114d79af2430db02a4f7a4a85328cdc5d403` from https://github.com/JSBSim-Team/jsbsim.
- [WASM wrapper source archive](source/jsbsim-wasm-1.2.4-beta.4.tar.gz), tag `v1.2.4-beta.4`, commit `8b36e7f1b410f9e7f16ba5f2d47b2efe7d38f5ec` from https://github.com/0x62/jsbsim-wasm. This includes bindings, build scripts, configuration, and upstream compatibility patches.

The JSBSim definitions used are `aircraft/c172p/c172p.xml`, `engine/eng_io320.xml`, and `engine/prop_75in2f.xml`. Aeronaut embeds their unmodified contents in a JSON download. The flight adapter, automatic mixture, control assistance, and rendering are application code outside the JSBSim library.

## Rebuilding and replacing the library

With Git, Node.js, CMake, and an activated Emscripten SDK available, clone the wrapper repository, check out the tag above, and follow its README. `scripts/build-wasm.sh` initializes the pinned JSBSim submodule, applies included compatibility patches, generates bindings if needed, and builds the runtime through Emscripten/CMake. The supplied archives contain matching wrapper and engine sources for offline access; place engine contents under `vendor/jsbsim` when using extracted archives. The preparation script's Git submodule command can be skipped for already-populated archive sources; apply the included patches before running the CMake build commands shown in `scripts/build-wasm.sh`.

To run a modified library, replace the two runtime files under Aeronaut's `public/jsbsim` and serve the app. The application's predev/prebuild synchronization script normally restores the npm package copies, so adjust or skip that script when testing your replacement. Aircraft definitions can likewise be replaced in `c172p.json`. No signature or other technical restriction prevents replacement or debugging of the LGPL library.
