import React, { useRef } from 'react';
import {
  Square, PenLine, Ruler, Trash2, Undo2, MousePointer2,
  Save, FolderOpen, Box, Layout, FileOutput, Circle, Spline,
  Pencil, DraftingCompass, Type, DoorOpen, AppWindow,
  Copy, Clipboard, FileImage, Scissors
} from 'lucide-react';
import { Command, DrawingElement } from '../types';

interface ToolbarProps {
  onManualCommand: (cmd: Command) => void;
  onLoadFile: (data: string) => void;
  is3D: boolean;
  onToggle3D: () => void;
  currentTool: DrawingElement['type'] | null;
  onSetTool: (tool: DrawingElement['type'] | null) => void;
  onCopy: () => void;
  onPaste: () => void;
  onExportPDF: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onManualCommand,
  onLoadFile,
  is3D,
  onToggle3D,
  currentTool,
  onSetTool,
  onCopy,
  onPaste,
  onExportPDF
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'select',   icon: MousePointer2,   label: 'Seleziona',       action: 'select', target: 'all' },
    { id: 'line',     icon: PenLine,         label: 'Linea',           action: 'draw',   target: 'line' },
    { id: 'wall',     icon: PenLine,         label: 'Parete',          action: 'draw',   target: 'wall' },
    { id: 'rect',     icon: Square,          label: 'Stanza',          action: 'draw',   target: 'room' },
    { id: 'circle',   icon: Circle,          label: 'Cerchio',         action: 'draw',   target: 'circle' },
    { id: 'polyline', icon: Spline,          label: 'Polilinea',       action: 'draw',   target: 'polyline' },
    { id: 'freehand', icon: Pencil,          label: 'Mano Libera',     action: 'draw',   target: 'freehand' },
    { id: 'door',     icon: DoorOpen,        label: 'Porta',           action: 'draw',   target: 'door' },
    { id: 'window',   icon: AppWindow,       label: 'Finestra',        action: 'draw',   target: 'window' },
    { id: 'dim',      icon: Ruler,           label: 'Quota Lineare',   action: 'draw',   target: 'dimension' },
    { id: 'ang_dim',  icon: DraftingCompass, label: 'Quota Angolare',  action: 'draw',   target: 'angular_dimension' },
    { id: 'text',     icon: Type,            label: 'Testo',           action: 'draw',   target: 'text' },
    { id: 'scissors', icon: Scissors,        label: 'Taglia Linea ✂',  action: 'draw',   target: 'scissors' },
    { id: 'undo',     icon: Undo2,           label: 'Annulla (Ctrl+Z)',action: 'undo',   target: 'all' },
    { id: 'clear',    icon: Trash2,          label: 'Pulisci tutto',   action: 'clear',  target: 'all' },
    { id: 'save',     icon: Save,            label: 'Salva Progetto',  action: 'save',   target: 'all' },
    { id: 'dxf',      icon: FileOutput,      label: 'Esporta DXF',     action: 'export_dxf', target: 'all' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => onLoadFile(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  const isActive = (tool: typeof tools[0]) =>
    (tool.action === 'draw'   && currentTool === tool.target) ||
    (tool.action === 'select' && currentTool === null);

  return (
    <div className="flex flex-col gap-1 p-2 bg-[#2d2d2d] border-r border-white/10 h-full overflow-y-auto">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            if (tool.action === 'draw')   { onSetTool(tool.target as DrawingElement['type']); }
            else if (tool.action === 'select') { onSetTool(null); }
            else { onManualCommand({ action: tool.action as any, target: tool.target as any }); }
          }}
          className={`p-3 rounded-lg transition-colors group relative ${
            isActive(tool)
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'hover:bg-white/10 text-white/70'
          }`}
          title={tool.label}
        >
          <tool.icon size={18} className={isActive(tool) ? 'text-white' : 'text-white/70 group-hover:text-white'} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Separator */}
      <div className="border-t border-white/10 my-1" />

      {/* Copy */}
      <button onClick={onCopy} className="p-3 rounded-lg hover:bg-white/10 transition-colors group relative" title="Copia (Ctrl+C)">
        <Copy size={18} className="text-white/70 group-hover:text-white" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Copia (Ctrl+C)</span>
      </button>

      {/* Paste */}
      <button onClick={onPaste} className="p-3 rounded-lg hover:bg-white/10 transition-colors group relative" title="Incolla (Ctrl+V)">
        <Clipboard size={18} className="text-white/70 group-hover:text-white" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Incolla (Ctrl+V)</span>
      </button>

      {/* PDF Export */}
      <button onClick={onExportPDF} className="p-3 rounded-lg hover:bg-white/10 transition-colors group relative" title="Esporta PDF">
        <FileImage size={18} className="text-rose-400 group-hover:text-rose-300" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Esporta PDF</span>
      </button>

      {/* Load file */}
      <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-lg hover:bg-white/10 transition-colors group relative" title="Carica Progetto">
        <FolderOpen size={18} className="text-white/70 group-hover:text-white" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Carica Progetto</span>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      </button>

      {/* 3D Toggle */}
      <div className="mt-auto border-t border-white/10 pt-2">
        <button
          onClick={onToggle3D}
          className={`p-3 rounded-lg transition-colors group relative w-full flex justify-center ${is3D ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-white/70'}`}
          title={is3D ? 'Torna a 2D' : 'Visualizza 3D'}
        >
          {is3D ? <Layout size={18} /> : <Box size={18} />}
          <span className="absolute left-full ml-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            {is3D ? 'Torna a 2D' : 'Visualizza 3D'}
          </span>
        </button>
      </div>
    </div>
  );
};
