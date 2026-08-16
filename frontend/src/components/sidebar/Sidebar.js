import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Users, LayoutList, Zap, Settings, Plus } from 'lucide-react';
import { AgentConfig, AgentStudioModal } from './AgentStudioModal';
export function Sidebar({ agentsStatus, projectState, agentsConfig, onAgentsChange, selectedAgent, onSelectAgent }) {
    const [editingAgent, setEditingAgent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleEdit = (agent, e) => {
        e.stopPropagation();
        setEditingAgent(agent);
        setIsModalOpen(true);
    };
    const handleCreate = () => {
        setEditingAgent(null);
        setIsModalOpen(true);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("aside", { className: "w-64 bg-slate-800/50 border-r border-slate-800 flex flex-col h-full shrink-0", children: [_jsx("div", { className: "p-4 border-b border-slate-800", children: _jsxs("h2", { className: "text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2", children: [_jsx(Zap, { size: 20, className: "text-indigo-400" }), "MyLocalGrok"] }) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3", children: [_jsx(Users, { size: 14 }), _jsx("span", { children: "\u00C9quipe (Agents)" })] }), _jsx("ul", { className: "space-y-2", children: agentsConfig.map((agent) => {
                                            const status = agentsStatus.find(a => a.agent === agent.name)?.status || 'idle';
                                            const isSelected = selectedAgent === agent.name;
                                            return (_jsxs("li", { onClick: () => onSelectAgent(agent.name), className: `flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : 'hover:bg-slate-700/50'}`, children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-medium text-slate-300", children: agent.name }), _jsx("span", { className: "text-[10px] text-slate-500", children: agent.role })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: (e) => handleEdit(agent, e), className: "opacity-0 group-hover:opacity-100 p-1 hover:text-white text-slate-400 transition-opacity", children: _jsx(Settings, { size: 14 }) }), status === 'thinking' && (_jsxs("span", { className: "flex h-2 w-2 relative", children: [_jsx("span", { className: `animate-ping absolute inline-flex h-full w-full rounded-full bg-${agent.themeColor || 'indigo'}-400 opacity-75` }), _jsx("span", { className: `relative inline-flex rounded-full h-2 w-2 bg-${agent.themeColor || 'indigo'}-500` })] })), status === 'idle' && (_jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-slate-500" }))] })] }, agent.id));
                                        }) }), _jsxs("button", { onClick: handleCreate, className: "mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-md border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 hover:bg-slate-800 transition-colors text-sm", children: [_jsx(Plus, { size: 16 }), " Ajouter un Agent"] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3", children: [_jsx(LayoutList, { size: 14 }), _jsx("span", { children: "T\u00E2ches" })] }), _jsx("ul", { className: "space-y-2", children: projectState?.tasks?.map((task) => (_jsxs("li", { className: "text-sm text-slate-400 flex items-start gap-2", children: [_jsx("span", { className: `mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}` }), _jsx("span", { className: task.status === 'completed' ? 'line-through opacity-60' : '', children: task.title })] }, task.id))) })] })] })] }), _jsx(AgentStudioModal, { agent: editingAgent, isOpen: isModalOpen, onClose: () => setIsModalOpen(false), onSave: onAgentsChange })] }));
}
