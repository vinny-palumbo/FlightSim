# Aeronaut

A browser flight simulator with a generated island practice course and optional Google Photorealistic 3D Tiles scenery.

## Run

Requires Node.js 22.12+.

```sh
npm install
npm run dev
```

Open http://localhost:5173. For a production build, run `npm run build`; serve `dist` with `npm run preview` or a static web server. Do not open index.html directly from the filesystem.

## Fly

Press **Space** to start flight. Arrow keys control pitch and bank (Down pulls up); A/D operate the rudder left/right. W increases throttle; S decreases it. The throttle slider also works. Space pauses, C cycles chase/pilot/orbit views, R resets. Touch controls appear on narrow screens. Switching windows pauses the flight.

The practice course has three rings, visited in order. Altitude is feet above the practice sea level; airspeed is knots. Flight starts airborne. Simplified acceleration, pitch/speed coupling, coordinated turns, stall sink and practice-ground collision are implemented. This is an arcade exploration simulator, not a training-grade aerodynamic model. There is no takeoff/landing or multiplayer system.

## Google scenery

Open **Scenery**, choose a departure area, and enter a browser-restricted Google Maps API key. Enable **Map Tiles API** and billing in the Google Cloud project. Allow the exact development/production HTTP referrers being used. The app holds the key in memory only and sends it to Google through Cesium tile requests; it does not persist it or send it to an application backend. Google usage charges and quota apply.

https://developers.google.com/maps/documentation/tile/get-api-key

Google mode streams scenery through CesiumJS. Aircraft rendering and flight physics are independent of Google's mesh. Attribution remains visible. No tile-derived collision meshes, height extraction, offline tile storage or navigation data are generated. Terrain/building collision is disabled in Google mode. There is no place search or third-party geocoder; departure coordinates are fixed presets.

Google mode requires live credentials to validate imagery access. With no key provided, practice flight is fully usable and Google access cannot be end-to-end verified.

## Structure

- `src/physics.js`: deterministic simulation, checkpoint rules.
- `src/world.js`: original procedural island geometry and aircraft.
- `src/engine.js`: Three.js renderer, controls, camera, Cesium integration.
- `src/main.jsx`: React instruments, dialogs and scenery setup.
- `public/cloud.png`: generated cloud sprite.
- `design-concept.png`: generated screen concept.

`npm test` checks cruise, turning, pitch/speed coupling, stall, terrain contact and checkpoint ordering.

## Art direction

Navy translucent panels, orange primary control, pale blue atmosphere, teal water, white/orange aircraft. Space Grotesk for display values and DM Sans for controls (system sans-serif fallback). The concept is a visual guide; the functional 3D world is independently generated geometry, not a flat background. The actual HUD adds pause guidance and a throttle slider, with responsive controls. Art generation used the configured imagegen CLI, GPT Image 2.5 Sunburst, medium quality.

Concept prompt: Full primary screen UI concept for AERONAUT browser flight simulator. Wide screen, low polygon coastal islands, teal ocean, green mountain islands, soft blue atmospheric sky. White and orange small propeller plane seen from behind lower center. Premium minimal dark navy translucent HUD: top left AERONAUT and Flight simulator. Top right Scenery and Controls buttons. Upper center compass. Bottom left AIRSPEED 112 kt ALTITUDE 2400 ft THROTTLE 65%. Bottom center orange Start flight button, Camera and Reset buttons. Bottom right FLIGHT PLAN with three checkpoint rows. Small footer Practice islands / Generated terrain. Generous sky, crisp legible sans serif typography. Complete playable game screen, practical realtime WebGL and native HTML HUD. No marketing.

Cloud prompt: Production game texture: one soft white cumulus cloud with subtly blue gray underside, realistic volume, isolated centered against truly transparent background, diffuse sunny light from upper left, wispy semi transparent edges, cloud occupies central 80 percent of wide image. No text no ground no sky. For billboard sprites in a 3D flight simulator.

## Cessna aircraft

The default aircraft is “Plane” by osmosikum, supplied as a GLB with 2K textures. See `public/models/LICENSE.md` and the in-app aircraft credit for source and CC BY 4.0 attribution. `src/aircraft.js` loads and normalizes it to an 11-meter wingspan with its nose along local -Z. Its propeller spins with the throttle; the source presentation animation is excluded so it cannot override flight physics. The procedural aircraft remains available during loading or if the GLB fails to load. Camera behavior is unchanged.

Aircraft rendering uses an outdoor reflection environment, up to 16x anisotropic texture filtering, and 1.75–2x rendering resolution. Original texture files and aircraft geometry remain intact. The higher rendering resolution increases GPU work.

Google tiles target a screen-space error of 6 (previously 12), keep requests active while moving, and remove the foveated pause delay. Horizon detail relaxation is reduced to 8. The Google helper’s default in-memory cache is retained. This improves the requested detail during flight but can increase network and GPU work; actual streaming speed depends on the connection and device.

## Scenery-first startup

The app opens Choose your scenery automatically and requires a Google connection before flight. Practice islands and their checkpoint UI are removed. All original destinations remain, plus Formia, Tokyo, Los Angeles, Toronto, Vancouver, Austin, Miami, Colorado (Denver), and Grand Canyon. Denver starts at 2,800 meters MSL and Grand Canyon at 3,000 meters MSL; resetting preserves the selected departure altitude.

## Flight dynamics

Both modes use one SI-unit light-aircraft model: mass 1,100 kg, wing area 16.2 square meters, shared lift/stall curve, finite thrust and propulsive power, atmospheric density, gravity, drag, and sideslip resistance. Coefficients and moments are illustrative, not calibrated Cessna performance data.

Normal mode assists attitude control; Acrobatic mode accepts unrestricted rate commands. Both use aerodynamic moments and rigid-body angular dynamics, with control authority vanishing at zero airflow. Switching modes preserves attitude and both linear and angular momentum. There is no extra acrobatic thrust, widened stall envelope, instant leveling, or artificial lift cap. Lift is perpendicular to airflow; drag dissipates energy. Positive rotational work is charged to the airstream. Midpoint force integration and small substeps reduce numerical energy drift.

Stall detection uses angle of attack rather than a universal speed cutoff. Tests cover high-speed stalls, power-off energy loss in both modes, finite engine power, force directions, zero-flow controls, smooth inverted recovery, maneuver energy tradeoffs, frame-rate consistency, and camera framing.

Reference principles: [NASA lift and drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/what-is-lift/) and [FAA stalls and load factor](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/airplane_handbook/06_afh_ch5.pdf).

Limits: this remains a simplified aerodynamic simulation, not a validated Cessna flight model. Wind, detailed propeller flow, structural failure, fuel burn and landing physics are not modeled. Google scenery collision detection remains disabled; passing through terrain/buildings is still possible. The synthetic-ground collision unit test verifies the integration callback only, not Google mesh collision detection.