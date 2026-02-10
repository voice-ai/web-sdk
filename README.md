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

- **Real-time Voice** - Connect to voice agents with live transcription
- **Agent Management** - Create, update, deploy, and manage agents
- **Webhooks** - Receive real-time notifications for call events
- **Analytics** - Access call history and transcripts
- **Knowledge Base** - Manage RAG documents for your agents
- **Phone Numbers** - Search and manage phone numbers

## Real-time Voice

### Connect to an Agent

```typescript
await voiceai.connect({
  agentId: 'agent-123',
  autoPublishMic: true  // default: true
});
```

### Error Handling

The `connect()` method throws an `Error` if connection fails. Common error cases:

```typescript
try {
  await voiceai.connect({ agentId: 'agent-123' });
} catch (error) {
  if (error.message.includes('insufficient_credits')) {
    // User is out of credits
    console.error('Out of credits. Please add more credits to continue.');
  } else if (error.message.includes('Authentication failed')) {
    // Invalid API key
    console.error('Invalid API key');
  } else if (error.message.includes('agent_not_deployed')) {
    // Agent is paused or disabled
    console.error('Agent is not deployed');
  } else {
    console.error('Connection failed:', error.message);
  }
}
```

Errors are also emitted via the `onError` handler and reflected in `onStatusChange`:

```typescript
voiceai.onError((error) => {
  console.error('Error:', error.message);
});

voiceai.onStatusChange((status) => {
  if (status.error) {
    // status.error contains the error message string
    console.error('Connection error:', status.error);
  }
});
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
      model: 'voiceai-tts-multilingual-v1-latest',
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

## Webhooks

Configure webhooks to receive real-time notifications when call events occur.

### Configure Webhook Events

```typescript
// Create agent with webhook events
const agent = await voiceai.agents.create({
  name: 'Support Agent',
  config: {
    prompt: 'You are a helpful support agent.',
    webhooks: {
      events: {
        url: 'https://your-server.com/webhooks/voice-events',
        secret: 'your-hmac-secret',  // Optional: for signature verification
        events: ['call.started', 'call.completed'],  // Or omit for all events
        timeout: 5,
        enabled: true
      }
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
      }
    }
  }
});
```

### Event Types

| Event | Description |
|-------|-------------|
| `call.started` | Call connected, agent ready |
| `call.completed` | Call ended, includes transcript and usage data |

### Webhook Payload

Your server receives POST requests with this structure:

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

### Signature Verification

If you configure a `secret`, verify the HMAC-SHA256 signature:

```typescript
import crypto from 'crypto';

function verifyWebhook(body: string, headers: Headers, secret: string): boolean {
  const signature = headers.get('x-webhook-signature');
  const timestamp = headers.get('x-webhook-timestamp');
  
  if (!signature || !timestamp) return false;
  
  const message = `${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

### Webhook Types

```typescript
import type {
  WebhookEventType,
  WebhookEventsConfig,
  WebhooksConfig,
  WebhookEvent,
  WebhookTestResponse,
} from '@voice-ai-labs/web-sdk';
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import VoiceAI, {
  type Agent,
  type TranscriptionSegment,
  type ConnectionStatus,
  type TTSParams,
  type WebhookEventsConfig,
  type WebhookEvent,
} from '@voice-ai-labs/web-sdk';
```

## Browser Support

Chrome, Firefox, Safari (latest versions). Requires microphone permission for voice features.

## License

MIT
