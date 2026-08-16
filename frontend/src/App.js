import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { Settings, Volume2, VolumeX, Code2 } from 'lucide-react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { MessageInput } from './components/chat/MessageInput';
import { ApiKeySettingsModal } from './components/settings/ApiKeySettingsModal';
import { ProjectStateInspector } from './components/state/ProjectStateInspector';
function App() {
    const socket = useSocket();
    const { isTtsEnabled, toggleTts, speak } = useTextToSpeech();
    const [messages, setMessages] = useState([]);
    const [agentsStatus, setAgentsStatus] = useState([]);
    const [agentsConfig, setAgentsConfig] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('Manager');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [projectState, setProjectState] = useState(null);
    const fetchAgents = () => {
        fetch('/api/agents')
            .then(res => res.json())
            .then(data => setAgentsConfig(data))
            .catch(console.error);
    };
    useEffect(() => {
        fetchAgents();
    }, []);
    useEffect(() => {
        if (!socket)
            return;
        socket.on('history', (hist) => {
            setMessages(hist);
        });
        socket.on('message', (msg) => {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender !== 'User') {
                speak(msg.text);
            }
        });
        socket.on('agent_status', (status) => {
            setAgentsStatus((prev) => {
                const existing = prev.find((a) => a.agent === status.agent);
                if (existing) {
                    return prev.map((a) => a.agent === status.agent ? status : a);
                }
                return [...prev, status];
            });
        });
        socket.on('stateUpdated', (state) => {
            setProjectState(state);
        });
        socket.on('agentsUpdated', (configs) => {
            setAgentsConfig(configs);
        });
        // Fetch initial state
        fetch('/api/state')
            .then(res => res.json())
            .then(data => setProjectState(data))
            .catch(console.error);
        return () => {
            socket.off('history');
            socket.off('message');
            socket.off('agent_status');
            socket.off('stateUpdated');
            socket.off('agentsUpdated');
        };
    }, [socket, speak]);
    const handleSendMessage = (text) => {
        if (!socket)
            return;
        socket.emit('message', { text, targetAgent: selectedAgent });
    };
    return (_jsxs("div", { className: "flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans", children: [_jsx(Sidebar, { agentsStatus: agentsStatus, projectState: projectState, agentsConfig: agentsConfig, onAgentsChange: fetchAgents, selectedAgent: selectedAgent, onSelectAgent: setSelectedAgent }), _jsxs("main", { className: "flex-1 flex flex-col relative", children: [_jsxs("header", { className: "h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-10 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }), _jsx("h1", { className: "font-semibold text-slate-100", children: "Salon Global" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: toggleTts, className: `p-2 rounded-lg transition-colors ${isTtsEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`, title: "Lecture vocale auto (TTS)", children: isTtsEnabled ? _jsx(Volume2, { size: 20 }) : _jsx(VolumeX, { size: 20 }) }), _jsx("button", { onClick: () => setIsInspectorOpen(!isInspectorOpen), className: `p-2 rounded-lg transition-colors ${isInspectorOpen ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`, title: "Inspecteur d'\u00E9tat", children: _jsx(Code2, { size: 20 }) }), _jsx("button", { onClick: () => setIsSettingsOpen(true), className: "p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400", title: "Param\u00E8tres", children: _jsx(Settings, { size: 20 }) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6 scroll-smooth pb-32", children: _jsx(ChatArea, { messages: messages }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-10", children: _jsx(MessageInput, { onSend: handleSendMessage }) })] }), isInspectorOpen && (_jsx(ProjectStateInspector, { projectState: projectState, onClose: () => setIsInspectorOpen(false) })), isSettingsOpen && (_jsx(ApiKeySettingsModal, { onClose: () => setIsSettingsOpen(false) }))] }));
}
export default App;
