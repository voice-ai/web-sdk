# Voice.ai Web SDK Development Guide

This document describes how to set up, build, and distribute the Voice.ai Web SDK.

## Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- [pnpm](https://pnpm.io/) package manager

## Getting Started

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/voice-ai/web-sdk.git
cd web-sdk/sdk-web

# Install dependencies
pnpm install
```

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build the SDK for production |
| `pnpm dev` | Start local demo server |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm clean` | Remove build artifacts |

## Building the SDK

### Build for Production

```bash
pnpm build
```

This runs TypeScript compilation followed by Rollup bundling, producing:

```
dist/
├── index.js        # CommonJS bundle
├── index.esm.js    # ES Module bundle
├── index.d.ts      # TypeScript declarations
└── *.map           # Source maps
```

### Build Process

1. **TypeScript Compilation** (`tsc`)
   - Compiles `.ts` files to JavaScript
   - Generates type declarations

2. **Rollup Bundling** (`rollup -c`)
   - Creates CommonJS bundle for Node.js/older bundlers
   - Creates ESM bundle for modern bundlers
   - Resolves and bundles dependencies
   - Generates source maps

## Project Structure

```
sdk-web/
├── src/
│   ├── index.ts              # Main VoiceAI class + exports
│   ├── types.ts              # TypeScript interfaces
│   ├── client/               # REST API clients
│   │   ├── index.ts          # Sub-client re-exports (agents, tts, etc.)
│   │   ├── base.ts           # Base HTTP client
│   │   ├── agents.ts         # Agent API
│   │   ├── analytics.ts      # Analytics API
│   │   ├── knowledge-base.ts # Knowledge Base API
│   │   └── phone-numbers.ts  # Phone Numbers API
│   ├── components/           # UI components (sample)
│   │   ├── VoiceAgentWidget.ts
│   │   └── voice-agent-widget.css
│   └── __tests__/            # Test files
├── demo/
│   └── test.html             # Demo page for testing
├── dist/                     # Built output (generated)
├── package.json
├── tsconfig.json
├── rollup.config.js
└── vitest.config.ts
```

## Local Development

### Running the Demo

```bash
pnpm dev
```

This starts a local HTTP server and opens the demo page at `http://localhost:3000/demo/test.html`.

Edit `demo/test.html` to test SDK features during development.

### Making Changes

1. Edit source files in `src/`
2. Build to verify compilation: `pnpm build`
3. Test with the demo: `pnpm dev`
4. Run tests: `pnpm test`

## Distribution

### Publishing to npm

The SDK is published as `@voice-ai-labs/web-sdk` on npm.

```bash
# Ensure you're logged in to npm
npm login

# Build the package
pnpm build

# Publish (this runs prepublishOnly automatically)
npm publish --access public
```

### Package Configuration

Key fields in `package.json`:

```json
{
  "name": "@voice-ai-labs/web-sdk",
  "version": "0.2.0",
  "type": "module",
  "main": "dist/index.js",         // CommonJS entry
  "module": "dist/index.esm.js",   // ESM entry
  "types": "dist/index.d.ts",      // TypeScript declarations
  "files": ["dist"]                // Only publish dist/
}
```

### Version Bumping

Follow semantic versioning:

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features, backward compatible)
npm version minor

# Major release (breaking changes)
npm version major
```

### Pre-release Versions

```bash
# Beta release
npm version 0.3.0-beta.1

# Publish with tag
npm publish --access public --tag beta
```

## Rollup Configuration

The `rollup.config.js` produces two bundle formats:

```javascript
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',           // CommonJS for Node.js
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',           // ES Modules for bundlers
      sourcemap: true,
      exports: 'named'
    }
  ],
  plugins: [
    nodeResolve({ preferBuiltins: false, browser: true }),
    typescript({ tsconfig: './tsconfig.json', declaration: true, declarationDir: './dist' })
  ]
};
```

## TypeScript Configuration

Key settings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## External Dependencies

The SDK has minimal runtime dependencies. Key peer/dev dependencies:

| Package | Purpose |
|---------|---------|
| `livekit-client` | Real-time voice connection |
| `typescript` | Type checking and compilation |
| `rollup` | Module bundling |
| `vitest` | Testing framework |

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
pnpm clean && pnpm build
```

### Type Errors

```bash
# Check types without building
npx tsc --noEmit
```

### Test Failures

```bash
# Run specific test file
npx vitest run src/__tests__/index.test.ts

# Run tests matching pattern
npx vitest run -t "constructor"
```

## Code Style

- TypeScript for all source files
- Use meaningful variable/function names
- Keep functions focused and small
- Add JSDoc comments for public APIs
- Follow existing patterns in the codebase
