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
}

interface AgentStudioModalProps {
  agent?: AgentConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AgentStudioModal({ agent, isOpen, onClose, onSave }: AgentStudioModalProps) {
  const [formData, setFormData] = useState<Partial<AgentConfig>>({});

  useEffect(() => {
    if (agent) {
      setFormData(agent);
    } else {
      setFormData({
        name: '',
        role: '',
        systemPrompt: '',
        themeColor: 'indigo',
        model: 'gemini-3.5-flash'
      });
    }
  }, [agent, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (agent?.id) {
        // Update
        await fetch(`/api/agents/${agent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create
        await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            id: formData.name?.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(7)
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
            <label className="text-sm font-medium text-slate-300">Modèle Gemini</label>
            <Select 
              value={formData.model || 'gemini-3.5-flash'} 
              onValueChange={value => setFormData({ ...formData, model: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 focus:ring-indigo-500">
                <SelectValue placeholder="Choisir un modèle" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectItem value="gemini-3.5-flash">Flash 3.5 - Standard</SelectItem>
                <SelectItem value="gemini-3.7-flash">Flash 3.7 - Avancé</SelectItem>
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
