# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Browser Commander is a Chrome MV3 extension + Node.js WebSocket server system for remote browser control over LAN. It consists of two main components:

### Server (`server/`)
- **Node.js + Express + WebSocket server** (`server/server.js`)
- Maintains client registry with WebSocket connections
- Serves controller UI at `/` and REST API at `/api/*`
- Handles authentication via optional `COMMAND_TOKEN` env variable
- Core endpoints:
  - `GET /api/clients` - List connected browser clients
  - `POST /api/send` - Send commands to specific clients or broadcast to all

### Extension (`extension/`)
- **Chrome MV3 extension** with persistent offscreen document architecture
- **Background service worker** (`background.js`) - Manages MRU tab tracking and extension lifecycle
- **Offscreen document** (`offscreen.js`) - Maintains persistent WebSocket connection to server and executes commands
- **Popup/Options** - User configuration interface

### Command Protocol
The system uses JSON WebSocket messages with these command types:
- `openUrl` - Open URL in new tab or update active tab
- `focusTab` - Focus tab by ID or URL pattern
- `closeTab` - Close tab by ID or URL pattern  
- `runScript` - Execute JavaScript in tabs matching URL pattern
- `listTabs` - Get all open tabs
- `requestMRU` - Get Most Recently Used tabs list

### Key Files
- `server/server.js:20-21` - Client state management and WebSocket handling
- `extension/offscreen.js:43-70` - Command execution and response handling
- `extension/background.js:22-38` - MRU tab tracking system
- `server/public/index.html` - Controller web interface

## Development Commands

### Server Development
```bash
cd server
npm install          # Install dependencies  
npm start            # Start server on port 8080
# Optional: export COMMAND_TOKEN=changeme for auth
```

### Extension Development
1. Load unpacked extension from `extension/` folder in `chrome://extensions`
2. Configure via extension Options page:
   - Server URL: `ws://127.0.0.1:8080/ws`
   - Label: Friendly client name
   - Auth Token: Must match server's `COMMAND_TOKEN` if set

### Controller Interface
- Access at `http://127.0.0.1:8080`
- Shows connected clients with MRU tabs and action buttons
- Supports individual client targeting or broadcast commands

## Security Considerations
- Script execution (`runScript` commands) requires explicit URL pattern matching for safety
- Authentication via Bearer token when `COMMAND_TOKEN` is configured
- Extension requires `<all_urls>` host permissions for tab management and script injection