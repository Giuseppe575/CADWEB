import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Plus, Check } from 'lucide-react';
import { Layer } from '../types';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onToggleVisibility: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onSelectLayer: (id: string) => void;
  onAddLayer: (name: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onToggleVisibility,
  onUpdateLayer,
  onSelectLayer,
  onAddLayer
}) => {
  const [newLayerName, setNewLayerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newLayerName.trim()) {
      onAddLayer(newLayerName.trim());
      setNewLayerName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="w-64 bg-[#2d2d2d] border-l border-white/10 flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-white/80">
          <Layers size={16} className="text-indigo-400" />
          <span>LIVELLI</span>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isAdding && (
          <div className="flex items-center gap-1 p-2 bg-black/20 rounded border border-indigo-500/30">
            <input
              autoFocus
              type="text"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nome livello..."
              className="bg-transparent text-xs text-white outline-none flex-1"
            />
            <button onClick={handleAdd} className="text-indigo-400 hover:text-indigo-300">
              <Check size={14} />
            </button>
          </div>
        )}

        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 p-2 rounded text-xs transition-colors cursor-pointer ${
              activeLayerId === layer.id ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5'
            }`}
            onClick={() => onSelectLayer(layer.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(layer.id);
              }}
              className="text-white/40 hover:text-white transition-colors"
            >
              {layer.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            
            <input
              type="color"
              value={layer.color}
              onChange={(e) => {
                e.stopPropagation();
                onUpdateLayer(layer.id, { color: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
            />
            
            <span className={`flex-1 truncate ${layer.isVisible ? 'text-white/80' : 'text-white/30'}`}>
              {layer.name}
            </span>

            {activeLayerId === layer.id && (
              <span className="text-[10px] text-indigo-400 font-bold">ATTIVO</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
