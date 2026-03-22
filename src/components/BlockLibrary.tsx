import React, { useState } from 'react';
import { BLOCKS, BLOCK_CATEGORIES, BlockDef } from '../utils/blockDefs';

interface BlockLibraryProps {
  onInsertBlock: (blockId: string) => void;
}

// ── Mini anteprime SVG per ogni tipo di blocco ────────────────────────────────
function BlockPreview({ id, w = 60, h = 60 }: { id: string; w?: number; h?: number }) {
  const s = (v: number) => v; // passthrough, coordinate già in px
  const c = '#00ffff';
  const fill = 'rgba(0,255,255,0.08)';
  const stroke = c;
  const sw = 1.5;

  const vb = `0 0 ${w} ${h}`;

  const shapes: React.ReactNode[] = [];

  switch (id) {
    case 'wc': {
      // Cisterna in alto
      const tw = w * 0.8, th = h * 0.22, tx = (w - tw) / 2;
      shapes.push(<rect key="tank" x={tx} y={1} width={tw} height={th} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Sedile ovale
      const bw = w * 0.88, bh = h * 0.72, bx = (w - bw) / 2, by = th + h * 0.05;
      shapes.push(<ellipse key="bowl" cx={w/2} cy={by + bh*0.5} rx={bw/2} ry={bh/2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Foro interno
      shapes.push(<ellipse key="hole" cx={w/2} cy={by + bh*0.55} rx={bw*0.3} ry={bh*0.28} stroke={stroke} strokeWidth={sw} fill="none" />);
      break;
    }
    case 'bidet': {
      const bw = w * 0.85, bh = h * 0.82, bx = (w - bw)/2, by = h*0.08;
      shapes.push(<ellipse key="body" cx={w/2} cy={by+bh*0.45} rx={bw/2} ry={bh/2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<ellipse key="basin" cx={w/2} cy={by+bh*0.55} rx={bw*0.32} ry={bh*0.28} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<line key="pipe" x1={w/2} y1={by} x2={w/2} y2={by-5} stroke={stroke} strokeWidth={sw} />);
      break;
    }
    case 'lavandino': {
      shapes.push(<rect key="outer" x={2} y={h*0.15} width={w-4} height={h*0.75} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<ellipse key="basin" cx={w/2} cy={h*0.55} rx={w*0.32} ry={h*0.3} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<circle key="drain" cx={w/2} cy={h*0.58} r={3} stroke={stroke} strokeWidth={1} fill="none" />);
      // Rubinetto
      shapes.push(<rect key="tap" x={w/2-4} y={h*0.12} width={8} height={h*0.1} rx={2} stroke={stroke} strokeWidth={1} fill={fill} />);
      break;
    }
    case 'lavabo_doppio': {
      shapes.push(<rect key="outer" x={2} y={h*0.15} width={w-4} height={h*0.75} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<ellipse key="b1" cx={w*0.28} cy={h*0.55} rx={w*0.2} ry={h*0.28} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<ellipse key="b2" cx={w*0.72} cy={h*0.55} rx={w*0.2} ry={h*0.28} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<line key="div" x1={w/2} y1={h*0.2} x2={w/2} y2={h*0.85} stroke={stroke} strokeWidth={0.8} />);
      break;
    }
    case 'vasca': {
      shapes.push(<rect key="outer" x={2} y={2} width={w-4} height={h-4} rx={8} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="inner" x={8} y={h*0.22} width={w-16} height={h*0.68} rx={6} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<circle key="drain" cx={w/2} cy={h*0.82} r={4} stroke={stroke} strokeWidth={1} fill="none" />);
      // Rubinetto in alto
      shapes.push(<rect key="tap" x={w*0.35} y={4} width={w*0.3} height={h*0.1} rx={2} stroke={stroke} strokeWidth={1} fill={fill} />);
      break;
    }
    case 'doccia': {
      shapes.push(<rect key="outer" x={2} y={2} width={w-4} height={h-4} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Testa doccia angolo
      shapes.push(<circle key="head" cx={w*0.2} cy={h*0.2} r={8} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<circle key="drain" cx={w/2} cy={h/2} r={5} stroke={stroke} strokeWidth={1} fill="none" />);
      // Linee acqua (stile schematico)
      shapes.push(<line key="l1" x1={w*0.2} y1={h*0.28} x2={w/2} y2={h/2} stroke={stroke} strokeWidth={0.8} strokeDasharray="4,3" />);
      break;
    }

    case 'frigo': {
      shapes.push(<rect key="body" x={2} y={2} width={w-4} height={h-4} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<line key="div" x1={4} y1={h*0.35} x2={w-4} y2={h*0.35} stroke={stroke} strokeWidth={0.8} />);
      shapes.push(<circle key="h1" cx={w-8} cy={h*0.18} r={3} stroke={stroke} strokeWidth={1} fill="none" />);
      shapes.push(<circle key="h2" cx={w-8} cy={h*0.65} r={3} stroke={stroke} strokeWidth={1} fill="none" />);
      break;
    }
    case 'lavello': {
      shapes.push(<rect key="outer" x={2} y={2} width={w-4} height={h-4} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="basin" x={7} y={h*0.15} width={w-14} height={h*0.7} rx={3} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<circle key="drain" cx={w/2} cy={h*0.58} r={4} stroke={stroke} strokeWidth={1} fill="none" />);
      shapes.push(<rect key="tap" x={w/2-4} y={3} width={8} height={h*0.1} rx={2} stroke={stroke} strokeWidth={1} fill={fill} />);
      break;
    }
    case 'piano_cottura': {
      shapes.push(<rect key="body" x={2} y={2} width={w-4} height={h-4} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      const fuochi = [{cx:w*0.28,cy:h*0.28},{cx:w*0.72,cy:h*0.28},{cx:w*0.28,cy:h*0.72},{cx:w*0.72,cy:h*0.72}];
      fuochi.forEach((f,i) => {
        shapes.push(<circle key={`f${i}`} cx={f.cx} cy={f.cy} r={w*0.15} stroke={stroke} strokeWidth={sw} fill="none" />);
        shapes.push(<circle key={`fc${i}`} cx={f.cx} cy={f.cy} r={w*0.05} stroke={stroke} strokeWidth={1} fill={stroke} />);
      });
      break;
    }
    case 'lavastoviglie': {
      shapes.push(<rect key="body" x={2} y={2} width={w-4} height={h-4} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="panel" x={w*0.1} y={h*0.08} width={w*0.8} height={h*0.15} rx={2} stroke={stroke} strokeWidth={0.8} fill="none" />);
      shapes.push(<circle key="btn" cx={w*0.8} cy={h*0.16} r={4} stroke={stroke} strokeWidth={1} fill="none" />);
      shapes.push(<line key="rack1" x1={w*0.1} y1={h*0.45} x2={w*0.9} y2={h*0.45} stroke={stroke} strokeWidth={0.8} />);
      shapes.push(<line key="rack2" x1={w*0.1} y1={h*0.65} x2={w*0.9} y2={h*0.65} stroke={stroke} strokeWidth={0.8} />);
      break;
    }

    // ── OFFICINA ──────────────────────────────────────────────────────────
    case 'ponte_sollevatore': {
      // Vista dall'alto: due rotaie + due bracci + sagoma auto
      const rw = w * 0.08, ry = h * 0.05;
      shapes.push(<rect key="r1" x={w*0.08} y={ry} width={rw} height={h*0.9} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="r2" x={w*0.84} y={ry} width={rw} height={h*0.9} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Bracci sollevatore
      shapes.push(<line key="b1" x1={w*0.08} y1={h*0.3} x2={w*0.92} y2={h*0.3} stroke={stroke} strokeWidth={sw*1.5} />);
      shapes.push(<line key="b2" x1={w*0.08} y1={h*0.7} x2={w*0.92} y2={h*0.7} stroke={stroke} strokeWidth={sw*1.5} />);
      // Sagoma auto semplificata
      shapes.push(<rect key="car" x={w*0.2} y={h*0.15} width={w*0.6} height={h*0.7} rx={6} stroke={stroke} strokeWidth={0.8} fill="none" strokeDasharray="4,3" />);
      break;
    }
    case 'banco_attrezzi': {
      shapes.push(<rect key="top" x={2} y={2} width={w-4} height={h*0.35} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="body" x={2} y={h*0.4} width={w-4} height={h*0.55} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Cassetti
      const nd = 3;
      for (let i=0; i<nd; i++) {
        const dy = h*0.42 + i*(h*0.52/nd);
        shapes.push(<rect key={`d${i}`} x={w*0.1} y={dy} width={w*0.8} height={h*0.52/nd-3} rx={1} stroke={stroke} strokeWidth={0.8} fill="none" />);
        shapes.push(<circle key={`dh${i}`} cx={w/2} cy={dy + (h*0.52/nd-3)/2} r={2} stroke={stroke} strokeWidth={1} fill={stroke} />);
      }
      break;
    }
    case 'trapano_colonna': {
      // Base
      shapes.push(<rect key="base" x={w*0.2} y={h*0.82} width={w*0.6} height={h*0.15} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Colonna
      shapes.push(<rect key="col" x={w*0.42} y={h*0.22} width={w*0.16} height={h*0.62} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Testa
      shapes.push(<ellipse key="head" cx={w/2} cy={h*0.18} rx={w*0.3} ry={h*0.14} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Mandrino
      shapes.push(<circle key="drill" cx={w/2} cy={h*0.32} r={w*0.08} stroke={stroke} strokeWidth={sw} fill="none" />);
      // Maniglie
      shapes.push(<line key="hnd" x1={w*0.75} y1={h*0.18} x2={w*0.88} y2={h*0.35} stroke={stroke} strokeWidth={sw} />);
      break;
    }
    case 'tornio': {
      shapes.push(<rect key="bed" x={2} y={h*0.55} width={w-4} height={h*0.38} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="head" x={4} y={h*0.2} width={w*0.42} height={h*0.38} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="tail" x={w*0.58} y={h*0.32} width={w*0.38} height={h*0.25} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<circle key="chuck" cx={w*0.25} cy={h*0.38} r={w*0.18} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<circle key="ctr" cx={w*0.25} cy={h*0.38} r={w*0.06} stroke={stroke} strokeWidth={1} fill={stroke} />);
      break;
    }
    case 'saldatrice': {
      shapes.push(<rect key="body" x={2} y={2} width={w-4} height={h*0.75} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="panel" x={w*0.15} y={h*0.1} width={w*0.7} height={h*0.4} rx={2} stroke={stroke} strokeWidth={0.8} fill="none" />);
      shapes.push(<circle key="dial" cx={w*0.35} cy={h*0.3} r={w*0.12} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<circle key="dial2" cx={w*0.65} cy={h*0.3} r={w*0.12} stroke={stroke} strokeWidth={sw} fill="none" />);
      shapes.push(<rect key="wheels" x={w*0.1} y={h*0.78} width={w*0.8} height={h*0.18} rx={3} stroke={stroke} strokeWidth={0.8} fill={fill} />);
      break;
    }
    case 'compressore': {
      shapes.push(<ellipse key="tank" cx={w/2} cy={h*0.55} rx={w*0.44} ry={h*0.38} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<rect key="motor" x={w*0.2} y={h*0.1} width={w*0.6} height={h*0.3} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<line key="l1" x1={w*0.15} y1={h*0.88} x2={w*0.85} y2={h*0.88} stroke={stroke} strokeWidth={sw} />);
      shapes.push(<circle key="gauge" cx={w*0.75} cy={h*0.25} r={w*0.12} stroke={stroke} strokeWidth={sw} fill="none" />);
      break;
    }
    case 'scaffale': {
      shapes.push(<rect key="frame" x={2} y={2} width={w-4} height={h-4} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      const ns = 5;
      for (let i=0; i<ns; i++) {
        const sy = 4 + i * (h-8) / ns;
        shapes.push(<line key={`s${i}`} x1={4} y1={sy} x2={w-4} y2={sy} stroke={stroke} strokeWidth={sw} />);
      }
      break;
    }
    case 'armadio_utensili': {
      shapes.push(<rect key="body" x={2} y={2} width={w-4} height={h-4} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<line key="div" x1={w/2} y1={4} x2={w/2} y2={h-4} stroke={stroke} strokeWidth={0.8} />);
      shapes.push(<circle key="h1" cx={w*0.35} cy={h*0.5} r={3} stroke={stroke} strokeWidth={1} fill="none" />);
      shapes.push(<circle key="h2" cx={w*0.65} cy={h*0.5} r={3} stroke={stroke} strokeWidth={1} fill="none" />);
      break;
    }
    case 'auto': {
      // Vista dall'alto
      shapes.push(<rect key="body" x={w*0.1} y={h*0.05} width={w*0.8} height={h*0.9} rx={12} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Abitacolo
      shapes.push(<rect key="cabin" x={w*0.18} y={h*0.28} width={w*0.64} height={h*0.44} rx={8} stroke={stroke} strokeWidth={0.8} fill="none" />);
      // Ruote
      const wheels = [{x:w*0.05,y:h*0.12},{x:w*0.05,y:h*0.7},{x:w*0.78,y:h*0.12},{x:w*0.78,y:h*0.7}];
      wheels.forEach((wh,i) => shapes.push(<rect key={`w${i}`} x={wh.x} y={wh.y} width={w*0.17} height={h*0.18} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />));
      break;
    }

    // ── UFFICIO ────────────────────────────────────────────────────────────
    case 'scrivania': {
      shapes.push(<rect key="top" x={2} y={2} width={w-4} height={h-4} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Monitor
      shapes.push(<rect key="mon" x={w*0.2} y={h*0.12} width={w*0.6} height={h*0.38} rx={2} stroke={stroke} strokeWidth={sw} fill="none" />);
      // Tastiera
      shapes.push(<rect key="kbd" x={w*0.15} y={h*0.6} width={w*0.7} height={h*0.2} rx={2} stroke={stroke} strokeWidth={0.8} fill="none" />);
      break;
    }
    case 'sedia': {
      shapes.push(<rect key="seat" x={w*0.1} y={h*0.25} width={w*0.8} height={h*0.7} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Schienale
      shapes.push(<rect key="back" x={w*0.15} y={h*0.05} width={w*0.7} height={h*0.22} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Gambe
      shapes.push(<line key="lf" x1={w*0.2} y1={h*0.95} x2={w*0.2} y2={h*1.0} stroke={stroke} strokeWidth={sw} />);
      shapes.push(<line key="rf" x1={w*0.8} y1={h*0.95} x2={w*0.8} y2={h*1.0} stroke={stroke} strokeWidth={sw} />);
      break;
    }
    case 'tavolo_riunioni': {
      shapes.push(<rect key="top" x={2} y={2} width={w-4} height={h-4} rx={5} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Sedie intorno (simboli)
      const ns = 4;
      for (let i=0; i<ns; i++) {
        const cy = h*0.15 + i*(h*0.7/ns);
        shapes.push(<rect key={`sl${i}`} x={-4} y={cy} width={6} height={h*0.14} rx={2} stroke={stroke} strokeWidth={0.8} fill={fill} />);
        shapes.push(<rect key={`sr${i}`} x={w-2} y={cy} width={6} height={h*0.14} rx={2} stroke={stroke} strokeWidth={0.8} fill={fill} />);
      }
      shapes.push(<rect key="st" x={w*0.35} y={-4} width={w*0.3} height={6} rx={2} stroke={stroke} strokeWidth={0.8} fill={fill} />);
      shapes.push(<rect key="sb" x={w*0.35} y={h-2} width={w*0.3} height={6} rx={2} stroke={stroke} strokeWidth={0.8} fill={fill} />);
      break;
    }
    case 'armadio': {
      shapes.push(<rect key="body" x={2} y={2} width={w-4} height={h-4} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<line key="div" x1={w/2} y1={4} x2={w/2} y2={h-4} stroke={stroke} strokeWidth={0.8} />);
      shapes.push(<circle key="h1" cx={w*0.35} cy={h*0.5} r={3} stroke={stroke} strokeWidth={1} fill="none" />);
      shapes.push(<circle key="h2" cx={w*0.65} cy={h*0.5} r={3} stroke={stroke} strokeWidth={1} fill="none" />);
      shapes.push(<line key="top" x1={4} y1={h*0.12} x2={w-4} y2={h*0.12} stroke={stroke} strokeWidth={0.8} />);
      break;
    }

    // ── ALTRO ────────────────────────────────────────────────────────────
    case 'scala': {
      shapes.push(<rect key="frame" x={2} y={2} width={w-4} height={h-4} rx={2} stroke={stroke} strokeWidth={sw} fill={fill} />);
      const ns2 = 9;
      for (let i=0; i<ns2; i++) {
        const sy = 4 + (i+0.5) * (h-8) / ns2;
        shapes.push(<line key={`s${i}`} x1={4} y1={sy} x2={w-4} y2={sy} stroke={stroke} strokeWidth={sw} />);
      }
      // Freccia direzione
      shapes.push(<polygon key="arr" points={`${w/2-6},${h-12} ${w/2+6},${h-12} ${w/2},${h-4}`} stroke={stroke} strokeWidth={1} fill={stroke} />);
      break;
    }
    case 'ascensore': {
      shapes.push(<rect key="body" x={2} y={2} width={w-4} height={h-4} rx={3} stroke={stroke} strokeWidth={sw} fill={fill} />);
      // Porte
      shapes.push(<line key="dp" x1={w/2} y1={h*0.1} x2={w/2} y2={h*0.9} stroke={stroke} strokeWidth={0.8} />);
      // Frecce su/giù
      shapes.push(<polygon key="au" points={`${w*0.35},${h*0.42} ${w*0.5},${h*0.25} ${w*0.65},${h*0.42}`} stroke={stroke} strokeWidth={1} fill="none" />);
      shapes.push(<polygon key="ad" points={`${w*0.35},${h*0.58} ${w*0.5},${h*0.75} ${w*0.65},${h*0.58}`} stroke={stroke} strokeWidth={1} fill="none" />);
      break;
    }

    default:
      shapes.push(<rect key="def" x={2} y={2} width={w-4} height={h-4} rx={4} stroke={stroke} strokeWidth={sw} fill={fill} />);
      shapes.push(<text key="lbl" x={w/2} y={h/2+5} textAnchor="middle" fill={c} fontSize={10}>{id}</text>);
  }

  return (
    <svg viewBox={vb} width={w} height={h} xmlns="http://www.w3.org/2000/svg"
         style={{ display: 'block', overflow: 'visible' }}>
      {shapes}
    </svg>
  );
}

// ── Componente principale BlockLibrary ────────────────────────────────────────
export const BlockLibrary: React.FC<BlockLibraryProps> = ({ onInsertBlock }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Bagno');
  const [isOpen, setIsOpen] = useState(true);

  const filtered = BLOCKS.filter(b => b.category === activeCategory);

  return (
    <div className="flex flex-col bg-[#252526] border-l border-white/10 h-full" style={{ width: isOpen ? 220 : 36 }}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2 p-2 text-[11px] font-bold text-cyan-400 hover:bg-white/10 transition-colors border-b border-white/10 w-full"
        title={isOpen ? 'Chiudi libreria' : 'Apri libreria blocchi'}
      >
        <span className="text-base">🏗️</span>
        {isOpen && <span className="uppercase tracking-wider">Libreria Blocchi</span>}
        {isOpen && <span className="ml-auto text-white/40">{isOpen ? '◀' : '▶'}</span>}
      </button>

      {isOpen && (
        <>
          {/* Categorie */}
          <div className="flex flex-col gap-0.5 p-1 border-b border-white/10">
            {BLOCK_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-left px-2 py-1 rounded text-[11px] transition-colors ${
                  activeCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Griglia blocchi */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-2">
              {filtered.map(block => (
                <BlockCard key={block.id} block={block} onInsert={onInsertBlock} />
              ))}
            </div>
          </div>

          <div className="p-2 border-t border-white/10 text-[9px] text-white/25 text-center font-mono">
            Clicca per inserire
          </div>
        </>
      )}
    </div>
  );
};

function BlockCard({ block, onInsert }: { block: BlockDef; onInsert: (id: string) => void }) {
  const pw = 56, ph = Math.round(pw * (block.defaultH / block.defaultW));
  const clampedH = Math.min(Math.max(ph, 36), 80);

  return (
    <button
      onClick={() => onInsert(block.id)}
      className="flex flex-col items-center gap-1 bg-black/30 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/40 rounded-lg p-2 transition-all group"
      title={`${block.name} — ${block.description}`}
    >
      <div className="flex items-center justify-center" style={{ width: 56, height: clampedH }}>
        <BlockPreview id={block.id} w={54} h={clampedH} />
      </div>
      <span className="text-[9px] text-white/60 group-hover:text-cyan-400 text-center leading-tight font-mono">
        {block.name}
      </span>
      <span className="text-[8px] text-white/25 text-center">{block.description}</span>
    </button>
  );
}
