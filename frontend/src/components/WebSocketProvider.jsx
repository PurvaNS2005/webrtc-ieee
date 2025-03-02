import { createContext, useContext, useEffect, useState } from "react";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [ws, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => console.log("Connected to WebSocket");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "userIdAssigned") {
        setUserId(data.userId);
      }
    };

    setSocket(ws);

    return () => {
      ws.close(); // Close connection when app unmounts
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ ws, userId, setUserId }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
