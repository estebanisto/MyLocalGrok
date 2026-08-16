import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
export function AgentStudioModal({ agent, isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({});
    useEffect(() => {
        if (agent) {
            setFormData(agent);
        }
        else {
            setFormData({
                name: '',
                role: '',
                systemPrompt: '',
                themeColor: 'indigo'
            });
        }
    }, [agent, isOpen]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name)
            return;
        try {
            if (agent?.id) {
                // Update
                await fetch(`/api/agents/${agent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }
            else {
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
        }
        catch (err) {
            console.error("Failed to save agent", err);
        }
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: (open) => !open && onClose(), children: _jsxs(DialogContent, { className: "sm:max-w-[500px] bg-slate-900 text-slate-200 border-slate-700", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: agent?.id ? 'Modifier l\'Agent' : 'Nouvel Agent' }) }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 mt-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-slate-300", children: "Nom" }), _jsx(Input, { value: formData.name || '', onChange: e => setFormData({ ...formData, name: e.target.value }), className: "bg-slate-800 border-slate-700 focus-visible:ring-indigo-500", placeholder: "ex: Architecte", required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-slate-300", children: "R\u00F4le" }), _jsx(Input, { value: formData.role || '', onChange: e => setFormData({ ...formData, role: e.target.value }), className: "bg-slate-800 border-slate-700 focus-visible:ring-indigo-500", placeholder: "ex: Expert technique" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-slate-300", children: "System Prompt" }), _jsx(Textarea, { value: formData.systemPrompt || '', onChange: e => setFormData({ ...formData, systemPrompt: e.target.value }), className: "bg-slate-800 border-slate-700 focus-visible:ring-indigo-500 min-h-[150px]", placeholder: "Tu es un agent expert en...", required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-slate-300", children: "Couleur (Tailwind)" }), _jsx(Input, { value: formData.themeColor || '', onChange: e => setFormData({ ...formData, themeColor: e.target.value }), className: "bg-slate-800 border-slate-700 focus-visible:ring-indigo-500", placeholder: "ex: indigo, emerald, rose" })] }), _jsxs(DialogFooter, { className: "mt-6", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, className: "hover:bg-slate-800 hover:text-white", children: "Annuler" }), _jsx(Button, { type: "submit", className: "bg-indigo-600 hover:bg-indigo-700 text-white", children: "Enregistrer" })] })] })] }) }));
}
