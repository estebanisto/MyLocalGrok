import { useState, useEffect } from 'react';
import { Plus, Folder, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

interface LandingPageProps {
  onProjectSelected: (projectId: string) => void;
}

export function LandingPage({ onProjectSelected }: LandingPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      });
      const project = await res.json();
      selectProject(project.id);
    } catch (e) {
      console.error(e);
    }
  };

  const selectProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}/active`, { method: 'POST' });
      onProjectSelected(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce projet et toutes ses données ?")) {
      return;
    }
    
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200">
      <div className="w-full max-w-md bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent text-center mb-8">
          MyLocalGrok
        </h1>

        {projects.length > 0 && !isCreating ? (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-300 mb-4">Vos Projets</h2>
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <button
                    onClick={() => selectProject(p.id)}
                    className="flex-1 flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="text-indigo-400" size={20} />
                      <span className="font-medium text-slate-200">{p.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button 
                    onClick={(e) => handleDelete(p.id, e)}
                    className="p-4 bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl border border-slate-700 transition-colors"
                    title="Supprimer le projet"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-6">
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-xl transition-colors font-medium"
              >
                <Plus size={20} />
                Nouveau Projet
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium text-slate-200">
                {projects.length === 0 ? "Bienvenue ! Créons votre premier projet." : "Créer un nouveau projet"}
              </h2>
            </div>
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
            <div className="flex gap-3">
              {projects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={!newProjectName.trim()}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer et Commencer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
