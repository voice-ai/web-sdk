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

