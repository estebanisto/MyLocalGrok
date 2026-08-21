import React, { useState, useEffect } from 'react';
import { X, Key, Trash2, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ApiKeySettingsModalProps {
  onClose?: () => void;
  inline?: boolean;
}

export function ApiKeySettingsModal({ onClose, inline = false }: ApiKeySettingsModalProps) {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState('');

  const fetchKeys = () => {
    fetch('/api/keys', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setKeys(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    fetch('/api/keys', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ key: newKey.trim() })
    }).then(() => {
      setNewKey('');
      fetchKeys();
    });
  };

  const handleRemove = (id: string) => {
    fetch(`/api/keys/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(fetchKeys);
  };

  const content = (
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl w-full ${inline ? '' : 'max-w-lg shadow-2xl'} overflow-hidden flex flex-col max-h-[80vh]`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Key size={20} className="text-indigo-400" />
          Pool de Clés API Gemini
        </h2>
        {!inline && onClose && (
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        <div className="space-y-3 mb-6">
          {keys.length === 0 ? (
            <div className="text-center p-6 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 text-slate-500">
              Aucune clé API configurée.
            </div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
                <div className="flex items-center gap-3">
                  {k.status === 'active' ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-500" />
                  )}
                  <span className="font-mono text-sm text-slate-300">{k.keyMasked}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    k.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {k.status}
                  </span>
                </div>
                <button onClick={() => handleRemove(k.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="AIzaSy..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button type="submit" disabled={!newKey.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} /> Ajouter
          </button>
        </form>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {content}
    </div>
  );
}
