import { Server, Socket } from 'socket.io';
import { ProjectManagerService, ProjectContext } from '../../services/ProjectManagerService';
import { ChatMessage } from '../../services/ChatHistoryService';

async function processAgentTurn(
  agentName: string, 
  inputText: string, 
  channel: string, 
  ctx: ProjectContext, 
  io: Server
) {
  const roomName = `project_${ctx.id}_${channel}`;
  const agent = ctx.orchestrator.getAgent(agentName);
  
  if (!agent) {
    const errorMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'System',
      text: `Agent ${agentName} not found.`,
      timestamp: new Date().toISOString()
    };
    await ctx.historyService.addMessage(errorMsg, channel);
    io.to(roomName).emit('message', { channel, message: errorMsg });
    return;
  }

  io.to(roomName).emit('agent_status', { channel, agent: agentName, status: 'thinking' });

  try {
    const currentHistory = await ctx.historyService.getHistory(channel);
    const thought = await agent.processMessage(inputText, currentHistory);
    
    const agentMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: agentName,
      text: thought.reponse,
      thought: thought.reflexion,
      action: thought.action,
      timestamp: new Date().toISOString()
    };

    await ctx.historyService.addMessage(agentMsg, channel);
    io.to(roomName).emit('message', { channel, message: agentMsg });

    // Handle Inter-Agent Communication (CALL_AGENT)
    if (thought.action && thought.action.type === 'CALL_AGENT' && thought.action.payload) {
      const targetAgentName = thought.action.payload.agent;
      const passMessage = thought.action.payload.message;
      
      if (targetAgentName && passMessage) {
        const targetChannel = targetAgentName === 'global' ? 'global' : targetAgentName;
        const targetRoomName = `project_${ctx.id}_${targetChannel}`;
        
        // Inject the forwarded message into the target channel
        const forwardedMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: agentName, // The agent who called
          text: passMessage,
          timestamp: new Date().toISOString()
        };
        
        await ctx.historyService.addMessage(forwardedMsg, targetChannel);
        io.to(targetRoomName).emit('message', { channel: targetChannel, message: forwardedMsg });

        // Trigger the target agent if it's a direct call (not just broadcasting to global)
        if (targetAgentName !== 'global') {
          // Fire and forget so we don't block
          processAgentTurn(targetAgentName, passMessage, targetChannel, ctx, io).catch(console.error);
        }
      }
    }
  } catch (error: any) {
    const errorMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'System',
      text: `Agent Error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
    await ctx.historyService.addMessage(errorMsg, channel);
    io.to(roomName).emit('message', { channel, message: errorMsg });
  } finally {
    io.to(roomName).emit('agent_status', { channel, agent: agentName, status: 'idle' });
  }
}

export interface ActiveUser {
  socketId: string;
  userId: string;
  username: string;
  role: string;
  projectId: string | null;
}

const activeConnections = new Map<string, ActiveUser>();

export function setupChatHandler(io: Server, projectManager: ProjectManagerService) {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }
    try {
      const jwtToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only');
      
      const { UserService } = require('../../services/UserService');
      const user = UserService.getUserById(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: User no longer exists'));
      }
      
      (socket as any).user = user;
      (socket as any).projectId = null;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  const broadcastSupervision = () => {
    const connections = Array.from(activeConnections.values());
    io.emit('supervision_update', connections);
  };

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`Client connected: ${socket.id}, User: ${user.username}`);

    activeConnections.set(socket.id, {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      projectId: null
    });

    if (user.role === 'admin' || user.role === 'team_lead') {
      socket.join('admin_supervision');
    }
    socket.emit('supervision_update', Array.from(activeConnections.values()));
    broadcastSupervision();

    socket.on('join_project', (projectId: string) => {
      // Leave previous project room if any
      const prevProjectId = (socket as any).projectId;
      if (prevProjectId) {
        socket.leave(`project_${prevProjectId}`);
      }
      
      (socket as any).projectId = projectId;
      socket.join(`project_${projectId}`);
      
      const conn = activeConnections.get(socket.id);
      if (conn) {
        conn.projectId = projectId;
        broadcastSupervision();
      }
    });

    // Request history for a specific channel
    socket.on('join_channel', async (channel: string) => {
      const projectId = (socket as any).projectId;
      if (!projectId) return;
      const ctx = projectManager.getContext(projectId);
      if (!ctx) return;
      
      // Join a socket room specific to project AND channel
      const roomName = `project_${projectId}_${channel}`;
      socket.join(roomName);
      
      const history = await ctx.historyService.getHistory(channel);
      socket.emit('history', { channel, history });
    });

    socket.on('message', async (data: { text: string, targetAgent?: string, channel?: string }) => {
      const projectId = (socket as any).projectId;
      if (!projectId) return;
      
      const ctx = projectManager.getContext(projectId);
      if (!ctx) return;

      const channel = data.channel || 'global';
      const roomName = `project_${projectId}_${channel}`;
      
      const userMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: user.username,
        text: data.text,
        timestamp: new Date().toISOString()
      };

      // Save and broadcast user message
      await ctx.historyService.addMessage(userMsg, channel);
      io.to(roomName).emit('message', { channel, message: userMsg });

      // Determine which agent should answer
      let agentName = channel !== 'global' ? channel : (data.targetAgent || 'Manager');
      
      // Fallback: if in global channel and the specific agent is not found, use the first available agent
      if (channel === 'global' && !ctx.orchestrator.getAgent(agentName)) {
        const available = ctx.orchestrator.getAvailableAgents();
        if (available.length > 0) {
          agentName = available[0];
        }
      }

      processAgentTurn(agentName, data.text, channel, ctx, io).catch(console.error);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      activeConnections.delete(socket.id);
      broadcastSupervision();
    });
  });
}
