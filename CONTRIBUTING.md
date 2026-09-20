# Contributing

Use Node.js 22.12+ (Node 22 is used in CI), then run:

```sh
npm ci
npm test
npm run build
```

Start the app with `npm run dev`. Tests exercise the bundled JSBSim WebAssembly
runtime directly and do not require Google credentials. To inspect live scenery,
enter your own browser-restricted Google Maps API key in the scenery dialog.
Never include keys in code, screenshots, issues, or pull requests.

For changes to controls, rendering, or layout, also check the app in a browser
at desktop and narrow viewport sizes. Describe the checks you performed and
whether live Google scenery was tested. Automated physics tests do not verify
Google imagery access or visual appearance.

Preserve the lockfile and the third-party notices. The runtime in `public/jsbsim/`
has been rebuilt to support the F-16 configuration; do not replace it with the
npm package's binary. See [runtime build instructions](public/jsbsim/source/BUILD.md)
and [third-party notices](THIRD_PARTY_NOTICES.md) before changing bundled assets.

Keep generated `dist/`, `node_modules/`, credentials, and local deployment
configuration out of commits. Include a concise explanation of the behavior
changed and relevant validation with a pull request.
