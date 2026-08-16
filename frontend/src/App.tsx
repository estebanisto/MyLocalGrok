import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { Settings, Volume2, VolumeX, Code2 } from 'lucide-react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { MessageInput } from './components/chat/MessageInput';
import { ApiKeySettingsModal } from './components/settings/ApiKeySettingsModal';
import { ProjectStateInspector } from './components/state/ProjectStateInspector';

export type Message = {
  id: string;
  sender: string;
  text: string;
  thought?: string;
  action?: any;
  timestamp: string;
};

export type AgentStatus = {
  agent: string;
  status: 'idle' | 'thinking';
};

function App() {
  const socket = useSocket();
  const { isTtsEnabled, toggleTts, speak } = useTextToSpeech();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<AgentStatus[]>([]);
  const [agentsConfig, setAgentsConfig] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('Manager');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [projectState, setProjectState] = useState<any>(null);

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
    if (!socket) return;

    socket.on('history', (hist: Message[]) => {
      setMessages(hist);
    });

    socket.on('message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.sender !== 'User') {
        speak(msg.text);
      }
    });

    socket.on('agent_status', (status: AgentStatus) => {
      setAgentsStatus((prev) => {
        const existing = prev.find((a) => a.agent === status.agent);
        if (existing) {
          return prev.map((a) => a.agent === status.agent ? status : a);
        }
        return [...prev, status];
      });
    });

    socket.on('stateUpdated', (state: any) => {
      setProjectState(state);
    });

    socket.on('agentsUpdated', (configs: any[]) => {
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

  const handleSendMessage = (text: string) => {
    if (!socket) return;
    socket.emit('message', { text, targetAgent: selectedAgent });
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        agentsStatus={agentsStatus} 
        projectState={projectState} 
        agentsConfig={agentsConfig}
        onAgentsChange={fetchAgents}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      <main className="flex-1 flex flex-col relative">
        <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h1 className="font-semibold text-slate-100">Salon Global</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTts}
              className={`p-2 rounded-lg transition-colors ${isTtsEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Lecture vocale auto (TTS)"
            >
              {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button 
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`p-2 rounded-lg transition-colors ${isInspectorOpen ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Inspecteur d'état"
            >
              <Code2 size={20} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              title="Paramètres"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth pb-32">
          <ChatArea messages={messages} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-10">
          <MessageInput onSend={handleSendMessage} />
        </div>
      </main>

      {isInspectorOpen && (
        <ProjectStateInspector projectState={projectState} onClose={() => setIsInspectorOpen(false)} />
      )}

      {isSettingsOpen && (
        <ApiKeySettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}

export default App;
