import { AgentChainOfThought } from './AgentTypes';
import { ProjectStateService } from '../../services/ProjectStateService';
import { WorkspaceSandbox } from '../../services/WorkspaceSandbox';
import { ApiKeyManager } from '../../services/ApiKeyManager';
import { GoogleGenAI } from '@google/genai';

export abstract class BaseAgent {
  protected name: string;
  protected roleDescription: string;

  constructor(
    name: string,
    roleDescription: string,
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
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });
      return response.text || '{}';
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
