import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { VoiceAIClient } from '../client';
import type {
  WebhookEventsConfig,
  PublicWebhookEventsConfig,
  WebhooksConfig,
  PublicWebhooksConfig,
  WebhookEvent,
  WebhookEventType,
  WebhookTestResponse,
} from '../types';

describe('Webhook Types', () => {
  describe('WebhookEventType', () => {
    it('should accept valid event types', () => {
      const validTypes: WebhookEventType[] = ['call.started', 'call.completed'];
      expect(validTypes).toHaveLength(2);
      expect(validTypes).toContain('call.started');
      expect(validTypes).toContain('call.completed');
    });
  });

  describe('WebhookEventsConfig', () => {
    it('should define full config with secret', () => {
      const config: WebhookEventsConfig = {
        url: 'https://example.com/webhooks',
        secret: 'my-secret-key',
        events: ['call.started', 'call.completed'],
        timeout: 10,
        enabled: true,
      };

      expect(config.url).toBe('https://example.com/webhooks');
      expect(config.secret).toBe('my-secret-key');
      expect(config.events).toHaveLength(2);
      expect(config.timeout).toBe(10);
      expect(config.enabled).toBe(true);
    });

    it('should allow minimal config with just url', () => {
      const config: WebhookEventsConfig = {
        url: 'https://example.com/webhooks',
      };

      expect(config.url).toBe('https://example.com/webhooks');
      expect(config.secret).toBeUndefined();
      expect(config.events).toBeUndefined();
    });

    it('should allow null values for optional fields', () => {
      const config: WebhookEventsConfig = {
        url: 'https://example.com/webhooks',
        secret: null,
        events: null,
        timeout: null,
        enabled: null,
      };

      expect(config.secret).toBeNull();
      expect(config.events).toBeNull();
    });
  });

  describe('PublicWebhookEventsConfig', () => {
    it('should have has_secret instead of secret', () => {
      const config: PublicWebhookEventsConfig = {
        url: 'https://example.com/webhooks',
        has_secret: true,
        events: ['call.started'],
        timeout: 5,
        enabled: true,
      };

      expect(config.url).toBe('https://example.com/webhooks');
      expect(config.has_secret).toBe(true);
      expect((config as any).secret).toBeUndefined();
    });

    it('should indicate no secret when has_secret is false', () => {
      const config: PublicWebhookEventsConfig = {
        url: 'https://example.com/webhooks',
        has_secret: false,
        events: ['call.completed'],
      };

      expect(config.has_secret).toBe(false);
    });
  });

  describe('WebhooksConfig', () => {
    it('should nest events config', () => {
      const config: WebhooksConfig = {
        events: {
          url: 'https://example.com/webhooks',
          secret: 'secret123',
          events: ['call.started', 'call.completed'],
          enabled: true,
        },
      };

      expect(config.events?.url).toBe('https://example.com/webhooks');
      expect(config.events?.secret).toBe('secret123');
    });

    it('should allow null events', () => {
      const config: WebhooksConfig = {
        events: null,
      };

      expect(config.events).toBeNull();
    });

    it('should allow empty config', () => {
      const config: WebhooksConfig = {};

      expect(config.events).toBeUndefined();
    });
  });

  describe('PublicWebhooksConfig', () => {
    it('should use PublicWebhookEventsConfig for events', () => {
      const config: PublicWebhooksConfig = {
        events: {
          url: 'https://example.com/webhooks',
          has_secret: true,
          events: ['call.started'],
          enabled: true,
        },
      };

      expect(config.events?.has_secret).toBe(true);
      expect((config.events as any).secret).toBeUndefined();
    });
  });

  describe('WebhookEvent', () => {
    it('should define call.started event payload', () => {
      const event: WebhookEvent = {
        event: 'call.started',
        timestamp: '2024-01-01T12:00:00Z',
        call_id: 'call-123',
        agent_id: 'agent-456',
        data: {
          call_type: 'web',
          started_at: '2024-01-01T12:00:00Z',
        },
      };

      expect(event.event).toBe('call.started');
      expect(event.call_id).toBe('call-123');
      expect(event.agent_id).toBe('agent-456');
      expect(event.data.call_type).toBe('web');
    });

    it('should define call.completed event payload', () => {
      const event: WebhookEvent = {
        event: 'call.completed',
        timestamp: '2024-01-01T12:05:00Z',
        call_id: 'call-123',
        agent_id: 'agent-456',
        data: {
          call_type: 'sip_inbound',
          duration_seconds: 300,
          credits_used: 5.5,
          transcript_uri: 'https://storage.example.com/transcript.json',
          transcript_summary: 'User asked about pricing.',
          from_number: '+14155551234',
          to_number: '+18005551234',
        },
      };

      expect(event.event).toBe('call.completed');
      expect(event.data.duration_seconds).toBe(300);
      expect(event.data.credits_used).toBe(5.5);
      expect(event.data.from_number).toBe('+14155551234');
    });

    it('should allow test event type', () => {
      const event: WebhookEvent = {
        event: 'test',
        timestamp: '2024-01-01T12:00:00Z',
        call_id: null,
        agent_id: 'agent-456',
        data: { message: 'Test webhook' },
      };

      expect(event.event).toBe('test');
      expect(event.call_id).toBeNull();
    });

    it('should allow optional call_id', () => {
      const event: WebhookEvent = {
        event: 'call.started',
        timestamp: '2024-01-01T12:00:00Z',
        agent_id: 'agent-456',
        data: {},
      };

      expect(event.call_id).toBeUndefined();
    });
  });

  describe('WebhookTestResponse', () => {
    it('should define successful test response', () => {
      const response: WebhookTestResponse = {
        status: 'success',
        message: 'Webhook test delivered successfully',
        attempts: 1,
        status_code: 200,
      };

      expect(response.status).toBe('success');
      expect(response.attempts).toBe(1);
      expect(response.status_code).toBe(200);
    });

    it('should define failed test response', () => {
      const response: WebhookTestResponse = {
        status: 'failed',
        message: 'Webhook test failed',
        error: 'Connection timeout',
        attempts: 3,
      };

      expect(response.status).toBe('failed');
      expect(response.error).toBe('Connection timeout');
      expect(response.attempts).toBe(3);
    });
  });
});

describe('Webhook API Client', () => {
  let client: VoiceAIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as Mock).mockClear();
    client = new VoiceAIClient({ apiKey: 'vk_test_key' });
  });

  describe('Create agent with webhooks', () => {
    it('should create agent with webhook events config', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Webhook Agent',
        config: {
          prompt: 'Test prompt',
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              has_secret: true,
              events: ['call.started', 'call.completed'],
              enabled: true,
            },
          },
        },
        status: 'paused',
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.create({
        name: 'Webhook Agent',
        config: {
          prompt: 'Test prompt',
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              secret: 'my-secret',
              events: ['call.started', 'call.completed'],
              enabled: true,
            },
          },
        },
      });

      expect(result.config?.webhooks?.events?.url).toBe('https://example.com/webhooks');
      expect(result.config?.webhooks?.events?.has_secret).toBe(true);
      
      // Verify request body included webhook config with secret
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('webhooks'),
        })
      );
    });

    it('should create agent with minimal webhook config', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Webhook Agent',
        config: {
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              has_secret: false,
            },
          },
        },
        status: 'paused',
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.create({
        name: 'Webhook Agent',
        config: {
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
            },
          },
        },
      });

      expect(result.config?.webhooks?.events?.url).toBe('https://example.com/webhooks');
      expect(result.config?.webhooks?.events?.has_secret).toBe(false);
    });
  });

  describe('Update agent webhooks', () => {
    it('should update webhook URL', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Test Agent',
        config: {
          webhooks: {
            events: {
              url: 'https://new-endpoint.com/webhooks',
              has_secret: true,
            },
          },
        },
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.update('agent-123', {
        config: {
          webhooks: {
            events: {
              url: 'https://new-endpoint.com/webhooks',
            },
          },
        },
      });

      expect(result.config?.webhooks?.events?.url).toBe('https://new-endpoint.com/webhooks');
    });

    it('should update webhook events list', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        config: {
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              events: ['call.completed'],
              has_secret: false,
            },
          },
        },
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.update('agent-123', {
        config: {
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              events: ['call.completed'],
            },
          },
        },
      });

      expect(result.config?.webhooks?.events?.events).toEqual(['call.completed']);
    });

    it('should disable webhook events', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        config: {
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              enabled: false,
            },
          },
        },
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.update('agent-123', {
        config: {
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              enabled: false,
            },
          },
        },
      });

      expect(result.config?.webhooks?.events?.enabled).toBe(false);
    });
  });

  describe('Get agent with webhooks', () => {
    it('should return agent with webhook config (has_secret, not secret)', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Test Agent',
        config: {
          webhooks: {
            events: {
              url: 'https://example.com/webhooks',
              has_secret: true,
              events: ['call.started', 'call.completed'],
              timeout: 5,
              enabled: true,
            },
          },
        },
        status: 'deployed',
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.getById('agent-123');

      expect(result.config?.webhooks?.events?.has_secret).toBe(true);
      expect((result.config?.webhooks?.events as any)?.secret).toBeUndefined();
      expect(result.config?.webhooks?.events?.events).toContain('call.started');
    });

    it('should return agent without webhooks', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Test Agent',
        config: {
          prompt: 'Basic agent',
        },
        status: 'deployed',
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      const result = await client.agents.getById('agent-123');

      expect(result.config?.webhooks).toBeUndefined();
    });
  });
});
