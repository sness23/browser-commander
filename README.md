# Browser Commander (local LAN)

A minimal Chrome MV3 extension + Node WebSocket hub that lets you send commands (open URL, focus tab, close tab, run script) to individual browser instances on your LAN. Each extension instance registers with the server and maintains a Most-Recently-Focused Tabs list (MRU). The server hosts a simple controller page to target clients and fire commands.

## Structure

```
browser-commander/
├─ extension/   # Chrome MV3 extension (load unpacked)
└─ server/      # Node + Express + ws hub (serves controller UI)
```

## Quick start

### 1) Start the server

```bash
cd server
npm install
# optional: export a token so only you can control it
export COMMAND_TOKEN=changeme
npm start
# Server listens on http://127.0.0.1:8080 and serves the controller UI at /
```

Open the controller UI: http://127.0.0.1:8080

If you set `COMMAND_TOKEN`, the API requires an `Authorization: Bearer` header. The extension also needs this token (Options page).

### 2) Load the extension (Chrome)

- Go to `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked** and select the `extension` folder.
- Click the extension's **Options** and set:
  - **Server URL**: `ws://127.0.0.1:8080/ws` (or wherever your server is)
  - **Label**: a friendly name for this machine/profile
  - **Auth Token**: leave blank unless you set `COMMAND_TOKEN` on the server

The extension creates a persistent offscreen page that maintains a WebSocket to the server and forwards MRU updates.

### 3) Use the controller

- Visit http://127.0.0.1:8080
- You should see your connected client(s). Type a URL and click **Open** to open it on that target, or use **Open URL in all clients** to broadcast.
- **Focus last** will focus the most recently active tab on that client.
- The table shows the top 5 MRU tab entries (title/url).

## Notes & next steps

- **Reliability**: Offscreen document keeps the WS alive across MV3 service worker sleeps.
- **Security**: For local-only, you can skip tokens. If exposing beyond localhost, set `COMMAND_TOKEN` and consider running behind HTTPS with a reverse proxy.
- **Run scripts**: The `runScript` command requires a `match` pattern (e.g., `"https://example.com/*"`) and only executes in matching tabs.
- **Discovery**: You can add mDNS later so extensions auto-discover the server on your LAN.
- **Acks & UI feedback**: The server currently doesn’t display client acks; easy to add if you want a logs pane.

Enjoy!
