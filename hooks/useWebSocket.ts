import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url: string) => {
  const [lastMessage, setLastMessage] = useState<any>(null);
  // 状态：Open, Connecting, Closed, Error
  const [connectionStatus, setConnectionStatus] = useState<string>('Closed');

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<any>(null);
  const isUnmounting = useRef(false); // 防止组件卸载后还在重连

  // 定义连接函数
  const connect = useCallback(() => {
    // 基础检查
    if (!url || isUnmounting.current) return;

    // 如果已有连接且处于连接中或已打开，则跳过
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    console.log(`[WebSocket] Connecting to ${url}...`);
    setConnectionStatus('Connecting');

    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      console.log('[WebSocket] Connected');
      setConnectionStatus('Open');
      // 连接成功，清除任何正在等待的重连任务
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (error) {
        console.error('[WebSocket] JSON Parse Error:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('[WebSocket] Disconnected', event.code, event.reason);
      setConnectionStatus('Closed');
      ws.current = null;

      // 如果不是组件卸载导致的断开，且 URL 有效，则尝试重连
      if (!isUnmounting.current && url) {
        console.log('[WebSocket] Attempting to reconnect in 3s...');

        // 避免重复设置定时器
        if (!reconnectTimeout.current) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectTimeout.current = null;
            connect(); // 递归调用重连
          }, 3000); // 3秒后重试
        }
      }
    };

    socket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setConnectionStatus('Error');
      // Error 后通常会触发 Close，重连逻辑统一在 onclose 处理
    };

  }, [url]);

  useEffect(() => {
    isUnmounting.current = false;
    connect();

    return () => {
      isUnmounting.current = true; // 标记卸载，阻止重连
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { lastMessage, connectionStatus };
};