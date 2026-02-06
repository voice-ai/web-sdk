/**
 * VoiceAIClient - Main API Client for Voice.ai Agent API
 * 
 * Provides access to Voice.ai Agent API functionality through sub-clients:
 * - agents: Agent management (create, update, deploy, pause, delete)
 * - analytics: Call history and stats
 * - knowledgeBase: Knowledge base management for RAG
 * - phoneNumbers: Phone number management
 * 
 * @example
 * ```typescript
 * import { VoiceAIClient } from '@voice-ai-labs/web-sdk';
 * 
 * const client = new VoiceAIClient({
 *   apiKey: 'vk_your_api_key'
 * });
 * 
 * // List agents
 * const agents = await client.agents.list();
 * 
 * // Create and deploy an agent
 * const agent = await client.agents.create({
 *   name: 'Support Agent',
 *   config: { prompt: 'You are a helpful assistant.' }
 * });
 * await client.agents.deploy(agent.agent_id);
 * 
 * // Get call history
 * const history = await client.analytics.getCallHistory();
 * ```
 */

import type { VoiceAIConfig } from '../types';
import { AgentClient } from './agents';
import { AnalyticsClient } from './analytics';
import { KnowledgeBaseClient } from './knowledge-base';
import { PhoneNumberClient } from './phone-numbers';

export { VoiceAIError } from './base';

/**
 * Main API client for Voice.ai Agent API
 */
export class VoiceAIClient {
  /** Agent management client */
  public readonly agents: AgentClient;
  
  /** Analytics client */
  public readonly analytics: AnalyticsClient;
  
  /** Knowledge Base client */
  public readonly knowledgeBase: KnowledgeBaseClient;
  
  /** Phone Number management client */
  public readonly phoneNumbers: PhoneNumberClient;

  /** Default API URL */
  private static readonly DEFAULT_API_URL = 'https://dev.voice.ai/api/v1';

  /**
   * Create a new VoiceAIClient
   * 
   * @param config - Client configuration
   * 
   * @example
   * ```typescript
   * const client = new VoiceAIClient({
   *   apiKey: 'vk_your_api_key',
   *   apiUrl: 'https://custom-api.example.com/api/v1' // optional
   * });
   * ```
   */
  constructor(config: VoiceAIConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    const apiUrl = config.apiUrl || VoiceAIClient.DEFAULT_API_URL;
    const clientConfig = { apiKey: config.apiKey, apiUrl };

    this.agents = new AgentClient(clientConfig);
    this.analytics = new AnalyticsClient(clientConfig);
    this.knowledgeBase = new KnowledgeBaseClient(clientConfig);
    this.phoneNumbers = new PhoneNumberClient(clientConfig);
  }
}

// Re-export sub-clients for direct usage if needed
export { AgentClient } from './agents';
export { AnalyticsClient } from './analytics';
export { KnowledgeBaseClient } from './knowledge-base';
export { PhoneNumberClient } from './phone-numbers';
