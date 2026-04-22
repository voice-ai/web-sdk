# SDK Demos

## Voice Widget Demo

1. **Build the SDK:**
   ```bash
   cd ..
   npm run build
   ```

2. **Update credentials in `demo/test.html`:**
   ```javascript
   const connectionOptions = {
     apiKey: 'vk_your_api_key_here',
     agentId: 'your_agent_id',
     apiUrl: 'http://localhost:8000/api/v1',
   };
   ```

3. **Start the dev server:**
   ```bash
   npm run dev
   ```
   This will automatically open `http://localhost:3000/demo/test.html` in your browser.

4. **Test:**
   - Widget appears in bottom-right
   - Move mouse near it → watch it move away like a blob!
   - Click to open voice agent
   - Watch eyes animate based on agent state

## Managed Tools Demo

Use `demo/managed-tools.html` to test Google managed tools from the browser SDK.

What it shows:
- shared Google OAuth connect/reconnect for the agent
- per-tool readiness derived from shared provider status
- shared Google disconnect for all tools

Open it after starting the same demo server:

```text
http://localhost:3000/demo/managed-tools.html
```

Update the API key, agent ID, and API URL in the form, then:
- click `Connect Google`
- finish OAuth in the popup
- click `Refresh Shared Status`
- use `Disconnect Google (all tools)` to clear the shared Google connection

## Standalone Node Test Server

Use `demo/server.js` when you want to hit SDK-backed local endpoints directly with `curl` or another HTTP client.

1. **Build the SDK:**
   ```bash
   pnpm build
   ```

2. **Set your API key:**
   ```bash
   export VOICEAI_API_KEY="vk_your_api_key_here"
   export VOICEAI_API_URL="https://dev.voice.ai/api/v1" # optional
   ```

3. **Start the server:**
   ```bash
   node ./demo/server.js
   ```

   By default it listens on `http://127.0.0.1:3030`.

4. **Hit the endpoints:**
   - `GET /health`
   - `GET /commands`
   - `POST /run`

`POST /run` takes a single JSON request body:

```json
{
  "command": "agents:get",
  "args": ["agent_123"],
  "payload": null,
  "flags": {}
}
```

Successful responses are returned directly in the same shape as the SDK method result.
For binary SDK methods like `tts:synthesize`, the server returns raw binary bytes.

Examples:

```bash
curl http://127.0.0.1:3030/commands
```

```bash
curl -X POST http://127.0.0.1:3030/run \
  -H 'Content-Type: application/json' \
  -d '{"command":"agents:get","args":["agent_123"]}'
```

```bash
curl -X POST http://127.0.0.1:3030/run \
  -H 'Content-Type: application/json' \
  -d '{"command":"tts:synthesize","payload":{"text":"Hello from curl","voice_id":"voice_123","language":"en","audio_format":"mp3"}}' \
  --output /tmp/sdk-test.mp3
```

```bash
curl -X POST http://127.0.0.1:3030/run \
  -H 'Content-Type: application/json' \
  -d '{"command":"voice:get-connection-details","args":["agent_123"],"flags":{"testMode":true}}'
```

Voice cloning uses `multipart/form-data`:

```bash
curl -X POST http://127.0.0.1:3030/run \
  -F 'command=tts:clone-voice' \
  -F 'payload={"name":"My Test Voice","language":"en","voice_visibility":"PRIVATE"}' \
  -F 'file=@/absolute/path/to/sample.wav'
```
