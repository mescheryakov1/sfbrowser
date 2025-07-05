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
