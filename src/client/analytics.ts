/**
 * Analytics Client
 * 
 * Provides methods for:
 * - Getting call history with filters
 * - Getting transcript URLs
 * - Getting agent stats summary
 */

import { BaseClient, BaseClientConfig } from './base';
import type {
  PaginatedCallHistoryResponse,
  GetCallHistoryOptions,
  TranscriptResponse,
  AgentStatsSummaryResponse,
} from '../types';

/**
 * Client for analytics and reporting operations
 */
export class AnalyticsClient extends BaseClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  /**
   * Get call history with optional filters
   * 
   * @param options - Pagination and filter options
   * @returns Paginated call history
   * 
   * @example
   * ```typescript
   * // Get recent calls
   * const history = await client.analytics.getCallHistory({
   *   page: 1,
   *   limit: 20
   * });
   * 
   * for (const call of history.items) {
   *   console.log(`Call ${call.id}: ${call.call_duration_seconds}s`);
   * }
   * ```
   * 
   * @example
   * ```typescript
   * // Filter by date range and agent
   * const history = await client.analytics.getCallHistory({
   *   start_date: '2024-01-01T00:00:00+00:00',
   *   end_date: '2024-01-31T23:59:59+00:00',
   *   agent_ids: ['agent-123', 'agent-456']
   * });
   * ```
   */
  async getCallHistory(options?: GetCallHistoryOptions): Promise<PaginatedCallHistoryResponse> {
    const params: Record<string, any> = {};
    
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.start_date) params.start_date = options.start_date;
    if (options?.end_date) params.end_date = options.end_date;
    if (options?.agent_ids) params.agent_ids = options.agent_ids;

    return this.get<PaginatedCallHistoryResponse>('/agent/call-history', params);
  }

  /**
   * Get transcript download URL for a call
   * 
   * @param summaryId - The call summary ID
   * @returns Object with transcript URL
   * 
   * @example
   * ```typescript
   * const { url } = await client.analytics.getTranscriptUrl(12345);
   * 
   * // Download transcript
   * window.open(url, '_blank');
   * ```
   */
  async getTranscriptUrl(summaryId: number): Promise<TranscriptResponse> {
    return this.get<TranscriptResponse>(`/agent/call-history/${summaryId}/transcript`);
  }

  /**
   * Get agent stats summary
   * 
   * @returns Summary of agent counts by status
   * 
   * @example
   * ```typescript
   * const stats = await client.analytics.getStatsSummary();
   * 
   * console.log('Total agents:', stats.total_agents);
   * console.log('Deployed:', stats.status_summary.deployed);
   * console.log('Paused:', stats.status_summary.paused);
   * ```
   */
  async getStatsSummary(): Promise<AgentStatsSummaryResponse> {
    return this.get<AgentStatsSummaryResponse>('/agent/stats-summary');
  }
}
