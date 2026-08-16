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
  const agent = ctx.orchestrator.getAgent(agentName);
  if (!agent) {
    const errorMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'System',
      text: `Agent ${agentName} not found.`,
      timestamp: new Date().toISOString()
    };
    await ctx.historyService.addMessage(errorMsg, channel);
    io.to(channel).emit('message', { channel, message: errorMsg });
    return;
  }

  io.to(channel).emit('agent_status', { channel, agent: agentName, status: 'thinking' });

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
    io.to(channel).emit('message', { channel, message: agentMsg });

    // Handle Inter-Agent Communication (CALL_AGENT)
    if (thought.action && thought.action.type === 'CALL_AGENT' && thought.action.payload) {
      const targetAgentName = thought.action.payload.agent;
      const passMessage = thought.action.payload.message;
      
      if (targetAgentName && passMessage) {
        const targetChannel = targetAgentName === 'global' ? 'global' : targetAgentName;
        
        // Inject the forwarded message into the target channel
        const forwardedMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: agentName, // The agent who called
          text: passMessage,
          timestamp: new Date().toISOString()
        };
        
        await ctx.historyService.addMessage(forwardedMsg, targetChannel);
        io.to(targetChannel).emit('message', { channel: targetChannel, message: forwardedMsg });

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
    io.to(channel).emit('message', { channel, message: errorMsg });
  } finally {
    io.to(channel).emit('agent_status', { channel, agent: agentName, status: 'idle' });
  }
}

export function setupChatHandler(io: Server, projectManager: ProjectManagerService) {
  io.on('connection', async (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Request history for a specific channel
    socket.on('join_channel', async (channel: string) => {
      const ctx = projectManager.getActiveContext();
      if (!ctx) return;
      socket.join(channel);
      const history = await ctx.historyService.getHistory(channel);
      socket.emit('history', { channel, history });
    });

    socket.on('message', async (data: { text: string, targetAgent?: string, channel?: string }) => {
      const ctx = projectManager.getActiveContext();
      if (!ctx) return;

      const channel = data.channel || 'global';
      
      const userMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: 'User',
        text: data.text,
        timestamp: new Date().toISOString()
      };

      // Save and broadcast user message
      await ctx.historyService.addMessage(userMsg, channel);
      io.to(channel).emit('message', { channel, message: userMsg });

      // Determine which agent should answer
      const agentName = channel !== 'global' ? channel : (data.targetAgent || 'Manager');
      
      processAgentTurn(agentName, data.text, channel, ctx, io).catch(console.error);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
