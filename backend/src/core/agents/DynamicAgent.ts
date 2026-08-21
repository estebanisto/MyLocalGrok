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
    [IDENTITÉ SYSTÈME] : Tu es l'agent "${this.config.name}" (Rôle : ${this.config.role}). Tu fonctionnes actuellement sur le modèle d'IA : ${this.config.model || 'gemini-3.5-flash'}. Si on te demande ta version, cite cette information avec précision.

    ${this.config.systemPrompt}

    Current State: ${JSON.stringify(state)}
    Recent Context:
    ${historyStr}
    
    Respond STRICTLY in this JSON format. YOU MUST FILL the fields with your actual response, DO NOT copy the placeholder text:
    {
      "reflexion": "<write your internal thoughts and reasoning here>",
      "reponse": "<write your actual message to the user here in their language>",
      "action": null
    }
    
    If you need to update the state, set action to:
    "action": { "type": "UPDATE_PROJECT_STATE", "payload": { "status": "in_progress", "tasks": [] } }
    Or to call an agent:
    "action": { "type": "CALL_AGENT", "payload": { "agent": "target_agent_name", "message": "instructions" } }

    IMPORTANT RULES:
    1. NEVER include "> Chain of Thought" or raw JSON blocks inside the "reponse" field!
    2. The "reponse" field must ONLY contain your conversational text.
    3. Set "action" to null if no state change is needed.
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
