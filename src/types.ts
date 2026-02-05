/**
 * Type definitions for Voice.ai Web SDK
 * 
 * This file contains all TypeScript types for the SDK including:
 * - Agent Connection types (real-time voice)
 * - Agent Management types
 * - Analytics types
 * - Knowledge Base types
 * - Phone Number types
 * - Common types (pagination, errors)
 */

// =============================================================================
// AGENT CONNECTION TYPES
// =============================================================================

export interface ConnectionDetails {
  serverUrl: string;
  participantToken: string;
  callId: string;
}

export interface ConnectionOptions {
  /** API base URL (default: auto-detect or provided) */
  apiUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Agent ID to connect to */
  agentId?: string;
  /** Agent configuration (for custom/preset agents) */
  agentConfig?: Record<string, any>;
  /** Metadata to pass to the agent */
  metadata?: string;
  /** Environment data */
  environment?: string | Record<string, any>;
  /** Enable automatic microphone publishing (default: true) */
  autoPublishMic?: boolean;
  /** Audio capture options */
  audioOptions?: AudioCaptureOptions;
  /** Enable pre-connect audio buffering (default: true) - improves mobile timing */
  preConnectBuffer?: boolean;
}

export interface TranscriptionSegment {
  /** Unique ID for this transcription segment/stream */
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: number;
  isFinal: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  callId?: string;
}

export type AgentState = 'disconnected' | 'connecting' | 'initializing' | 'listening' | 'thinking' | 'speaking';

export interface AgentStateInfo {
  state: AgentState;
  agentParticipantId?: string;
}

export interface AudioLevelInfo {
  level: number; // 0-1
  isSpeaking: boolean;
}

export interface MicrophoneState {
  enabled: boolean;
  muted: boolean;
}

export type TranscriptionHandler = (segment: TranscriptionSegment) => void;
export type ConnectionStatusHandler = (status: ConnectionStatus) => void;
export type ErrorHandler = (error: Error) => void;
export type AgentStateHandler = (state: AgentStateInfo) => void;
export type AudioLevelHandler = (level: AudioLevelInfo) => void;
export type MicrophoneStateHandler = (state: MicrophoneState) => void;

export interface AudioCaptureOptions {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
  voiceIsolation?: boolean;
  [key: string]: any;
}

// =============================================================================
// COMMON TYPES
// =============================================================================

/** Pagination metadata returned by list endpoints */
export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_items: number;
  limit: number;
  has_next: boolean;
  has_previous: boolean;
}

/** Pagination options for list requests */
export interface PaginationOptions {
  /** Page number (1-based) */
  page?: number;
  /** Items per page (max 100) */
  limit?: number;
}

/** Standard error response from API */
export interface ErrorResponse {
  error: string;
  detail?: string;
  code?: string;
}

/** Validation error detail */
export interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/** HTTP Validation Error response */
export interface HTTPValidationError {
  detail: ValidationErrorDetail[];
}

// =============================================================================
// AGENT TYPES
// =============================================================================

/** TTS parameters for agent voice configuration */
export interface TTSParams {
  /** Voice ID to use for text-to-speech generation */
  voice_id?: string | null;
  /** TTS model to use. If not provided, automatically selected based on language.
   * Examples: 'voiceai-tts-v1-latest', 'voiceai-tts-multilingual-v1-latest' */
  model?: string | null;
  /** Language code (ISO 639-1 format, e.g., 'en', 'es', 'fr').
   * Use 'auto' for ASR-detected language at runtime (requires multilingual model).
   * Defaults to 'en' if not set. */
  language?: string | null;
  /** Sampling temperature (0.0-2.0). Higher values make output more random. */
  temperature?: number | null;
  /** Nucleus sampling parameter (0.0-1.0). Controls diversity of output. */
  top_p?: number | null;
}

/** MCP Server configuration */
export interface MCPServerConfig {
  /** Human-readable name for the server (required) */
  name: string;
  /** Description of the server's purpose or tools */
  description?: string | null;
  /** MCP server endpoint URL (required). URLs ending with '/mcp' use streamable HTTP transport. */
  url: string;
  /** Authentication type (default: 'none') */
  auth_type?: 'none' | 'bearer_token' | 'api_key' | 'custom_headers' | null;
  /** Token for 'bearer_token' or 'api_key' authentication */
  auth_token?: string | null;
  /** HTTP headers for authentication or custom configuration */
  headers?: Record<string, string> | null;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/** Webhook event types */
export type WebhookEventType = 'call.started' | 'call.completed';

/** Webhook event notification configuration (for creating/updating) */
export interface WebhookEventsConfig {
  /** Webhook endpoint URL (required) */
  url: string;
  /** HMAC-SHA256 signing secret for payload verification */
  secret?: string | null;
  /** Event types to receive. Empty array = all events. Options: 'call.started', 'call.completed' */
  events?: WebhookEventType[];
  /** Request timeout in seconds (default: 5, range: 1-30) */
  timeout?: number;
  /** Whether webhook notifications are active (default: true) */
  enabled?: boolean;
}

/** Public webhook events config (returned by API, secret not exposed) */
export interface PublicWebhookEventsConfig {
  /** Webhook endpoint URL */
  url: string;
  /** Whether a signing secret is configured */
  has_secret?: boolean;
  /** Event types configured to receive */
  events?: WebhookEventType[];
  /** Request timeout in seconds */
  timeout?: number;
  /** Whether webhook notifications are active */
  enabled?: boolean;
}

/** Webhooks configuration (for creating/updating) */
export interface WebhooksConfig {
  /** Event notification webhook configuration */
  events?: WebhookEventsConfig | null;
}

/** Public webhooks configuration (returned by API) */
export interface PublicWebhooksConfig {
  /** Event notification webhook configuration */
  events?: PublicWebhookEventsConfig | null;
}

/** Webhook event payload (received at your webhook URL) */
export interface WebhookEvent {
  /** Event type */
  event: WebhookEventType | 'test';
  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;
  /** Unique identifier for the call (may be null for test events) */
  call_id?: string | null;
  /** Agent ID that generated the event */
  agent_id: string;
  /** Event-specific additional data */
  data: Record<string, any>;
}

/** Response from testing webhook configuration */
export interface WebhookTestResponse {
  /** Test result status */
  status: 'success' | 'failed';
  /** Human-readable result description */
  message: string;
  /** Error details if the test failed */
  error?: string | null;
  /** Number of delivery attempts made */
  attempts: number;
}

/** Public agent configuration */
export interface PublicAgentConfig {
  /** Agent system prompt */
  prompt?: string | null;
  /** Initial greeting message */
  greeting?: string | null;
  /** LLM temperature (default: 0.7) */
  llm_temperature?: number | null;
  /** LLM model (default: gemini-2.5-flash-lite) */
  llm_model?: string | null;
  /** Minimum TTS sentence length (default: 20) */
  tts_min_sentence_len?: number | null;
  /** TTS parameters */
  tts_params?: TTSParams | null;
  /** Minimum silence duration (default: 0.55) */
  min_silence_duration?: number | null;
  /** Minimum speech duration (default: 0.1) */
  min_speech_duration?: number | null;
  /** User silence timeout (default: 10.0) */
  user_silence_timeout?: number | null;
  /** Maximum call duration in seconds (default: 900) */
  max_call_duration_seconds?: number | null;
  /** Allow interruptions (default: true) */
  allow_interruptions?: boolean | null;
  /** Allow interruptions on greeting (default: false) */
  allow_interruptions_on_greeting?: boolean | null;
  /** Minimum words required for interruption (default: 1) */
  min_interruption_words?: number | null;
  /** Enable automatic noise reduction (default: true) */
  auto_noise_reduction?: boolean | null;
  /** Whether agent can end calls via tool or timeout (default: false) */
  allow_agent_to_end_call?: boolean | null;
  /** Whether agent can skip turns and yield conversation control (default: false) */
  allow_agent_to_skip_turn?: boolean | null;
  /** Minimum endpointing delay (default: 0.5) */
  min_endpointing_delay?: number | null;
  /** Maximum endpointing delay (default: 3.0) */
  max_endpointing_delay?: number | null;
  /** VAD activation threshold (default: 0.6) */
  vad_activation_threshold?: number | null;
  /** Phone number in E.164 format */
  phone_number?: string | null;
  /** Webhook configuration for event notifications */
  webhooks?: PublicWebhooksConfig | null;
  /** MCP servers configuration */
  mcp_servers?: MCPServerConfig[] | null;
}

/** Agent category */
export type AgentCategory = 'business' | 'playground';

/** Agent playground visibility */
export type AgentPlaygroundVisibility = 'public' | 'unlisted';

/** Agent object */
export interface Agent {
  /** Unique agent identifier */
  agent_id: string;
  /** Agent name */
  name: string;
  /** Agent configuration */
  config: PublicAgentConfig;
  /** Agent status (default: paused) */
  status: string;
  /** Status code (default: 1) */
  status_code: number;
  /** Associated knowledge base ID */
  kb_id?: number | null;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/** Request to create a new agent */
export interface CreateAgentRequest {
  /** Agent name (cannot be empty) */
  name: string;
  /** Agent configuration */
  config: PublicAgentConfig;
  /** Knowledge base ID to assign (optional) */
  kb_id?: number | null;
}

/** Request to update an agent */
export interface UpdateAgentRequest {
  /** New agent name */
  name?: string | null;
  /** Updated configuration */
  config?: PublicAgentConfig | null;
  /** Knowledge base ID (set to null to remove) */
  kb_id?: number | null;
}

/** Response from deploying an agent */
export interface AgentDeployResponse {
  agent: Agent;
  message: string;
  sip_status?: string | null;
  sip_details?: Record<string, any> | null;
}

/** Response from pausing an agent */
export interface AgentPauseResponse {
  agent: Agent;
}

/** Response from deleting/disabling an agent */
export interface AgentDeleteResponse {
  agent: Agent;
  message?: string | null;
}

/** Agent connection status response */
export interface AgentConnectionStatusResponse {
  agent_id: string;
  name: string;
  voice_id: string;
  status: string;
  status_code: number;
  call_allowed: boolean;
  call_validation_details?: Record<string, any> | null;
}

/** Agent status summary */
export interface AgentStatusSummary {
  deployed: number;
  paused: number;
  disabled: number;
}

/** Agent stats summary response */
export interface AgentStatsSummaryResponse {
  total_agents: number;
  status_summary: AgentStatusSummary;
}

/** Request to initialize agent from template */
export interface InitAgentRequest {
  agent_template?: string | null;
  name?: string | null;
}

/** Response from initializing agent from template */
export interface InitAgentResponse {
  agent_template: PublicAgentConfig;
  available_types: string[];
  description: string;
}

/** Paginated agent response */
export interface PaginatedAgentResponse {
  items: Agent[];
  pagination: PaginationMeta;
}

/** List agents options */
export interface ListAgentsOptions extends PaginationOptions {
  /** List of statuses to show (default: deployed and paused) */
  show_statuses?: string[];
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/** Call history item */
export interface CallHistoryItem {
  id: number;
  agent_id?: string | null;
  agent_name?: string | null;
  call_timestamp: string;
  call_duration_seconds: number;
  credits_used: number;
  has_transcript: boolean;
  call_type?: string | null;
  from_number?: string | null;
  to_number?: string | null;
  transcription_summary?: string | null;
  transcription_stats?: Record<string, any> | null;
}

/** Paginated call history response */
export interface PaginatedCallHistoryResponse {
  items: CallHistoryItem[];
  pagination: PaginationMeta;
}

/** Options for getting call history */
export interface GetCallHistoryOptions extends PaginationOptions {
  /** Filter calls after this date (ISO format UTC) */
  start_date?: string;
  /** Filter calls before this date (ISO format UTC) */
  end_date?: string;
  /** Filter calls by agent ID(s) */
  agent_ids?: string[];
}

/** Transcript URL response */
export interface TranscriptResponse {
  url: string;
}

// =============================================================================
// KNOWLEDGE BASE TYPES
// =============================================================================

/** Document for knowledge base */
export interface KnowledgeBaseDocument {
  /** Document text content (required) */
  content: string;
  /** Optional metadata dictionary */
  metadata?: Record<string, any> | null;
}

/** Request to create a knowledge base */
export interface CreateKnowledgeBaseRequest {
  /** Knowledge base name */
  name?: string | null;
  /** Knowledge base description */
  description?: string | null;
  /** List of documents (at least one required) */
  documents: KnowledgeBaseDocument[];
}

/** Request to update a knowledge base */
export interface UpdateKnowledgeBaseRequest {
  /** New name */
  name?: string | null;
  /** New description */
  description?: string | null;
  /** Documents to replace all existing (if provided) */
  documents?: KnowledgeBaseDocument[] | null;
}

/** Knowledge base response (without documents) */
export interface KnowledgeBaseResponse {
  kb_id: number;
  name?: string | null;
  description?: string | null;
  document_count: number;
  created_at: string;
  updated_at: string;
  message?: string | null;
}

/** Knowledge base with documents */
export interface KnowledgeBaseWithDocuments extends KnowledgeBaseResponse {
  documents: Record<string, any>[];
}

/** Paginated knowledge base response */
export interface PaginatedKnowledgeBaseResponse {
  items: KnowledgeBaseResponse[];
  pagination: PaginationMeta;
}

/** Request to assign knowledge base to agent */
export interface AssignKnowledgeBaseRequest {
  kb_id: number;
}

// =============================================================================
// PHONE NUMBER TYPES
// =============================================================================

/** Phone number information */
export interface PhoneNumberInfo {
  phone_number: string;
  status: string;
  assigned_to_agent_id?: string | null;
  assigned_to_agent_name?: string | null;
}

/** Available phone number from search */
export interface AvailablePhoneNumber {
  phone_number: string;
  locality?: string | null;
  region?: string | null;
  country_code: string;
}

/** Request to search phone numbers */
export interface SearchPhoneNumbersRequest {
  /** Country code (e.g., 'US', 'CA', default: 'US') */
  country_code?: string;
  /** 3-digit area code (e.g., '415') */
  area_code?: string | null;
  /** Provider: 'twilio' or 'telnyx' (default: 'twilio') */
  provider?: string;
}

/** Response from searching phone numbers */
export interface SearchPhoneNumbersResponse {
  results: AvailablePhoneNumber[];
  total_results: number;
}

/** Request to select/purchase or release a phone number */
export interface PurchasePhoneNumberRequest {
  /** Exact phone number (e.g., '+15551234567') */
  phone_number: string;
  /** Provider: 'twilio' or 'telnyx' (default: 'twilio') */
  provider?: string;
}

/** Response from selecting or releasing a phone number */
export interface PurchasePhoneNumberResponse {
  phone_number: string;
  status: string;
}

/** All phone numbers response (non-paginated) */
export interface AllPhoneNumbersResponse {
  phone_numbers: PhoneNumberInfo[];
  total_numbers: number;
  total_available: number;
  total_assigned: number;
}

/** Paginated phone numbers response */
export interface PaginatedPhoneNumberResponse {
  items: AvailablePhoneNumber[];
  pagination: PaginationMeta;
}

/** Paginated all phone numbers response */
export interface PaginatedAllPhoneNumbersResponse {
  items: PhoneNumberInfo[];
  pagination: PaginationMeta;
}

// =============================================================================
// CONNECTION DETAILS TYPES
// =============================================================================

/** Request for connection details */
export interface ConnectionDetailsRequest {
  agent_id?: string | null;
  metadata?: string | null;
  environment?: string | null;
}

/** Response with connection details */
export interface ConnectionDetailsResponse {
  server_url: string;
  participant_token: string;
  call_id: string;
}

/** End call response */
export interface EndCallResponse {
  call_id: string;
  status: string;
  ended_at: string;
  actual_duration_seconds: number;
  credits_used: number;
}

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

/** Configuration for VoiceAI SDK */
export interface VoiceAIConfig {
  /** API key for authentication (required) */
  apiKey: string;
  /** API base URL (optional, defaults to production) */
  apiUrl?: string;
}

/** @deprecated Use VoiceAIConfig instead */
export type VoiceAIClientConfig = VoiceAIConfig;
