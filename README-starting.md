# Browser Commander - Getting Started Guide

This guide provides detailed step-by-step instructions to set up and run Browser Commander, a Chrome extension + Node.js server system for remote browser control over your local network.

## Overview

Browser Commander consists of two main components:
- **Server**: Node.js + Express + WebSocket server that manages client connections
- **Extension**: Chrome MV3 extension that connects to the server and executes commands

## Prerequisites

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- **Google Chrome** (or Chromium-based browser)
- **Network access** between devices on your LAN (if controlling across multiple machines)

## Part 1: Setting Up the Server

### 1.1 Install Dependencies

Navigate to the server directory and install the required packages:

```bash
cd server
npm install
```

This will install:
- `express` - Web server framework
- `ws` - WebSocket library

### 1.2 Configure Authentication (Optional but Recommended)

For security, especially if exposing beyond localhost, set up an authentication token:

```bash
# Set a secure token (replace 'your-secure-token-here' with your own)
export COMMAND_TOKEN=your-secure-token-here
```

**Important**: Without a token, anyone on your network can control your browsers. Always use a token in production environments.

### 1.3 Start the Server

```bash
npm start
```

You should see:
```
Browser Commander server listening on http://127.0.0.1:8080
Auth token required for /api/* and client hello. (if token was set)
```

The server is now running and ready to accept connections.

### 1.4 Verify Server is Running

Open your browser and navigate to `http://127.0.0.1:8080`. You should see the Browser Commander control interface (currently empty since no clients are connected).

## Part 2: Installing the Chrome Extension

### 2.1 Enable Developer Mode

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Toggle **"Developer mode"** on (top-right corner)

### 2.2 Load the Extension

1. Click **"Load unpacked"**
2. Navigate to and select the `extension` folder in your Browser Commander directory
3. The extension should now appear in your extensions list

### 2.3 Configure the Extension

1. Click on the extension's **"Details"** button
2. Click **"Extension options"** 
3. Configure the following settings:
   - **Server URL**: `ws://127.0.0.1:8080/ws` (default)
   - **Label**: Give this browser instance a friendly name (e.g., "My Desktop Chrome", "Laptop Browser")
   - **Auth Token**: Enter the same token you set in step 1.2 (leave blank if no token was set)
4. Save the settings

### 2.4 Verify Extension Connection

1. Go back to the server control interface at `http://127.0.0.1:8080`
2. Refresh the page
3. You should now see your browser client listed in the table with:
   - The label you assigned
   - Platform information
   - Recent tabs (MRU - Most Recently Used)

## Part 3: Testing the Setup

### 3.1 Basic Functionality Test

1. In the control interface, find your connected client
2. In the URL input field next to your client, enter: `https://www.example.com`
3. Click **"Open"** - this should open the URL in a new tab in the controlled browser
4. Try the **"Focus last"** button to focus the most recently used tab

### 3.2 Global Commands

1. In the top input field, enter a URL like `https://www.google.com`
2. Click **"Open URL in all clients"** - this will open the URL in all connected browsers

### 3.3 Advanced Features

- **List Tabs**: Click to see all open tabs in the browser console
- **Focus Tab**: Use to switch focus to specific tabs
- **Script Execution**: Send JavaScript commands (requires URL pattern matching for security)

## Part 4: Multi-Device Setup

### 4.1 Network Configuration

To control browsers on other devices:

1. Find your server machine's IP address:
   ```bash
   # On Linux/macOS
   ip addr show
   # or
   ifconfig
   
   # On Windows
   ipconfig
   ```

2. Update the server to listen on all interfaces (optional):
   ```bash
   # Set PORT and bind to all interfaces if needed
   export PORT=8080
   # The server already binds to 127.0.0.1 by default
   ```

### 4.2 Configure Remote Extensions

On each remote device:

1. Install the Chrome extension (repeat Part 2)
2. In extension options, set:
   - **Server URL**: `ws://[SERVER_IP]:8080/ws` (replace [SERVER_IP] with actual IP)
   - **Label**: Unique name for this device
   - **Auth Token**: Same token as server

### 4.3 Firewall Considerations

Ensure port 8080 is open on the server machine:

```bash
# Ubuntu/Debian
sudo ufw allow 8080

# CentOS/RHEL
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

## Part 5: Troubleshooting

### 5.1 Extension Not Connecting

**Check these common issues:**

1. **Server URL**: Ensure the WebSocket URL is correct (`ws://` not `http://`)
2. **Network connectivity**: Test if you can reach `http://[SERVER_IP]:8080` from the client browser
3. **Authentication**: Verify the token matches between server and extension
4. **Chrome permissions**: Ensure the extension has all required permissions

### 5.2 Connection Issues

**Extension shows as offline:**

1. Check browser developer console for WebSocket errors
2. Verify server is running and accessible
3. Check network firewall settings
4. Restart the extension by disabling/enabling it

### 5.3 Commands Not Working

**Commands fail to execute:**

1. Check server console for error messages
2. Verify the target browser client is still connected
3. For script execution, ensure URL patterns match target tabs
4. Check Chrome extension permissions

### 5.4 Debug Mode

Enable detailed logging:

```bash
# Server debug mode
DEBUG=* npm start

# Or check browser extension console
# Right-click extension icon → "Inspect popup"
```

## Part 6: Security Best Practices

### 6.1 Authentication

- **Always use a strong token** when running on networks with other users
- **Change the default port** if needed for additional security
- **Use HTTPS/WSS** with a reverse proxy for external access

### 6.2 Network Security

- **Restrict to local network**: Don't expose to the internet without proper security
- **Use VPN**: For remote access, use a VPN instead of direct internet exposure
- **Monitor connections**: Check the control interface regularly for unexpected clients

### 6.3 Script Execution

- **URL pattern matching** is enforced for all script execution
- **Review scripts** before execution
- **Limit script length** (automatically enforced)

## Part 7: Advanced Configuration

### 7.1 Custom Port

```bash
export PORT=3000
npm start
```

### 7.2 Environment Variables

```bash
# Complete configuration example
export PORT=8080
export COMMAND_TOKEN=my-secret-token
npm start
```

### 7.3 Running as a Service

Create a systemd service file (Linux):

```ini
[Unit]
Description=Browser Commander Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/browser-commander/server
Environment=PORT=8080
Environment=COMMAND_TOKEN=your-token
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

## Getting Help

If you encounter issues:

1. Check the server console output for error messages
2. Check Chrome extension console (Developer Tools → Extensions → Browser Commander → Inspect)
3. Verify network connectivity between all components
4. Review the main README.md for additional technical details

The system is designed to be resilient, with automatic reconnection and error recovery built into both the server and extension components.