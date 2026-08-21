import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { Users, Folder, Settings, UserPlus, Edit2, Trash2, Save, X, Plus, LogOut, Code2, Activity, Download, Image as ImageIcon, Search } from 'lucide-react';
import { ApiKeySettingsModal } from '../components/settings/ApiKeySettingsModal';

interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  createdAt: string;
  thumbnail_url?: string;
  assignedUsers?: { id: string; username: string; role: string }[];
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
    if (socket) {
      if (user?.role === 'admin' || user?.role === 'team_lead') {
        // We might not need this emit if the backend already joins on connection, but let's keep it safe
        socket.emit('join_admin_supervision');
      }
      socket.on('supervision_update', (connections) => {
        setActiveConnections(connections);
      });
      return () => {
        socket.off('supervision_update');
      };
    }
  }, [user, socket]);
  
  // Projects State
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectUsers, setNewProjectUsers] = useState<string[]>([]);
  const [newProjectThumbnail, setNewProjectThumbnail] = useState<File | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
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
      const formData = new FormData();
      formData.append('name', newProjectName);
      if (newProjectDesc) formData.append('description', newProjectDesc);
      if (newProjectUsers.length > 0) formData.append('assignedUsers', JSON.stringify(newProjectUsers));
      if (newProjectThumbnail) formData.append('thumbnail', newProjectThumbnail);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      if (res.ok) {
        setIsCreatingProject(false);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectUsers([]);
        setNewProjectThumbnail(null);
        fetchProjects();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création du projet.");
    }
  };
  const handleOpenEditModal = (p: ProjectInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewProjectName(p.name);
    setNewProjectDesc(p.description || '');
    setNewProjectUsers(p.assignedUsers?.map(u => u.id) || []);
    setNewProjectThumbnail(null);
    setEditingProjectId(p.id);
    setIsEditingProject(true);
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !editingProjectId) return;

    try {
      const formData = new FormData();
      formData.append('name', newProjectName);
      if (newProjectDesc) formData.append('description', newProjectDesc);
      formData.append('assignedUsers', JSON.stringify(newProjectUsers));
      if (newProjectThumbnail) formData.append('thumbnail', newProjectThumbnail);

      const res = await fetch(`/api/projects/${editingProjectId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      if (res.ok) {
        setIsEditingProject(false);
        setEditingProjectId(null);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectUsers([]);
        setNewProjectThumbnail(null);
        fetchProjects();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification du projet.");
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

  const handleUploadThumbnail = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('thumbnail', file);

    try {
      const res = await fetch(`/api/projects/${id}/thumbnail`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (res.ok) {
        fetchProjects(); // Rafraichir les images
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'upload de l'image.");
    }
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
  
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    const parts = name.trim().split(/[\s-._]+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-rose-500 text-white';
      case 'team_lead': return 'bg-amber-500 text-amber-950';
      default: return 'bg-emerald-500 text-white';
    }
  };

  const uniqueConnections: any[] = [];
  activeConnections.forEach(conn => {
    const existing = uniqueConnections.find(u => u.userId === conn.userId);
    if (!existing) {
      uniqueConnections.push({ ...conn });
    } else if (conn.projectId && !existing.projectId) {
      existing.projectId = conn.projectId;
    }
  });

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
                  <p className="text-3xl font-bold text-white">{uniqueConnections.length}</p>
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
                        className="bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 rounded-xl overflow-hidden cursor-pointer transition-colors flex flex-col"
                      >
                        <div className="h-20 w-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-b border-slate-600/50">
                          {p.thumbnail_url ? (
                            <img src={`http://localhost:3001${p.thumbnail_url}`} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Code2 className="text-slate-500/50" size={32} />
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div className="font-medium text-slate-200 truncate mb-1" title={p.name}>{p.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Créé le {new Date(p.createdAt).toLocaleDateString()}
                          </div>
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
                  {uniqueConnections.length === 0 ? (
                    <div className="text-center text-slate-500 py-4">Aucun utilisateur actuellement en ligne.</div>
                  ) : (
                    <div className="relative border-l border-slate-700 ml-3 md:ml-0 md:border-l-0">
                      <div className="md:absolute md:inset-y-0 md:left-1/2 md:-ml-px md:w-px md:bg-slate-700"></div>
                      <div className="space-y-6">
                        {uniqueConnections.map((conn, index) => {
                          const activeProject = projects.find(p => p.id === conn.projectId);
                          const isEven = index % 2 === 0;
                          return (
                            <div key={conn.userId} className={`relative flex items-center md:justify-between w-full ${isEven ? 'md:flex-row-reverse' : ''}`}>
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
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Rechercher un projet..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 transition-all"
                    />
                  </div>
                  {canCreateProject && !isCreatingProject && (
                    <button
                      onClick={() => setIsCreatingProject(true)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-indigo-500/20 shrink-0"
                    >
                      <Plus size={20} />
                      Nouveau Projet
                    </button>
                  )}
                </div>
              </div>

              {filteredProjects.length === 0 ? (
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
                  {filteredProjects.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => selectProject(p.id)}
                      className="group relative bg-slate-800/40 hover:bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500/50 cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col min-h-[16rem] overflow-hidden"
                    >
                      <div className="h-32 w-full relative bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700/50 flex items-center justify-center">
                        {p.thumbnail_url ? (
                          <img src={`http://localhost:3001${p.thumbnail_url}`} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Code2 className="text-slate-700/50" size={48} />
                        )}
                        
                        {canCreateProject && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700">
                            <button 
                              onClick={(e) => handleOpenEditModal(p, e)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                              title="Modifier le projet"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={(e) => handleDownloadProject(p.id, e)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                              title="Télécharger le projet (ZIP)"
                            >
                              <Download size={16} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteProject(p.id, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                              title="Supprimer le projet"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white truncate">
                            {p.name}
                          </h3>
                        </div>
                        
                        {p.description && (
                          <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                            {p.description}
                          </p>
                        )}
                        
                        <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-slate-700/50">
                          {p.assignedUsers && p.assignedUsers.filter(u => u.role !== 'admin').length > 0 && (
                            <div className="flex items-center pl-2">
                              {[...p.assignedUsers].filter(u => u.role !== 'admin').sort((a, b) => {
                                const ranks: Record<string, number> = { admin: 1, team_lead: 2, employee: 3 };
                                return (ranks[a.role] || 4) - (ranks[b.role] || 4);
                              }).map(u => {
                                const isOnline = activeConnections.some(conn => conn.userId === u.id && conn.projectId === p.id);
                                return (
                                  <div 
                                    key={u.id} 
                                    className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-800 ${getRoleColor(u.role)} font-medium text-xs -ml-2 hover:z-10 transition-transform hover:scale-110`}
                                    title={`${u.username} (${u.role})`}
                                  >
                                    {getInitials(u.username)}
                                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Créé le {new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column: User List */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-800 border-b border-slate-700">
                          <tr>
                            <th className="py-4 px-4 text-xs uppercase font-semibold text-slate-400">Utilisateur</th>
                            <th className="py-4 px-4 text-xs uppercase font-semibold text-slate-400">Rôle</th>
                            {user?.role === 'admin' && <th className="py-4 px-4 text-xs uppercase font-semibold text-slate-400 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="py-4 px-4">
                                {editingUserId === u.id ? (
                                  <div className="space-y-2">
                                    <input 
                                      type="text" 
                                      value={editForm.username}
                                      onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                    <input 
                                      type="password" 
                                      placeholder="Nouveau mdp (optionnel)"
                                      value={editForm.password}
                                      onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  u.username
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {editingUserId === u.id ? (
                                  <select 
                                    value={editForm.role}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                <td className="py-4 px-4 text-right">
                                  <div className="flex justify-end gap-3">
                                    {editingUserId === u.id ? (
                                      <>
                                        <button onClick={() => handleEditSubmit(u.id)} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors cursor-pointer" title="Enregistrer">
                                          <Save size={16} />
                                        </button>
                                        <button onClick={() => setEditingUserId(null)} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer" title="Annuler">
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
                                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        {u.id !== user.id && (
                                          <button 
                                            onClick={() => handleDeleteUser(u.id)} 
                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
                </div>

                {/* Right Column: Tools */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  {/* User Creation Form */}
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <UserPlus size={20} className="text-indigo-400" /> Nouvel Utilisateur
                    </h3>
                    
                    {error && <div className="mb-4 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}
                    
                    <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                      <div className="w-full">
                        <label className="block text-sm text-slate-400 mb-1">Nom d'utilisateur</label>
                        <input 
                          type="text" 
                          autoComplete="off"
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none [&:-webkit-autofill]:[WebkitBoxShadow:0_0_0_30px_#131314_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]" 
                          required
                        />
                      </div>
                      <div className="w-full">
                        <label className="block text-sm text-slate-400 mb-1">Mot de passe</label>
                        <input 
                          type="password" 
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none [&:-webkit-autofill]:[WebkitBoxShadow:0_0_0_30px_#131314_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]" 
                          required
                        />
                      </div>
                      <div className="w-full">
                        <label className="block text-sm text-slate-400 mb-1">Rôle</label>
                        <select 
                          value={newRole}
                          onChange={e => setNewRole(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="employee">Employé (Accès restreint)</option>
                          <option value="team_lead">Team Lead (Gère ses projets/employés)</option>
                          {user?.role === 'admin' && <option value="admin">Admin (Accès total)</option>}
                        </select>
                      </div>
                      <button type="submit" className="w-full px-6 py-2.5 h-[42px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap mt-2">
                        Créer l'utilisateur
                      </button>
                    </form>
                  </div>

                  {/* Project Access Management */}
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden sticky top-0">
                    <div className="p-6 bg-slate-800 border-b border-slate-700">
                      <h3 className="text-lg font-semibold mb-1">Accès aux Projets</h3>
                      <p className="text-sm text-slate-400">Sélectionnez un projet pour gérer ses accès.</p>
                      <select 
                        className="mt-4 w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
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

          {/* Create Project Modal */}
          {isCreatingProject && (user?.role === 'admin' || user?.role === 'team_lead') && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50">
                  <h3 className="text-xl font-semibold text-white">Créer un nouveau projet</h3>
                  <button onClick={() => setIsCreatingProject(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-700 p-2 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleCreateProject} className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom du projet *</label>
                      <input
                        type="text"
                        autoFocus
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder="Ex: Refonte du site web..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                      <textarea
                        value={newProjectDesc}
                        onChange={e => setNewProjectDesc(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px]"
                        placeholder="Courte description du projet..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Image de couverture</label>
                      <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-slate-900/50 border border-slate-700 border-dashed hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl p-4 flex-1 flex flex-col items-center justify-center transition-all">
                          <ImageIcon className="text-slate-400 mb-2" size={24} />
                          <span className="text-sm text-slate-400">Cliquez pour choisir une image</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => setNewProjectThumbnail(e.target.files?.[0] || null)}
                          />
                        </label>
                        {newProjectThumbnail && (
                          <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 shrink-0 relative group">
                            <img src={URL.createObjectURL(newProjectThumbnail)} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setNewProjectThumbnail(null)}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="text-white" size={24} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'team_lead') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Assigner des membres (Optionnel)</label>
                        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                          {users.filter(u => u.id !== user.id).length === 0 ? (
                            <div className="text-slate-500 text-sm italic text-center py-2">Aucun autre utilisateur disponible</div>
                          ) : (
                            <div className="space-y-2">
                              {users.filter(u => u.id !== user.id).map(u => (
                                <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                                    checked={newProjectUsers.includes(u.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewProjectUsers([...newProjectUsers, u.id]);
                                      } else {
                                        setNewProjectUsers(newProjectUsers.filter(id => id !== u.id));
                                      }
                                    }}
                                  />
                                  <span className="text-slate-200">{u.username}</span>
                                  <span className="text-xs text-slate-500 uppercase tracking-wider">{u.role}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
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
                      Créer le projet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
        
        {/* Edit Project Modal */}
        {isEditingProject && (user?.role === 'admin' || user?.role === 'team_lead') && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50">
                <h3 className="text-xl font-semibold text-white">Modifier le projet</h3>
                <button onClick={() => setIsEditingProject(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-700 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleEditProject} className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom du projet *</label>
                    <input
                      type="text"
                      autoFocus
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="Ex: Refonte du site web..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                    <textarea
                      value={newProjectDesc}
                      onChange={e => setNewProjectDesc(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px]"
                      placeholder="Courte description du projet..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Image de couverture</label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer bg-slate-900/50 border border-slate-700 border-dashed hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl p-4 flex-1 flex flex-col items-center justify-center transition-all">
                        <ImageIcon className="text-slate-400 mb-2" size={24} />
                        <span className="text-sm text-slate-400">Cliquez pour modifier l'image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={e => setNewProjectThumbnail(e.target.files?.[0] || null)}
                        />
                      </label>
                      {newProjectThumbnail && (
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 shrink-0 relative group">
                          <img src={URL.createObjectURL(newProjectThumbnail)} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setNewProjectThumbnail(null)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="text-white" size={24} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {(user?.role === 'admin' || user?.role === 'team_lead') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Membres assignés</label>
                      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                        {users.filter(u => u.id !== user.id).length === 0 ? (
                          <div className="text-slate-500 text-sm italic text-center py-2">Aucun autre utilisateur disponible</div>
                        ) : (
                          <div className="space-y-2">
                            {users.filter(u => u.id !== user.id).map(u => (
                              <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                                  checked={newProjectUsers.includes(u.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewProjectUsers([...newProjectUsers, u.id]);
                                    } else {
                                      setNewProjectUsers(newProjectUsers.filter(id => id !== u.id));
                                    }
                                  }}
                                />
                                <span className="text-slate-200">{u.username}</span>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">{u.role}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsEditingProject(false)}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newProjectName.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
