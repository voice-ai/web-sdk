import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import VoiceAI, { IANA_TIMEZONE_OPTIONS, getGoogleReconnectState, getRequiredGoogleScopes } from '../index';
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
      expect(client.models).toBeDefined();
      expect(client.managedTools).toBeDefined();
    });

    it('should have managed tools client when auth token provider provided', () => {
      const client = new VoiceAI({ getAuthToken: async () => 'jwt_token' });
      expect(client.managedTools).toBeDefined();
    });
  });


  describe('ModelsClient', () => {
    it('should list supported models', async () => {
      const client = new VoiceAI({ apiKey: 'vk_test_key' });
      const mockModels = {
        llm_models: ['openai/gpt-oss-120b-maas', 'zai-org/glm-5-maas'],
        tts_models: ['voiceai-tts-v1-latest'],
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockModels,
      });

      const result = await client.models.list();

      expect(result).toEqual(mockModels);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer vk_test_key',
          }),
        })
      );
    });
  });

  describe('ManagedToolsClient', () => {
    let client: VoiceAI;

    beforeEach(() => {
      client = new VoiceAI({ authToken: 'jwt_test_token' });
    });

    it('should start Google OAuth with draft managed tools', async () => {
      const mockResponse = {
        auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?state=test',
        requested_scopes: [
          'openid',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/gmail.send',
        ],
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.managedTools.google.startOAuth('agent-123', {
        returnUrl: 'https://app.example.com/agents/agent-123?tab=tools',
        managedTools: {
          google_gmail: {
            enabled: true,
            selected_operations: ['google_gmail_send_email'],
          },
        },
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/google/agent-123/oauth/start',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer jwt_test_token',
          }),
          body: JSON.stringify({
            return_path: 'https://app.example.com/agents/agent-123?tab=tools',
            managed_tools: {
              google_gmail: {
                enabled: true,
                selected_operations: ['google_gmail_send_email'],
              },
            },
          }),
        })
      );
    });

    it('should fetch Google connection status with token provider auth', async () => {
      const tokenProviderClient = new VoiceAI({ getAuthToken: async () => 'jwt_provider_token' });
      const mockStatus = {
        connected: true,
        agent_id: 'agent-123',
        email: 'user@example.com',
        granted_scopes: ['https://www.googleapis.com/auth/calendar'],
        scopes: ['https://www.googleapis.com/auth/calendar'],
        required_scopes: ['openid'],
        missing_scopes: [],
        reconnect_required: false,
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockStatus,
      });

      const result = await tokenProviderClient.managedTools.google.getStatus('agent-123');

      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/google/agent-123/status',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer jwt_provider_token',
          }),
        })
      );
    });

    it('should disconnect Google connection', async () => {
      const mockResponse = { disconnected: true, agent_id: 'agent-123' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.managedTools.google.disconnect('agent-123');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/google/agent-123/disconnect',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Managed Google helpers', () => {
    it('should derive minimal Google scopes from enabled tools and operations', () => {
      const scopes = getRequiredGoogleScopes({
        google_calendar: { enabled: true },
        google_gmail: {
          enabled: true,
          selected_operations: ['google_gmail_get_message'],
        },
      });

      expect(scopes).toEqual([
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.readonly',
      ]);
    });

    it('should not request Calendar or Sheets scopes when selected operations are explicitly empty', () => {
      const scopes = getRequiredGoogleScopes({
        google_calendar: { enabled: true, selected_operations: [] },
        google_sheets: { enabled: true, selected_operations: [] },
      });

      expect(scopes).toEqual([
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ]);
    });

    it('should mark reconnect required only when connected and missing draft scopes', () => {
      const reconnectState = getGoogleReconnectState(
        {
          google_gmail: {
            enabled: true,
            selected_operations: ['google_gmail_send_email'],
          },
        },
        {
          connected: true,
          granted_scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        }
      );

      expect(reconnectState.reconnect_required).toBe(true);
      expect(reconnectState.missing_scopes).toEqual([
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.send',
      ]);
    });

    it('should preserve backend reconnect_required even when scopes are already satisfied', () => {
      const reconnectState = getGoogleReconnectState(
        {
          google_calendar: {
            enabled: true,
            selected_operations: ['google_calendar_check_availability'],
          },
        },
        {
          connected: true,
          granted_scopes: ['https://www.googleapis.com/auth/calendar'],
          reconnect_required: true,
        }
      );

      expect(reconnectState.missing_scopes).toEqual([
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ]);
      expect(reconnectState.reconnect_required).toBe(true);
    });

    it('should expose timezone options with UTC offset labels sorted by offset', () => {
      expect(IANA_TIMEZONE_OPTIONS.length).toBeGreaterThan(10);
      expect(IANA_TIMEZONE_OPTIONS[0]).toHaveProperty('value');
      expect(IANA_TIMEZONE_OPTIONS[0]).toHaveProperty('label');
      expect(IANA_TIMEZONE_OPTIONS[0]).toHaveProperty('offsetMinutes');
      expect(IANA_TIMEZONE_OPTIONS[0].label.startsWith('UTC')).toBe(true);

      const losAngeles = IANA_TIMEZONE_OPTIONS.find((option) => option.value === 'America/Los_Angeles');
      const newYork = IANA_TIMEZONE_OPTIONS.find((option) => option.value === 'America/New_York');
      expect(losAngeles).toBeDefined();
      expect(newYork).toBeDefined();
      expect(losAngeles!.label).toContain('America/Los_Angeles');
      expect(newYork!.label).toContain('America/New_York');
      expect(losAngeles!.offsetMinutes).toBeLessThanOrEqual(newYork!.offsetMinutes);
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
        config: { prompt: 'Test prompt', managed_tools: { google_calendar: { enabled: true } } },
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
        config: { prompt: 'Test prompt', managed_tools: { google_calendar: { enabled: true } } },
      });

      expect(result).toEqual(mockAgent);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Agent', config: { prompt: 'Test prompt', managed_tools: { google_calendar: { enabled: true } } } }),
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


    it('should create outbound call via agents client', async () => {
      const mockOutbound = {
        call_id: 'call-123',
        room_name: 'call_outbound_room',
        agent_id: 'agent-123',
        target_phone_number: '+15551234567',
        status: 'initiated',
        initiated_at: '2024-01-01T00:00:00Z',
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockOutbound,
      });

      const result = await client.agents.createOutboundCall({
        agent_id: 'agent-123',
        target_phone_number: '+15551234567',
        dynamic_variables: { case_id: 'abc-1', priority: 2, vip: true },
        agent_overrides: {
          tts_params: {
            voice_id: 'voice-override',
          },
        },
      });

      expect(result).toEqual(mockOutbound);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/calls/outbound',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            agent_id: 'agent-123',
            target_phone_number: '+15551234567',
            dynamic_variables: { case_id: 'abc-1', priority: 2, vip: true },
            agent_overrides: {
              tts_params: {
                voice_id: 'voice-override',
              },
            },
          }),
        })
      );
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

    it('should forward call history search and sort params', async () => {
      const mockHistory = {
        items: [],
        pagination: { current_page: 1, total_pages: 1, total_items: 0, limit: 10, has_next: false, has_previous: false },
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockHistory,
      });

      await client.analytics.getCallHistory({
        page: 2,
        limit: 10,
        agent_name: 'alpha',
        sort_by: 'duration',
        sort_dir: 'asc',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/call-history?page=2&limit=10&agent_name=alpha&sort_by=duration&sort_dir=asc',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should get transcript URL', async () => {
      const mockTranscript = { url: 'https://example.com/transcript.json' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTranscript,
      });

      const result = await client.analytics.getTranscriptUrl('call-12345');

      expect(result.url).toBe('https://example.com/transcript.json');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/call-history/call-12345/transcript',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should get recording URL', async () => {
      const mockRecording = { status: 'ready', url: 'https://example.com/recording.mp3' };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRecording,
      });

      const result = await client.analytics.getRecordingUrl('call-12345');

      expect(result.status).toBe('ready');
      expect(result.url).toBe('https://example.com/recording.mp3');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/agent/call-history/call-12345/recording',
        expect.objectContaining({ method: 'GET' })
      );
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

    it('should list pronunciation dictionaries', async () => {
      const mockDictionaries = [
        {
          id: 'dict-1',
          name: 'Medical Terms',
          language: 'en',
          current_version: 2,
          created_at_unix: 1234,
          updated_at_unix: 1235,
        },
      ];
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDictionaries,
      });

      const result = await client.tts.listPronunciationDictionaries();
      expect(result).toEqual(mockDictionaries);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/pronunciation-dictionaries',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should create pronunciation dictionary from file', async () => {
      const mockDictionary = {
        id: 'dict-1',
        name: 'From File',
        language: 'en',
        current_version: 1,
        created_at_unix: 1234,
        updated_at_unix: 1234,
        rules: [],
        versions: [],
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDictionary,
      });

      const file = new Blob(['<lexicon></lexicon>'], { type: 'application/pls+xml' });
      const result = await client.tts.createPronunciationDictionaryFromFile({
        file,
        name: 'From File',
        language: 'en',
      });

      expect(result).toEqual(mockDictionary);
      const fetchCall = (global.fetch as Mock).mock.calls[0];
      expect(fetchCall[0]).toBe('https://dev.voice.ai/api/v1/tts/pronunciation-dictionaries/add-from-file');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });

    it('should set pronunciation dictionary rules', async () => {
      const mockResponse = {
        id: 'dict-1',
        name: 'Medical Terms',
        language: 'en',
        current_version: 3,
        created_at_unix: 1234,
        updated_at_unix: 1236,
        rules: [
          {
            id: 'rule-1',
            word: 'Thailand',
            replacement: 'tie-land',
            ipa: null,
            case_sensitive: true,
          },
        ],
        versions: [{ version: 3, created_at_unix: 1236 }],
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.tts.setPronunciationDictionaryRules('dict-1', [
        { word: 'Thailand', replacement: 'tie-land' },
      ]);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/pronunciation-dictionaries/dict-1/set-rules',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            rules: [{ word: 'Thailand', replacement: 'tie-land' }],
          }),
        })
      );
    });

    it('should remove pronunciation dictionary rules by rule_ids', async () => {
      const mockResponse = {
        id: 'dict-1',
        name: 'Medical Terms',
        language: 'en',
        current_version: 4,
        created_at_unix: 1234,
        updated_at_unix: 1237,
        rules: [],
        versions: [{ version: 4, created_at_unix: 1237 }],
      };
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await client.tts.removePronunciationDictionaryRules('dict-1', [
        'rule-1',
        'rule-2',
      ]);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/pronunciation-dictionaries/dict-1/remove-rules',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            rule_ids: ['rule-1', 'rule-2'],
          }),
        })
      );
    });

    it('should download pronunciation dictionary version as blob', async () => {
      const mockBlob = new Blob(['pls data'], { type: 'application/pls+xml' });
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await client.tts.downloadPronunciationDictionaryVersion('dict-1', 4);
      expect(result).toBe(mockBlob);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.voice.ai/api/v1/tts/pronunciation-dictionaries/dict-1/4/download',
        expect.objectContaining({ method: 'GET' })
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
        dictionary_id: 'dict-1',
        dictionary_version: 3,
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
            dictionary_id: 'dict-1',
            dictionary_version: 3,
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
