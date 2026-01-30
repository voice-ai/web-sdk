/**
 * Knowledge Base Client
 * 
 * Provides methods for:
 * - Creating and managing knowledge bases
 * - Listing and retrieving knowledge base details
 * - Updating and deleting knowledge bases
 */

import { BaseClient, BaseClientConfig } from './base';
import type {
  KnowledgeBaseResponse,
  KnowledgeBaseWithDocuments,
  CreateKnowledgeBaseRequest,
  UpdateKnowledgeBaseRequest,
  PaginatedKnowledgeBaseResponse,
  PaginationOptions,
} from '../types';

/**
 * Client for Knowledge Base operations
 */
export class KnowledgeBaseClient extends BaseClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  /**
   * List knowledge bases
   * 
   * @param options - Pagination options
   * @returns Paginated list of knowledge bases or array
   * 
   * @example
   * ```typescript
   * const result = await client.knowledgeBase.list({ page: 1, limit: 10 });
   * 
   * if ('items' in result) {
   *   for (const kb of result.items) {
   *     console.log(`${kb.name}: ${kb.document_count} documents`);
   *   }
   * }
   * ```
   */
  async list(options?: PaginationOptions): Promise<PaginatedKnowledgeBaseResponse | KnowledgeBaseResponse[]> {
    const params: Record<string, any> = {};
    
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;

    return super.get<PaginatedKnowledgeBaseResponse | KnowledgeBaseResponse[]>('/knowledge-base/', params);
  }

  /**
   * Create a new knowledge base
   * 
   * @param options - Knowledge base creation options
   * @returns Created knowledge base
   * 
   * @example
   * ```typescript
   * const kb = await client.knowledgeBase.create({
   *   name: 'Product FAQ',
   *   description: 'Frequently asked questions about our products',
   *   documents: [
   *     { content: 'Q: What is the return policy? A: 30 days...' },
   *     { content: 'Q: How do I track my order? A: Use the tracking link...' }
   *   ]
   * });
   * 
   * console.log('Created KB:', kb.kb_id);
   * ```
   */
  async create(options: CreateKnowledgeBaseRequest): Promise<KnowledgeBaseResponse> {
    return this.post<KnowledgeBaseResponse>('/knowledge-base/', options);
  }

  /**
   * Get knowledge base details with documents
   * 
   * @param kbId - The knowledge base ID
   * @returns Knowledge base with documents
   * 
   * @example
   * ```typescript
   * const kb = await client.knowledgeBase.getById(42);
   * 
   * console.log('Documents:', kb.documents.length);
   * for (const doc of kb.documents) {
   *   console.log('- ', doc.content.substring(0, 50));
   * }
   * ```
   */
  async getById(kbId: number): Promise<KnowledgeBaseWithDocuments> {
    return super.get<KnowledgeBaseWithDocuments>(`/knowledge-base/${kbId}`);
  }

  /**
   * Update a knowledge base
   * 
   * If documents are provided, they replace ALL existing documents.
   * 
   * @param kbId - The knowledge base ID
   * @param options - Fields to update
   * @returns Updated knowledge base with documents
   * 
   * @example
   * ```typescript
   * // Update name only
   * const updated = await client.knowledgeBase.update(42, {
   *   name: 'Updated FAQ'
   * });
   * 
   * // Replace all documents
   * const replaced = await client.knowledgeBase.update(42, {
   *   documents: [
   *     { content: 'New document content...' }
   *   ]
   * });
   * ```
   */
  async update(kbId: number, options: UpdateKnowledgeBaseRequest): Promise<KnowledgeBaseWithDocuments> {
    return this.put<KnowledgeBaseWithDocuments>(`/knowledge-base/${kbId}`, options);
  }

  /**
   * Delete a knowledge base
   * 
   * @param kbId - The knowledge base ID
   * 
   * @example
   * ```typescript
   * await client.knowledgeBase.remove(42);
   * console.log('Knowledge base deleted');
   * ```
   */
  async remove(kbId: number): Promise<void> {
    await super.delete<void>(`/knowledge-base/${kbId}`);
  }
}
