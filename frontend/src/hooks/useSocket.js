import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
const SOCKET_SERVER_URL = 'http://localhost:3001';
export function useSocket() {
    const [socket, setSocket] = useState(null);
    useEffect(() => {
        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);
        return () => {
            newSocket.close();
        };
    }, []);
    return socket;
}
