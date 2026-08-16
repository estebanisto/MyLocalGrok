import { WorkspaceSandbox } from './WorkspaceSandbox';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  thought?: string;
  action?: any;
  timestamp: string;
}

export class ChatHistoryService {
  private readonly historyFile = 'chatHistory.json';
  private readonly MAX_MESSAGES = 500;
  private isWriting = false;

  constructor(private sandbox: WorkspaceSandbox) {}

  public async getHistory(): Promise<ChatMessage[]> {
    try {
      const raw = await this.sandbox.readFile(this.historyFile);
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async addMessage(message: ChatMessage): Promise<void> {
    while (this.isWriting) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.isWriting = true;
    try {
      const history = await this.getHistory();
      history.push(message);
      
      // Sliding window
      if (history.length > this.MAX_MESSAGES) {
        history.splice(0, history.length - this.MAX_MESSAGES);
      }
      
      await this.sandbox.writeFile(this.historyFile, JSON.stringify(history, null, 2));
    } finally {
      this.isWriting = false;
    }
  }
}
