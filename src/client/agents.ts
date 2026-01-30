/**
 * Agent Management Client
 * 
 * Provides methods for:
 * - Creating, updating, and deleting agents
 * - Deploying and pausing agents
 * - Checking agent connection status
 * - Managing agent knowledge bases
 */

import { BaseClient, BaseClientConfig } from './base';
import type {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentDeployResponse,
  AgentPauseResponse,
  AgentDeleteResponse,
  AgentConnectionStatusResponse,
  InitAgentRequest,
  InitAgentResponse,
  PaginatedAgentResponse,
  ListAgentsOptions,
  AssignKnowledgeBaseRequest,
} from '../types';

/**
 * Client for Agent management operations
 */
export class AgentClient extends BaseClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  /**
   * List agents with optional pagination and filtering
   * 
   * @param options - Pagination and filter options
   * @returns Paginated list of agents or array of agents
   * 
   * @example
   * ```typescript
   * // Get all deployed agents
   * const result = await client.agents.list({
   *   page: 1,
   *   limit: 10,
   *   show_statuses: ['deployed']
   * });
   * 
   * for (const agent of result.items) {
   *   console.log(`${agent.name}: ${agent.status}`);
   * }
   * ```
   */
  async list(options?: ListAgentsOptions): Promise<PaginatedAgentResponse | Agent[]> {
    const params: Record<string, any> = {};
    
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.show_statuses) params.show_statuses = options.show_statuses;

    return super.get<PaginatedAgentResponse | Agent[]>('/agent/', params);
  }

  /**
   * Create a new agent
   * 
   * @param options - Agent creation options
   * @returns Created agent
   * 
   * @example
   * ```typescript
   * const agent = await client.agents.create({
   *   name: 'Customer Support Agent',
   *   config: {
   *     prompt: 'You are a helpful customer support agent.',
   *     greeting: 'Hello! How can I help you today?',
   *     tts_params: {
   *       voice_id: 'my-voice-id'
   *     }
   *   }
   * });
   * 
   * console.log('Created agent:', agent.agent_id);
   * ```
   */
  async create(options: CreateAgentRequest): Promise<Agent> {
    return this.post<Agent>('/agent/', options);
  }

  /**
   * Get agent details by ID
   * 
   * @param agentId - The agent ID
   * @returns Agent details
   * 
   * @example
   * ```typescript
   * const agent = await client.agents.getById('agent-123');
   * console.log('Agent config:', agent.config);
   * ```
   */
  async getById(agentId: string): Promise<Agent> {
    return super.get<Agent>(`/agent/${encodeURIComponent(agentId)}`);
  }

  /**
   * Update an existing agent
   * 
   * @param agentId - The agent ID to update
   * @param options - Fields to update
   * @returns Updated agent
   * 
   * @example
   * ```typescript
   * const updated = await client.agents.update('agent-123', {
   *   name: 'Updated Agent Name',
   *   config: {
   *     greeting: 'Hi there! What can I do for you?'
   *   }
   * });
   * ```
   */
  async update(agentId: string, options: UpdateAgentRequest): Promise<Agent> {
    return this.put<Agent>(`/agent/${encodeURIComponent(agentId)}`, options);
  }

  /**
   * Deploy an agent (prepare for phone calls)
   * 
   * @param agentId - The agent ID to deploy
   * @returns Deployment response with agent and status
   * 
   * @example
   * ```typescript
   * const result = await client.agents.deploy('agent-123');
   * console.log('Deployed:', result.message);
   * console.log('SIP status:', result.sip_status);
   * ```
   */
  async deploy(agentId: string): Promise<AgentDeployResponse> {
    return this.post<AgentDeployResponse>(`/agent/${encodeURIComponent(agentId)}/deploy`);
  }

  /**
   * Pause an agent (frees phone number)
   * 
   * This endpoint is idempotent.
   * 
   * @param agentId - The agent ID to pause
   * @returns Pause response with agent
   * 
   * @example
   * ```typescript
   * const result = await client.agents.pause('agent-123');
   * console.log('Agent status:', result.agent.status);
   * ```
   */
  async pause(agentId: string): Promise<AgentPauseResponse> {
    return this.post<AgentPauseResponse>(`/agent/${encodeURIComponent(agentId)}/pause`);
  }

  /**
   * Delete/disable an agent
   * 
   * An agent must be paused before being deleted.
   * Disabled agents will be automatically deleted after a grace period.
   * 
   * @param agentId - The agent ID to delete
   * @returns Delete response
   * 
   * @example
   * ```typescript
   * // First pause, then delete
   * await client.agents.pause('agent-123');
   * const result = await client.agents.disable('agent-123');
   * console.log('Deleted:', result.message);
   * ```
   */
  async disable(agentId: string): Promise<AgentDeleteResponse> {
    return this.post<AgentDeleteResponse>(`/agent/${encodeURIComponent(agentId)}/disable`);
  }

  /**
   * Initialize agent from template
   * 
   * @param options - Template options
   * @returns Template configuration and available types
   * 
   * @example
   * ```typescript
   * // Get available templates
   * const result = await client.agents.initFromTemplate();
   * console.log('Available types:', result.available_types);
   * 
   * // Initialize from specific template
   * const template = await client.agents.initFromTemplate({
   *   agent_template: 'customer_support'
   * });
   * ```
   */
  async initFromTemplate(options?: InitAgentRequest): Promise<InitAgentResponse> {
    return this.post<InitAgentResponse>('/agent/init-agent', options || {});
  }

  /**
   * Check if an agent is available for connection
   * 
   * @param agentId - The agent ID to check
   * @returns Agent connection status
   * 
   * @example
   * ```typescript
   * const status = await client.agents.getStatus('agent-123');
   * 
   * if (status.call_allowed) {
   *   console.log('Agent is available for calls');
   * } else {
   *   console.log('Reason:', status.call_validation_details);
   * }
   * ```
   */
  async getStatus(agentId: string): Promise<AgentConnectionStatusResponse> {
    return super.get<AgentConnectionStatusResponse>(`/connection/agent-status/${encodeURIComponent(agentId)}`);
  }

  /**
   * Assign a knowledge base to an agent for RAG
   * 
   * @param agentId - The agent ID
   * @param kbId - The knowledge base ID to assign
   * @returns Updated agent
   * 
   * @example
   * ```typescript
   * const agent = await client.agents.assignKnowledgeBase('agent-123', 42);
   * console.log('KB assigned:', agent.kb_id);
   * ```
   */
  async assignKnowledgeBase(agentId: string, kbId: number): Promise<Agent> {
    const body: AssignKnowledgeBaseRequest = { kb_id: kbId };
    return this.post<Agent>(`/agent/${encodeURIComponent(agentId)}/assign-knowledge-base`, body);
  }

  /**
   * Remove knowledge base from an agent
   * 
   * @param agentId - The agent ID
   * 
   * @example
   * ```typescript
   * await client.agents.unassignKnowledgeBase('agent-123');
   * ```
   */
  async unassignKnowledgeBase(agentId: string): Promise<void> {
    await this.delete<void>(`/agent/${encodeURIComponent(agentId)}/knowledge-base`);
  }
}
