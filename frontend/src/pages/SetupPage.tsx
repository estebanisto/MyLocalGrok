import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to setup');
      }

      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-slate-200">
      <form onSubmit={handleSetup} className="bg-slate-800 p-8 rounded-lg shadow-xl w-96 flex flex-col gap-4 border border-slate-700">
        <h1 className="text-2xl font-semibold mb-2">Première Configuration</h1>
        <p className="text-slate-400 text-sm mb-4">Créez le compte Administrateur pour commencer.</p>
        
        {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">{error}</div>}
        
        <div className="flex flex-col gap-1">
          <label className="text-sm">Nom d'utilisateur</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-slate-900 border border-slate-700 p-2 rounded focus:outline-none focus:border-indigo-500" 
            required
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm">Mot de passe</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-900 border border-slate-700 p-2 rounded focus:outline-none focus:border-indigo-500" 
            required
          />
        </div>
        
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded mt-4 transition-colors font-semibold">
          Créer le compte
        </button>
      </form>
    </div>
  );
}
