import { BaseAgent } from './BaseAgent';
import { AgentChainOfThought } from './AgentTypes';
import { ProjectStateService } from '../../services/ProjectStateService';
import { WorkspaceSandbox } from '../../services/WorkspaceSandbox';
import { ApiKeyManager } from '../../services/ApiKeyManager';

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  themeColor: string;
}

export class DynamicAgent extends BaseAgent {
  constructor(
    private config: AgentConfig,
    stateService: ProjectStateService,
    sandbox: WorkspaceSandbox,
    keyManager: ApiKeyManager
  ) {
    super(config.name, config.role, stateService, sandbox, keyManager);
  }

  public async processMessage(message: string, contextHistory: any[]): Promise<AgentChainOfThought> {
    const state = await this.stateService.getState();
    
    // Formatting history for context
    const historyStr = contextHistory.slice(-10).map(m => `${m.sender}: ${m.text}`).join('\n');

    const systemPrompt = `
    ${this.config.systemPrompt}
    
    Current State: ${JSON.stringify(state)}
    Recent Context:
    ${historyStr}
    
    Respond STRICTLY in this JSON format:
    {
      "reflexion": "your internal thoughts",
      "reponse": "your message to the user",
      "action": {
        "type": "UPDATE_PROJECT_STATE",
        "payload": { "task": "example" }
      }
    }
    The "action" field is optional.
    `;

    const resultStr = await this.callLLM(message, systemPrompt);
    let parsed: AgentChainOfThought;
    
    try {
      parsed = JSON.parse(resultStr);
    } catch (e) {
      parsed = {
        reflexion: "Error parsing LLM response",
        reponse: "Je n'ai pas réussi à formuler ma réponse correctement."
      };
    }

    if (parsed.action && parsed.action.type === 'UPDATE_PROJECT_STATE') {
      await this.stateService.updateState((s: any) => {
        s.history.push({ time: new Date().toISOString(), agent: this.name, action: parsed!.action });
        return s;
      });
    }

    return parsed;
  }
}
