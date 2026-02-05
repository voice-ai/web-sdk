# Contributing to Voice.ai Web SDK

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/voice-ai/web-sdk.git
cd web-sdk

# Install dependencies
pnpm install

# Build the SDK
pnpm run build

# Run the demo
pnpm run dev
```

## Making Changes

1. **Fork the repository** and create a new branch for your feature/fix
2. **Make your changes** in the `src/` directory
3. **Build** to verify it compiles: `pnpm run build`
4. **Test** your changes with the demo: `pnpm run dev`
5. **Submit a pull request** with a clear description

## Project Structure

```
src/
├── index.ts              # Main SDK class
├── types.ts              # TypeScript interfaces
└── components/           # Sample UI widget (copy & customize)
    ├── VoiceAgentWidget.ts
    └── voice-agent-widget.css

demo/
└── test.html             # Demo page for testing

dist/                     # Built output (generated)
```

## Code Style

- TypeScript for all source files
- Use meaningful variable/function names
- Keep functions focused and small
- Add comments for complex logic

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include a clear description of what changed and why
- Make sure the build passes before submitting
- Update README if adding new features

## Questions?

Open an issue if you have questions or run into problems.

