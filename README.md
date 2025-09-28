# SingleSiteBrowser

Minimal kiosk-mode Electron browser with extension and Native Messaging host placeholders.

## Building

```bash
npm install
npm run dist
```

The `dist` script disables publishing so no GitHub token is required. Resulting installers or executables will be in the `dist/` folder.

When packaging for Windows the build pipeline automatically runs `npm run build-cryptopro-stub` to produce a standalone
`cryptopro_stub.exe` from the JavaScript placeholder via [`pkg`](https://github.com/vercel/pkg). The generated binary lives next to the
stub sources inside `native_host_placeholder/` and is ignored by git, so local builds remain reproducible without committing the
artifact.

## GitHub Actions CI

Continuous integration builds for Linux and Windows are configured in
`.github/workflows/build.yml`. Each run installs dependencies, executes
`npm run dist` and uploads the resulting binaries as artifacts.

You can download the ready-made `.AppImage` or `.exe` from the **Actions** tab
of your repository by selecting a build run and choosing the artifact for your
platform.

## Extension

Two packed extensions are included in the repository (`iifchhfnnmpdbibifmljnfjhpififfog.zip` and `pfhgbfnnjiafkhfdkmpiflachepdcjod.zip`).
During the build step they are automatically extracted into `embedded_ext_placeholder/` by the `prepare-ext` script so that they become part of the final executable.
You can run this step manually via:

```bash
npm run prepare-ext
```

The resulting directories will then be packaged as-is.

## Native Messaging Host

Provide your host manifest and executable inside `native_host_placeholder/` to package with the application.
After the first run, copy the manifest and binary to:
```
{userData}/NativeMessagingHosts/
```
where `{userData}` is reported by the app. If the directory is empty, you'll see a warning on startup.

### Windows build

The repository ships with the official CryptoPro native messaging host inside
`CAdES Browser Plug-in.zip`. The build pipeline extracts the signed
`nmcades.exe` and its manifest into `native_host_windows/` via
`npm run prepare-native-host` (executed automatically before TypeScript
compilation, `npm run dist` and `npm start`). The generated executable is
ignored by git, so only the sources required to build it are committed. During
startup on Windows the application prefers this directory over the placeholder
and rewrites the manifest so that the executable is referenced from the user's
`NativeMessagingHosts` folder without introducing any additional startup delay.

### CryptoPro stub

A minimal CryptoPro native messaging stub is included for testing.

* `cryptopro_stub.js` – JavaScript implementation used for non-Windows platforms or as the source for the packaged executable.
* `cryptopro_stub.cmd` – Batch launcher that discovers a colocated `node.exe` or falls back to the system `node`.
* `cryptopro_stub.exe` – Generated on demand by running `npm run build-cryptopro-stub` and bundled automatically by `npm run dist` on any
  platform with `pkg` available.

If you do not generate the executable, Windows builds fall back to the `.cmd` launcher which requires Node.js to be present in the
environment.
