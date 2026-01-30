# Testing the Widget

## Quick Test

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