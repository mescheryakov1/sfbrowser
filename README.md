# SingleSiteBrowser

Minimal kiosk-mode Electron browser with extension and Native Messaging host placeholders.

## Building

```bash
npm install
npm run dist
```

The `dist` script disables publishing so no GitHub token is required. Resulting installers or executables will be in the `dist/` folder.

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
{userData}/native_messaging/
```
where `{userData}` is reported by the app. If the directory is empty, you'll see a warning on startup.
