/**
 * Phone Number Management Client
 * 
 * Provides methods for:
 * - Listing owned phone numbers
 * - Searching available numbers
 * - Selecting (provisioning) phone numbers
 * - Releasing phone numbers
 */

import { BaseClient, BaseClientConfig } from './base';
import type {
  PhoneNumberInfo,
  AvailablePhoneNumber,
  SearchPhoneNumbersRequest,
  SearchPhoneNumbersResponse,
  PurchasePhoneNumberResponse,
  AllPhoneNumbersResponse,
  PaginatedPhoneNumberResponse,
  PaginatedAllPhoneNumbersResponse,
  PaginationOptions,
} from '../types';

/**
 * Client for phone number management operations
 */
export class PhoneNumberClient extends BaseClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  /**
   * List all owned phone numbers with details
   * 
   * @param options - Pagination options
   * @returns Phone numbers with assignment info
   * 
   * @example
   * ```typescript
   * const result = await client.phoneNumbers.list({ page: 1, limit: 10 });
   * 
   * if ('items' in result) {
   *   for (const phone of result.items) {
   *     console.log(`${phone.phone_number}: ${phone.status}`);
   *     if (phone.assigned_to_agent_name) {
   *       console.log(`  Assigned to: ${phone.assigned_to_agent_name}`);
   *     }
   *   }
   * }
   * ```
   */
  async list(options?: PaginationOptions): Promise<AllPhoneNumbersResponse | PaginatedAllPhoneNumbersResponse> {
    const params: Record<string, any> = {};
    
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;

    return this.get<AllPhoneNumbersResponse | PaginatedAllPhoneNumbersResponse>('/agent/phone-numbers', params);
  }

  /**
   * List available (unassigned) phone numbers
   * 
   * @param options - Pagination options
   * @returns Available phone numbers
   * 
   * @example
   * ```typescript
   * const result = await client.phoneNumbers.listAvailable();
   * 
   * if ('items' in result) {
   *   console.log('Available numbers:', result.items.length);
   * }
   * ```
   */
  async listAvailable(options?: PaginationOptions): Promise<Record<string, any> | PaginatedPhoneNumberResponse> {
    const params: Record<string, any> = {};
    
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;

    return this.get<Record<string, any> | PaginatedPhoneNumberResponse>('/agent/available-phone-numbers', params);
  }

  /**
   * Search for available phone numbers to select
   * 
   * @param options - Search filters
   * @returns Search results with available numbers
   * 
   * @example
   * ```typescript
   * // Search for US numbers in area code 415
   * const results = await client.phoneNumbers.search({
   *   country_code: 'US',
   *   area_code: '415',
   *   provider: 'twilio'
   * });
   * 
   * console.log('Found:', results.total_results);
   * for (const num of results.results) {
   *   console.log(`${num.phone_number} - ${num.locality}, ${num.region}`);
   * }
   * ```
   */
  async search(options: SearchPhoneNumbersRequest): Promise<SearchPhoneNumbersResponse> {
    return this.post<SearchPhoneNumbersResponse>('/agent/search-phone-numbers', options);
  }

  /**
   * Select (provision) a phone number from your plan's allowance
   * 
   * Phone numbers consume a slot from your plan's included allowance.
   * If you've reached your plan limit, you'll need to upgrade your plan
   * or release an existing number.
   * 
   * @param phoneNumber - The phone number to select (e.g., '+15551234567')
   * @param provider - Provider: 'twilio' or 'telnyx' (default: 'twilio')
   * @returns Selection response
   * 
   * @example
   * ```typescript
   * const result = await client.phoneNumbers.select('+15551234567', 'twilio');
   * console.log('Selected:', result.phone_number, result.status);
   * ```
   */
  async select(phoneNumber: string, provider: string = 'twilio'): Promise<PurchasePhoneNumberResponse> {
    return this.post<PurchasePhoneNumberResponse>('/agent/select-phone-number', {
      phone_number: phoneNumber,
      provider,
    });
  }

  /**
   * Release an owned phone number
   * 
   * Phone numbers attached to deployed agents cannot be released.
   * You must first pause your agent.
   * 
   * @param phoneNumber - The phone number to release
   * @param provider - Provider: 'twilio' or 'telnyx' (default: 'twilio')
   * @returns Release response
   * 
   * @example
   * ```typescript
   * // First pause any agent using this number
   * await client.agents.pause('agent-123');
   * 
   * // Then release the number
   * const result = await client.phoneNumbers.release('+15551234567');
   * console.log('Released:', result.phone_number);
   * ```
   */
  async release(phoneNumber: string, provider: string = 'twilio'): Promise<PurchasePhoneNumberResponse> {
    return this.post<PurchasePhoneNumberResponse>('/agent/release-phone-number', {
      phone_number: phoneNumber,
      provider,
    });
  }
}
