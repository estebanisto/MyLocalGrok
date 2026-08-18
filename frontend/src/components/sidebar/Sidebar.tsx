import { useState } from 'react';
import type { AgentStatus } from '../../App';
import { Users, LayoutList, Zap, Settings, Plus, LogOut, MessageSquare } from 'lucide-react';
import { AgentStudioModal } from './AgentStudioModal';
import type { AgentConfig } from './AgentStudioModal';

interface SidebarProps {
  projectId: string;
  agentsStatus: AgentStatus[];
  projectState: any;
  agentsConfig: AgentConfig[];
  onAgentsChange: () => void;
  currentChannel: string;
  onSelectChannel: (channel: string) => void;
  onQuitProject: () => void;
}

export function Sidebar({ projectId, agentsStatus, projectState, agentsConfig, onAgentsChange, currentChannel, onSelectChannel, onQuitProject }: SidebarProps) {
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (agent: AgentConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  return (
    <>
      <aside className="w-64 bg-slate-800/50 border-r border-slate-800 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Zap size={20} className="text-indigo-400" />
            {projectState?.name || 'Workspace'}
          </h2>
          <button 
            onClick={onQuitProject}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
            title="Quitter le projet"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <MessageSquare size={14} />
              <span>Salons</span>
            </div>
            <button
              onClick={() => onSelectChannel('global')}
              className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors font-medium text-sm ${
                currentChannel === 'global' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50' : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${currentChannel === 'global' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              Salon Global
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <Users size={14} />
              <span>Équipe (Agents)</span>
            </div>
            <ul className="space-y-2">
              {Array.isArray(agentsConfig) && agentsConfig.map((agent) => {
                const status = agentsStatus.find(a => a.agent === agent.name)?.status || 'idle';
                const isSelected = currentChannel === agent.name;
                return (
                  <li 
                    key={agent.id} 
                    onClick={() => onSelectChannel(agent.name)}
                    className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : 'hover:bg-slate-700/50'}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-300">{agent.name}</span>
                      <span className="text-[10px] text-slate-500">{agent.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => handleEdit(agent, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-slate-400 transition-opacity">
                        <Settings size={14} />
                      </button>
                      {status === 'thinking' && (
                        <span className="flex h-2 w-2 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${agent.themeColor || 'indigo'}-400 opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 bg-${agent.themeColor || 'indigo'}-500`}></span>
                        </span>
                      )}
                      {status === 'idle' && (
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <button 
              onClick={handleCreate}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-md border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 hover:bg-slate-800 transition-colors text-sm"
            >
              <Plus size={16} /> Ajouter un Agent
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <LayoutList size={14} />
              <span>Tâches du projet</span>
            </div>
            <ul className="space-y-2">
              {projectState?.tasks?.map((task: any) => (
                <li key={task.id} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className={task.status === 'completed' ? 'line-through opacity-60' : ''}>{task.title}</span>
                </li>
              ))}
              {(!projectState?.tasks || projectState.tasks.length === 0) && (
                <li className="text-xs text-slate-500 italic">Aucune tâche en cours</li>
              )}
            </ul>
          </div>
        </div>
      </aside>
      {isModalOpen && (
        <AgentStudioModal
          projectId={projectId}
          agent={editingAgent}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={onAgentsChange}
        />
      )}
    </>
  );
}
