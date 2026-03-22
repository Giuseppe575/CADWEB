import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { CADCanvas } from './components/CADCanvas';
import { Toolbar } from './components/Toolbar';
import { VoiceInterface } from './components/VoiceInterface';
import { ThreeDView } from './components/ThreeDView';
import { LayerPanel } from './components/LayerPanel';
import { BlockLibrary } from './components/BlockLibrary';
import { useDrawing } from './hooks/useDrawing';
import { getBlockDef } from './utils/blockDefs';
import { Command } from './types';
import { Layout, Terminal } from 'lucide-react';

export default function App() {
  const {
    elements,
    layers,
    activeLayerId,
    cursorPos,
    setCursorPos,
    executeCommand,
    selectElement,
    updateElement,
    loadFromFile,
    toggleLayerVisibility,
    updateLayer,
    setActiveLayerId,
    addLayer,
    addPointToDrawing,
    startDrawing,
    updateDrawing,
    endDrawing,
    isDrawing,
    tempElement,
    currentTool,
    setCurrentTool,
    copySelected,
    pasteClipboard,
    splitElement,
    insertBlock,
  } = useDrawing();

  const [is3D, setIs3D] = useState(false);
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [cliInput, setCliInput] = useState('');
  const [cliHistory, setCliHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);

  // Ref exposed by CADCanvas for PDF export
  const stageExportRef = useRef<(() => string | null) | null>(null);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ESC e Enter terminano sempre il disegno, anche se il CLI ha il focus
      if (e.key === 'Escape' || e.key === 'Enter') {
        if (isDrawing) {
          e.preventDefault();
          endDrawing();
          setCurrentTool(null);
          // Togli il focus dal campo CLI in modo da non inviare il form
          (document.activeElement as HTMLElement)?.blur();
          return;
        }
        if (e.key === 'Escape') {
          setCurrentTool(null);
          return;
        }
      }
      // Per tutte le altre scorciatoie, ignora se un campo di testo ha il focus
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); executeCommand({ action: 'undo', target: 'all' }); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteClipboard(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); executeCommand({ action: 'save', target: 'all' }); }
      if (e.key === 'Delete' || e.key === 'Backspace') { executeCommand({ action: 'delete', target: 'selected' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [executeCommand, copySelected, pasteClipboard, setCurrentTool, isDrawing, endDrawing]);

  // ── PDF Export — scarica PNG direttamente (evita popup blocker) ─────────────
  const handleExportPDF = () => {
    if (!stageExportRef.current) return;
    const dataURL = stageExportRef.current();
    if (!dataURL) return;
    // Scarica come PNG (download diretto, no popup)
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'planimetria.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCommand = (cmd: Command) => {
    console.log('Executing command:', cmd);
    if ((cmd.action as string) === 'export_pdf') { handleExportPDF(); return; }
    if ((cmd.action as string) === 'copy')  { copySelected();    return; }
    if ((cmd.action as string) === 'paste') { pasteClipboard();  return; }

    const logMsg = `${cmd.action.toUpperCase()} ${cmd.target.toUpperCase()}${cmd.params?.length ? ` (L:${cmd.params.length})` : ''}`;
    setCommandLog(prev => [logMsg, ...prev].slice(0, 5));
    executeCommand(cmd);
  };

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    const value = parseFloat(cliInput.replace(/[^\d.]/g, ''));
    setCliHistory(prev => [cliInput, ...prev].slice(0, 50));
    setHistoryIndex(-1);
    if (!isNaN(value)) {
      const selected = elements.find(el => el.isSelected);
      if (selected) {
        handleCommand({ action: 'scale', target: 'selected', params: { length: value } });
      } else {
        handleCommand({ action: 'draw', target: 'line', params: { length: value } });
      }
    } else {
      setCommandLog(prev => [`CLI: ${cliInput.toUpperCase()}`, ...prev].slice(0, 5));
    }
    setCliInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < cliHistory.length - 1) {
        const idx = historyIndex + 1;
        setHistoryIndex(idx);
        setCliInput(cliHistory[idx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const idx = historyIndex - 1;
        setHistoryIndex(idx);
        setCliInput(cliHistory[idx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCliInput('');
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1e1e]">
      {/* Sidebar Toolbar */}
      <Toolbar
        onManualCommand={handleCommand}
        onLoadFile={loadFromFile}
        is3D={is3D}
        onToggle3D={() => setIs3D(!is3D)}
        currentTool={currentTool}
        onSetTool={setCurrentTool}
        onCopy={copySelected}
        onPaste={pasteClipboard}
        onExportPDF={handleExportPDF}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-[#252526]">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-white/80">
            <Layout size={18} className="text-indigo-400" />
            <span>AUTOCAD VOICE PLAN v2.4</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-white/40">
            <span className={is3D ? 'text-indigo-400' : ''}>MODE: {is3D ? '3D' : '2D'}</span>
            <span>SNAP: ON</span>
            <span className="text-white/20">Ctrl+C copia • Ctrl+V incolla • Del elimina • Esc strumento</span>
          </div>
        </header>

        {/* Canvas + Panels */}
        <div className="flex-1 relative flex overflow-hidden">
          {/* Libreria Blocchi — pannello sinistro dopo toolbar */}
          <BlockLibrary
            onInsertBlock={(blockId) => {
              const def = getBlockDef(blockId);
              if (def) insertBlock(blockId, def.defaultW, def.defaultH);
            }}
          />

          <div className="flex-1 relative">
            {is3D ? (
              <ThreeDView elements={elements} layers={layers} />
            ) : (
              <CADCanvas
                elements={elements}
                layers={layers}
                cursorPos={cursorPos}
                onCursorMove={setCursorPos}
                onSelect={selectElement}
                onUpdate={updateElement}
                isDrawing={isDrawing}
                tempElement={tempElement}
                currentTool={currentTool}
                onStartDrawing={startDrawing}
                onUpdateDrawing={updateDrawing}
                onAddPoint={addPointToDrawing}
                onEndDrawing={endDrawing}
                onExecuteCommand={executeCommand}
                onSplitElement={splitElement}
                stageExportRef={stageExportRef}
              />
            )}

            {/* Command Log */}
            <div className="absolute bottom-24 left-4 w-48 pointer-events-none">
              <div className="space-y-1">
                {commandLog.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1 - i * 0.2, x: 0 }}
                    className="bg-black/40 backdrop-blur-sm border-l-2 border-indigo-500 px-2 py-1 text-[10px] text-white/70 font-mono"
                  >
                    {log}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Help Panel — collassabile */}
            {showHelp ? (
              <div className="absolute top-4 right-4 w-64 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-xs text-white/70 font-mono">
                <h3
                  className="text-indigo-400 font-bold mb-2 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setShowHelp(false)}
                  title="Chiudi"
                >
                  <span className="flex items-center gap-2"><Terminal size={12} /> ESEMPI COMANDI</span>
                  <span className="text-white/40 hover:text-white/80 text-sm leading-none">✕</span>
                </h3>
                <ul className="space-y-1">
                  <li className="cursor-pointer hover:text-white transition-colors" onClick={() => handleCommand({ action: 'draw', target: 'wall', params: { length: 5 } })}>• "Disegna una parete di 5 metri"</li>
                  <li className="cursor-pointer hover:text-white transition-colors" onClick={() => handleCommand({ action: 'draw', target: 'door', params: { width: 90 } })}>• "Aggiungi una porta da 90cm"</li>
                  <li className="cursor-pointer hover:text-white transition-colors" onClick={() => handleCommand({ action: 'draw', target: 'window', params: { width: 120 } })}>• "Finestra da 120cm"</li>
                  <li className="cursor-pointer hover:text-white transition-colors" onClick={() => handleCommand({ action: 'draw', target: 'room', params: { length: 4, label: 'Soggiorno' } })}>• "Crea una stanza di 4 metri"</li>
                  <li className="cursor-pointer hover:text-white transition-colors" onClick={() => handleCommand({ action: 'offset', target: 'selected', params: { offset: 20 } })}>• "Offset 20 cm" (su linea selezionata)</li>
                  <li className="cursor-pointer hover:text-white transition-colors" onClick={() => handleCommand({ action: 'save', target: 'all' })}>• "Salva il progetto"</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-white/10 text-[10px] opacity-50">
                  Clicca per provare • Mic per voce
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowHelp(true)}
                title="Mostra esempi comandi"
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-black/60 transition-all"
              >
                <Terminal size={16} />
              </button>
            )}

            {/* Properties Panel for Wall */}
            {elements.find(el => el.isSelected && el.type === 'wall') && (
              <div className="absolute top-[320px] right-4 w-64 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-xs text-white/70 font-mono">
                <h3 className="text-indigo-400 font-bold mb-3 flex items-center gap-2">
                  <Terminal size={12} /> PROPRIETÀ MURO
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 opacity-50">Spessore (px):</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min="1" max="20"
                        value={elements.find(el => el.isSelected)?.properties.thickness || 2}
                        onChange={(e) => {
                          const sel = elements.find(el => el.isSelected);
                          if (sel) updateElement(sel.id, { properties: { ...sel.properties, thickness: parseInt(e.target.value) } });
                        }}
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="w-8 text-right">{elements.find(el => el.isSelected)?.properties.thickness || 2}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCommand({ action: 'delete', target: 'selected' })}
                    className="w-full mt-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/20 rounded py-1 transition-colors"
                  >Elimina Muro</button>
                </div>
              </div>
            )}

            {/* Properties Panel for Door */}
            {elements.find(el => el.isSelected && el.type === 'door') && (
              <div className="absolute top-[320px] right-4 w-64 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-xs text-white/70 font-mono">
                <h3 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                  <Terminal size={12} /> PROPRIETÀ PORTA
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 opacity-50">Apertura (gradi):</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min="10" max="180"
                        value={elements.find(el => el.isSelected)?.properties.openAngle || 90}
                        onChange={(e) => {
                          const sel = elements.find(el => el.isSelected);
                          if (sel) updateElement(sel.id, { properties: { ...sel.properties, openAngle: parseInt(e.target.value) } });
                        }}
                        className="flex-1 accent-cyan-500"
                      />
                      <span className="w-10 text-right">{elements.find(el => el.isSelected)?.properties.openAngle || 90}°</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCommand({ action: 'delete', target: 'selected' })}
                    className="w-full mt-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/20 rounded py-1 transition-colors"
                  >Elimina Porta</button>
                </div>
              </div>
            )}

            {/* Properties Panel for Text */}
            {elements.find(el => el.isSelected && el.type === 'text') && (
              <div className="absolute top-[320px] right-4 w-64 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-xs text-white/70 font-mono">
                <h3 className="text-indigo-400 font-bold mb-3 flex items-center gap-2">
                  <Terminal size={12} /> PROPRIETÀ TESTO
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 opacity-50">Contenuto:</label>
                    <input
                      type="text"
                      value={elements.find(el => el.isSelected)?.properties.textContent || ''}
                      onChange={(e) => {
                        const sel = elements.find(el => el.isSelected);
                        if (sel) updateElement(sel.id, { properties: { ...sel.properties, textContent: e.target.value } });
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 outline-none text-white focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block mb-1 opacity-50">Dimensione:</label>
                      <input
                        type="number"
                        value={elements.find(el => el.isSelected)?.properties.fontSize || 16}
                        onChange={(e) => {
                          const sel = elements.find(el => el.isSelected);
                          if (sel) updateElement(sel.id, { properties: { ...sel.properties, fontSize: parseInt(e.target.value) || 12 } });
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 outline-none text-white focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1 opacity-50">Font:</label>
                      <select
                        value={elements.find(el => el.isSelected)?.properties.fontFamily || 'Inter'}
                        onChange={(e) => {
                          const sel = elements.find(el => el.isSelected);
                          if (sel) updateElement(sel.id, { properties: { ...sel.properties, fontFamily: e.target.value } });
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 outline-none text-white focus:border-indigo-500"
                      >
                        <option value="Inter">Inter</option>
                        <option value="JetBrains Mono">Mono</option>
                        <option value="Georgia">Serif</option>
                        <option value="Arial">Arial</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCommand({ action: 'delete', target: 'selected' })}
                    className="w-full mt-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/20 rounded py-1 transition-colors"
                  >Elimina Nota</button>
                </div>
              </div>
            )}

            {/* Drawing hint banner (polilinea / quota angolare) */}
            {isDrawing && (currentTool === 'polyline' || currentTool === 'angular_dimension' || currentTool === 'freehand') && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-black text-xs font-mono font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
                <span>✏️ Disegno in corso</span>
                <span className="bg-black/20 px-2 py-0.5 rounded">Clic = punto</span>
                <span className="bg-black/20 px-2 py-0.5 rounded">Doppio clic / Esc / Invio = chiudi</span>
                <button
                  onClick={() => { endDrawing(); setCurrentTool(null); }}
                  className="bg-black/30 hover:bg-black/50 text-white px-3 py-0.5 rounded-full transition-colors ml-1"
                >✕ Chiudi</button>
              </div>
            )}

            {/* Voice Control */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
              <VoiceInterface onCommand={handleCommand} />
            </div>
          </div>

          {/* Layer Panel */}
          {!is3D && (
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onToggleVisibility={toggleLayerVisibility}
              onUpdateLayer={updateLayer}
              onSelectLayer={setActiveLayerId}
              onAddLayer={addLayer}
            />
          )}
        </div>

        {/* CLI Footer */}
        <footer className="h-10 bg-[#1e1e1e] border-t border-white/10 flex items-center px-4 gap-3">
          <Terminal size={14} className="text-white/30" />
          <form onSubmit={handleCliSubmit} className="flex-1 flex items-center font-mono text-xs text-white/60">
            <span className="mr-2">Comando:</span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un comando o una quota (es. 5)"
              className="flex-1 bg-transparent border-none outline-none text-indigo-400 placeholder:text-white/10"
              autoFocus
            />
          </form>
        </footer>
      </div>
    </div>
  );
}
