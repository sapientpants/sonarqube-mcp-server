/**
 * Service account configuration utilities
 */

export interface ServiceAccountConfig {
  id: string;
  token: string;
  url?: string;
  organization?: string;
}

/**
 * Get service account configuration
 */
export function getServiceAccountConfig(accountId: string): ServiceAccountConfig | null {
  // For default account, check standard environment variables
  if (accountId === 'default') {
    const token = process.env.SONARQUBE_TOKEN;
    if (!token) {
      return null;
    }

    return {
      id: 'default',
      token,
      url: process.env.SONARQUBE_URL,
      organization: process.env.SONARQUBE_ORGANIZATION,
    };
  }

  // For numbered accounts (SA1-SA10)
  const regex = /^SA(\d+)$/;
  const match = regex.exec(accountId);
  if (match) {
    const num = match[1];
    const token = process.env[`SONARQUBE_SA${num}_TOKEN`];
    if (!token) {
      return null;
    }

    return {
      id: accountId,
      token,
      url: process.env[`SONARQUBE_SA${num}_URL`],
      organization: process.env[`SONARQUBE_SA${num}_ORGANIZATION`],
    };
  }

  return null;
}
