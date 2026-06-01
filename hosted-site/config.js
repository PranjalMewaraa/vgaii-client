// Per-client deployment config. This is the ONLY file that changes between
// clients — deploy the same index.html everywhere and give each client their
// own config.js.
//
// On platforms with build-time env substitution you can generate this file from
// environment variables (e.g. CLIENT_ID, CRM_BASE).
window.SITE_CONFIG = {
  // The client's cuid or profile slug (from the CRM).
  clientId: "REPLACE_WITH_CLIENT_ID",

  // Base URL of the CRM that owns the data (no trailing slash).
  crmBase: "http://localhost:3000",
};
