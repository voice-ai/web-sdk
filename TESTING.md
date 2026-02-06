# Testing the Voice.ai Web SDK

This document describes how to run and write tests for the Voice.ai Web SDK.

## Test Framework

The SDK uses [Vitest](https://vitest.dev/) as the testing framework with:
- **jsdom** environment for browser API simulation
- **v8** coverage provider for code coverage reports

## Running Tests

### Run All Tests

```bash
pnpm test
```

This runs all tests once and exits.

### Watch Mode

```bash
pnpm test:watch
```

Runs tests in watch mode - tests re-run automatically when files change. Useful during development.

### Coverage Report

```bash
pnpm test:coverage
```

Generates a coverage report with:
- Terminal output with coverage summary
- HTML report in `coverage/` directory
- JSON report for CI integration

Open `coverage/index.html` in a browser to view the detailed HTML coverage report.

## Test Structure

Tests are located in `src/__tests__/`:

```
src/__tests__/
├── setup.ts          # Global test setup (mocks)
├── index.test.ts     # VoiceAI class tests (real-time voice)
└── client.test.ts    # API client tests (REST API)
```

### Test Categories

**`index.test.ts`** - Tests for the main `VoiceAI` class:
- Constructor and initialization
- Connection/disconnection
- Event handlers (transcription, status, errors)
- Microphone control
- Message sending
- Retry logic

**`client.test.ts`** - Tests for REST API clients:
- `AgentClient` - Agent CRUD operations
- `AnalyticsClient` - Call history, transcripts, stats
- `KnowledgeBaseClient` - Knowledge base operations
- `PhoneNumberClient` - Phone number management
- Error handling (401, 404, 422, etc.)

## Writing Tests

### Test Setup

The `setup.ts` file provides global mocks:

```typescript
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window for browser environment detection
Object.defineProperty(global, 'window', {
  value: {
    location: {
      origin: 'http://localhost:3000',
    },
  },
  writable: true,
});
```

### Example Test

```typescript
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { VoiceAI } from '../index';

describe('VoiceAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as Mock).mockClear();
  });

  it('should throw error if no API key provided', () => {
    expect(() => new VoiceAI({} as any)).toThrow('API key is required');
  });

  it('should initialize with API key', () => {
    const sdk = new VoiceAI({ apiKey: 'vk_test_key' });
    expect(sdk).toBeInstanceOf(VoiceAI);
  });
});
```

### Mocking Fetch

```typescript
// Mock successful response
(global.fetch as Mock).mockResolvedValueOnce({
  ok: true,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => ({ agent_id: 'agent-123', name: 'Test Agent' }),
});

// Mock error response
(global.fetch as Mock).mockResolvedValueOnce({
  ok: false,
  status: 401,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => ({ error: 'Unauthorized' }),
});
```

### Mocking LiveKit

The `index.test.ts` file includes comprehensive LiveKit mocking:

```typescript
vi.mock('livekit-client', () => {
  const mockRoom = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    // ... other methods
  };

  return {
    Room: vi.fn(() => mockRoom),
    RoomEvent: { /* event constants */ },
    createLocalAudioTrack: vi.fn().mockResolvedValue({ kind: 'audio' }),
    // ...
  };
});
```

## Configuration

Test configuration is in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.config.*',
      ],
    },
  },
});
```

## Tips

1. **Clear mocks between tests** - Use `vi.clearAllMocks()` in `beforeEach`
2. **Mock once for sequential calls** - Use `mockResolvedValueOnce()` for ordered responses
3. **Test error paths** - Always test both success and error scenarios
4. **Keep tests isolated** - Each test should be independent and repeatable
