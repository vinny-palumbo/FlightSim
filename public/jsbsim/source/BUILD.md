# Rebuild Aeronaut's JSBSim WebAssembly runtime

Build tools: Emscripten 3.1.69, CMake (tested 4.4.3), Ninja, Node.js. Use an activated Emscripten environment. The SDK JS wrapper remains @0x62/jsbsim-wasm 1.2.4-beta.4.

1. Extract `jsbsim-wasm-1.2.4-beta.4.tar.gz` into a wrapper directory.
2. Extract `jsbsim-1.2.4.tar.gz` into its `vendor/jsbsim` directory.
3. Apply `patches/jsbsim-emscripten-compat.patch` to that engine source (`git apply` accepts a patch outside a Git worktree).
4. Copy the adjacent `FGFDMExecBindings.cpp` to `generated/FGFDMExecBindings.cpp` inside the wrapper. This supplied generated file is the exact one compiled for Aeronaut; no AST generation step is required.
5. From the wrapper, run (use an absolute path in JSBSIM_SOURCE_DIR):

```sh
emcmake cmake -S cmake -B build/wasm -G Ninja -DJSBSIM_SOURCE_DIR=/absolute/path/to/wrapper/vendor/jsbsim -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS=-fexceptions -DCMAKE_POLICY_VERSION_MINIMUM=3.5
cmake --build build/wasm --target jsbsim_wasm --parallel 2
```

`CMAKE_CXX_FLAGS=-fexceptions` is essential: the F-16 XML uses property-valued expressions whose parsing relies on caught C++ exceptions. Enabling exceptions only on the final executable leaves those library paths broken.

Copy `build/wasm/jsbsim_wasm.mjs` and `build/wasm/jsbsim_wasm.wasm` into the app's `public/jsbsim/`, then run `npm test` and `npm run build`. The prebuild script preserves these files. The Emscripten compatibility patch is the only change to the engine source; all aircraft and engine XML remains unmodified.
