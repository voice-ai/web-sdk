# Voice.ai Web SDK

The official Voice.ai SDK for JavaScript/TypeScript applications.

## Installation

```bash
npm install @voice-ai-labs/web-sdk
```

## Quick Start

```typescript
import VoiceAI from '@voice-ai-labs/web-sdk';

// Initialize with your API key
const voiceai = new VoiceAI({ apiKey: 'vk_your_api_key' });

// Connect to a voice agent
await voiceai.connect({ agentId: 'your-agent-id' });

// Listen for transcriptions
voiceai.onTranscription((segment) => {
  console.log(`${segment.role}: ${segment.text}`);
});

// Disconnect when done
await voiceai.disconnect();
```

## Features

The SDK provides a unified interface for:

- [**Real-time Voice**](#real-time-voice) — Connect to voice agents with live transcription
- [**Text-to-Speech**](#text-to-speech) — Generate speech and manage voices
- [**Agent Management**](#agent-management) — Create, update, deploy, and manage agents
- [**Knowledge Base**](#knowledge-base) — Manage RAG documents for your agents
- [**Phone Numbers**](#phone-numbers) — Search and manage phone numbers
- [**Analytics**](#analytics) — Access call history and transcripts
- [**Webhooks**](#webhooks) — Receive real-time notifications for call events
- [**Security**](#security) — Backend token exchange, endToken, CORS
- [**Error Handling**](#error-handling) — Connection and API error handling

## Real-time Voice

### Connect to an Agent

```typescript
await voiceai.connect({
  agentId: 'agent-123',
  autoPublishMic: true  // default: true
});

// Test mode: preview paused agents before deploying
await voiceai.connect({ agentId: 'agent-123', testMode: true });
```

### Events

```typescript
// Transcriptions (user and agent speech)
voiceai.onTranscription((segment) => {
  console.log(`${segment.role}: ${segment.text}`);
  console.log('Final:', segment.isFinal);
});

// Connection status
voiceai.onStatusChange((status) => {
  if (status.connected) console.log('Connected!');
  if (status.error) console.error('Error:', status.error);
});

// Agent state (listening, speaking, thinking)
voiceai.onAgentStateChange((state) => {
  console.log('Agent is:', state.state);
});

// Audio levels (for visualizations)
voiceai.onAudioLevel((level) => {
  console.log('Level:', level.level, 'Speaking:', level.isSpeaking);
});

// Errors
voiceai.onError((error) => {
  console.error('Error:', error.message);
});
```

Each handler returns a function to unsubscribe: `const stop = voiceai.onTranscription(...); stop();`

### Microphone Control

```typescript
await voiceai.setMicrophoneEnabled(true);   // Enable
await voiceai.setMicrophoneEnabled(false);  // Disable
```

### Send Text Message

```typescript
await voiceai.sendMessage('Hello agent!');
```

### Disconnect

```typescript
await voiceai.disconnect();
```

**Status (read-only)**
```typescript
voiceai.isConnected();
voiceai.getStatus();          // { connected, connecting, callId, error }
voiceai.getAgentState();      // { state, agentParticipantId }
voiceai.getMicrophoneState(); // { enabled, muted }
```

## Text-to-Speech

The TTS API provides speech generation and voice management.

### Generate Speech

```typescript
// Non-streaming: returns complete audio as Blob
const audio = await voiceai.tts.synthesize({
  text: 'Hello, welcome to Voice AI!',
  voice_id: 'voice-123',
  language: 'en',
  audio_format: 'mp3',
});
const url = URL.createObjectURL(audio);
new Audio(url).play();

// Streaming: returns Response with readable body
const response = await voiceai.tts.synthesizeStream({
  text: 'Hello, welcome!',
  voice_id: 'voice-123',
  language: 'en',
});
const reader = response.body!.getReader();
// Read chunks: reader.read()
```

### Voice Management

```typescript
// List all available voices
const voices = await voiceai.tts.listVoices();

// Clone a voice from audio file (MP3/WAV/OGG, max 7.5MB)
const voice = await voiceai.tts.cloneVoice({
  file: audioFile,
  name: 'My Voice',
  language: 'en',
  voice_visibility: 'PRIVATE',
});

// Get voice status (PENDING -> PROCESSING -> AVAILABLE)
await voiceai.tts.getVoice(voice.voice_id);

// Update voice metadata
await voiceai.tts.updateVoice('voice-123', { name: 'Renamed', voice_visibility: 'PUBLIC' });

// Delete voice
await voiceai.tts.deleteVoice('voice-123');
```

## Agent Management

```typescript
// List agents
const agents = await voiceai.agents.list();

// Create an agent
const agent = await voiceai.agents.create({
  name: 'Customer Support',
  config: {
    prompt: 'You are a helpful customer support agent.',
    greeting: 'Hello! How can I help you today?',
    tts_params: {
      voice_id: 'my-voice-id',
      model: 'voiceai-tts-v1-latest',
      language: 'en'
    }
  }
});

// Deploy the agent
await voiceai.agents.deploy(agent.agent_id);

// Update an agent
await voiceai.agents.update(agent.agent_id, {
  name: 'Updated Name'
});

// Pause an agent
await voiceai.agents.pause(agent.agent_id);

// Delete an agent
await voiceai.agents.disable(agent.agent_id);
```

## Knowledge Base

```typescript
// Create a knowledge base
const kb = await voiceai.knowledgeBase.create({
  name: 'Product FAQ',
  documents: [
    { content: 'Return policy: 30 days for full refund.' },
    { content: 'Shipping: Free on orders over $50.' }
  ]
});

// Assign to an agent
await voiceai.agents.assignKnowledgeBase(agentId, kb.kb_id);

// List knowledge bases
const kbs = await voiceai.knowledgeBase.list();

// Update a knowledge base
await voiceai.knowledgeBase.update(kb.kb_id, {
  documents: [{ content: 'Updated content' }]
});

// Delete a knowledge base
await voiceai.knowledgeBase.remove(kb.kb_id);
```

## Phone Numbers

```typescript
// Search available numbers
const numbers = await voiceai.phoneNumbers.search({
  country_code: 'US',
  area_code: '415'
});

// Select a number
await voiceai.phoneNumbers.select('+14155551234');

// List your numbers
const myNumbers = await voiceai.phoneNumbers.list();

// Release a number
await voiceai.phoneNumbers.release('+14155551234');
```

## Analytics

```typescript
// Get call history
const history = await voiceai.analytics.getCallHistory({
  page: 1,
  limit: 20,
  agent_ids: ['agent-123']
});

// Get transcript URL
const transcript = await voiceai.analytics.getTranscriptUrl(summaryId);

// Get stats summary
const stats = await voiceai.analytics.getStatsSummary();
```

## Webhooks

Configure webhooks when creating or updating an agent.

`webhooks.events` and `webhooks.tools` use different contracts:

- `webhooks.events` supports `secret` (write-only on create/update) and `has_secret` (read-only on fetch).
- `webhooks.tools` define outbound API calls and do not use `secret`.

### Configure Webhook Events and Tools

```typescript
// Create agent with webhook events and tools
const agent = await voiceai.agents.create({
  name: 'Support Agent',
  config: {
    prompt: 'You are a helpful support agent.',
    webhooks: {
      events: {
        url: 'https://your-server.com/webhooks/voice-events',
        secret: 'your-hmac-secret',  // Event webhook signing secret
        events: ['call.started', 'call.completed'],  // Or omit for all events
        timeout: 5,
        enabled: true
      },
      tools: [
        {
          name: 'get_account_status',
          description: 'Fetches current account status for a customer.',
          url: 'https://your-server.com/webhooks/tools/account-status',
          parameters: {
            customer_id: 'string'
          },
          method: 'POST',
          execution_mode: 'sync',
          auth_type: 'api_key',
          auth_token: 'your-api-key',
          headers: {
            'X-Service-Version': '2026-02'
          },
          response: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              tier: { type: 'string' }
            }
          },
          timeout: 10
        }
      ]
    }
  }
});

// Update webhook config on existing agent
await voiceai.agents.update(agentId, {
  config: {
    webhooks: {
      events: {
        url: 'https://your-server.com/webhooks',
        events: ['call.completed'],  // Only receive call.completed
        enabled: true
      },
      tools: [
        {
          name: 'search_knowledge_base',
          description: 'Searches KB and returns ranked snippets.',
          url: 'https://your-server.com/webhooks/tools/search-kb',
          parameters: {
            query: 'string',
            top_k: 'number'
          },
          method: 'GET',
          execution_mode: 'async',
          auth_type: 'custom_headers',
          headers: {
            'X-Internal-Token': 'your-internal-token'
          },
          timeout: 20
        }
      ]
    }
  }
});
```

Required fields for each webhook tool: `name`, `description`, `parameters`, `url`, `method`, `execution_mode`, `auth_type`.  
Optional fields: `auth_token`, `headers`, `response`, `timeout`.

### Event Types

| Event | Description |
|-------|-------------|
| `call.started` | Call connected, agent ready |
| `call.completed` | Call ended, includes transcript and usage data |

### Event Webhook Payload

Your event webhook URL receives POST requests with this structure:

```typescript
interface WebhookEvent {
  event: 'call.started' | 'call.completed' | 'test';
  timestamp: string;  // ISO 8601
  call_id: string;
  agent_id: string;
  data: {
    call_type: 'web' | 'sip_inbound' | 'sip_outbound';
    // call.started: started_at, from_number?, to_number?
    // call.completed: duration_seconds, credits_used, transcript_uri, transcript_summary
  };
}
```

### Webhook Tool Request Shape

For webhook tools, Voice.ai makes outbound HTTP requests directly to each tool `url`.

- `method: 'GET'`: tool arguments are sent as query parameters.
- `method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'`: tool arguments are sent as JSON body.
- Metadata headers are always sent:
  - `X-VoiceAI-Request-Id`
  - `X-VoiceAI-Tool-Name`
  - `X-VoiceAI-Agent-Id`
  - `X-VoiceAI-Call-Id`

```http
GET /webhooks/tools/search-kb?query=refund+policy&top_k=3
X-VoiceAI-Request-Id: req_123
X-VoiceAI-Tool-Name: search_knowledge_base
X-VoiceAI-Agent-Id: agent_123
X-VoiceAI-Call-Id: call_123
```

```http
POST /webhooks/tools/account-status
Content-Type: application/json
X-VoiceAI-Request-Id: req_456
X-VoiceAI-Tool-Name: get_account_status
X-VoiceAI-Agent-Id: agent_123
X-VoiceAI-Call-Id: call_123

{"customer_id":"cust_789"}
```

### Webhook Tool Authentication

- `auth_type: 'none'`: no auth headers added.
- `auth_type: 'bearer_token'`: sends `Authorization: Bearer <auth_token>`.
- `auth_type: 'api_key'`: sends `X-API-Key: <auth_token>`.
- `auth_type: 'custom_headers'`: sends your configured `headers` map.

### Webhook Tool Response Behavior

- `execution_mode: 'sync'`: waits for downstream response body; non-2xx fails the tool call.
- `execution_mode: 'async'`: treats any 2xx as accepted and does not require a response payload.

### Signature Verification (Event Webhooks)

If you configure `webhooks.events.secret`, verify the HMAC-SHA256 signature:

```typescript
import crypto from 'crypto';

function verifyEventWebhook(body: string, headers: Headers, secret: string): boolean {
  const signature = headers.get('x-webhook-signature');
  const timestamp = headers.get('x-webhook-timestamp');
  
  if (!signature || !timestamp) return false;
  
  const message = `${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

## Security

`connect()` fetches connection details and connects in one call. To keep your API key off the browser, split into two steps:

```typescript
// Step 1: Backend — get connection details (requires API key)
const details = await voiceai.getConnectionDetails({ agentId: 'agent-123' });
// Returns: { serverUrl, participantToken, callId, endToken }

// Step 2: Frontend — connect with pre-fetched details (no API key needed)
const voiceai = new VoiceAI();
await voiceai.connectRoom(details);
```

**Important:** Pass `endToken` from your backend to the frontend. The SDK uses it on `disconnect()` to free the concurrency slot immediately.

REST methods (`agents.*`, `tts.*`, `analytics.*`, etc.) require an API key and are CORS-blocked from browsers.

## Error Handling

### Connection errors

The `connect()` method throws an `Error` if connection fails. Common error cases:

```typescript
try {
  await voiceai.connect({ agentId: 'agent-123' });
} catch (error) {
  if (error.message.includes('insufficient_credits')) {
    console.error('Out of credits. Please add more credits to continue.');
  } else if (error.message.includes('Authentication failed')) {
    console.error('Invalid API key');
  } else if (error.message.includes('agent_not_deployed')) {
    console.error('Agent is not deployed');
  } else {
    console.error('Connection failed:', error.message);
  }
}
```

Errors are also emitted via `onError` and reflected in `onStatusChange`:

```typescript
voiceai.onError((error) => {
  console.error('Error:', error.message);
});

voiceai.onStatusChange((status) => {
  if (status.error) {
    console.error('Connection error:', status.error);
  }
});
```

### REST API errors (agents, TTS, analytics, etc.)

REST methods throw `VoiceAIError`:

```typescript
import { VoiceAIError } from '@voice-ai-labs/web-sdk';

try {
  const agent = await voiceai.agents.getById('nonexistent');
} catch (error) {
  if (error instanceof VoiceAIError) {
    // error.message, error.status (401, 403, 404, 422), error.code, error.detail
    if (error.status === 404) console.error('Agent not found');
  }
}

try {
  const audio = await voiceai.tts.synthesize({ text: '...', voice_id: 'voice-123' });
} catch (error) {
  if (error instanceof VoiceAIError) {
    // error.status: 400 (validation), 401 (auth), 404 (voice not found), 422 (invalid request)
    if (error.status === 404) console.error('Voice not found');
  }
}
```

## TypeScript

Full TypeScript support. Exported types:

```typescript
import VoiceAI, { VoiceAIError } from '@voice-ai-labs/web-sdk';
import type {
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
  VoiceAgentWidgetOptions,
  VoiceAgentWidgetTheme,
} from '@voice-ai-labs/web-sdk';
```

## Browser Support

Chrome, Firefox, Safari (latest versions). Requires microphone permission for voice features.

## License

MIT
