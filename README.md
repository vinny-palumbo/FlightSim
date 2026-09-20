# Aeronaut

A browser flight simulator using JSBSim flight dynamics and Google Photorealistic 3D Tiles through CesiumJS.

## Run

Requires Node.js 22.12+. Run `npm install`, then `npm run dev`. Open http://localhost:5173. `npm run build` produces a static site in `dist`; `npm run preview` serves it locally. The predev/prebuild scripts copy the pinned JSBSim runtime into public assets. No physics server is required.

## Fly

Choose scenery and connect with a browser-restricted Google Maps API key. Enable Map Tiles API and billing, and allow your development/production HTTP referrers. The key stays in memory and is sent to Google through Cesium tile requests; it is not persisted or sent to an application backend. Google usage charges and quota apply. See https://developers.google.com/maps/documentation/tile/get-api-key.

Flight starts airborne and paused, trimmed for 95 knots calibrated airspeed. Space starts/pauses. Arrow keys control pitch and bank (Down pulls up); A/D operate the rudder left/right; W/S increase/decrease throttle. F toggles Acrobatic mode, C cycles camera views, and R resets at the selected departure. Touch controls appear on narrow screens. Switching windows pauses flight. Altitude is feet MSL; airspeed is calibrated knots.

The scenery chooser opens on startup. Practice islands are removed. Destinations include San Francisco, New York, Rio, Montreal, Amalfi Coast, Formia, Tokyo, Los Angeles, Toronto, Vancouver, Austin, Miami, Colorado (Denver), and Grand Canyon.

## Flight dynamics

The app runs the actual JSBSim 1.2.4 C++ engine compiled to WebAssembly, through the pinned `@0x62/jsbsim-wasm@1.2.4-beta.4` SDK. It loads upstream Cessna 172P aircraft, IO-320 engine, and propeller definitions. JSBSim calculates forces, moments, atmosphere, propulsion, fuel consumption, and six-degree-of-freedom motion at a fixed 120 Hz. There is no custom-physics fallback.

Normal mode applies pitch/bank assistance through control surface commands. Acrobatic mode gives direct control of the same surfaces and uses the same aircraft model, forces, and engine. Switching modes preserves the simulation state. Acrobatic mode does not turn the Cessna into an aerobatic aircraft. Aggressive maneuvers can stall it; inverted-flight accuracy depends on the underlying model. Automatic mixture adjustment accommodates high-elevation departures. Rendering uses JSBSim's Earth-fixed position and attitude; the propeller animation follows simulated RPM.

The aircraft definition is an approximation, not a validated training simulator. There is no structural-damage simulation or user-controlled wind. Google terrain/building contacts are not supplied to JSBSim: the simulator stops at the default sea-level surface, and passing through elevated scenery remains possible. Takeoff/landing is not a supported gameplay feature.

`npm test` runs the shipped WASM engine to check trimmed cruise at four departure regions/elevations, control directions, throttle response, continuity between modes, reset, frame-rate consistency, initialization failures, and acrobatic camera framing. Existing aircraft and camera tests also run. Google imagery access requires a live key and is separate from these physics tests.

See [runtime notices and source](public/jsbsim/NOTICE.md) for versions, licenses, corresponding source archives, and rebuilding instructions.

## Rendering and assets

The default aircraft is “Plane” by osmosikum, with its original 2K textures and geometry. See `public/models/LICENSE.md` and the in-app credit for CC BY 4.0 attribution. The model is normalized to an 11-meter wingspan. Its presentation animation is excluded. Blue paint becomes white and white paint becomes golden orange-yellow at runtime. A procedural plane remains available during asset loading or on failure.

The aircraft uses an outdoor reflection environment, anisotropic texture filtering, and 1.75–2x rendering resolution. Google tiles target screen-space error 6, keep requests active while moving, and remove the foveated pause delay. The default in-memory tile cache is retained. Detail and streaming speed depend on Google's source coverage, network, and device. Attribution remains visible; the app does not extract tile geometry, store tiles offline, or generate navigation data.

## Structure

- `src/jsbsim-flight.js`: WASM lifecycle, aircraft initialization, control assistance, state mapping.
- `src/flight-state.js`: initial state and shared utility.
- `src/engine.js`: Three.js renderer, input, camera, and Cesium integration.
- `src/camera.js`: normal and aircraft-relative acrobatic cameras.
- `src/aircraft.js`: GLB loading, paint and propeller setup.
- `src/main.jsx`: React instruments, dialogs and scenery setup.
- `public/jsbsim/`: runtime, aircraft definitions, licenses, and corresponding source.
