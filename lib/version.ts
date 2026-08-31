// lib/version.ts
//
// Single source of truth for the user-facing app release version.
// Keep in sync with package.json (test-enforced). Since v1.3.0 the
// optimized prompt carries NO version header — the version appears only in
// UI metadata, API headers, telemetry, and the JSON output format.
export const APP_VERSION = "1.4.5";
