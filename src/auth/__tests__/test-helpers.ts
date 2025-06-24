// Type definitions for test helpers

interface CredentialData {
  encrypted: boolean;
  data?: {
    iv: string;
    authTag: string;
    encrypted: string;
  };
}

export interface CredentialStoreInternal {
  credentials: Map<string, string | CredentialData>;
  options: {
    useEncryption: boolean;
    masterPassword: string;
  };
  encryptionKey: Buffer;
  deriveKey: (password: string) => Buffer;
  loadFromFile: () => Promise<void>;
}

export interface SonarQubeClientMock {
  system: {
    ping?: jest.Mock;
    getStatus?: jest.Mock;
  };
}

export interface ServiceAccountHealthMonitorInternal {
  checkInterval: number;
  unhealthyThreshold: number;
  timeout: number;
  checkAllAccounts: () => Promise<void>;
}
