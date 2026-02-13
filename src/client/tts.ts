/**
 * Text-to-Speech (TTS) Client
 * 
 * Provides methods for:
 * - Generating speech from text (synchronous and streaming)
 * - Listing available voices
 * - Getting voice details
 * - Cloning voices from audio samples
 * - Updating and deleting voices
 */

import { BaseClient, BaseClientConfig } from './base';
import type {
  SynthesizeRequest,
  CloneVoiceOptions,
  CloneVoiceResponse,
  VoiceResponse,
  UpdateVoiceOptions,
  DeleteVoiceResponse,
} from '../types';

/**
 * Client for Text-to-Speech operations
 * 
 * @example
 * ```typescript
 * // List available voices
 * const voices = await client.tts.listVoices();
 * 
 * // Generate speech
 * const audio = await client.tts.synthesize({
 *   text: 'Hello world!',
 *   voice_id: 'voice-123',
 *   language: 'en',
 * });
 * 
 * // Clone a voice
 * const cloned = await client.tts.cloneVoice({
 *   file: audioFile,
 *   name: 'My Voice',
 *   language: 'en',
 * });
 * ```
 */
export class TTSClient extends BaseClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  // ==========================================================================
  // SPEECH GENERATION
  // ==========================================================================

  /**
   * Generate speech from text (returns complete audio file)
   * 
   * This is the synchronous endpoint - it blocks until generation completes
   * and returns the entire audio file as a Blob. For lower latency with
   * chunked streaming, use {@link synthesizeStream}.
   * 
   * @param options - Speech generation options
   * @returns Audio blob in the requested format
   * 
   * @example
   * ```typescript
   * const audio = await client.tts.synthesize({
   *   text: 'Hello, welcome to Voice AI!',
   *   voice_id: 'voice-123',
   *   language: 'en',
   *   audio_format: 'mp3',
   * });
   * 
   * // Play in browser
   * const url = URL.createObjectURL(audio);
   * new Audio(url).play();
   * 
   * // Or download
   * const a = document.createElement('a');
   * a.href = url;
   * a.download = 'speech.mp3';
   * a.click();
   * ```
   */
  async synthesize(options: SynthesizeRequest): Promise<Blob> {
    return this.postForBlob('/tts/speech', options);
  }

  /**
   * Generate speech from text with HTTP chunked streaming
   * 
   * Returns a Response object with a readable body stream. Audio chunks
   * are sent to the client as they are generated, providing lower perceived
   * latency than {@link synthesize}.
   * 
   * @param options - Speech generation options
   * @returns Fetch Response with streaming body
   * 
   * @example
   * ```typescript
   * const response = await client.tts.synthesizeStream({
   *   text: 'Hello, welcome to Voice AI!',
   *   voice_id: 'voice-123',
   *   language: 'en',
   * });
   * 
   * // Read chunks as they arrive
   * const reader = response.body!.getReader();
   * while (true) {
   *   const { done, value } = await reader.read();
   *   if (done) break;
   *   // Process audio chunk (Uint8Array)
   *   console.log('Received chunk:', value.length, 'bytes');
   * }
   * 
   * // Or collect all chunks and create a blob
   * const response = await client.tts.synthesizeStream({ text: '...', voice_id: '...' });
   * const blob = await response.blob();
   * ```
   */
  async synthesizeStream(options: SynthesizeRequest): Promise<Response> {
    return this.postForStream('/tts/speech/stream', options);
  }

  // ==========================================================================
  // VOICE MANAGEMENT
  // ==========================================================================

  /**
   * List voices available to the current user
   * 
   * Returns voices owned by the authenticated user plus default/public voices.
   * Deleted voices are excluded.
   * 
   * @returns Array of voice objects
   * 
   * @example
   * ```typescript
   * const voices = await client.tts.listVoices();
   * 
   * for (const voice of voices) {
   *   console.log(`${voice.name} (${voice.voice_id}): ${voice.status}`);
   * }
   * 
   * // Filter to only available voices
   * const available = voices.filter(v => v.status === 'AVAILABLE');
   * ```
   */
  async listVoices(): Promise<VoiceResponse[]> {
    return this.get<VoiceResponse[]>('/tts/voices');
  }

  /**
   * Get voice details and status
   * 
   * Useful for polling the status of a voice clone operation
   * (PENDING -> PROCESSING -> AVAILABLE).
   * 
   * Access control:
   * - PUBLIC voices: readable by any authenticated user
   * - PRIVATE voices: readable only by owner (returns 404 otherwise)
   * 
   * @param voiceId - The voice ID
   * @returns Voice details and status
   * 
   * @example
   * ```typescript
   * const voice = await client.tts.getVoice('voice-123');
   * 
   * if (voice.status === 'AVAILABLE') {
   *   console.log('Voice is ready to use!');
   * } else if (voice.status === 'PROCESSING') {
   *   console.log('Voice is still being processed...');
   * }
   * ```
   */
  async getVoice(voiceId: string): Promise<VoiceResponse> {
    return this.get<VoiceResponse>(`/tts/voice/${encodeURIComponent(voiceId)}`);
  }

  /**
   * Clone a voice from a reference audio file
   * 
   * Accepts an audio file (MP3, WAV, or OGG, max 7.5MB) and creates
   * a cloned voice. The voice starts in PENDING status and moves to
   * PROCESSING, then AVAILABLE once ready.
   * 
   * Use {@link getVoice} to poll the voice status.
   * 
   * @param options - Clone voice options including audio file
   * @returns Created voice with ID and initial status (PENDING)
   * 
   * @example
   * ```typescript
   * // From a file input
   * const fileInput = document.querySelector('input[type="file"]');
   * const file = fileInput.files[0];
   * 
   * const voice = await client.tts.cloneVoice({
   *   file: file,
   *   name: 'My Custom Voice',
   *   language: 'en',
   *   voice_visibility: 'PRIVATE',
   * });
   * 
   * console.log('Voice ID:', voice.voice_id);
   * console.log('Status:', voice.status); // 'PENDING'
   * 
   * // Poll until ready
   * let status = voice.status;
   * while (status !== 'AVAILABLE' && status !== 'FAILED') {
   *   await new Promise(r => setTimeout(r, 2000));
   *   const updated = await client.tts.getVoice(voice.voice_id);
   *   status = updated.status;
   *   console.log('Status:', status);
   * }
   * ```
   */
  async cloneVoice(options: CloneVoiceOptions): Promise<CloneVoiceResponse> {
    const formData = new FormData();
    formData.append('file', options.file);

    if (options.name !== undefined) {
      formData.append('name', options.name);
    }
    if (options.voice_visibility !== undefined) {
      formData.append('voice_visibility', options.voice_visibility);
    }
    if (options.language !== undefined) {
      formData.append('language', options.language);
    }

    return this.postFormData<CloneVoiceResponse>('/tts/clone-voice', formData);
  }

  /**
   * Update voice metadata (name and/or visibility)
   * 
   * Only the voice owner can update a voice.
   * 
   * @param voiceId - The voice ID to update
   * @param options - Fields to update
   * @returns Updated voice details
   * 
   * @example
   * ```typescript
   * // Rename a voice
   * const updated = await client.tts.updateVoice('voice-123', {
   *   name: 'New Voice Name',
   * });
   * 
   * // Make a voice private
   * const updated = await client.tts.updateVoice('voice-123', {
   *   voice_visibility: 'PRIVATE',
   * });
   * ```
   */
  async updateVoice(voiceId: string, options: UpdateVoiceOptions): Promise<VoiceResponse> {
    return this.patch<VoiceResponse>(`/tts/voice/${encodeURIComponent(voiceId)}`, options);
  }

  /**
   * Delete a voice
   * 
   * Only the voice owner can delete a voice. The voice will no longer
   * appear in voice listings.
   * 
   * @param voiceId - The voice ID to delete
   * @returns Deletion confirmation
   * 
   * @example
   * ```typescript
   * await client.tts.deleteVoice('voice-123');
   * console.log('Voice deleted');
   * ```
   */
  async deleteVoice(voiceId: string): Promise<DeleteVoiceResponse> {
    return this.httpDelete<DeleteVoiceResponse>(`/tts/voice/${encodeURIComponent(voiceId)}`);
  }
}
