import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceSandbox } from './WorkspaceSandbox';
import { ProjectStateService } from './ProjectStateService';
import { ChatHistoryService } from './ChatHistoryService';
import { AgentOrchestrator } from './AgentOrchestrator';
import { ApiKeyManager } from './ApiKeyManager';

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProjectContext {
  id: string;
  sandbox: WorkspaceSandbox;
  stateService: ProjectStateService;
  historyService: ChatHistoryService;
  orchestrator: AgentOrchestrator;
}

export class ProjectManagerService extends EventEmitter {
  private projects: ProjectInfo[] = [];
  private activeProjectContext: ProjectContext | null = null;
  private readonly configPath: string;
  private readonly rootWorkspaceDir: string;

  constructor(private keyManager: ApiKeyManager) {
    super();
    this.rootWorkspaceDir = path.resolve(process.cwd(), 'workspace', 'projects');
    this.configPath = path.resolve(process.cwd(), 'workspace', 'projects_list.json');
    this.loadProjects();
  }

  private loadProjects() {
    try {
      if (!fs.existsSync(this.rootWorkspaceDir)) {
        fs.mkdirSync(this.rootWorkspaceDir, { recursive: true });
      }
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.projects = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load projects list', e);
    }
  }

  private saveProjects() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.projects, null, 2));
    } catch (e) {
      console.error('Failed to save projects list', e);
    }
  }

  public getProjects(): ProjectInfo[] {
    return this.projects;
  }

  public deleteProject(id: string): void {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Project ${id} not found`);

    this.projects.splice(index, 1);
    this.saveProjects();

    const projectDir = path.join(this.rootWorkspaceDir, id);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    if (this.activeProjectContext && this.activeProjectContext.id === id) {
      this.activeProjectContext = null;
      this.emit('activeProjectChanged', null);
    }
    
    this.emit('projectsUpdated', this.projects);
  }

  public createProject(name: string): ProjectInfo {
    const id = Math.random().toString(36).substring(7) + '-' + Date.now().toString(36);
    const newProject = { id, name, createdAt: new Date().toISOString() };
    this.projects.push(newProject);
    this.saveProjects();

    // Create the project folder
    const projectDir = path.join(this.rootWorkspaceDir, id);
    fs.mkdirSync(projectDir, { recursive: true });

    // Initialize default project state
    const defaultState = {
      name,
      version: "1.0.0",
      status: "Initialization",
      tasks: [],
      architecture: {},
      activeAgents: [],
      history: []
    };
    fs.writeFileSync(path.join(projectDir, 'projectState.json'), JSON.stringify(defaultState, null, 2));
    
    // Default Agents config with the Project Manager
    const defaultAgents = [
      {
        id: Math.random().toString(36).substring(7),
        name: "Chef de projet",
        role: "Gestionnaire principal du projet",
        systemPrompt: "Tu es le Chef de projet principal. Ton rôle est de coordonner le travail de l'équipe, de maintenir à jour l'état du projet via l'action UPDATE_PROJECT_STATE, et de déléguer les tâches aux autres agents via l'action CALL_AGENT. Sois clair, concis, et veille à ce que le projet avance efficacement. Analyse les demandes de l'utilisateur et assigne le travail technique aux autres membres de l'équipe lorsque nécessaire.",
        modelId: "gemini-3.5-flash",
        temperature: 0.3,
        themeColor: "indigo"
      }
    ];
    fs.writeFileSync(path.join(projectDir, 'agentsConfig.json'), JSON.stringify(defaultAgents, null, 2));

    this.emit('projectsUpdated', this.projects);
    return newProject;
  }

  public loadActiveProject(id: string): ProjectContext {
    const project = this.projects.find(p => p.id === id);
    if (!project) throw new Error(`Project ${id} not found`);

    const projectDir = path.join(this.rootWorkspaceDir, id);
    if (!fs.existsSync(projectDir)) {
       fs.mkdirSync(projectDir, { recursive: true });
    }

    const sandbox = new WorkspaceSandbox(projectDir);
    const stateService = new ProjectStateService(sandbox);
    const historyService = new ChatHistoryService(sandbox);
    const orchestrator = new AgentOrchestrator(stateService, sandbox, this.keyManager);

    this.activeProjectContext = { id, sandbox, stateService, historyService, orchestrator };
    this.emit('activeProjectChanged', this.activeProjectContext);
    
    return this.activeProjectContext;
  }

  public getActiveContext(): ProjectContext | null {
    return this.activeProjectContext;
  }
}
