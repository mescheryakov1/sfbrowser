# SingleSiteBrowser

Minimal kiosk-mode Electron browser with extension and Native Messaging host placeholders.

## Building

```bash
npm install
npm run dist
```

Resulting installers or executables will be in the `dist/` folder.

## Extension

Place your packed extension inside `embedded_ext_placeholder/` before building. The directory will be packaged as-is.

## Native Messaging Host

Provide your host manifest and executable inside `native_host_placeholder/` to package with the application.
After the first run, copy the manifest and binary to:
```
{userData}/native_messaging/
```
where `{userData}` is reported by the app. If the directory is empty, you'll see a warning on startup.
