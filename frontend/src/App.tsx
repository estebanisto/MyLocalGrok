import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { Settings, Volume2, VolumeX, Code2, LogOut, MessageSquare } from 'lucide-react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { MessageInput } from './components/chat/MessageInput';
import { ApiKeySettingsModal } from './components/settings/ApiKeySettingsModal';
import { ProjectStateInspector } from './components/state/ProjectStateInspector';
import { LandingPage } from './pages/LandingPage';
import { AgentStudioModal } from './components/sidebar/AgentStudioModal';

export type Message = {
  id: string;
  sender: string;
  text: string;
  thought?: string;
  action?: any;
  timestamp: string;
};

export type AgentStatus = {
  channel: string;
  agent: string;
  status: 'idle' | 'thinking';
};

function App() {
  const socket = useSocket();
  const { isTtsEnabled, toggleTts, speak } = useTextToSpeech();
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Workspace State
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<AgentStatus[]>([]);
  const [agentsConfig, setAgentsConfig] = useState<any[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('global'); // 'global' or agentName
  const [targetAgent, setTargetAgent] = useState<string>('Manager'); // Used in global chat
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [projectState, setProjectState] = useState<any>(null);

  const fetchAgents = () => {
    if (!activeProjectId) return;
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        setAgentsConfig(data);
        if (data.length === 0) {
          setIsWizardOpen(true);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (activeProjectId) {
      fetchAgents();
      fetch('/api/state')
        .then(res => res.json())
        .then(data => setProjectState(data))
        .catch(console.error);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (!socket || !activeProjectId) return;

    socket.emit('join_channel', currentChannel);

    const onHistory = (data: { channel: string, history: Message[] }) => {
      if (data.channel === currentChannel) {
        setMessages(data.history);
      }
    };

    const onMessage = (data: { channel: string, message: Message }) => {
      if (data.channel === currentChannel) {
        setMessages((prev) => [...prev, data.message]);
        if (data.message.sender !== 'User') {
          speak(data.message.text);
        }
      }
    };

    const onAgentStatus = (status: AgentStatus) => {
      setAgentsStatus((prev) => {
        const existing = prev.find((a) => a.agent === status.agent && a.channel === status.channel);
        if (existing) {
          return prev.map((a) => (a.agent === status.agent && a.channel === status.channel) ? status : a);
        }
        return [...prev, status];
      });
    };

    const onStateUpdated = (state: any) => setProjectState(state);
    const onAgentsUpdated = (configs: any[]) => setAgentsConfig(configs);

    socket.on('history', onHistory);
    socket.on('message', onMessage);
    socket.on('agent_status', onAgentStatus);
    socket.on('stateUpdated', onStateUpdated);
    socket.on('agentsUpdated', onAgentsUpdated);

    return () => {
      socket.off('history', onHistory);
      socket.off('message', onMessage);
      socket.off('agent_status', onAgentStatus);
      socket.off('stateUpdated', onStateUpdated);
      socket.off('agentsUpdated', onAgentsUpdated);
    };
  }, [socket, activeProjectId, currentChannel, speak]);

  const handleSendMessage = (text: string) => {
    if (!socket) return;
    socket.emit('message', { 
      text, 
      channel: currentChannel,
      targetAgent: currentChannel === 'global' ? targetAgent : currentChannel
    });
  };

  if (!activeProjectId) {
    return <LandingPage onProjectSelected={setActiveProjectId} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        agentsStatus={agentsStatus.filter(s => s.channel === currentChannel)} 
        projectState={projectState} 
        agentsConfig={agentsConfig}
        onAgentsChange={fetchAgents}
        currentChannel={currentChannel}
        onSelectChannel={setCurrentChannel}
        onQuitProject={() => {
          setActiveProjectId(null);
          setCurrentChannel('global');
        }}
      />

      <main className="flex-1 flex flex-col relative">
        <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${currentChannel === 'global' ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse`}></div>
            <h1 className="font-semibold text-slate-100 flex items-center gap-2">
              <MessageSquare size={18} className={currentChannel === 'global' ? 'text-emerald-400' : 'text-indigo-400'} />
              {currentChannel === 'global' ? 'Salon Global' : `Salon Privé : ${currentChannel}`}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {currentChannel === 'global' && agentsConfig.length > 0 && (
              <select 
                value={targetAgent}
                onChange={e => setTargetAgent(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-300 focus:outline-none"
                title="Agent qui répondra dans le salon global"
              >
                {agentsConfig.map(a => <option key={a.id} value={a.name}>@{a.name}</option>)}
              </select>
            )}
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
          <ChatArea messages={messages} currentChannel={currentChannel} />
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

      {isWizardOpen && (
        <AgentStudioModal 
          agent={null}
          isOpen={true}
          onClose={() => setIsWizardOpen(false)}
          onSave={fetchAgents}
        />
      )}
    </div>
  );
}

export default App;
