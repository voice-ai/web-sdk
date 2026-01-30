import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { VoiceAI } from '../index';
import { Room, RoomEvent } from 'livekit-client';

// Mock livekit-client
vi.mock('livekit-client', () => {
  const mockRoom = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    prepareConnection: vi.fn(),
    startAudio: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    state: 'disconnected',
    localParticipant: {
      setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
      publishTrack: vi.fn().mockResolvedValue(undefined),
      publishData: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue(undefined),
      getTrackPublication: vi.fn().mockReturnValue({
        isSubscribed: true,
        isMuted: false,
      }),
    },
  };

  return {
    Room: vi.fn(() => mockRoom),
    RoomEvent: {
      Connected: 'connected',
      Disconnected: 'disconnected',
      ParticipantConnected: 'participantConnected',
      ParticipantDisconnected: 'participantDisconnected',
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
      TranscriptionReceived: 'transcriptionReceived',
      DataReceived: 'dataReceived',
      MediaDevicesError: 'mediaDevicesError',
    },
    createLocalAudioTrack: vi.fn().mockResolvedValue({
      kind: 'audio',
    }),
    Track: {
      Source: {
        Microphone: 'microphone',
        Camera: 'camera',
        ScreenShare: 'screen_share',
      },
    },
    RemoteParticipant: class {},
    LocalParticipant: class {},
  };
});

describe('VoiceAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as Mock).mockClear();
  });

  describe('constructor', () => {
    it('should throw error if no API key provided', () => {
      expect(() => new VoiceAI({} as any)).toThrow('API key is required');
    });

    it('should initialize with API key', () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test_key' });
      expect(sdk).toBeInstanceOf(VoiceAI);
    });

    it('should initialize with custom API URL', () => {
      const sdk = new VoiceAI({
        apiKey: 'vk_test_key',
        apiUrl: 'https://api.example.com/api/v1',
      });
      expect(sdk).toBeInstanceOf(VoiceAI);
    });
  });

  describe('connect', () => {
    it('should throw error if already connected', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      
      // Mock successful connection
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });

      // Try to connect again
      await expect(sdk.connect({ agentId: 'agent-123' })).rejects.toThrow(
        'Already connected or connecting'
      );
    });

    it('should call connection details API with correct payload', async () => {
      const sdk = new VoiceAI({
        apiUrl: 'https://api.example.com/api/v1',
        apiKey: 'vk_test_key',
      });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/connection/connection-details',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer vk_test_key',
          }),
          body: JSON.stringify({ agent_id: 'agent-123' }),
        })
      );
    });

    it('should handle API errors (401)', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_invalid' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(sdk.connect({ agentId: 'agent-123' })).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should handle call validation failures (403)', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          code: 'CALL_VALIDATION_FAILED',
          reason: 'insufficient_credits',
        }),
      });

      await expect(sdk.connect({ agentId: 'agent-123' })).rejects.toThrow(
        'Call validation failed: insufficient_credits'
      );
    });

    it('should connect to room with connection details', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });

      const Room = (await import('livekit-client')).Room;
      const mockRoom = Room as unknown as { mock: { calls: any[] } };
      
      expect(mockRoom.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from room', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });
      await sdk.disconnect();

      expect(sdk.isConnected()).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('should register transcription handler', () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      const handler = vi.fn();
      
      const unsubscribe = sdk.onTranscription(handler);
      expect(unsubscribe).toBeInstanceOf(Function);
      
      unsubscribe();
    });

    it('should register status change handler', () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      const handler = vi.fn();
      
      const unsubscribe = sdk.onStatusChange(handler);
      expect(unsubscribe).toBeInstanceOf(Function);
      
      unsubscribe();
    });

    it('should register error handler', () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      const handler = vi.fn();
      
      const unsubscribe = sdk.onError(handler);
      expect(unsubscribe).toBeInstanceOf(Function);
      
      unsubscribe();
    });
  });

  describe('status methods', () => {
    it('should return connection status', () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      const status = sdk.getStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('connecting');
      expect(status.connected).toBe(false);
      expect(status.connecting).toBe(false);
    });

    it('should check if connected', () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      expect(sdk.isConnected()).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should throw error if not connected', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      
      await expect(sdk.sendMessage('hello')).rejects.toThrow('Not connected');
    });
  });

  describe('setMicrophoneEnabled', () => {
    it('should throw error if not connected', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      
      await expect(sdk.setMicrophoneEnabled(true)).rejects.toThrow('Not connected');
    });

    it('should enable microphone when connected', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });
      await sdk.setMicrophoneEnabled(true);

      const Room = (await import('livekit-client')).Room;
      const mockRoom = (Room as any).mock.results[0].value;
      expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('sendMessage', () => {
    it('should send message when connected', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });
      await sdk.sendMessage('Hello agent');

      const Room = (await import('livekit-client')).Room;
      const mockRoom = (Room as any).mock.results[0].value;
      expect(mockRoom.localParticipant.sendText).toHaveBeenCalledWith('Hello agent', { topic: 'lk.chat' });
    });
  });

  describe('connect with different options', () => {
    it('should handle agentConfig option', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({
        agentConfig: { prompt: 'test', voice_id: 'voice-123' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            metadata: JSON.stringify({ prompt: 'test', voice_id: 'voice-123' }),
          }),
        })
      );
    });

    it('should handle metadata string option', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ metadata: '{"test": "value"}' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ metadata: '{"test": "value"}' }),
        })
      );
    });

    it('should handle environment as string', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123', environment: '{"env": "test"}' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            agent_id: 'agent-123',
            environment: '{"env": "test"}',
          }),
        })
      );
    });

    it('should handle environment as object', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123', environment: { env: 'test' } });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            agent_id: 'agent-123',
            environment: JSON.stringify({ env: 'test' }),
          }),
        })
      );
    });

    it('should handle autoPublishMic false', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123', autoPublishMic: false });

      const Room = (await import('livekit-client')).Room;
      const mockRoom = (Room as any).mock.results[0].value;
      expect(mockRoom.localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
    });

    it('should handle custom audioOptions', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({
        agentId: 'agent-123',
        audioOptions: { echoCancellation: true, sampleRate: 16000 },
      });

      const { createLocalAudioTrack } = await import('livekit-client');
      expect(createLocalAudioTrack).toHaveBeenCalledWith({
        echoCancellation: true,
        sampleRate: 16000,
      });
    });
  });

  describe('disconnect error handling', () => {
    it('should handle disconnect errors gracefully', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });

      const Room = (await import('livekit-client')).Room;
      const mockRoom = (Room as any).mock.results[0].value;
      mockRoom.disconnect.mockRejectedValueOnce(new Error('Disconnect failed'));

      // Should not throw
      await sdk.disconnect();
      expect(sdk.isConnected()).toBe(false);
    });
  });

  describe('event emission', () => {
    it('should emit transcription events', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      const transcriptionHandler = vi.fn();

      sdk.onTranscription(transcriptionHandler);

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });

      // Simulate DataReceived event
      const Room = (await import('livekit-client')).Room;
      const mockRoom = (Room as any).mock.results[0].value;
      const onCallbacks = mockRoom.on.mock.calls;
      
      // Find DataReceived callback
      const dataReceivedCallback = onCallbacks.find(
        (call: any[]) => call[0] === 'dataReceived'
      )?.[1];

      if (dataReceivedCallback) {
        const { RemoteParticipant } = await import('livekit-client');
        const mockParticipant = Object.create(RemoteParticipant.prototype);
        // Send as lk.chat message with proper JSON format
        const chatMessage = JSON.stringify({ message: 'Hello from agent', id: 'msg-1', timestamp: Date.now() });
        const payload = new TextEncoder().encode(chatMessage);
        // Pass topic as 4th argument (payload, participant, kind, topic)
        dataReceivedCallback(payload, mockParticipant, undefined, 'lk.chat');
        
        expect(transcriptionHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Hello from agent',
            role: 'assistant',
            isFinal: true,
          })
        );
      }
    });

    it('should emit status change events', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      const statusHandler = vi.fn();

      sdk.onStatusChange(statusHandler);

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      await sdk.connect({ agentId: 'agent-123' });

      expect(statusHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          connecting: false,
          callId: 'call123',
        })
      );
    });

    it('should emit error events', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });
      const errorHandler = vi.fn();

      sdk.onError(errorHandler);

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      try {
        await sdk.connect({ agentId: 'agent-123' });
      } catch (e) {
        // Expected to throw
      }

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Authentication failed'),
        })
      );
    });
  });

  describe('connection retry logic', () => {
    it('should retry on connection failure', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      // Get the mock room instance that will be created
      const Room = (await import('livekit-client')).Room;
      const RoomMock = Room as any;
      
      // First two attempts fail, third succeeds
      let callCount = 0;
      RoomMock.mockImplementation(() => {
        const mockRoom = {
          connect: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.reject(new Error('Connection failed 1'));
            if (callCount === 2) return Promise.reject(new Error('Connection failed 2'));
            return Promise.resolve(undefined);
          }),
          disconnect: vi.fn().mockResolvedValue(undefined),
          prepareConnection: vi.fn(),
          startAudio: vi.fn().mockResolvedValue(undefined),
          on: vi.fn(),
          off: vi.fn(),
          state: 'disconnected',
          localParticipant: {
            setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
            publishTrack: vi.fn().mockResolvedValue(undefined),
            publishData: vi.fn().mockResolvedValue(undefined),
          },
        };
        return mockRoom;
      });

      await sdk.connect({ agentId: 'agent-123' });

      expect(sdk.isConnected()).toBe(true);
    });

    it('should throw after max retries', async () => {
      const sdk = new VoiceAI({ apiKey: 'vk_test' });

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          server_url: 'wss://test.com',
          participant_token: 'token123',
          call_id: 'call123',
        }),
      });

      const Room = (await import('livekit-client')).Room;
      const RoomMock = Room as any;
      
      RoomMock.mockImplementation(() => {
        const mockRoom = {
          connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
          disconnect: vi.fn().mockResolvedValue(undefined),
          prepareConnection: vi.fn(),
          startAudio: vi.fn().mockResolvedValue(undefined),
          on: vi.fn(),
          off: vi.fn(),
          state: 'disconnected',
          localParticipant: {
            setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
            publishTrack: vi.fn().mockResolvedValue(undefined),
            publishData: vi.fn().mockResolvedValue(undefined),
          },
        };
        return mockRoom;
      });

      await expect(sdk.connect({ agentId: 'agent-123' })).rejects.toThrow();
    });
  });
});
