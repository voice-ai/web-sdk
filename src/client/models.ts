import { BaseClient, BaseClientConfig } from './base';
import type { ModelsResponse } from '../types';

export class ModelsClient extends BaseClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  async list(): Promise<ModelsResponse> {
    return this.get<ModelsResponse>('/models');
  }
}
