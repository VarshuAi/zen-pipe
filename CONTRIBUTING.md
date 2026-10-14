# Contributing to ZenPipe

Thank you for your interest in contributing to **ZenPipe**! ZenPipe is a high-performance, universal open-source media streaming engine, YouTube client, and CLI suite built for longevity and extreme reliability.

## 🌟 Core Philosophy & Design Rules

To preserve ZenPipe's speed, auditability, and independence, all contributions must respect the following core principles:

1. **Zero External NPM Runtime Dependencies**:
   - The core extraction engine, CLI, and HTTP streaming server **must NOT** add third-party runtime npm packages.
   - Utilize Node.js native APIs (`fetch`, `crypto`, `http`, `stream`, `fs`, `readline`, `child_process`).
   - Node 22/24 native type stripping (`--experimental-strip-types`) is used across the codebase.

2. **Clean Dark Theme & SVG Only UI**:
   - The web interface strictly follows authentic YouTube Dark Theme palette (`#0f0f0f` background, `#272727` borders, `#ffffff` primary text).
   - **Strictly zero emojis in the UI**: All UI elements, buttons, badges, indicators, and toasts must use clean inline SVGs.

3. **Privacy by Default**:
   - Zero telemetry, zero tracking, and zero compulsory cloud accounts.
   - User data (watch history, bookmarks, custom playlists) is stored strictly on the local device (`localStorage`).

---

## 🛠️ Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v22 or v24+
- Git

### Cloning & Running Locally

```bash
# Clone the repository
git clone https://github.com/VarshuAi/zen-pipe.git
cd zen-pipe

# Launch web server and API engine
npm start

# Open http://localhost:3333 in your browser
```

### Running the CLI

```bash
# Stream video directly
node bin/zenpipe.js stream jNQXAC9IVRw

# Search YouTube
node bin/zenpipe.js search "lofi hip hop"

# Show trending videos
node bin/zenpipe.js trending music US

# Check fallback mirrors
node bin/zenpipe.js mirrors
```

---

## 🧪 Testing Guidelines

Before submitting a Pull Request, you **must verify that all automated test suites pass**:

```bash
# Run core test suite (92 tests)
npm test

# Run extended features test suite
npm run test:features

# Run all test suites
npm run test:all
```

When adding a new extractor or feature, write a corresponding test in `test/zentube.test.ts` or `test/features.test.ts`.

---

## 📦 Pull Request Process

1. Fork the repo on GitHub: `https://github.com/VarshuAi/zen-pipe`
2. Create a topic branch: `git checkout -b feat/my-new-feature`
3. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(extractor): add support for 4K AV1 stream extraction"
   ```
4. Push to your fork:
   ```bash
   git push origin feat/my-new-feature
   ```
5. Open a Pull Request against `main`. GitHub Actions will automatically verify your code across Linux, macOS, and Windows.

---

## 📜 License

By contributing to ZenPipe, you agree that your contributions will be licensed under the **GNU General Public License v3.0 (GPL-3.0)**.
