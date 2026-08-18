import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3001';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { token }
    });
    
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
}
