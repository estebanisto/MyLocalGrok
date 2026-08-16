import { useState } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '../../hooks/useSpeechToText';

interface MessageInputProps {
  onSend: (text: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('');
  const { isListening, toggleListening } = useSpeechToText((transcript) => {
    setText((prev) => {
      const space = prev && !prev.endsWith(' ') ? ' ' : '';
      return prev + space + transcript;
    });
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full relative group">
      <div className={`absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl transition-opacity duration-500 ${isListening ? 'opacity-100 animate-pulse' : 'opacity-0 group-focus-within:opacity-50'}`}></div>
      <div className="relative flex items-end gap-2 bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-xl">
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 rounded-xl transition-all duration-300 ${
            isListening 
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
              : 'bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
          title={isListening ? "Arrêter la dictée" : "Dictée vocale"}
        >
          {isListening ? <MicOff size={22} className="animate-pulse" /> : <Mic size={22} />}
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Envoyez un message ou utilisez la voix..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 resize-none max-h-32 min-h-[44px] py-3 px-2"
          rows={1}
          style={{ height: 'auto' }}
        />

        <button
          type="submit"
          disabled={!text.trim()}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm"
        >
          <Send size={20} className={text.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
        </button>
      </div>
    </form>
  );
}
