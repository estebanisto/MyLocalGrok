import { AgentChainOfThought } from './AgentTypes';
import { ProjectStateService } from '../../services/ProjectStateService';
import { WorkspaceSandbox } from '../../services/WorkspaceSandbox';
import { ApiKeyManager } from '../../services/ApiKeyManager';
import { GoogleGenerativeAI } from '@google/generative-ai';

export abstract class BaseAgent {
  protected name: string;
  protected roleDescription: string;

  constructor(
    name: string,
    roleDescription: string,
    protected model: string = 'gemini-1.5-flash-001',
    protected stateService: ProjectStateService,
    protected sandbox: WorkspaceSandbox,
    protected keyManager: ApiKeyManager
  ) {
    this.name = name;
    this.roleDescription = roleDescription;
  }

  public getName(): string {
    return this.name;
  }

  protected async callLLM(prompt: string, systemInstruction: string): Promise<string> {
    const key = this.keyManager.getNextActiveKey();
    if (!key) {
      throw new Error('No active API keys available');
    }

    try {
      console.log("Appel du modèle :", this.model);
      const genAI = new GoogleGenerativeAI(key);
      const generativeModel = genAI.getGenerativeModel({ 
        model: this.model,
        systemInstruction: systemInstruction 
      });
      const response = await generativeModel.generateContent(prompt);
      return response.response.text() || '{}';
    } catch (error: any) {
      if (error.status === 429) {
        this.keyManager.reportError(key, 429);
        return this.callLLM(prompt, systemInstruction); // Retry with next key
      }
      this.keyManager.reportError(key, error.status || 500);
      throw error;
    }
  }

  public abstract processMessage(message: string, contextHistory?: any[]): Promise<AgentChainOfThought>;
}
