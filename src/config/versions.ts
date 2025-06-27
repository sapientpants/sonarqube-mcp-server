/**
 * Centralized version configuration for the SonarQube MCP Server
 */

/**
 * Server version - the version of the SonarQube MCP Server itself
 */
export const SERVER_VERSION = '1.5.1';

/**
 * MCP SDK version currently in use
 */
export const SDK_VERSION = '1.13.0';

/**
 * MCP protocol versions supported by the current SDK
 * Listed in order from newest to oldest
 */
export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
  '2024-10-07',
] as const;

/**
 * Latest MCP protocol version
 */
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

/**
 * Default negotiated protocol version (what most clients will use)
 */
export const DEFAULT_NEGOTIATED_PROTOCOL_VERSION = '2025-03-26';

/**
 * Version information object for logging and display
 */
export const VERSION_INFO = {
  serverVersion: SERVER_VERSION,
  sdkVersion: SDK_VERSION,
  supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
  latestProtocolVersion: LATEST_PROTOCOL_VERSION,
  defaultNegotiatedProtocolVersion: DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
} as const;
