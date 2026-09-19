# Verification

Verified September 19, 2026.

- Production build: passed (`npm run build`).
- Physics tests: 6 passed (cruise, coordinated turns, pitch/speed tradeoff, throttle/stall, terrain contact, sequential checkpoints).
- Browser: Codex in-app Browser; no standalone Playwright fallback used.
- Desktop: native 1280 × 720 viewport. Mobile: 390 × 844, then viewport restored. Mobile canvas and document widths both 390 pixels; no horizontal overflow.
- Browser interaction path: start, advancing speed/time/course distance, pause, resume keyboard shortcut, camera button and C shortcut, reset, controls dialog, scenery dialog, departure selection, missing-key disabled state, invalid-key connection error and return to usable practice flight.
- Final reloaded practice scene: no browser warning/error logs.
- Live Google imagery: not verified; a valid user Google Maps API key and enabled billing are required. Invalid-key rejection was verified. No claim of a successfully rendered Google city is made.

## Visual comparison

The generated `design-concept.png` and final in-app browser screenshot `preview.png` were both inspected using `view_image`.

Comparison points: (1) brand placement and letter spacing, (2) upper-right scenery/controls actions, (3) centered compass and orange heading pointer, (4) bottom-left speed/altitude/throttle hierarchy, (5) orange central flight action and adjacent camera/reset controls, (6) bottom-right three-row flight plan, (7) white/orange aircraft and coastal palette.

Fixed during review: small chase-camera aircraft, overly flat water/sky, narrow-screen aircraft framing, and missing accessible names on collapsed mobile navigation buttons.

Copy comparison: brand, Flight simulator, Scenery, Controls, AIRSPEED, ALTITUDE, THROTTLE, Start flight, Reset, FLIGHT PLAN and checkpoint names are preserved. Intentional changes: Camera becomes the active camera name; real instrument values replace concept numbers; actionable start/pause/stall guidance is added; footer reports actual elapsed time and camera mode.

The interface was checked for fidelity to the concept. It is not a pixel-identical reproduction: the independent playable low-poly terrain and aircraft are simpler than the concept illustration; mobile stacks the instruments/actions and hides the course list; the throttle is an interactive slider; checkpoints are visible rings. No unresolved UI overlap or broken tested control remains. Photorealistic Google scenery remains credential-gated.
