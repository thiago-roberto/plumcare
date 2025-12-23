import { getProvider, getRegisteredSystems, type ProviderConfig } from '../../providers/base.provider.js';
import { config } from '../../core/config/index.js';
import type { EhrSystem } from '../../core/types/index.js';
import type {
  ConnectionEhrSystem,
  EhrConnection,
  ConnectionTestResponse,
} from './connections.types.js';
import { SYSTEM_DISPLAY_NAMES } from './connections.types.js';

/**
 * Connections Service
 *
 * Handles EHR connection status and testing.
 */

/**
 * Get provider config for a system
 */
function getProviderConfig(system: EhrSystem): ProviderConfig {
  return config[system] as ProviderConfig;
}

/**
 * Get all EHR connections with their status
 */
export async function getConnections(): Promise<EhrConnection[]> {
  const systems = getRegisteredSystems();
  const connections: EhrConnection[] = [];

  for (const system of systems) {
    try {
      const providerConfig = getProviderConfig(system);
      const provider = getProvider(system, providerConfig);
      const status = await provider.getConnectionStatus();
      connections.push(status);
    } catch {
      // If provider fails, add a disconnected status
      connections.push({
        id: `${system}-001`,
        system: system as ConnectionEhrSystem,
        name: getSystemName(system as ConnectionEhrSystem),
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

/**
 * Get connection status for a specific EHR system
 */
export async function getConnectionBySystem(system: ConnectionEhrSystem): Promise<EhrConnection> {
  const providerConfig = getProviderConfig(system);
  const provider = getProvider(system, providerConfig);
  return provider.getConnectionStatus();
}

/**
 * Test connection to an EHR system
 */
export async function testConnection(system: ConnectionEhrSystem): Promise<ConnectionTestResponse> {
  const providerConfig = getProviderConfig(system);
  const provider = getProvider(system, providerConfig);

  const authResult = await provider.authenticate();

  return {
    success: true,
    system,
    message: 'Connection test successful',
    expiresAt: authResult.expiresAt?.toISOString(),
  };
}

/**
 * Get display name for a system
 */
function getSystemName(system: ConnectionEhrSystem): string {
  return SYSTEM_DISPLAY_NAMES[system];
}
