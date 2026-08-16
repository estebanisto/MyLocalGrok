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
  model: string;
}

export class DynamicAgent extends BaseAgent {
  constructor(
    private config: AgentConfig,
    stateService: ProjectStateService,
    sandbox: WorkspaceSandbox,
    keyManager: ApiKeyManager
  ) {
    super(config.name, config.role, config.model || 'gemini-3.5-flash', stateService, sandbox, keyManager);
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
    
    Respond STRICTLY in this JSON format (do not use markdown blocks):
    {
      "reflexion": "your internal thoughts (will be hidden from user)",
      "reponse": "your natural language message to the user",
      "action": {
        "type": "UPDATE_PROJECT_STATE",
        "payload": { "status": "in_progress", "tasks": [] }
      }
    }
    IMPORTANT RULES:
    1. NEVER include "> Chain of Thought" or "_UPDATE_PROJECT_STATE" or raw JSON blocks inside the "reponse" field!
    2. The "reponse" field must ONLY contain your conversational, human-friendly text.
    3. If you want to update the state, use the "action" JSON object, DO NOT write it in the text.
    4. The "action" field is optional, omit it if no state change is needed.
    `;

    const resultStr = await this.callLLM(message, systemPrompt);
    let parsed: AgentChainOfThought;
    
    try {
      const cleaned = resultStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON Parse Error on:", resultStr);
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
