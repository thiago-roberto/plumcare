import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/di-tokens.js';
import type { EhrSystem, EhrConnection } from '../../core/types/index.js';
import { getProvider, getRegisteredSystems, type ProviderConfig } from '../../core/providers/base.provider.js';
import { ConfigService } from '../config/config.service.js';

@injectable()
export class ConnectionsService {
  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService
  ) {}

  async getAllConnections(): Promise<EhrConnection[]> {
    const systems = getRegisteredSystems();
    const connections: EhrConnection[] = [];

    for (const system of systems) {
      try {
        const providerConfig = this.getProviderConfig(system);
        const provider = getProvider(system, providerConfig);
        const status = await provider.getConnectionStatus();
        connections.push(status);
      } catch {
        connections.push({
          id: `${system}-001`,
          system,
          name: this.getSystemName(system),
          status: 'error',
          lastSync: new Date().toISOString(),
          patientCount: 0,
          encounterCount: 0,
          pendingRecords: 0,
          apiVersion: 'unknown',
          fhirVersion: 'R4',
          capabilities: [],
        });
      }
    }

    return connections;
  }

  async getConnection(system: EhrSystem): Promise<EhrConnection> {
    const providerConfig = this.getProviderConfig(system);
    const provider = getProvider(system, providerConfig);
    return provider.getConnectionStatus();
  }

  async testConnection(system: EhrSystem): Promise<{ success: boolean; expiresAt: Date }> {
    const providerConfig = this.getProviderConfig(system);
    const provider = getProvider(system, providerConfig);
    const authResult = await provider.authenticate();
    return {
      success: true,
      expiresAt: authResult.expiresAt,
    };
  }

  private getProviderConfig(system: EhrSystem): ProviderConfig {
    const config = this.configService[system] as ProviderConfig;
    return config;
  }

  private getSystemName(system: EhrSystem): string {
    const names: Record<EhrSystem, string> = {
      athena: 'Athena Health',
      elation: 'Elation Health',
      nextgen: 'NextGen Healthcare',
    };
    return names[system];
  }
}
