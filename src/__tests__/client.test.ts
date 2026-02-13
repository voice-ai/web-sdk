import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import VoiceAI from '../index';
import { VoiceAIError } from '../client';

describe('VoiceAI REST API (agents, analytics, tts, etc.)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as Mock).mockClear();
  });

  describe('REST sub-clients', () => {
    it('should create client with API key', () => {
      const client = new VoiceAI({ apiKey: 'vk_test_key' });
      expect(client).toBeInstanceOf(VoiceAI);
    });

    it('should have all REST sub-clients when API key provided', () => {
      const client = new VoiceAI({ apiKey: 'vk_test_key' });
      expect(client.agents).toBeDefined();
      expect(client.analytics).toBeDefined();
      expect(client.knowledgeBase).toBeDefined();
      expect(client.phoneNumbers).toBeDefined();
      expect(client.tts).toBeDefined();
    });
  });

  describe('AgentClient', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ apiKey: 'vk_test_key' });
    });

    it('should list agents', async () => {
      const mockAgents = {
        items: [{ agent_id: 'agent-1', name: 'Test Agent', status: 'deployed' }],
        pagination: { current_page: 1, total_pages: 1, total_items: 1, limit: 10, has_next: false, has_previous: false },
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgents,
      });

      const result = await client.agents.list({ page: 1, limit: 10 });

      expect(result).toEqual(mockAgents);
    });

    it('should create agent', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'New Agent',
        config: { prompt: 'Test prompt' },
        status: 'paused',
        status_code: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.create({
        name: 'New Agent',
        config: { prompt: 'Test prompt' },
      });

      expect(result).toEqual(mockAgent);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Agent', config: { prompt: 'Test prompt' } }),
        })
      );
    });

    it('should get agent by ID', async () => {
      const mockAgent = { agent_id: 'agent-123', name: 'Test Agent' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.getById('agent-123');

      expect(result).toEqual(mockAgent);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/agent-123',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should update agent', async () => {
      const mockAgent = { agent_id: 'agent-123', name: 'Updated Agent' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.update('agent-123', { name: 'Updated Agent' });

      expect(result).toEqual(mockAgent);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/agent-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Agent' }),
        })
      );
    });

    it('should deploy agent', async () => {
      const mockResponse = {
        agent: { agent_id: 'agent-123', status: 'deployed' },
        message: 'Agent deployed successfully',
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.agents.deploy('agent-123');

      expect(result.message).toBe('Agent deployed successfully');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/agent-123/deploy',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should pause agent', async () => {
      const mockResponse = { agent: { agent_id: 'agent-123', status: 'paused' } };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.agents.pause('agent-123');

      expect(result.agent.status).toBe('paused');
    });

    it('should disable agent', async () => {
      const mockResponse = { agent: { agent_id: 'agent-123', status: 'disabled' }, message: 'Agent disabled' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.agents.disable('agent-123');

      expect(result.message).toBe('Agent disabled');
    });

    it('should get agent status', async () => {
      const mockStatus = {
        agent_id: 'agent-123',
        name: 'Test Agent',
        voice_id: 'voice-1',
        status: 'deployed',
        status_code: 2,
        call_allowed: true,
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockStatus,
      });

      const result = await client.agents.getStatus('agent-123');

      expect(result.call_allowed).toBe(true);
    });
  });

  describe('AnalyticsClient', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ apiKey: 'vk_test_key' });
    });

    it('should get call history', async () => {
      const mockHistory = {
        items: [
          { id: 1, call_timestamp: '2024-01-01T00:00:00Z', call_duration_seconds: 60, credits_used: 1, has_transcript: true },
        ],
        pagination: { current_page: 1, total_pages: 1, total_items: 1, limit: 10, has_next: false, has_previous: false },
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockHistory,
      });

      const result = await client.analytics.getCallHistory({ page: 1, limit: 10 });

      expect(result.items.length).toBe(1);
    });

    it('should get transcript URL', async () => {
      const mockTranscript = { url: 'https://example.com/transcript.json' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTranscript,
      });

      const result = await client.analytics.getTranscriptUrl(12345);

      expect(result.url).toBe('https://example.com/transcript.json');
    });

    it('should get stats summary', async () => {
      const mockStats = {
        total_agents: 10,
        status_summary: { deployed: 5, paused: 4, disabled: 1 },
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockStats,
      });

      const result = await client.analytics.getStatsSummary();

      expect(result.total_agents).toBe(10);
      expect(result.status_summary.deployed).toBe(5);
    });
  });

  describe('KnowledgeBaseClient', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ apiKey: 'vk_test_key' });
    });

    it('should list knowledge bases', async () => {
      const mockKBs = {
        items: [{ kb_id: 1, name: 'Test KB', document_count: 5 }],
        pagination: { current_page: 1, total_pages: 1, total_items: 1, limit: 10, has_next: false, has_previous: false },
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockKBs,
      });

      const result = await client.knowledgeBase.list();

      expect(result).toEqual(mockKBs);
    });

    it('should create knowledge base', async () => {
      const mockKB = { kb_id: 1, name: 'New KB', document_count: 1 };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockKB,
      });

      const result = await client.knowledgeBase.create({
        name: 'New KB',
        documents: [{ content: 'Test content' }],
      });

      expect(result.kb_id).toBe(1);
    });

    it('should get knowledge base by ID', async () => {
      const mockKB = { kb_id: 1, name: 'Test KB', document_count: 5, documents: [] };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockKB,
      });

      const result = await client.knowledgeBase.getById(1);

      expect(result.kb_id).toBe(1);
    });

    it('should update knowledge base', async () => {
      const mockKB = { kb_id: 1, name: 'Updated KB', document_count: 5, documents: [] };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockKB,
      });

      const result = await client.knowledgeBase.update(1, { name: 'Updated KB' });

      expect(result.name).toBe('Updated KB');
    });

    it('should delete knowledge base', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
      });

      await expect(client.knowledgeBase.remove(1)).resolves.toBeUndefined();
    });
  });

  describe('PhoneNumberClient', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ apiKey: 'vk_test_key' });
    });

    it('should list phone numbers', async () => {
      const mockPhones = {
        phone_numbers: [{ phone_number: '+15551234567', status: 'available' }],
        total_numbers: 1,
        total_available: 1,
        total_assigned: 0,
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockPhones,
      });

      const result = await client.phoneNumbers.list();

      expect(result).toEqual(mockPhones);
    });

    it('should search phone numbers', async () => {
      const mockResults = {
        results: [{ phone_number: '+14151234567', locality: 'San Francisco', region: 'CA', country_code: 'US' }],
        total_results: 1,
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResults,
      });

      const result = await client.phoneNumbers.search({
        country_code: 'US',
        area_code: '415',
      });

      expect(result.total_results).toBe(1);
      expect(result.results[0].locality).toBe('San Francisco');
    });

    it('should select phone number', async () => {
      const mockResponse = { phone_number: '+15551234567', status: 'selected' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.phoneNumbers.select('+15551234567', 'twilio');

      expect(result.status).toBe('selected');
    });

    it('should release phone number', async () => {
      const mockResponse = { phone_number: '+15551234567', status: 'released' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.phoneNumbers.release('+15551234567');

      expect(result.status).toBe('released');
    });
  });

  describe('request and response serialization', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ apiKey: 'vk_test_key' });
    });

    it('should send all fields in CreateAgentRequest to the API', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'New Agent',
        config: { prompt: 'Test prompt' },
        status: 'paused',
        status_code: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      await client.agents.create({
        name: 'New Agent',
        config: { prompt: 'Test prompt' },
        foo: true,
        bar: 'baz',
      } as any);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'New Agent',
            config: { prompt: 'Test prompt' },
            foo: true,
            bar: 'baz',
          }),
        })
      );
    });

    it('should send all fields in UpdateAgentRequest to the API', async () => {
      const mockAgent = { agent_id: 'agent-123', name: 'Updated Agent' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      await client.agents.update('agent-123', {
        name: 'Updated Agent',
        notes: 'some_value',
      } as any);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/agent-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Agent',
            notes: 'some_value',
          }),
        })
      );
    });

    it('should send all fields in agent config to the API', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Config Agent',
        config: { prompt: 'Test', custom_a: 42 },
        status: 'paused',
        status_code: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      await client.agents.create({
        name: 'Config Agent',
        config: {
          prompt: 'Test',
          custom_a: 42,
          custom_b: 'hello',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Config Agent',
            config: {
              prompt: 'Test',
              custom_a: 42,
              custom_b: 'hello',
            },
          }),
        })
      );
    });

    it('should preserve all fields in API responses', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Test Agent',
        config: { prompt: 'Test' },
        status: 'deployed',
        status_code: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tags: { key: 'value' },
        labels: ['a', 'b'],
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.getById('agent-123');

      expect(result.agent_id).toBe('agent-123');
      expect((result as any).tags).toEqual({ key: 'value' });
      expect((result as any).labels).toEqual(['a', 'b']);
    });
  });

  describe('TTSClient', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ apiKey: 'vk_test_key' });
    });

    it('should have tts sub-client', () => {
      expect(client.tts).toBeDefined();
    });

    it('should list voices', async () => {
      const mockVoices = [
        { voice_id: 'voice-1', status: 'AVAILABLE', name: 'Default Voice', voice_visibility: 'PUBLIC' },
        { voice_id: 'voice-2', status: 'AVAILABLE', name: 'My Voice', voice_visibility: 'PRIVATE' },
      ];
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockVoices,
      });

      const result = await client.tts.listVoices();

      expect(result).toEqual(mockVoices);
      expect(result.length).toBe(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/voices',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should get voice by ID', async () => {
      const mockVoice = { voice_id: 'voice-123', status: 'AVAILABLE', name: 'Test Voice', voice_visibility: 'PUBLIC' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockVoice,
      });

      const result = await client.tts.getVoice('voice-123');

      expect(result.voice_id).toBe('voice-123');
      expect(result.status).toBe('AVAILABLE');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/voice/voice-123',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should clone voice with file upload', async () => {
      const mockResponse = { voice_id: 'new-voice-id', status: 'PENDING' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const file = new Blob(['fake audio data'], { type: 'audio/mp3' });
      const result = await client.tts.cloneVoice({
        file,
        name: 'My Cloned Voice',
        language: 'en',
        voice_visibility: 'PRIVATE',
      });

      expect(result.voice_id).toBe('new-voice-id');
      expect(result.status).toBe('PENDING');
      
      // Verify FormData was used (no Content-Type header - browser sets it)
      const fetchCall = (global.fetch as Mock).mock.calls[0];
      expect(fetchCall[0]).toBe('https://dev.voice.ai/api/v1/tts/clone-voice');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });

    it('should update voice metadata', async () => {
      const mockVoice = { voice_id: 'voice-123', status: 'AVAILABLE', name: 'Updated Name', voice_visibility: 'PRIVATE' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockVoice,
      });

      const result = await client.tts.updateVoice('voice-123', {
        name: 'Updated Name',
        voice_visibility: 'PRIVATE',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.voice_visibility).toBe('PRIVATE');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/voice/voice-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name', voice_visibility: 'PRIVATE' }),
        })
      );
    });

    it('should delete voice', async () => {
      const mockResponse = { status: 'deleted', voice_id: 'voice-123' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.tts.deleteVoice('voice-123');

      expect(result.status).toBe('deleted');
      expect(result.voice_id).toBe('voice-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/voice/voice-123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should synthesize speech and return blob', async () => {
      const mockBlob = new Blob(['fake audio'], { type: 'audio/mpeg' });
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await client.tts.synthesize({
        text: 'Hello world',
        voice_id: 'voice-123',
        language: 'en',
        audio_format: 'mp3',
      });

      expect(result).toBeInstanceOf(Blob);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/speech',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            text: 'Hello world',
            voice_id: 'voice-123',
            language: 'en',
            audio_format: 'mp3',
          }),
        })
      );
    });

    it('should synthesize speech stream and return response', async () => {
      const mockResponse = {
        ok: true,
        body: 'mock-readable-stream',
      };
      (global.fetch as Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.tts.synthesizeStream({
        text: 'Hello world',
        voice_id: 'voice-123',
        language: 'en',
      });

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/speech/stream',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            text: 'Hello world',
            voice_id: 'voice-123',
            language: 'en',
          }),
        })
      );
    });

    it('should throw VoiceAIError on synthesize failure', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Text is too long' }),
      });

      await expect(client.tts.synthesize({
        text: 'x'.repeat(100000),
        voice_id: 'voice-123',
      })).rejects.toThrow('Text is too long');
    });

    it('should throw VoiceAIError when voice not found', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Voice not found' }),
      });

      await expect(client.tts.getVoice('nonexistent')).rejects.toThrow('Voice not found');
    });
  });

  describe('Error handling', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ apiKey: 'vk_test_key' });
    });

    it('should throw VoiceAIError on 401', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Unauthorized' }),
      });

      try {
        await client.agents.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VoiceAIError);
        expect((error as Error).message).toContain('Authentication failed');
      }
    });

    it('should throw VoiceAIError on 404', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Agent not found' }),
      });

      await expect(client.agents.getById('nonexistent')).rejects.toThrow('Agent not found');
    });

    it('should throw VoiceAIError on 422 validation error', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          detail: [{ loc: ['body', 'name'], msg: 'field required', type: 'value_error.missing' }],
        }),
      });

      await expect(client.agents.create({ name: '', config: {} })).rejects.toThrow('field required');
    });
  });
});
