import { WorkspaceSandbox } from './WorkspaceSandbox';
import { EventEmitter } from 'events';

export interface ProjectState {
  name: string;
  version: string;
  status: string;
  tasks: Array<{id: string, title: string, status: string}>;
  architecture: any;
  activeAgents: string[];
  history: any[];
}

export class ProjectStateService extends EventEmitter {
  private isWriting: boolean = false;
  private readonly stateFile = 'projectState.json';

  constructor(private sandbox: WorkspaceSandbox) {
    super();
  }

  public async getState(): Promise<ProjectState> {
    const raw = await this.sandbox.readFile(this.stateFile);
    return JSON.parse(raw);
  }

  public async updateState(updater: (state: ProjectState) => ProjectState | Promise<ProjectState>): Promise<ProjectState> {
    // Simple locking mechanism
    while (this.isWriting) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.isWriting = true;
    try {
      const currentState = await this.getState();
      const newState = await updater(currentState);
      
      await this.sandbox.writeFile(this.stateFile, JSON.stringify(newState, null, 2));
      
      // Emit event so Socket.io can broadcast it
      this.emit('stateUpdated', newState);
      
      return newState;
    } finally {
      this.isWriting = false;
    }
  }
}
