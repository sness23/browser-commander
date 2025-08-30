// Test WebSocket connection to server
import WebSocket from 'ws';

const serverUrl = 'ws://127.0.0.1:8080/ws';
const token = 'test123';

console.log('Testing WebSocket connection to:', serverUrl);

try {
  const ws = new WebSocket(serverUrl);
  
  ws.on('open', () => {
    console.log('✓ WebSocket connected successfully');
    
    // Send hello message like the extension does
    const hello = {
      kind: 'hello',
      clientId: 'test-client-' + Date.now(),
      label: 'Test Client',
      token: token,
      platform: 'test',
      version: '0.1.0',
      ts: Date.now(),
      mru: []
    };
    
    console.log('Sending hello message:', JSON.stringify(hello, null, 2));
    ws.send(JSON.stringify(hello));
  });
  
  ws.on('message', (data) => {
    console.log('← Received message:', data.toString());
  });
  
  ws.on('error', (error) => {
    console.error('✗ WebSocket error:', error.message);
  });
  
  ws.on('close', (code, reason) => {
    console.log('✗ WebSocket closed:', code, reason?.toString());
    process.exit(1);
  });
  
  // Keep alive for a few seconds
  setTimeout(() => {
    console.log('Test completed, closing connection');
    ws.close();
    process.exit(0);
  }, 3000);
  
} catch (error) {
  console.error('✗ Failed to create WebSocket:', error.message);
  process.exit(1);
}