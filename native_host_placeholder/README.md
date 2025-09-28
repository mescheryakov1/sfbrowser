# Native Messaging Host Placeholder

Place your native messaging host manifest and executable here for packaging.

Manifest format example:
```json
{
  "name": "com.my_company.single_site_host",
  "description": "Native host for SingleSiteBrowser",
  "path": "path-to-executable",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://your-extension-id/"]
}
```

Executable: binary file referenced by `path` in the manifest.

## CryptoPro stub assets

The repository includes a CryptoPro placeholder host consisting of:

* `cryptopro_stub.js` – cross-platform JavaScript implementation.
* `cryptopro_stub.cmd` – helper launcher that prefers a colocated `node.exe` when present.
* `cryptopro_stub.exe` – generated on demand with `npm run build-cryptopro-stub` (ignored by git).

Electron builds automatically run the `build-cryptopro-stub` script so the standalone executable is added to the Windows bundle. If you skip
that step, Windows deployments will fall back to using the `.cmd` launcher and thus require Node.js to be available on the host.
