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
- [**Managed Tools**](#managed-tools) — Connect first-party managed integrations such as Google Calendar, Sheets, and Gmail
- [**Knowledge Base**](#knowledge-base) — Manage RAG documents for your agents
- [**Phone Numbers**](#phone-numbers) — Search and manage phone numbers
- [**Analytics**](#analytics) — Access call history, transcripts, and recordings
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

`connect()` supports these top-level request shapes:

- `agentId` for a saved agent
- `dynamicVariables` for optional runtime variables passed at call start
- `testMode` to preview paused agents before deploying

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

Managed pronunciation dictionaries can be attached to direct TTS requests and saved agent configs with:

```typescript
const audio = await voiceai.tts.synthesize({
  text: 'Schedule a follow-up for Thailand.',
  voice_id: 'voice-123',
  language: 'en',
  dictionary_id: 'dict-123',
  dictionary_version: 2,
});
```

### Voice Management

```typescript
// List all available voices
const voices = await voiceai.tts.listVoices();

// Clone a voice from audio file (MP3/WAV/M4A, max 7.5MB)
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

### Pronunciation Dictionaries

```typescript
// List dictionaries
const dictionaries = await voiceai.tts.listPronunciationDictionaries();

// Get one dictionary
const dictionary = await voiceai.tts.getPronunciationDictionary('dict-123');

// Create from rules
const created = await voiceai.tts.createPronunciationDictionaryFromRules({
  name: 'Medical Terms',
  language: 'en',
  rules: [
    { word: 'Thailand', replacement: 'tie-land' },
    { word: 'router', replacement: 'row-ter', ipa: 'ˈraʊtɚ', case_sensitive: false },
  ],
});

// Create from a .pls file
await voiceai.tts.createPronunciationDictionaryFromFile({
  file: dictionaryFile,
  name: 'Imported Dictionary',
  language: 'en',
});

// Rename
await voiceai.tts.updatePronunciationDictionary('dict-123', { name: 'Medical Terms v2' });

// Replace all rules
await voiceai.tts.setPronunciationDictionaryRules('dict-123', [
  { word: 'SQL', replacement: 'sequel', case_sensitive: false },
]);

// Add rules
await voiceai.tts.addPronunciationDictionaryRules('dict-123', [
  { word: 'gif', replacement: 'jif', case_sensitive: false },
]);

// Remove rules by stable rule ID
await voiceai.tts.removePronunciationDictionaryRules('dict-123', ['rule-1', 'rule-2']);

// Download a specific version as a Blob
const plsBlob = await voiceai.tts.downloadPronunciationDictionaryVersion('dict-123', 3);

// Delete
await voiceai.tts.deletePronunciationDictionary('dict-123');
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
    recording_enabled: true,
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

// Create an outbound call (server-side only)
// NOTE: Outbound is restricted to approved accounts.
// If your account is not approved, this endpoint may return 403.
await voiceai.agents.createOutboundCall({
  agent_id: agent.agent_id,
  target_phone_number: '+15551234567',
  dynamic_variables: { case_id: 'abc-1' }
});
```

## Managed Tools

The managed tools surface is generic. Today it covers Google Calendar, Google Sheets, and Gmail.

Managed tools are exposed under `voiceai.managedTools`.

Today the SDK includes one Google entry:

- `voiceai.managedTools.google`
  - Use it to start OAuth, check status, and disconnect Google managed tools for an agent
  - Pass the individual managed tool configs under `managedTools.google_calendar`, `managedTools.google_sheets`, and `managedTools.google_gmail`

Use the managed Google surface to connect an agent to Google Calendar, Sheets, or Gmail.

For a working browser example, see [`sdk/web/demo/managed-tools.html`](https://github.com/voice-ai/web-sdk/blob/main/demo/managed-tools.html).

```typescript
import VoiceAI, {
  GOOGLE_CALENDAR_OPERATION_OPTIONS,
  IANA_TIMEZONE_OPTIONS,
  getGoogleReconnectState,
  hasEnabledGoogleManagedTools,
} from '@voice-ai-labs/web-sdk';

const voiceai = new VoiceAI({ apiKey: 'vk_your_api_key' });

const start = await voiceai.managedTools.google.startOAuth('agent-123', {
  returnUrl: window.location.href,
  managedTools: {
    google_calendar: {
      enabled: true,
      timezone: 'America/Los_Angeles',
      selected_operations: ['google_calendar_check_availability', 'google_calendar_create_event'],
    },
  },
});

window.open(start.auth_url, 'google-oauth', 'popup,width=540,height=720');

const status = await voiceai.managedTools.google.getStatus('agent-123');
const reconnect = getGoogleReconnectState(
  {
    google_calendar: {
      enabled: true,
      selected_operations: ['google_calendar_check_availability', 'google_calendar_create_event'],
    },
  },
  status
);
```

Connection flow:

1. Call `startOAuth(...)` with the agent ID, `returnUrl`, and only the clicked Google managed tool config.
2. Open the returned `auth_url` in a popup or browser tab.
3. Google redirects to the VoiceAI backend callback.
4. The backend completes OAuth and then returns the user to your `returnUrl`.
5. Refresh or poll `voiceai.managedTools.google.getStatus(agentId)` to confirm the connection state.

Connection semantics:

- `startOAuth(...)` manages Google managed-tools access for the agent
- pass only the clicked tool config to request only that tool's scopes
- enabling more Google operations later can require reconnecting to grant additional access on the same Google connection
- `disconnect(...)` removes Google managed-tools access for all Google tools on that agent

Available helpers:

- `voiceai.managedTools.google.startOAuth(agentId, { returnUrl, managedTools })`
- `voiceai.managedTools.google.getStatus(agentId)`
- `voiceai.managedTools.google.disconnect(agentId)`
- `GOOGLE_CALENDAR_OPERATION_OPTIONS`, `GOOGLE_SHEETS_OPERATION_OPTIONS`, `GOOGLE_GMAIL_OPERATION_OPTIONS`
- `getManagedToolSelectedOperations(...)`, `toggleManagedToolOperation(...)`
- `getRequiredGoogleScopes(...)`, `getGoogleReconnectState(...)`, `hasEnabledGoogleManagedTools(...)`
- `IANA_TIMEZONE_OPTIONS` for timezone selectors. Each option includes `{ value, label, offsetMinutes }`, where `value` is the canonical IANA timezone like `America/Los_Angeles`

Managed tool config fields:

- `google_calendar`
  - `enabled: boolean`
  - `default_calendar_id?: string`
  - `timezone?: string`
  - `selected_operations?: GoogleCalendarOperation[]`
- `google_sheets`
  - `enabled: boolean`
  - `spreadsheet_id?: string`
  - `sheet_name?: string`
  - `selected_operations?: GoogleSheetsOperation[]`
- `google_gmail`
  - `enabled: boolean`
  - `selected_operations?: GoogleGmailOperation[]`

Supported Calendar operations:

- `google_calendar_check_availability` — Check whether a calendar is free during a time window
- `google_calendar_list_upcoming_events` — Read the next upcoming events from the calendar
- `google_calendar_create_event` — Create a new calendar event
- `google_calendar_update_event` — Modify an existing calendar event
- `google_calendar_cancel_event` — Cancel or delete an existing calendar event

Supported Sheets operations:

- `google_sheets_append_row` — Write a new row into a spreadsheet
- `google_sheets_list_sheets` — List worksheet tabs and spreadsheet metadata
- `google_sheets_read_rows` — Read rows from a worksheet range

Supported Gmail operations:

- `google_gmail_search_messages` — Search Gmail and return readable message summaries
- `google_gmail_get_message` — Fetch a specific Gmail message by ID
- `google_gmail_send_email` — Send an email from the connected Gmail account

Notes:

- Google Calendar, Sheets, and Gmail all use the `voiceai.managedTools.google` surface.
- When a user clicks a specific tool card, pass only that tool's config in `managedTools` so OAuth only requests that tool's scopes.
- If you enable additional Google operations later, `getStatus()` / `getGoogleReconnectState(...)` may report `reconnect_required` until you reconnect and grant the additional access.
- `voiceai.managedTools.google.disconnect(agentId)` removes Google managed-tools access for the agent.
- `returnUrl` is your app/frontend return target after the VoiceAI backend callback completes. It is not the Google-registered OAuth redirect URI.
- Calendar `timezone` should be an IANA timezone like `America/Los_Angeles`
- If `selected_operations` is omitted, the SDK helpers treat that managed tool config as “all supported operations selected”
- If `selected_operations` is an empty array, the managed tool config remains present but requests no additional provider scopes

> **Outbound access control:** `POST /api/v1/calls/outbound` is restricted to approved accounts.
> If you need outbound enabled for your account/workspace, please contact Voice.ai support.

> **Update behavior:** `voiceai.agents.update()` is a partial update. Omit a field to leave it unchanged. For nullable scalar fields like `prompt`, `greeting`, `phone_number`, or nested `tts_params` fields, pass `null` to clear the current value. See section-specific notes below for webhook clearing behavior.

> **Recording:** `config.recording_enabled` defaults to `true` for new agents. Set it to `false` to disable recording for future calls.

### Dynamic Variables

Pass optional `dynamic_variables` at call start and reference them in your prompt with `{{variable_name}}`:

```typescript
await voiceai.agents.update(agent.agent_id, {
  config: {
    allow_outbound_calling: true,
    prompt: 'You are helping {{customer_name}} with order {{order_id}}.'
  }
});

await voiceai.connect({
  agentId: agent.agent_id,
  dynamicVariables: {
    customer_name: 'Alice',
    order_id: '12345'
  }
});
```

- `dynamic_variables` must be a flat object of string, number, or boolean values.
- Extra variables are allowed.
- Variables that are not referenced by the runtime prompt are ignored.
- The runtime is responsible for interpolating these variables into the prompt.

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
  agent_ids: ['agent-123'],
  agent_name: 'support',
  sort_by: 'duration',
  sort_dir: 'desc'
});

// Get transcript URL
const transcript = await voiceai.analytics.getTranscriptUrl(callId);

// Get recording status or URL
const recording = await voiceai.analytics.getRecordingUrl(callId);
if (recording.status === 'ready' && recording.url) {
  window.open(recording.url, '_blank');
}

// Get stats summary
const stats = await voiceai.analytics.getStatsSummary();
```

## Webhooks

Configure webhooks when creating or updating an agent.

`webhooks.events[]`, `webhooks.inbound_call`, and `webhooks.tools` use different contracts:

- `webhooks.events[]` supports `secret` (write-only on create/update) and `has_secret` (read-only on fetch), with fan-out across enabled endpoints.
- `webhooks.inbound_call` supports `secret` (write-only on create/update) and `has_secret` (read-only on fetch).
- `webhooks.tools` define outbound API calls and do not use `secret`.

### Configure Webhook Events and Tools

```typescript
// Create agent with webhook events and tools
const agent = await voiceai.agents.create({
  name: 'Support Agent',
  config: {
    prompt: 'You are a helpful support agent.',
    webhooks: {
      events: [
        {
          url: 'https://your-server.com/webhooks/voice-events',
          secret: 'your-hmac-secret',  // Event webhook signing secret
          events: ['call.started', 'call.completed'],  // Or omit for all events
          timeout: 5,
          enabled: true
        }
      ],
      inbound_call: {
        url: 'https://your-server.com/webhooks/inbound-call',
        secret: 'your-inbound-call-secret',  // Inbound call webhook signing secret
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
      events: [
        {
          url: 'https://your-server.com/webhooks',
          events: ['call.completed'],  // Only receive call.completed
          enabled: true
        }
      ],
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

### Webhook configuration requiredness

- `webhooks.events[]`  
  - Required per endpoint: `url`
  - Optional per endpoint: `secret`, `events`, `timeout` (default `5`), `enabled` (default `true`)
  - On update: omit `webhooks.events` to preserve the current list, set `webhooks.events: null` to remove it, or pass a full array to replace the list
  - When replacing the array: omitted `secret` values are preserved only for entries whose `url` exactly matches an existing endpoint, `secret: null` clears the signing secret for that endpoint, and duplicate URLs are invalid
  - Use `events: []` on an endpoint to receive all event types
- `webhooks.inbound_call`  
  - Required: `url`
  - Optional: `secret`, `timeout` (default `5`), `enabled` (default `true`)
  - On update: omit `inbound_call` to preserve it, set `inbound_call: null` to remove it, and set `secret: null` to clear only the signing secret
- `webhooks.tools`  
  - Required per tool: `name`, `description`, `parameters`, `url`, `method`, `execution_mode`, `auth_type`
  - Optional per tool: `auth_token`, `headers`, `response`, `timeout` (default `10`)
  - On update: omit `tools` to leave the current tool list unchanged, set `tools: null` to clear all tools, or pass a new array to replace the current list

If a field is optional and omitted, the service uses the documented default. Prefer omitting optional fields instead of sending `null` unless you explicitly intend to clear behavior in a supported way.

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

- `method: 'GET' | 'DELETE'`: tool arguments are sent as query parameters.
- `method: 'POST' | 'PUT' | 'PATCH'`: tool arguments are sent as JSON body.
- For body methods, Voice.ai always sends `Content-Type: application/json`.
- If you configure a `Content-Type` header in `headers`, it is ignored for webhook tools.
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
- `auth_type: 'custom_headers'`: sends your configured `headers` map, except `Content-Type`, which is agent-managed for body methods.

### Webhook Tool Response Behavior

- `execution_mode: 'sync'`: waits for downstream response body; non-2xx fails the tool call.
- `execution_mode: 'async'`: treats any 2xx as accepted and does not require a response payload.

### Signature Verification (Event Webhooks)

If you configure `webhooks.events[].secret`, verify the HMAC-SHA256 signature:

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

### Inbound Call Webhook Payload

If you configure `webhooks.inbound_call`, Voice.ai sends inbound call personalization requests with this shape:

```typescript
interface InboundCallWebhookRequest {
  agent_id: string;
  call_id: string;
  from_number: string;
  to_number: string;
}
```

Your endpoint should respond with:

```typescript
interface InboundCallWebhookResponse {
  dynamic_variables?: Record<string, string | number | boolean>;
}
```

If you configure `webhooks.inbound_call.secret`, verify the HMAC-SHA256 signature using the same
`X-Webhook-Timestamp` and `X-Webhook-Signature` headers shown above for event webhooks.

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
