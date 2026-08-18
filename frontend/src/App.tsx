import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from './hooks/useSocket';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useAuth } from './hooks/useAuth';
import { Volume2, VolumeX, Code2, MessageSquare } from 'lucide-react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { MessageInput } from './components/chat/MessageInput';
import { ProjectStateInspector } from './components/state/ProjectStateInspector';
import { AgentStudioModal } from './components/sidebar/AgentStudioModal';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full bg-slate-900 flex items-center justify-center text-slate-400">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

import { useParams } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';

function WorkspaceApp() {
  const { projectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId;

  const socket = useSocket();
  const { isTtsEnabled, toggleTts, speak } = useTextToSpeech();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Workspace State
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<AgentStatus[]>([]);
  const [agentsConfig, setAgentsConfig] = useState<any[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('global');
  const [targetAgent, setTargetAgent] = useState<string>('Manager');
  
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [projectState, setProjectState] = useState<any>(null);

  const fetchAgents = () => {
    if (!activeProjectId) return;
    fetch('/api/agents', {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'x-project-id': activeProjectId
      }
    })
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
      fetch('/api/state', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-project-id': activeProjectId 
        }
      })
        .then(res => res.json())
        .then(data => setProjectState(data))
        .catch(console.error);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (!socket || !activeProjectId) return;

    socket.emit('join_project', activeProjectId);
    socket.emit('join_channel', currentChannel);

    const onHistory = (data: { channel: string, history: Message[] }) => {
      if (data.channel === currentChannel) {
        setMessages(data.history);
      }
    };

    const onMessage = (data: { channel: string, message: Message }) => {
      if (data.channel === currentChannel) {
        setMessages((prev) => [...prev, data.message]);
        if (data.message.sender !== 'User' && data.message.sender !== user?.username) {
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
  }, [socket, activeProjectId, currentChannel, speak, user]);

  const handleSendMessage = (text: string) => {
    if (!socket) return;
    socket.emit('message', { 
      text, 
      channel: currentChannel,
      targetAgent: currentChannel === 'global' ? targetAgent : currentChannel
    });
  };

  if (!activeProjectId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        projectId={activeProjectId}
        agentsStatus={agentsStatus.filter(s => s.channel === currentChannel)} 
        projectState={projectState} 
        agentsConfig={agentsConfig}
        onAgentsChange={fetchAgents}
        currentChannel={currentChannel}
        onSelectChannel={setCurrentChannel}
        onQuitProject={() => {
          navigate('/');
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
            
            <div className="h-6 w-px bg-slate-700 mx-2"></div>

            <span className="text-sm font-medium text-slate-300">
              {user?.username} ({user?.role})
            </span>

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
              onClick={logout}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 ml-2 text-sm font-semibold flex items-center gap-1"
              title="Déconnexion"
            >
              Déconnexion
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

      {isWizardOpen && (
        <AgentStudioModal 
          projectId={activeProjectId}
          agent={null}
          isOpen={true}
          onClose={() => setIsWizardOpen(false)}
          onSave={fetchAgents}
        />
      )}
    </div>
  );
}

function App() {
  const [checkingSetup, setCheckingSetup] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch('/api/auth/check-setup')
      .then(res => res.json())
      .then(data => {
        if (data.setupRequired && location.pathname !== '/setup') {
          navigate('/setup');
        }
      })
      .catch(console.error)
      .finally(() => setCheckingSetup(false));
  }, [navigate, location.pathname]);

  if (checkingSetup) return <div className="h-screen w-full bg-slate-900 flex items-center justify-center text-slate-400">Initialisation...</div>;

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/workspace/:projectId" 
        element={
          <ProtectedRoute>
            <WorkspaceApp />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
