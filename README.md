# Voice.AI Web SDK

The official Voice.AI SDK for JavaScript/TypeScript applications.

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

## TypeScript

Full TypeScript support with exported types:

```typescript
import VoiceAI, {
  type Agent,
  type TranscriptionSegment,
  type ConnectionStatus,
  type TTSParams,
} from '@voice-ai-labs/web-sdk';
```

## Browser Support

Chrome, Firefox, Safari (latest versions). Requires microphone permission for voice features.

## License

MIT
