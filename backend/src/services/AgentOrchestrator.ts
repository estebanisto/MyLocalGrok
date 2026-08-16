import { DynamicAgent, AgentConfig } from '../core/agents/DynamicAgent';
import { ProjectStateService } from './ProjectStateService';
import { WorkspaceSandbox } from './WorkspaceSandbox';
import { ApiKeyManager } from './ApiKeyManager';
import { EventEmitter } from 'events';

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, DynamicAgent> = new Map();
  private readonly configFile = 'agentsConfig.json';
  
  constructor(
    private stateService: ProjectStateService,
    private sandbox: WorkspaceSandbox,
    private keyManager: ApiKeyManager
  ) {
    super();
    this.initAgents();
  }

  public async initAgents() {
    try {
      const raw = await this.sandbox.readFile(this.configFile);
      const configs: AgentConfig[] = JSON.parse(raw);
      
      this.agents.clear();
      for (const config of configs) {
        this.agents.set(config.name, new DynamicAgent(config, this.stateService, this.sandbox, this.keyManager));
      }
      
      const updatedConfigs = await this.getAgentsConfig();
      this.emit('agentsUpdated', updatedConfigs);
    } catch (e) {
      console.warn("agentsConfig.json not found or invalid, waiting for creation.");
    }
  }

  public async getAgentsConfig(): Promise<AgentConfig[]> {
    try {
      const raw = await this.sandbox.readFile(this.configFile);
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async updateAgentsConfig(configs: AgentConfig[]) {
    await this.sandbox.writeFile(this.configFile, JSON.stringify(configs, null, 2));
    await this.initAgents();
  }

  public getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  public getAgent(name: string): DynamicAgent | undefined {
    return this.agents.get(name);
  }
}
