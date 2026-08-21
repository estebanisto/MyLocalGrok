import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  themeColor: string;
  model?: string;
  modelId?: string;
  temperature?: number;
}

interface AgentStudioModalProps {
  projectId: string;
  agent: AgentConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AgentStudioModal({ projectId, agent, isOpen, onClose, onSave }: AgentStudioModalProps) {
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [hasGemini, setHasGemini] = useState(false);
  const [geminiModels, setGeminiModels] = useState<Array<{id: string, name: string}>>([]);
  const [hasGrok, setHasGrok] = useState(false);
  const [hasOpenAI, setHasOpenAI] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingProviders(true);
      
      // 1. Check local models
      const ollamaUrl = localStorage.getItem('ollamaUrl');
      const p1 = ollamaUrl 
        ? fetch(`/api/ollama/tags?url=${encodeURIComponent(ollamaUrl)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.models) {
              setLocalModels(data.models.map((m: any) => m.name));
            } else {
              setLocalModels([]);
            }
          })
          .catch(() => setLocalModels([]))
        : Promise.resolve(setLocalModels([]));

      // 2. Check LocalStorage API Keys
      setHasGrok(!!localStorage.getItem('grokKey'));
      setHasOpenAI(!!localStorage.getItem('openAIKey'));

      // 3. Check Gemini Keys & fetch dynamic models
      const p2Keys = fetch('/api/keys', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setHasGemini(Array.isArray(data) && data.length > 0);
      })
      .catch(() => setHasGemini(false));

      const p2Models = fetch('/api/gemini/models', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setGeminiModels(data);
        } else {
          setGeminiModels([]);
        }
      })
      .catch(() => setGeminiModels([]));

      Promise.all([p1, p2Keys, p2Models]).finally(() => {
        setIsLoadingProviders(false);
      });
    }
  }, [isOpen]);

  const [formData, setFormData] = useState<Partial<AgentConfig>>({
    name: '',
    role: '',
    systemPrompt: '',
    model: 'gemini-3.5-flash',
    temperature: 0.7,
    themeColor: 'indigo'
  });

  useEffect(() => {
    if (agent) {
      setFormData(agent);
    } else {
      setFormData({
        name: '',
        role: '',
        systemPrompt: '',
        themeColor: 'indigo',
        model: 'gemini-3.5-flash',
        temperature: 0.7
      });
    }
  }, [agent, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) return;

    try {
      if (agent?.id) {
        // Update
        await fetch(`/api/agents/${agent.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'x-project-id': projectId
          },
          body: JSON.stringify(formData)
        });
      } else {
        // Create
        await fetch('/api/agents', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'x-project-id': projectId
          },
          body: JSON.stringify({
            ...formData,
            id: Math.random().toString(36).substring(7)
          })
        });
      }
      onSave();
      onClose();
    } catch (err) {
      console.error("Failed to save agent", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 text-slate-200 border-slate-700">
        <DialogHeader>
          <DialogTitle>{agent?.id ? 'Modifier l\'Agent' : 'Nouvel Agent'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Nom</label>
            <Input 
              value={formData.name || ''} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              className="bg-slate-800 border-slate-700 focus-visible:ring-indigo-500"
              placeholder="ex: Architecte"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Rôle</label>
            <Input 
              value={formData.role || ''} 
              onChange={e => setFormData({ ...formData, role: e.target.value })} 
              className="bg-slate-800 border-slate-700 focus-visible:ring-indigo-500"
              placeholder="ex: Expert technique"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">System Prompt</label>
            <Textarea 
              value={formData.systemPrompt || ''} 
              onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })} 
              className="bg-slate-800 border-slate-700 focus-visible:ring-indigo-500 min-h-[150px]"
              placeholder="Tu es un agent expert en..."
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Couleur (Tailwind)</label>
            <Input 
              value={formData.themeColor || ''} 
              onChange={e => setFormData({ ...formData, themeColor: e.target.value })} 
              className="bg-slate-800 border-slate-700 focus-visible:ring-indigo-500"
              placeholder="ex: indigo, emerald, rose"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Modèle (IA)</label>
            <Select 
              key={isLoadingProviders ? 'loading' : 'ready'}
              disabled={isLoadingProviders}
              value={formData.model || 'gemini-3.5-flash'} 
              onValueChange={(value) => setFormData({ ...formData, model: value || 'gemini-3.5-flash' })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 focus:ring-indigo-500">
                <SelectValue placeholder={isLoadingProviders ? "Chargement des modèles..." : "Choisir un modèle"} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                {hasGemini && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase mt-1 border-b border-slate-700/50 mb-1">Google Gemini</div>
                    {geminiModels.length > 0 ? (
                      geminiModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="gemini-3.5-flash-lite">3.5 Flash-Lite</SelectItem>
                        <SelectItem value="gemini-3.7-flash">3.7 Flash</SelectItem>
                        <SelectItem value="gemini-3.1-pro-preview">3.1 Pro</SelectItem>
                        <SelectItem value="gemini-extended-reasoning">Raisonnement Étendu</SelectItem>
                      </>
                    )}
                  </>
                )}

                {hasOpenAI && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase mt-2 border-b border-slate-700/50 mb-1">OpenAI</div>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  </>
                )}

                {hasGrok && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase mt-2 border-b border-slate-700/50 mb-1">xAI Grok</div>
                    <SelectItem value="grok-beta">Grok Beta</SelectItem>
                  </>
                )}

                {localModels.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase mt-2 border-b border-slate-700/50 mb-1">Modèles Locaux (Ollama)</div>
                    {localModels.map(modelName => (
                      <SelectItem key={modelName} value={`ollama:${modelName}`}>Local : {modelName}</SelectItem>
                    ))}
                  </>
                )}
                
                {(!hasGemini && !hasOpenAI && !hasGrok && localModels.length === 0) && (
                  <div className="px-3 py-4 text-sm text-center text-amber-500/80 bg-amber-500/10 rounded-md m-2 border border-amber-500/20">
                    Aucun fournisseur d'IA configuré.<br/>Veuillez ajouter une clé API ou configurer Ollama dans les réglages globaux.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-slate-800 hover:text-white">Annuler</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
