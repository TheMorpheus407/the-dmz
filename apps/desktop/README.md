# The DMZ: Desktop Application

This is the Tauri-based desktop application wrapper for The DMZ: Archive Gate, enabling Steam distribution and local save functionality.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Rust (latest stable)
- Tauri CLI: `cargo install tauri-cli`

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Install Tauri CLI (if not already installed):

   ```bash
   cargo install tauri-cli
   ```

3. Generate application icons:
   - Place 32x32.png, 128x128.png, 128x128@2x.png, icon.icns, and icon.ico in `src-tauri/icons/`
   - Or use `tauri icon` command to generate from a source image

## Development

```bash
# Run in development mode
pnpm dev

# Or use Tauri directly
pnpm tauri dev
```

## Build

```bash
# Build for current platform
pnpm build

# Build for all platforms
pnpm tauri build
```

## Features

- **Local Save System**: 10 save slots with JSON versioning and SHA-256 checksums
- **Window Management**: Fullscreen, minimize to tray, window state persistence
- **Steam Integration**: Achievements API (stub - requires Steam app ID)
- **System Tray**: Background operation with tray menu

## Save System

Saves are stored in:

- Windows: `%LOCALAPPDATA%\the-dmz\`
- macOS: `~/Library/Application Support/the-dmz/`
- Linux: `~/.local/share/the-dmz/`

## Steam Integration

The Steam API integration is currently a stub. To fully integrate:

1. Register the game on Steamworks
2. Obtain an App ID
3. Add Steam SDK integration via tauri-plugin-steam or native bindings

## Architecture

```
apps/desktop/
├── src/
│   ├── lib/
│   │   ├── save/       # Save/load system
│   │   ├── platform/  # Platform detection
│   │   └── steam/      # Steam API integration
│   └── index.ts        # Main exports
└── src-tauri/
    ├── src/
    │   ├── main.rs     # Entry point
    │   └── lib.rs      # Tauri commands
    └── tauri.conf.json # Tauri configuration
```
