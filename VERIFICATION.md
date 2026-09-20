# Verification

Last checked locally: September 20, 2026, on Windows with Node.js 22.22.2.

## Automated checks

- Fresh locked installation succeeded. This machine required command-scoped
  `NODE_OPTIONS=--use-system-ca` and `npm ci --os=win32 --cpu=x64` because its
  npm configuration selected Linux binaries and its registry connection needed
  the system certificate store. Global settings were not changed.
- `npm test`: all 22 tests passed.
- `npm run build`: production build passed, including vendored runtime validation.
- The suite executes the shipped JSBSim WASM binary, not a physics mock alone.
- Cessna and F-16 cruise, control direction, throttle response, reset, and flight
  model selection are covered. Cessna tests also cover frame-rate consistency,
  continuity between Normal and Acrobatic modes, and initialization failures.
- Model switching tests cover loading failures and disposal during loading.
- Aircraft/camera tests cover model orientation, size, and camera framing,
  including narrow and wide views for the Rafale.

The GitHub Actions workflow performs a locked dependency install, tests, and a
production build on Node 22 under Ubuntu. Its first hosted run is pending upload
to GitHub; local success does not claim that the hosted workflow has already run.

## Browser and scenery coverage

No new browser interaction or visual review was performed for this repository
preparation. Live Google imagery has not been verified with a valid API key.
It requires Map Tiles API access, billing, and suitable referrer restrictions.

An earlier September 19 browser review covered a practice-island version.
That version's offline scenery, checkpoints, and fallback flight are no longer
the current experience. `preview.png` and `design-concept.png` are historical
visual references, not verification of the current interface.

Before a public playable release, check the current app with live scenery:

- Connect a destination, start, pause, resume, reset, and switch camera views.
- Switch Cessna Arcade/Realistic physics and select the Rafale/F-16 option.
- Check Acrobatic mode, keyboard controls, touch controls, and pause on blur.
- Check a narrow viewport and visible Google/aircraft attribution.
- Check rejected credentials and scenery download errors.

Flights start airborne. Terrain/building collisions and takeoff/landing gameplay
are not supported; passing through scenery is a documented limitation.
