import { useState } from 'react';
import type { Message } from '../../App';
import { Bot, User, ChevronDown, ChevronRight, Terminal } from 'lucide-react';

export function ChatArea({ messages, currentChannel }: { messages: Message[], currentChannel: string }) {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {messages.map((msg) => (
        <MessageItem key={msg.id} msg={msg} />
      ))}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 mt-20">
          <Bot size={48} className="mb-4 opacity-50" />
          <p>
            {currentChannel === 'global' 
              ? "Le salon global est vide. Dites quelque chose à l'équipe !" 
              : `Commencez votre conversation privée avec ${currentChannel}.`}
          </p>
        </div>
      )}
    </div>
  );
}

function MessageItem({ msg }: { msg: Message }) {
  const isUser = msg.sender === 'User';
  const [showThought, setShowThought] = useState(false);
  const [showAction, setShowAction] = useState(false);

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
        isUser ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-emerald-400'
      }`}>
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </div>
      
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-baseline gap-2 mx-1">
          <span className="font-semibold text-sm text-slate-300">{msg.sender}</span>
          <span className="text-xs text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
        }`}>
          {msg.thought && !isUser && (
            <div className="mb-3">
              <button 
                onClick={() => setShowThought(!showThought)}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showThought ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Chain of Thought
              </button>
              {showThought && (
                <div className="mt-2 p-3 bg-slate-900/50 rounded-md text-sm text-slate-400 border border-slate-700/50 font-mono text-xs whitespace-pre-wrap">
                  {msg.thought}
                </div>
              )}
            </div>
          )}

          <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

          {msg.action && (
            <div className="mt-3">
              <button 
                onClick={() => setShowAction(!showAction)}
                className="flex items-center gap-1 text-xs font-medium text-emerald-400/80 hover:text-emerald-300 transition-colors"
              >
                {showAction ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Terminal size={14} />
                Action: {msg.action.type}
              </button>
              
              {showAction && (
                <div className="mt-2 p-3 bg-emerald-900/20 border border-emerald-500/20 rounded-md">
                  <pre className="text-xs text-emerald-300/70 overflow-x-auto font-mono">
                    {JSON.stringify(msg.action.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
