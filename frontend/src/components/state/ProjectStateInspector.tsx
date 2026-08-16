import { X, Code2 } from 'lucide-react';

interface ProjectStateInspectorProps {
  projectState: any;
  onClose: () => void;
}

export function ProjectStateInspector({ projectState, onClose }: ProjectStateInspectorProps) {
  return (
    <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 animate-in slide-in-from-right-8 duration-300 shadow-2xl z-20 absolute right-0 top-0 bottom-0">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
        <h2 className="font-semibold flex items-center gap-2 text-slate-200">
          <Code2 size={18} className="text-cyan-400" />
          État du Projet JSON
        </h2>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
        <pre className="text-xs text-slate-300 font-mono w-full break-all whitespace-pre-wrap">
          {JSON.stringify(projectState, null, 2)}
        </pre>
      </div>
    </aside>
  );
}
