import { useState, useEffect } from 'react';

function App() {
  const [socket, setSocket] = useState(null); // WebSocket instance
  const [hostId, setHostId] = useState(''); // Host ID returned from the server
  const [error, setError] = useState(null); // Error message
  const [connected, setConnected] = useState(false); // WebSocket connection status

  useEffect(() => {
    // Establish WebSocket connection when the component mounts
    const ws = new WebSocket('ws://localhost:8080');
    setSocket(ws);

    // Handle WebSocket events
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('Error connecting to WebSocket.');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data); // Parse the response from the server

      if (data.action === 'create-room' && data.hostId) {
        // If the server responds with a host ID after creating a room
        setHostId(data.hostId);
      } else if (data.error) {
        // Handle any error messages from the server
        setError(data.error);
      }
    };

    // Clean up WebSocket connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  const createRoom = () => {
    if (socket && connected) {
      // Send a message to create a room
      socket.send(JSON.stringify({ action: 'create-room' }));
    } else {
      setError('WebSocket not connected. Please check the server.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>WebSocket Room Creation</h1>
      <button onClick={createRoom} disabled={!connected}>
        Create Room
      </button>
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
        {error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : (
          <p>Host ID: {hostId || 'Not fetched yet.'}</p>
        )}
        {!connected && <p style={{ color: 'orange' }}>Connecting to WebSocket...</p>}
      </div>
    </div>
  );
}

export default App;
