import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url: string) => {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Closed');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // ✅ 新增：如果 URL 为空，直接返回，不创建 WebSocket，防止崩溃
    if (!url) {
      setConnectionStatus('Closed');
      return;
    }

    // Basic connection logic
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      console.log('WebSocket Connected');
      setConnectionStatus('Open');
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected');
      setConnectionStatus('Closed');
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setConnectionStatus('Error');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (error) {
        console.error('WebSocket JSON Parse Error:', error);
      }
    };

    return () => {
      socket.close();
    };
  }, [url]);

  return { lastMessage, connectionStatus };
};