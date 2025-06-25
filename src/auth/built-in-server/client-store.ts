import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import type { OAuthClient, ClientStore as IClientStore } from './types.js';

const SALT_ROUNDS = 12;

export class InMemoryClientStore implements IClientStore {
  private clients = new Map<string, OAuthClient>();

  async createClient(
    clientData: Omit<OAuthClient, 'createdAt' | 'updatedAt'>
  ): Promise<OAuthClient> {
    if (await this.getClientById(clientData.clientId)) {
      throw new Error('Client with this ID already exists');
    }

    const client: OAuthClient = {
      ...clientData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clients.set(client.clientId, client);
    return client;
  }

  async getClientById(clientId: string): Promise<OAuthClient | null> {
    return this.clients.get(clientId) ?? null;
  }

  async updateClient(clientId: string, updates: Partial<OAuthClient>): Promise<OAuthClient> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    const updatedClient = {
      ...client,
      ...updates,
      clientId: client.clientId,
      createdAt: client.createdAt,
      updatedAt: new Date(),
    };

    this.clients.set(clientId, updatedClient);
    return updatedClient;
  }

  async deleteClient(clientId: string): Promise<void> {
    if (!this.clients.has(clientId)) {
      throw new Error('Client not found');
    }
    this.clients.delete(clientId);
  }

  async listClients(options?: { limit?: number; offset?: number }): Promise<OAuthClient[]> {
    const allClients = Array.from(this.clients.values());
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    return allClients.slice(offset, offset + limit);
  }

  async validateClientCredentials(clientId: string, clientSecret: string): Promise<boolean> {
    const client = await this.getClientById(clientId);
    if (!client || !client.clientSecretHash) {
      return false;
    }

    return bcrypt.compare(clientSecret, client.clientSecretHash);
  }
}

export class ClientSecretGenerator {
  static generateClientSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  static async hashClientSecret(clientSecret: string): Promise<string> {
    return bcrypt.hash(clientSecret, SALT_ROUNDS);
  }
}
