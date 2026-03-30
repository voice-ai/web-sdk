import { BaseClient, type BaseClientConfig } from './base';
import type {
  GoogleConnectionStatus,
  GoogleOAuthStartOptions,
  GoogleOAuthStartResponse,
} from '../types';

class GoogleManagedToolsClient extends BaseClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  async startOAuth(agentId: string, options: GoogleOAuthStartOptions = {}): Promise<GoogleOAuthStartResponse> {
    return this.post<GoogleOAuthStartResponse>(
      `/google/${encodeURIComponent(agentId)}/oauth/start`,
      {
        return_path: options.returnUrl,
        managed_tools: options.managedTools,
      }
    );
  }

  async getStatus(agentId: string): Promise<GoogleConnectionStatus> {
    return this.get<GoogleConnectionStatus>(`/google/${encodeURIComponent(agentId)}/status`);
  }

  async disconnect(agentId: string): Promise<{ disconnected: boolean; agent_id: string }> {
    return this.httpDelete<{ disconnected: boolean; agent_id: string }>(`/google/${encodeURIComponent(agentId)}/disconnect`);
  }
}

export class ManagedToolsClient {
  public readonly google: GoogleManagedToolsClient;

  constructor(config: BaseClientConfig) {
    this.google = new GoogleManagedToolsClient(config);
  }
}
