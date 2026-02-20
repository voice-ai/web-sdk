import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import VoiceAI from '../index';
import type {
  WebhookEventsConfig,
  WebhookToolConfig,
  WebhooksConfig,
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

  describe('WebhookEventsConfig (response shape)', () => {
    it('should support has_secret field for API responses', () => {
      const config: WebhookEventsConfig = {
        url: 'https://example.com/webhooks',
        has_secret: true,
        events: ['call.started'],
        timeout: 5,
        enabled: true,
      };

      expect(config.url).toBe('https://example.com/webhooks');
      expect(config.has_secret).toBe(true);
    });

    it('should indicate no secret when has_secret is false', () => {
      const config: WebhookEventsConfig = {
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

    it('should support events and tools together', () => {
      const config: WebhooksConfig = {
        events: {
          url: 'https://example.com/webhooks/events',
          events: ['call.started'],
        },
        tools: [
          {
            name: 'lookup_order',
            description: 'Lookup an order by id',
            url: 'https://example.com/webhooks/tools',
          },
        ],
      };

      expect(config.events?.url).toBe('https://example.com/webhooks/events');
      expect(config.tools?.[0]?.name).toBe('lookup_order');
    });

    it('should allow null tools', () => {
      const config: WebhooksConfig = {
        tools: null,
      };

      expect(config.tools).toBeNull();
    });
  });

  describe('WebhooksConfig (response shape)', () => {
    it('should support has_secret in nested events config', () => {
      const config: WebhooksConfig = {
        events: {
          url: 'https://example.com/webhooks',
          has_secret: true,
          events: ['call.started'],
          enabled: true,
        },
      };

      expect(config.events?.has_secret).toBe(true);
    });
  });

  describe('WebhookToolConfig', () => {
    it('should allow minimal tool configuration', () => {
      const tool: WebhookToolConfig = {
        name: 'lookup_order',
        description: 'Lookup an order by id',
        url: 'https://example.com/webhooks/tools/lookup-order',
      };

      expect(tool.name).toBe('lookup_order');
      expect(tool.url).toContain('/lookup-order');
      expect(tool.parameters).toBeUndefined();
      expect(tool.response).toBeUndefined();
    });

    it('should represent write/read secret semantics', () => {
      const writeConfig: WebhookToolConfig = {
        name: 'lookup_order',
        description: 'Lookup order details',
        url: 'https://example.com/webhooks/tools/lookup-order',
        secret: 'write-only-secret',
      };

      const readConfig: WebhookToolConfig = {
        name: 'lookup_order',
        description: 'Lookup order details',
        url: 'https://example.com/webhooks/tools/lookup-order',
        has_secret: true,
      };

      expect(writeConfig.secret).toBe('write-only-secret');
      expect((readConfig as any).secret).toBeUndefined();
      expect(readConfig.has_secret).toBe(true);
    });

    it('should allow full tool configuration with schema-like fields', () => {
      const tool: WebhookToolConfig = {
        name: 'lookup_order',
        description: 'Lookup order details',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'Order identifier' },
            include_history: { type: 'boolean' },
          },
          required: ['order_id'],
        },
        response: {
          type: 'object',
          properties: {
            order_id: { type: 'string' },
            status: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  quantity: { type: 'number' },
                },
              },
            },
          },
        },
        url: 'https://example.com/webhooks/tools/lookup-order',
        secret: 'tool-secret',
        timeout: 10,
      };

      expect(tool.parameters?.properties?.order_id?.type).toBe('string');
      expect(tool.response?.properties?.items?.items?.properties?.sku?.type).toBe('string');
      expect(tool.timeout).toBe(10);
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
  let client: VoiceAI;

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as Mock).mockClear();
    client = new VoiceAI({ apiKey: 'vk_test_key' });
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

    it('should create agent with webhook tools config', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Webhook Tool Agent',
        config: {
          webhooks: {
            tools: [
              {
                name: 'lookup_order',
                description: 'Lookup order details',
                url: 'https://example.com/webhooks/tools/lookup-order',
                has_secret: true,
                timeout: 8,
              },
            ],
          },
        },
        status: 'paused',
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      await client.agents.create({
        name: 'Webhook Tool Agent',
        config: {
          webhooks: {
            tools: [
              {
                name: 'lookup_order',
                description: 'Lookup order details',
                url: 'https://example.com/webhooks/tools/lookup-order',
                secret: 'tool-secret',
                timeout: 8,
                parameters: {
                  type: 'object',
                  properties: {
                    order_id: { type: 'string' },
                  },
                },
                response: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                  },
                },
              },
            ],
          },
        },
      });

      const [, request] = (global.fetch as Mock).mock.calls[0];
      const requestBody = JSON.parse(request.body);
      expect(requestBody.config.webhooks.tools).toHaveLength(1);
      expect(requestBody.config.webhooks.tools[0].name).toBe('lookup_order');
      expect(requestBody.config.webhooks.tools[0].parameters.properties.order_id.type).toBe('string');
      expect(requestBody.config.webhooks.tools[0].response.properties.status.type).toBe('string');
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

    it('should update webhook tool fields', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        config: {
          webhooks: {
            tools: [
              {
                name: 'lookup_order',
                description: 'Lookup order details',
                url: 'https://new-endpoint.com/webhooks/tools/lookup-order',
                timeout: 15,
                has_secret: true,
                parameters: {
                  type: 'object',
                  properties: {
                    order_id: { type: 'string' },
                    region: { type: 'string' },
                  },
                },
              },
            ],
          },
        },
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAgent,
      });

      await client.agents.update('agent-123', {
        config: {
          webhooks: {
            tools: [
              {
                name: 'lookup_order',
                description: 'Lookup order details',
                url: 'https://new-endpoint.com/webhooks/tools/lookup-order',
                timeout: 15,
                parameters: {
                  type: 'object',
                  properties: {
                    order_id: { type: 'string' },
                    region: { type: 'string' },
                  },
                },
              },
            ],
          },
        },
      });

      const [, request] = (global.fetch as Mock).mock.calls[0];
      const requestBody = JSON.parse(request.body);
      expect(requestBody.config.webhooks.tools[0].url).toBe('https://new-endpoint.com/webhooks/tools/lookup-order');
      expect(requestBody.config.webhooks.tools[0].timeout).toBe(15);
      expect(requestBody.config.webhooks.tools[0].parameters.properties.region.type).toBe('string');
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

    it('should return agent with webhook tool has_secret but not secret', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        name: 'Test Agent',
        config: {
          webhooks: {
            tools: [
              {
                name: 'lookup_order',
                description: 'Lookup order details',
                url: 'https://example.com/webhooks/tools/lookup-order',
                has_secret: true,
                timeout: 10,
                response: {
                  type: 'object',
                },
              },
            ],
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

      expect(result.config?.webhooks?.tools?.[0]?.has_secret).toBe(true);
      expect((result.config?.webhooks?.tools?.[0] as any)?.secret).toBeUndefined();
      expect(result.config?.webhooks?.tools?.[0]?.name).toBe('lookup_order');
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
