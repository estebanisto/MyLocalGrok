import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { Users, Folder, Settings, UserPlus, Edit2, Trash2, Save, X, Plus, LogOut, Code2, Activity, Download } from 'lucide-react';
import { ApiKeySettingsModal } from '../components/settings/ApiKeySettingsModal';

interface ProjectInfo {
  id: string;
  name: string;
  owner_id: string;
  createdAt: string;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState<'projects' | 'users' | 'settings' | 'supervision'>(
    () => (user?.role === 'admin' || user?.role === 'team_lead') ? 'supervision' : 'projects'
  );
  const [activeConnections, setActiveConnections] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'admin' && socket) {
      socket.emit('join_admin_supervision');
      socket.on('active_connections', (connections) => {
        setActiveConnections(connections);
      });
      return () => {
        socket.off('active_connections');
      };
    }
  }, [user, socket]);
  
  // Projects State
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'employee' | 'team_lead' | 'admin'>('employee');
  const [error, setError] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', role: '', password: '' });

  // Assignments State
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectAssignments, setProjectAssignments] = useState<string[]>([]);

  const fetchUsers = () => {
    fetch('/api/auth/users', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(console.error);
  };

  const fetchProjects = () => {
    fetch('/api/projects', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchProjects();
    if (user?.role === 'admin' || user?.role === 'team_lead') {
      fetchUsers();
    }
  }, [user]);

  // Project Handlers
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newProjectName })
      });
      if (res.ok) {
        setIsCreatingProject(false);
        setNewProjectName('');
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}/active`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/workspace/${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use an anchor to trigger the download. The backend must handle the token (e.g., via cookie or we just do fetch and blob).
    // The previous implementation probably used window.open or fetch. Let's use fetch and blob.
    fetch(`/api/projects/${id}/download`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      if (!res.ok) throw new Error("Erreur lors du téléchargement");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error(err);
      alert("Impossible de télécharger le projet.");
    });
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce projet et toutes ses données ?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/projects/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la suppression du projet");
      }
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error(error);
      alert("Impossible de supprimer ce projet. Veuillez vérifier vos droits ou réessayer.");
    }
  };

  // User Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }
      setNewUsername('');
      setNewPassword('');
      setError('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditSubmit = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setEditingUserId(null);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Assignment Handlers
  const loadAssignments = async (projectId: string) => {
    setSelectedProject(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setProjectAssignments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAssignment = async (projectId: string, userId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        await fetch(`/api/projects/${projectId}/assignments/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setProjectAssignments(prev => prev.filter(id => id !== userId));
      } else {
        await fetch(`/api/projects/${projectId}/assignments`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ userId })
        });
        setProjectAssignments(prev => [...prev, userId]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const canCreateProject = user?.role === 'admin' || user?.role === 'team_lead';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-slate-200 font-sans">
      
      {/* Sidebar */}
      <div className="w-64 h-full border-r border-slate-800 bg-slate-800 flex flex-col shrink-0">
        
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <Code2 className="text-indigo-400" size={24} />
            </div>
            <h1 className="text-xl font-bold">
              <span className="text-slate-100">Mind</span>
              <span className="text-indigo-400">Forge</span>
            </h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {(user?.role === 'admin' || user?.role === 'team_lead') && (
              <button 
                onClick={() => setActiveTab('supervision')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'supervision' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'hover:bg-slate-700 text-slate-400'}`}
              >
                <Activity size={20} />
                Supervision globale
              </button>
            )}
            <button 
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'projects' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'hover:bg-slate-700 text-slate-400'}`}
            >
              <Folder size={20} />
              Projets
            </button>
            {(user?.role === 'admin' || user?.role === 'team_lead') && (
              <button 
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'hover:bg-slate-700 text-slate-400'}`}
              >
                <Users size={20} />
                Utilisateurs & Accès
              </button>
            )}
            {user?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'hover:bg-slate-700 text-slate-400'}`}
              >
                <Settings size={20} />
                Réglages Globaux
              </button>
            )}
        </nav>

        {/* Profile & Logout (Bottom) */}
        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-800/50 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="text-sm">
              <div className="text-slate-400 mb-1">Connecté en tant que</div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200 truncate pr-2">{user?.username}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                  user?.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                  user?.role === 'team_lead' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {user?.role === 'team_lead' ? 'Lead' : user?.role}
                </span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-red-500/10 text-slate-300 hover:text-red-400 rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-red-500/20"
              title="Déconnexion"
            >
              <LogOut size={16} /> Quitter
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
          
          {/* SUPERVISION TAB */}
          {activeTab === 'supervision' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                    <Activity className="text-indigo-400" /> Supervision globale
                  </h2>
                  <p className="text-slate-400">Suivi en temps réel de l'activité sur la plateforme.</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <h3 className="text-slate-400 text-sm font-medium mb-1">Utilisateurs en ligne</h3>
                  <p className="text-3xl font-bold text-white">{activeConnections.length}</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <h3 className="text-slate-400 text-sm font-medium mb-1">Total Projets</h3>
                  <p className="text-3xl font-bold text-white">{projects.length}</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <h3 className="text-slate-400 text-sm font-medium mb-1">Total Utilisateurs</h3>
                  <p className="text-3xl font-bold text-white">{users.length}</p>
                </div>
              </div>

              {/* Projects Grid */}
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Folder className="text-indigo-400" size={20} /> Tous les Projets
                </h3>
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">Aucun projet disponible.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {projects.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => navigate(`/workspace/${p.id}`)}
                        className="bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 rounded-xl p-4 cursor-pointer transition-colors flex flex-col justify-between"
                      >
                        <div className="font-medium text-slate-200 truncate mb-2" title={p.name}>{p.name}</div>
                        <div className="text-xs text-slate-400 flex items-center justify-between">
                          <span>Créé le {new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline / Live Activity */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="text-emerald-400" size={20} /> Activité en direct
                  </h3>
                </div>
                <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {activeConnections.length === 0 ? (
                    <div className="text-center text-slate-500 py-4">Aucun utilisateur actuellement en ligne.</div>
                  ) : (
                    <div className="relative border-l border-slate-700 ml-3 md:ml-0 md:border-l-0">
                      <div className="md:absolute md:inset-y-0 md:left-1/2 md:-ml-px md:w-px md:bg-slate-700"></div>
                      <div className="space-y-6">
                        {activeConnections.map((conn, index) => {
                          const activeProject = projects.find(p => p.id === conn.projectId);
                          const isEven = index % 2 === 0;
                          return (
                            <div key={conn.socketId} className={`relative flex items-center md:justify-between w-full ${isEven ? 'md:flex-row-reverse' : ''}`}>
                              {/* Connector dot */}
                              <div className="absolute left-[-5px] md:left-1/2 md:-ml-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-800/50 animate-pulse z-10"></div>
                              
                              <div className={`w-full md:w-[calc(50%-2rem)] ml-6 md:ml-0 bg-slate-700/30 p-4 rounded-xl border border-slate-700/50 shadow`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-slate-200">{conn.username}</span>
                                  <span className="text-xs text-slate-500 capitalize">{conn.role}</span>
                                </div>
                                <div className="text-slate-400 text-sm">
                                  {conn.projectId ? (
                                    <span className="flex items-center gap-1.5 mt-2">
                                      <span className="text-slate-500">Travaille sur</span>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                                        <Folder size={12} />
                                        <span className="truncate max-w-[150px]">{activeProject ? activeProject.name : 'Projet inconnu'}</span>
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 italic mt-2 block">Navigue sur le tableau de bord</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Vos Projets</h2>
                  <p className="text-slate-400">Sélectionnez un projet pour accéder à l'espace de travail.</p>
                </div>
                
                {canCreateProject && !isCreatingProject && (
                  <button
                    onClick={() => setIsCreatingProject(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-indigo-500/20"
                  >
                    <Plus size={20} />
                    Nouveau Projet
                  </button>
                )}
              </div>

              {isCreatingProject && canCreateProject && (
                <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl max-w-2xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-white">Créer un projet</h3>
                    <button onClick={() => setIsCreatingProject(false)} className="text-slate-400 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleCreateProject} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Nom du projet</label>
                      <input
                        type="text"
                        autoFocus
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="Ex: Refonte du site web..."
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsCreatingProject(false)}
                        className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={!newProjectName.trim()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                      >
                        Créer
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {projects.length === 0 && !isCreatingProject ? (
                <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-slate-800 border-dashed">
                  <Folder className="mx-auto text-slate-600 mb-4" size={48} />
                  <h3 className="text-xl font-medium text-slate-300 mb-2">Aucun projet disponible</h3>
                  {canCreateProject ? (
                    <p className="text-slate-500">Cliquez sur "Nouveau Projet" pour commencer.</p>
                  ) : (
                    <p className="text-slate-500 max-w-md mx-auto">Vous n'avez pas encore été assigné à un projet. Veuillez contacter un administrateur ou un chef d'équipe.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => selectProject(p.id)}
                      className="group relative bg-slate-800/40 hover:bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500/50 p-6 cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col h-48"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-500/10 p-3 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                          <Folder className="text-indigo-400" size={28} />
                        </div>
                        {canCreateProject && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => handleDownloadProject(p.id, e)}
                              className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Télécharger le projet (ZIP)"
                            >
                              <Download size={18} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteProject(p.id, e)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Supprimer le projet"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white mb-1 truncate">
                        {p.name}
                      </h3>
                      
                      <div className="mt-auto flex items-center justify-between text-sm text-slate-500">
                        <span>Créé le {new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (user?.role === 'admin' || user?.role === 'team_lead') && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Gestion des Utilisateurs & Accès</h2>
                <p className="text-slate-400">Ajoutez de nouveaux membres et gérez leurs accès aux projets.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* User Creation & List */}
                <div className="space-y-6">
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <UserPlus size={20} className="text-indigo-400" /> Nouvel Utilisateur
                    </h3>
                    
                    {error && <div className="mb-4 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}
                    
                    <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm text-slate-400 mb-1">Nom d'utilisateur</label>
                          <input 
                            type="text" 
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500" 
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm text-slate-400 mb-1">Mot de passe</label>
                          <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500" 
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-sm text-slate-400 mb-1">Rôle</label>
                          <select 
                            value={newRole}
                            onChange={e => setNewRole(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="employee">Employé (Accès restreint)</option>
                            <option value="team_lead">Team Lead (Gère ses projets/employés)</option>
                            {user?.role === 'admin' && <option value="admin">Admin (Accès total)</option>}
                          </select>
                        </div>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap">
                          Créer l'utilisateur
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800 border-b border-slate-700">
                        <tr>
                          <th className="p-4 font-medium text-slate-400">Utilisateur</th>
                          <th className="p-4 font-medium text-slate-400">Rôle</th>
                          {user?.role === 'admin' && <th className="p-4 font-medium text-slate-400 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-800/50">
                            <td className="p-4">
                              {editingUserId === u.id ? (
                                <div className="space-y-2">
                                  <input 
                                    type="text" 
                                    value={editForm.username}
                                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500 w-full"
                                  />
                                  <input 
                                    type="password" 
                                    placeholder="Nouveau mdp (optionnel)"
                                    value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500 w-full"
                                  />
                                </div>
                              ) : (
                                u.username
                              )}
                            </td>
                            <td className="p-4">
                              {editingUserId === u.id ? (
                                <select 
                                  value={editForm.role}
                                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500 w-full"
                                >
                                  <option value="employee">Employee</option>
                                  <option value="team_lead">Team Lead</option>
                                  {user?.role === 'admin' && <option value="admin">Admin</option>}
                                </select>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                  u.role === 'team_lead' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {u.role}
                                </span>
                              )}
                            </td>
                            {user?.role === 'admin' && (
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                  {editingUserId === u.id ? (
                                    <>
                                      <button onClick={() => handleEditSubmit(u.id)} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors" title="Enregistrer">
                                        <Save size={16} />
                                      </button>
                                      <button onClick={() => setEditingUserId(null)} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors" title="Annuler">
                                        <X size={16} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => {
                                          setEditingUserId(u.id);
                                          setEditForm({ username: u.username, role: u.role, password: '' });
                                        }} 
                                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      {u.id !== user.id && (
                                        <button 
                                          onClick={() => handleDeleteUser(u.id)} 
                                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Project Access Management */}
                <div>
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden sticky top-0">
                    <div className="p-4 bg-slate-800 border-b border-slate-700">
                      <h3 className="font-medium">Accès aux Projets</h3>
                      <p className="text-sm text-slate-400 mt-1">Sélectionnez un projet pour gérer ses accès.</p>
                      <select 
                        className="mt-3 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        value={selectedProject || ''}
                        onChange={(e) => loadAssignments(e.target.value)}
                      >
                        <option value="" disabled>-- Choisir un projet --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedProject ? (
                      <div className="p-2 divide-y divide-slate-800/50 max-h-[500px] overflow-y-auto">
                        {users.filter(u => u.role !== 'admin').map(u => {
                          const isAssigned = projectAssignments.includes(u.id);
                          return (
                            <div key={u.id} className="flex items-center justify-between p-3 hover:bg-slate-800/30 rounded-lg transition-colors">
                              <div>
                                <div className="font-medium">{u.username}</div>
                                <div className="text-xs text-slate-500 capitalize">{u.role}</div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={isAssigned}
                                  onChange={() => toggleAssignment(selectedProject, u.id, isAssigned)}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        Sélectionnez un projet ci-dessus pour afficher et modifier les accès des employés.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && user?.role === 'admin' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Réglages Globaux</h2>
                <p className="text-slate-400">Configurez les paramètres généraux de la plateforme.</p>
              </div>
              <ApiKeySettingsModal onClose={() => {}} inline={true} />
            </div>
          )}
        </div>
    </div>
  );
}
