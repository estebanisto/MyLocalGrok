import { Server, Socket } from 'socket.io';
import { AgentOrchestrator } from '../../services/AgentOrchestrator';
import { ChatHistoryService, ChatMessage } from '../../services/ChatHistoryService';

export function setupChatHandler(io: Server, orchestrator: AgentOrchestrator, historyService: ChatHistoryService) {
  io.on('connection', async (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send history on connect
    const history = await historyService.getHistory();
    socket.emit('history', history);

    socket.on('message', async (data: { text: string, targetAgent?: string }) => {
      const userMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: 'User',
        text: data.text,
        timestamp: new Date().toISOString()
      };

      // Save and broadcast user message
      await historyService.addMessage(userMsg);
      io.emit('message', userMsg);

      const agentName = data.targetAgent || 'Manager';
      const agent = orchestrator.getAgent(agentName);

      if (agent) {
        io.emit('agent_status', { agent: agentName, status: 'thinking' });

        try {
          const currentHistory = await historyService.getHistory();
          const thought = await agent.processMessage(data.text, currentHistory);
          
          const agentMsg: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            sender: agentName,
            text: thought.reponse,
            thought: thought.reflexion,
            action: thought.action,
            timestamp: new Date().toISOString()
          };

          await historyService.addMessage(agentMsg);
          io.emit('message', agentMsg);
        } catch (error: any) {
          const errorMsg: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            sender: 'System',
            text: `Agent Error: ${error.message}`,
            timestamp: new Date().toISOString()
          };
          await historyService.addMessage(errorMsg);
          io.emit('message', errorMsg);
        } finally {
          io.emit('agent_status', { agent: agentName, status: 'idle' });
        }
      } else {
        const errorMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sender: 'System',
          text: `Agent ${agentName} not found.`,
          timestamp: new Date().toISOString()
        };
        await historyService.addMessage(errorMsg);
        io.emit('message', errorMsg);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
