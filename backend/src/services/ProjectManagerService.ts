import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceSandbox } from './WorkspaceSandbox';
import { ProjectStateService } from './ProjectStateService';
import { ChatHistoryService } from './ChatHistoryService';
import { AgentOrchestrator } from './AgentOrchestrator';
import { ApiKeyManager } from './ApiKeyManager';
import db from '../infrastructure/db/Database';

export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  createdAt: string;
  thumbnail_url?: string;
  assignedUsers?: { id: string; username: string; role: string }[];
}

export interface ProjectContext {
  id: string;
  sandbox: WorkspaceSandbox;
  stateService: ProjectStateService;
  historyService: ChatHistoryService;
  orchestrator: AgentOrchestrator;
}

export class ProjectManagerService extends EventEmitter {
  private activeContexts: Map<string, ProjectContext> = new Map();
  private readonly configPath: string;
  private readonly rootWorkspaceDir: string;

  constructor(private keyManager: ApiKeyManager) {
    super();
    this.rootWorkspaceDir = path.resolve(process.cwd(), 'workspace', 'projects');
    this.configPath = path.resolve(process.cwd(), 'workspace', 'projects_list.json');
    if (!fs.existsSync(this.rootWorkspaceDir)) {
      fs.mkdirSync(this.rootWorkspaceDir, { recursive: true });
    }
  }

  // Called during initial admin setup to migrate old projects
  public migrateOldProjectsToAdmin(adminId: string) {
    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const oldProjects = JSON.parse(data);
        
        const stmt = db.prepare('INSERT OR IGNORE INTO projects (id, name, owner_id, createdAt) VALUES (?, ?, ?, ?)');
        const insertMany = db.transaction((projects) => {
          for (const p of projects) {
            stmt.run(p.id, p.name, adminId, p.createdAt || new Date().toISOString());
          }
        });
        
        insertMany(oldProjects);
        
        // Rename file to prevent re-migration
        fs.renameSync(this.configPath, this.configPath + '.migrated');
      } catch (e) {
        console.error('Failed to migrate projects', e);
      }
    }
  }

  public getProjectsForUser(userId: string, role: string): ProjectInfo[] {
    let projects: ProjectInfo[] = [];
    if (role === 'admin') {
      projects = db.prepare('SELECT * FROM projects').all() as ProjectInfo[];
    } else {
      projects = db.prepare(`
        SELECT p.* FROM projects p
        LEFT JOIN project_assignments pa ON p.id = pa.project_id
        WHERE p.owner_id = ? OR pa.user_id = ?
        GROUP BY p.id
      `).all(userId, userId) as ProjectInfo[];
    }

    const allAssignments = db.prepare(`
      SELECT pa.project_id, u.id, u.username, u.role
      FROM project_assignments pa
      JOIN users u ON pa.user_id = u.id
    `).all() as any[];

    for (const p of projects) {
      p.assignedUsers = allAssignments
        .filter(a => a.project_id === p.id)
        .map(a => ({ id: a.id, username: a.username, role: a.role }));
    }

    return projects;
  }

  public deleteProject(id: string, userId: string, role: string): void {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectInfo;
    if (!project) throw new Error(`Project ${id} not found`);

    if (role !== 'admin' && project.owner_id !== userId) {
      throw new Error('Unauthorized to delete this project (only Admin or Owner can delete)');
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    const projectDir = path.join(this.rootWorkspaceDir, id);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    if (this.activeContexts.has(id)) {
      this.activeContexts.delete(id);
    }
    
    this.emit('projectsUpdated');
  }

  public createProject(name: string, description: string | undefined, owner_id: string): ProjectInfo {
    const id = Math.random().toString(36).substring(7) + '-' + Date.now().toString(36);
    const createdAt = new Date().toISOString();
    
    db.transaction(() => {
      db.prepare('INSERT INTO projects (id, name, description, owner_id, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, name, description || null, owner_id, createdAt);
      db.prepare('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)').run(id, owner_id);
    })();

    const newProject: ProjectInfo = { id, name, description: description || undefined, owner_id, createdAt };

    // Create the project folder
    const projectDir = path.join(this.rootWorkspaceDir, id);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

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

    this.emit('projectsUpdated');
    return newProject;
  }

  public loadActiveProject(id: string, userId: string, role: string): ProjectContext {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectInfo;
    if (!project) throw new Error(`Project ${id} not found`);

    if (role !== 'admin' && project.owner_id !== userId) {
      // Check if user is assigned
      const assigned = db.prepare('SELECT 1 FROM project_assignments WHERE project_id = ? AND user_id = ?').get(id, userId);
      if (!assigned) {
        throw new Error('Unauthorized to load this project');
      }
    }

    if (this.activeContexts.has(id)) {
      return this.activeContexts.get(id)!;
    }

    const projectDir = path.join(this.rootWorkspaceDir, id);
    if (!fs.existsSync(projectDir)) {
       fs.mkdirSync(projectDir, { recursive: true });
    }

    const sandbox = new WorkspaceSandbox(projectDir);
    const stateService = new ProjectStateService(sandbox);
    const historyService = new ChatHistoryService(sandbox);
    const orchestrator = new AgentOrchestrator(stateService, sandbox, this.keyManager);

    const context = { id, sandbox, stateService, historyService, orchestrator };
    this.activeContexts.set(id, context);
    
    // Emit event so server can hook socket events for this context if needed
    this.emit('projectContextLoaded', context);
    
    return context;
  }

  public getContext(projectId: string): ProjectContext | null {
    return this.activeContexts.get(projectId) || null;
  }

  public getProjectAssignments(projectId: string): string[] {
    const rows = db.prepare('SELECT user_id FROM project_assignments WHERE project_id = ?').all(projectId) as { user_id: string }[];
    return rows.map(r => r.user_id);
  }

  public assignUserToProject(projectId: string, targetUserId: string, assignerId: string, assignerRole: string): void {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectInfo;
    if (!project) throw new Error('Project not found');

    if (assignerRole !== 'admin' && project.owner_id !== assignerId) {
      throw new Error('Only the project owner or an admin can assign users');
    }

    db.prepare('INSERT OR IGNORE INTO project_assignments (project_id, user_id) VALUES (?, ?)').run(projectId, targetUserId);
    this.emit('projectsUpdated');
  }

  public removeUserFromProject(projectId: string, targetUserId: string, assignerId: string, assignerRole: string): void {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectInfo;
    if (!project) throw new Error('Project not found');

    if (assignerRole !== 'admin' && project.owner_id !== assignerId) {
      throw new Error('Only the project owner or an admin can remove users');
    }
    
    if (project.owner_id === targetUserId) {
      throw new Error('Cannot remove the project owner from the project');
    }

    db.prepare('DELETE FROM project_assignments WHERE project_id = ? AND user_id = ?').run(projectId, targetUserId);
    this.emit('projectsUpdated');
  }

  public updateProjectThumbnail(projectId: string, url: string): void {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectInfo;
    if (!project) throw new Error('Project not found');
    db.prepare('UPDATE projects SET thumbnail_url = ? WHERE id = ?').run(url, projectId);
    this.emit('projectsUpdated');
  }

  public updateProject(
    projectId: string, 
    name: string, 
    description: string | undefined, 
    assignedUserIds: string[], 
    updaterId: string, 
    updaterRole: string
  ): void {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectInfo;
    if (!project) throw new Error('Project not found');

    if (updaterRole !== 'admin' && project.owner_id !== updaterId) {
      throw new Error('Only the project owner or an admin can edit the project details');
    }

    db.transaction(() => {
      // Update basic info
      db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(name, description || null, projectId);
      
      // Update assignments (we keep the owner as always assigned or implicitly assigned, but let's just clear and set)
      db.prepare('DELETE FROM project_assignments WHERE project_id = ?').run(projectId);
      
      const insertStmt = db.prepare('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)');
      // Make sure owner is always assigned
      const usersToAssign = new Set(assignedUserIds);
      usersToAssign.add(project.owner_id);
      
      for (const uid of usersToAssign) {
        insertStmt.run(projectId, uid);
      }
    })();
    
    this.emit('projectsUpdated');
  }
}
