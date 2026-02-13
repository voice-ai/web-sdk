/**
 * Voice.ai Web SDK
 * 
 * A single, unified SDK for Voice.ai services.
 * 
 * @example
 * ```typescript
 * import VoiceAI from '@voice-ai-labs/web-sdk';
 * 
 * const voiceai = new VoiceAI({ apiKey: 'vk_...' });
 * 
 * // Real-time voice connection
 * await voiceai.connect({ agentId: 'agent-123' });
 * voiceai.onTranscription((seg) => console.log(`${seg.role}: ${seg.text}`));
 * await voiceai.disconnect();
 * 
 * // REST API operations
 * const agents = await voiceai.agents.list();
 * await voiceai.agents.create({ name: 'Support', config: {...} });
 * const history = await voiceai.analytics.getCallHistory();
 * ```
 */

import { Room, RoomEvent, createLocalAudioTrack, Track, RemoteParticipant } from 'livekit-client';
import { VoiceAIError } from './client/base';
import { AgentClient } from './client/agents';
import { AnalyticsClient } from './client/analytics';
import { KnowledgeBaseClient } from './client/knowledge-base';
import { PhoneNumberClient } from './client/phone-numbers';
import { TTSClient } from './client/tts';
import type {
  ConnectionOptions,
  ConnectionDetails,
  TranscriptionSegment,
  ConnectionStatus,
  TranscriptionHandler,
  ConnectionStatusHandler,
  ErrorHandler,
  AudioCaptureOptions,
  AgentState,
  AgentStateInfo,
  AudioLevelInfo,
  MicrophoneState,
  AgentStateHandler,
  AudioLevelHandler,
  MicrophoneStateHandler,
  VoiceAIConfig,
} from './types';

/** Default API URL */
const DEFAULT_API_URL = 'https://dev.voice.ai/api/v1';

/**
 * VoiceAI - The unified Voice.ai SDK
 * 
 * Provides both real-time voice agent connections and REST API access
 * through a single, easy-to-use interface.
 * 
 * @example
 * ```typescript
 * import VoiceAI from '@voice-ai-labs/web-sdk';
 * 
 * const voiceai = new VoiceAI({ apiKey: 'vk_your_api_key' });
 * 
 * // Connect to a voice agent
 * await voiceai.connect({ agentId: 'agent-123' });
 * 
 * // Listen for transcriptions
 * voiceai.onTranscription((segment) => {
 *   console.log(`${segment.role}: ${segment.text}`);
 * });
 * 
 * // Disconnect when done
 * await voiceai.disconnect();
 * ```
 */
export class VoiceAI {
  // ==========================================================================
  // API CLIENTS (REST API)
  // ==========================================================================
  
  /** Agent management - create, update, deploy, pause, delete agents. */
  public get agents(): AgentClient {
    if (!this._agents) throw new VoiceAIError('API key required for agents API. Pass apiKey in the constructor.');
    return this._agents;
  }
  private _agents?: AgentClient;
  
  /** Analytics - call history, transcripts, stats. */
  public get analytics(): AnalyticsClient {
    if (!this._analytics) throw new VoiceAIError('API key required for analytics API. Pass apiKey in the constructor.');
    return this._analytics;
  }
  private _analytics?: AnalyticsClient;
  
  /** Knowledge Base - manage RAG documents. */
  public get knowledgeBase(): KnowledgeBaseClient {
    if (!this._knowledgeBase) throw new VoiceAIError('API key required for knowledgeBase API. Pass apiKey in the constructor.');
    return this._knowledgeBase;
  }
  private _knowledgeBase?: KnowledgeBaseClient;
  
  /** Phone Numbers - search, select, release phone numbers. */
  public get phoneNumbers(): PhoneNumberClient {
    if (!this._phoneNumbers) throw new VoiceAIError('API key required for phoneNumbers API. Pass apiKey in the constructor.');
    return this._phoneNumbers;
  }
  private _phoneNumbers?: PhoneNumberClient;
  
  /** Text-to-Speech - generate speech, manage voices, clone voices. */
  public get tts(): TTSClient {
    if (!this._tts) throw new VoiceAIError('API key required for tts API. Pass apiKey in the constructor.');
    return this._tts;
  }
  private _tts?: TTSClient;

  // ==========================================================================
  // PRIVATE STATE (Real-time voice)
  // ==========================================================================
  
  private room: Room | null = null;
  private connectionStatus: ConnectionStatus = { connected: false, connecting: false };
  private transcriptionHandlers: Set<TranscriptionHandler> = new Set();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private agentStateHandlers: Set<AgentStateHandler> = new Set();
  private audioLevelHandlers: Set<AudioLevelHandler> = new Set();
  private microphoneStateHandlers: Set<MicrophoneStateHandler> = new Set();
  private apiUrl: string;
  private apiKey: string;
  private effectiveApiKey: string = '';
  private cachedConnectionDetails: ConnectionDetails | null = null;
  private currentAgentState: AgentState = 'disconnected';
  private agentParticipantId: string | null = null;
  private audioLevelInterval: number | null = null;

  /**
   * Create a new VoiceAI client
   * 
   * @param config - Configuration options (optional for frontend-only usage)
   * @param config.apiKey - Your Voice.ai API key (required for API operations and `getConnectionDetails`)
   * @param config.apiUrl - Custom API URL (optional, defaults to production)
   */
  constructor(config: VoiceAIConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.apiUrl = config.apiUrl || DEFAULT_API_URL;

    // Initialize API clients when apiKey is provided
    if (this.apiKey) {
      const clientConfig = { apiKey: this.apiKey, apiUrl: this.apiUrl };
      this._agents = new AgentClient(clientConfig);
      this._analytics = new AnalyticsClient(clientConfig);
      this._knowledgeBase = new KnowledgeBaseClient(clientConfig);
      this._phoneNumbers = new PhoneNumberClient(clientConfig);
      this._tts = new TTSClient(clientConfig);
    }
  }

  // ==========================================================================
  // REAL-TIME VOICE CONNECTION
  // ==========================================================================

  /**
   * Get connection details for a voice agent.
   * 
   * Requires an API key. Call this from your backend, then pass the result
   * to `connectRoom()` on the frontend.
   * 
   * @param options - Connection options (agentId, testMode, etc.)
   * @returns Connection details (serverUrl, participantToken, callId)
   * 
   * @example
   * ```typescript
   * // Server-side: get connection details
   * const details = await voiceai.getConnectionDetails({ agentId: 'agent-123' });
   * // Return details to frontend...
   * 
   * // With test mode
   * const details = await voiceai.getConnectionDetails({ 
   *   agentId: 'agent-123', 
   *   testMode: true 
   * });
   * ```
   */
  async getConnectionDetails(options: ConnectionOptions): Promise<ConnectionDetails> {
    return this.fetchConnectionDetails(options);
  }

  /**
   * Connect to a LiveKit room using pre-fetched connection details.
   * 
   * This is the browser-safe method -- it only needs a room token,
   * no API key required. Get the connection details from your backend
   * using `getConnectionDetails()`.
   * 
   * @param connectionDetails - Server URL, participant token, and call ID from your backend
   * @param options - Audio/microphone options
   * 
   * @example
   * ```typescript
   * // Frontend: connect using token from your backend
   * const voiceai = new VoiceAI();
   * await voiceai.connectRoom(
   *   { serverUrl, participantToken, callId },
   *   { autoPublishMic: true }
   * );
   * ```
   */
  async connectRoom(
    connectionDetails: ConnectionDetails,
    options: Pick<ConnectionOptions, 'autoPublishMic' | 'audioOptions' | 'preConnectBuffer'> = {}
  ): Promise<void> {
    if (this.connectionStatus.connecting || this.connectionStatus.connected) {
      throw new Error('Already connected or connecting');
    }

    this.updateStatus({ connecting: true, connected: false });
    this.cachedConnectionDetails = connectionDetails;

    try {
      this.room = new Room();
      this.setupRoomListeners();
      this.room.prepareConnection(connectionDetails.serverUrl, connectionDetails.participantToken);

      const preConnectBuffer = options.preConnectBuffer !== false;

      let connected = false;
      let lastError: unknown;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await Promise.all([
            this.setupAudio(options as ConnectionOptions, preConnectBuffer),
            this.room.connect(connectionDetails.serverUrl, connectionDetails.participantToken)
          ]);
          connected = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!connected) {
        throw lastError || new Error('Failed to connect after 3 attempts');
      }

      this.updateStatus({ connected: true, connecting: false, callId: connectionDetails.callId });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateStatus({ connected: false, connecting: false, error: err.message });
      this.emitError(err);
      throw err;
    }
  }

  /**
   * Connect to a voice agent for real-time conversation.
   * 
   * Convenience method that combines `getConnectionDetails()` + `connectRoom()`.
   * 
   * @param options - Connection options
   * 
   * @example
   * ```typescript
   * await voiceai.connect({ agentId: 'agent-123' });
   * ```
   */
  async connect(options: ConnectionOptions): Promise<void> {
    if (this.connectionStatus.connecting || this.connectionStatus.connected) {
      throw new Error('Already connected or connecting');
    }

    this.updateStatus({ connecting: true, connected: false });

    try {
      // Get connection details via the appropriate method
      const connectionDetails = await this.getOrRefreshConnectionDetails(options);
      
      // Create room instance
      this.room = new Room();
      this.setupRoomListeners();

      // Pre-warm connection
      this.room.prepareConnection(connectionDetails.serverUrl, connectionDetails.participantToken);

      const preConnectBuffer = options.preConnectBuffer !== false;

      // Connect with retry logic
      let connected = false;
      let lastError: unknown;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await Promise.all([
            this.setupAudio(options, preConnectBuffer),
            this.room.connect(connectionDetails.serverUrl, connectionDetails.participantToken)
          ]);
          connected = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!connected) {
        throw lastError || new Error('Failed to connect after 3 attempts');
      }

      this.updateStatus({ connected: true, connecting: false, callId: connectionDetails.callId });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateStatus({ connected: false, connecting: false, error: err.message });
      this.emitError(err);
      throw err;
    }
  }

  /**
   * Disconnect from the room and end the call.
   * 
   * Signals the server to free the concurrency slot using endToken from
   * connection details. Connection details always include end_token when
   * fetched from the API; backends must pass it when using pre-fetched details.
   * If no endToken, the server detects room disconnect as fallback.
   */
  async disconnect(): Promise<void> {
    this.stopAudioLevelMonitoring();
    
    const callId = this.cachedConnectionDetails?.callId;
    const endToken = this.cachedConnectionDetails?.endToken;
    
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.room = null;
    }
    
    // Signal server to free concurrency slot (endToken only - API always returns it)
    if (callId && endToken) {
      try {
        const response = await fetch(`${this.apiUrl}/calls/${encodeURIComponent(callId)}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${endToken}`
          }
        });
        if (!response.ok) {
          console.warn(`[VoiceAI] Failed to end call ${callId}: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.warn(`[VoiceAI] Failed to end call ${callId}:`, err);
      }
    } else if (callId && !endToken) {
      console.warn(`[VoiceAI] No endToken in connection details - pass end_token from your backend to enable immediate teardown`);
    }
    
    this.cachedConnectionDetails = null;
    this.effectiveApiKey = '';
    this.agentParticipantId = null;
    this.updateAgentState('disconnected');
    this.updateStatus({ connected: false, connecting: false });
  }

  /**
   * Check if currently connected to a voice agent
   */
  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get current agent state (listening, speaking, thinking, etc.)
   */
  getAgentState(): AgentStateInfo {
    return {
      state: this.currentAgentState,
      agentParticipantId: this.agentParticipantId || undefined
    };
  }

  /**
   * Get current microphone state
   */
  getMicrophoneState(): MicrophoneState {
    if (!this.room?.localParticipant) {
      return { enabled: false, muted: false };
    }
    const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
    return {
      enabled: micPub !== undefined && micPub.isSubscribed,
      muted: micPub?.isMuted ?? false
    };
  }

  /**
   * Send a text message to the agent
   */
  async sendMessage(text: string): Promise<void> {
    if (!this.room || !this.connectionStatus.connected) {
      throw new Error('Not connected');
    }

    await this.room.localParticipant.sendText(text, { topic: 'lk.chat' });
  }

  /**
   * Enable or disable the microphone
   */
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected');
    }

    await this.room.localParticipant.setMicrophoneEnabled(enabled);
    
    const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
    this.emitMicrophoneState({
      enabled: micPub !== undefined && micPub.isSubscribed,
      muted: micPub?.isMuted ?? false
    });
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Subscribe to transcription events (user and agent speech)
   * @returns Unsubscribe function
   */
  onTranscription(handler: TranscriptionHandler): () => void {
    this.transcriptionHandlers.add(handler);
    return () => this.transcriptionHandlers.delete(handler);
  }

  /**
   * Subscribe to connection status changes
   * @returns Unsubscribe function
   */
  onStatusChange(handler: ConnectionStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Subscribe to error events
   * @returns Unsubscribe function
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Subscribe to agent state changes (listening, speaking, thinking)
   * @returns Unsubscribe function
   */
  onAgentStateChange(handler: AgentStateHandler): () => void {
    this.agentStateHandlers.add(handler);
    handler({ state: this.currentAgentState, agentParticipantId: this.agentParticipantId || undefined });
    return () => this.agentStateHandlers.delete(handler);
  }

  /**
   * Subscribe to audio level updates (for visualizations)
   * @returns Unsubscribe function
   */
  onAudioLevel(handler: AudioLevelHandler): () => void {
    this.audioLevelHandlers.add(handler);
    return () => this.audioLevelHandlers.delete(handler);
  }

  /**
   * Subscribe to microphone state changes
   * @returns Unsubscribe function
   */
  onMicrophoneStateChange(handler: MicrophoneStateHandler): () => void {
    this.microphoneStateHandlers.add(handler);
    if (this.room?.localParticipant) {
      const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      handler({
        enabled: micPub !== undefined && micPub.isSubscribed,
        muted: micPub?.isMuted ?? false
      });
    }
    return () => this.microphoneStateHandlers.delete(handler);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return true;
      return payload.exp * 1000 <= Date.now() + 60 * 1000;
    } catch {
      return true;
    }
  }

  private async getOrRefreshConnectionDetails(options: ConnectionOptions): Promise<ConnectionDetails> {
    // Mode 1: Pre-fetched connection details provided directly
    if (options.serverUrl && options.participantToken) {
      const details: ConnectionDetails = {
        serverUrl: options.serverUrl,
        participantToken: options.participantToken,
        callId: options.callId || '',
        endToken: options.endToken,
      };
      this.cachedConnectionDetails = details;
      return details;
    }

    // Use cached details if still valid
    if (this.cachedConnectionDetails && !this.isTokenExpired(this.cachedConnectionDetails.participantToken)) {
      return this.cachedConnectionDetails;
    }
    
    // Mode 2: Direct API call with API key (constructor or per-call)
    if (!this.apiKey && !options.apiKey) {
      throw new Error(
        'No authentication method configured. Use one of:\n' +
        '1. connectRoom() with pre-fetched details from your backend\n' +
        '2. API key: new VoiceAI({ apiKey: "vk_..." }) or connect({ apiKey: "vk_..." })'
      );
    }

    const connectionDetails = await this.fetchConnectionDetails(options);
    this.cachedConnectionDetails = connectionDetails;
    return connectionDetails;
  }

  /**
   * Fetch connection details from the developer's backend endpoint.
   * The backend holds the API key and calls the Voice.AI API server-side.
   */
  /**
   * Fetch connection details using the API key directly.
   * Used by the public getConnectionDetails() method.
   */
  private async fetchConnectionDetails(options: ConnectionOptions): Promise<ConnectionDetails> {
    if (!this.apiKey && !options.apiKey) {
      throw new Error('API key is required for getConnectionDetails(). Pass { apiKey: "vk_..." } to the constructor or options.');
    }
    return this.fetchConnectionDetailsFromApi(options);
  }

  private async fetchConnectionDetailsFromApi(options: ConnectionOptions): Promise<ConnectionDetails> {
    const url = options.apiUrl || this.apiUrl;
    // Use test-connection-details for testMode (allows testing paused/undeployed agents)
    const endpointPath = options.testMode 
      ? '/connection/test-connection-details' 
      : '/connection/connection-details';
    const endpoint = `${url}${endpointPath}`;

    const requestData: Record<string, any> = {};
    if (options.agentId) requestData.agent_id = options.agentId;
    if (options.agentConfig) {
      requestData.metadata = JSON.stringify(options.agentConfig);
    } else if (options.metadata) {
      requestData.metadata = options.metadata;
    }
    if (options.environment) {
      requestData.environment = typeof options.environment === 'string' 
        ? options.environment 
        : JSON.stringify(options.environment);
    }

    const apiKey = options.apiKey || this.apiKey;
    this.effectiveApiKey = apiKey;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      
      if (response.status === 403 && (
        errorData.code === 'CALL_VALIDATION_FAILED' || 
        errorData.detail?.code === 'CALL_VALIDATION_FAILED' ||
        errorData.error === 'CALL_VALIDATION_FAILED'
      )) {
        const reason = errorData.reason || errorData.detail?.reason || errorData.error?.reason || 'blocked';
        throw new Error(`Call validation failed: ${reason}`);
      }
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      }
      
      throw new Error(errorData.detail || errorData.error || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      serverUrl: data.server_url,
      participantToken: data.participant_token,
      callId: data.call_id,
      endToken: data.end_token,
    };
  }

  private async setupAudio(options: ConnectionOptions, preConnectBuffer: boolean): Promise<void> {
    if (!this.room || options.autoPublishMic === false) return;

    try {
      await this.room.startAudio();
      const audioOpts = options.audioOptions || generateOptimalAudioOptions();
      const audioTrack = await createLocalAudioTrack(audioOpts);
      await this.room.localParticipant.publishTrack(audioTrack, { preConnectBuffer });
    } catch {
      // Continue even if audio setup fails
    }
  }

  private setupRoomListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      this.updateStatus({ connected: true, connecting: false });
      this.updateAgentState('connecting');
      this.detectAgentParticipant();
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.updateStatus({ connected: false, connecting: false });
      this.updateAgentState('disconnected');
      this.agentParticipantId = null;
      this.stopAudioLevelMonitoring();
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: any) => {
      if (participant instanceof RemoteParticipant) {
        this.detectAgentParticipant();
      }
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
      if (participant instanceof RemoteParticipant && participant.identity === this.agentParticipantId) {
        this.updateAgentState('disconnected');
        this.agentParticipantId = null;
      }
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: any, _publication: any, participant: any) => {
      if (track.kind === 'audio' && participant instanceof RemoteParticipant) {
        const audioElement = track.attach();
        audioElement.id = `voice-agent-audio-${participant.identity}`;
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        
        if (participant.identity === this.agentParticipantId || !this.agentParticipantId) {
          this.agentParticipantId = participant.identity;
          this.startAudioLevelMonitoring(track);
          this.updateAgentState('listening');
        }
      }
    });
    
    this.room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
      if (track.kind === 'audio') {
        const elements = track.detach();
        elements.forEach((el: HTMLElement) => el.remove());
      }
    });

    this.room.on(RoomEvent.TranscriptionReceived, (segments: any[], participant: any) => {
      for (const segment of segments) {
        const isAgent = participant instanceof RemoteParticipant;
        const segmentId = segment.id || segment.segmentId || `${participant?.identity || 'unknown'}-${segment.firstReceivedTime || Date.now()}`;
        this.emitTranscription({
          id: segmentId,
          text: segment.text || segment.final || '',
          role: isAgent ? 'assistant' : 'user',
          timestamp: segment.firstReceivedTime || segment.timestamp || Date.now(),
          isFinal: segment.final !== undefined ? Boolean(segment.final) : segment.isFinal ?? false
        });
      }
    });

    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: any, _kind?: any, topic?: string) => {
      if (participant instanceof RemoteParticipant) {
        try {
          const text = new TextDecoder().decode(payload);
          
          // Handle chat topic
          if (topic === 'lk.chat') {
            const chatMsgId = `chat-${participant?.identity || 'unknown'}-${Date.now()}`;
            try {
              const data = JSON.parse(text);
              this.emitTranscription({
                id: data.id || chatMsgId,
                text: data.message || data.text || text,
                role: 'assistant',
                timestamp: data.timestamp || Date.now(),
                isFinal: true
              });
            } catch {
              this.emitTranscription({
                id: chatMsgId,
                text,
                role: 'assistant',
                timestamp: Date.now(),
                isFinal: true
              });
            }
          }
          
          // Try to parse as JSON for agent state updates
          try {
            const data = JSON.parse(text);
            if (data.type === 'agent_state' && data.state) {
              this.updateAgentState(data.state as AgentState);
            }
          } catch {
            // Not JSON, ignore
          }
        } catch {
          // Ignore non-text data
        }
      }
    });

    this.room.on(RoomEvent.MediaDevicesError, (error: any) => {
      this.emitError(new Error(`Media device error: ${error.message || String(error)}`));
    });
  }

  private detectAgentParticipant(): void {
    if (!this.room) return;
    
    for (const participant of this.room.remoteParticipants.values()) {
      const identity = participant.identity || '';
      if (identity.includes('agent') || identity.includes('assistant')) {
        this.agentParticipantId = participant.identity;
        this.updateAgentState('initializing');
        return;
      }
    }
    
    if (this.room.remoteParticipants.size > 0 && !this.agentParticipantId) {
      const firstParticipant = Array.from(this.room.remoteParticipants.values())[0];
      this.agentParticipantId = firstParticipant.identity;
      this.updateAgentState('initializing');
    }
  }

  private startAudioLevelMonitoring(track: any): void {
    this.stopAudioLevelMonitoring();
    
    if (!track?.mediaStreamTrack) return;
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(new MediaStream([track.mediaStreamTrack]));
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let isRunning = true;
    let speakingDebounce = 0;
    
    const updateLevel = () => {
      if (!isRunning || !this.room || this.room.state === 'disconnected') {
        audioContext.close();
        return;
      }
      
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0, maxVal = 0;
      for (let i = 2; i < Math.min(50, dataArray.length); i++) {
        sum += dataArray[i];
        if (dataArray[i] > maxVal) maxVal = dataArray[i];
      }
      const average = sum / 48;
      const combined = average * 0.6 + maxVal * 0.4;
      const level = Math.min(combined / 255, 1);
      const isSpeaking = level > 0.05;
      
      this.emitAudioLevel({ level, isSpeaking });
      
      if (isSpeaking) {
        speakingDebounce = 10;
        if (this.currentAgentState === 'listening') this.updateAgentState('speaking');
      } else {
        speakingDebounce--;
        if (speakingDebounce <= 0 && this.currentAgentState === 'speaking') {
          this.updateAgentState('listening');
        }
      }
      
      this.audioLevelInterval = requestAnimationFrame(updateLevel) as unknown as number;
    };
    
    this.audioLevelInterval = requestAnimationFrame(updateLevel) as unknown as number;
    (this as any)._audioContext = audioContext;
    (this as any)._audioMonitoringRunning = () => { isRunning = false; };
  }

  private stopAudioLevelMonitoring(): void {
    if (this.audioLevelInterval !== null) {
      cancelAnimationFrame(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    
    if ((this as any)._audioMonitoringRunning) {
      (this as any)._audioMonitoringRunning();
      (this as any)._audioMonitoringRunning = null;
    }
    
    const audioContext = (this as any)._audioContext as AudioContext | null;
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
    (this as any)._audioContext = null;
  }

  private updateAgentState(state: AgentState): void {
    if (this.currentAgentState === state) return;
    this.currentAgentState = state;
    this.emitAgentState({ state, agentParticipantId: this.agentParticipantId || undefined });
  }

  private updateStatus(status: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.statusHandlers.forEach(handler => handler(this.connectionStatus));
  }

  private emitTranscription(segment: TranscriptionSegment): void {
    this.transcriptionHandlers.forEach(handler => handler(segment));
  }

  private emitError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  private emitAgentState(state: AgentStateInfo): void {
    this.agentStateHandlers.forEach(handler => handler(state));
  }

  private emitAudioLevel(level: AudioLevelInfo): void {
    this.audioLevelHandlers.forEach(handler => handler(level));
  }

  private emitMicrophoneState(state: MicrophoneState): void {
    this.microphoneStateHandlers.forEach(handler => handler(state));
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/** Default export - the VoiceAI class */
export default VoiceAI;

/** Error class for API errors */
export { VoiceAIError } from './client/base';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Re-export only types that users interact with directly.
// Method parameter and return types are inferred by TypeScript --
// users don't need to import CreateAgentRequest, PaginatedAgentResponse, etc.
export type {
  VoiceAIConfig,
  ConnectionOptions,
  ConnectionDetails,
  ConnectionStatus,
  TranscriptionSegment,
  AgentState,
  AgentStateInfo,
  AudioLevelInfo,
  MicrophoneState,
  Agent,
  VoiceResponse,
  VoiceStatus,
} from './types';

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate optimized audio capture options for voice agents
 * 
 * @param options - Optional overrides
 * @returns AudioCaptureOptions optimized for voice
 */
export function generateOptimalAudioOptions(options?: Partial<AudioCaptureOptions>): AudioCaptureOptions {
  let supportsVoiceIsolation = false;
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getSupportedConstraints) {
    const supported = navigator.mediaDevices.getSupportedConstraints();
    supportsVoiceIsolation = 'voiceIsolation' in supported && Boolean(supported.voiceIsolation);
  }

  const optimalOptions: AudioCaptureOptions = {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: true,
  };

  if (supportsVoiceIsolation) {
    optimalOptions.voiceIsolation = true;
  }

  return { ...optimalOptions, ...options };
}

// =============================================================================
// UI COMPONENTS (SAMPLE)
// =============================================================================

export { VoiceAgentWidget } from './components/VoiceAgentWidget';
export type { VoiceAgentWidgetOptions, VoiceAgentWidgetTheme } from './components/VoiceAgentWidget';
