// ── Definizione blocchi simboli architetturali / officina ───────────────────
// Coordinate normalizzate 0..1 rispetto a (x, y, w, h) del blocco

export interface BlockDef {
  id: string;
  name: string;
  category: string;
  emoji: string;
  defaultW: number; // px
  defaultH: number; // px
  description: string;
}

export const BLOCK_CATEGORIES = ['Bagno', 'Cucina', 'Officina/Garage', 'Ufficio', 'Altro'] as const;

export const BLOCKS: BlockDef[] = [
  // ── BAGNO ────────────────────────────────────────────────────────────────
  { id: 'wc',       name: 'WC',           category: 'Bagno',         emoji: '🚽', defaultW: 60,  defaultH: 100, description: '36x60 cm' },
  { id: 'bidet',    name: 'Bidet',        category: 'Bagno',         emoji: '🚿', defaultW: 60,  defaultH: 90,  description: '36x54 cm' },
  { id: 'lavandino',name: 'Lavandino',    category: 'Bagno',         emoji: '🚰', defaultW: 90,  defaultH: 65,  description: '55x40 cm' },
  { id: 'vasca',    name: 'Vasca',        category: 'Bagno',         emoji: '🛁', defaultW: 80,  defaultH: 180, description: '80x170 cm' },
  { id: 'doccia',   name: 'Doccia',       category: 'Bagno',         emoji: '🚿', defaultW: 100, defaultH: 100, description: '90x90 cm' },
  { id: 'lavabo_doppio', name: 'Lavabo doppio', category: 'Bagno',   emoji: '🚰', defaultW: 130, defaultH: 65,  description: '130x50 cm' },

  // ── CUCINA ───────────────────────────────────────────────────────────────
  { id: 'frigo',    name: 'Frigorifero',  category: 'Cucina',        emoji: '🧊', defaultW: 65,  defaultH: 70,  description: '60x65 cm' },
  { id: 'lavello',  name: 'Lavello',      category: 'Cucina',        emoji: '🍽️', defaultW: 60,  defaultH: 120, description: '50x120 cm' },
  { id: 'piano_cottura', name: 'Piano cottura', category: 'Cucina',  emoji: '🔥', defaultW: 60,  defaultH: 90,  description: '60x90 cm' },
  { id: 'lavastoviglie', name: 'Lavastoviglie', category: 'Cucina',  emoji: '🫧', defaultW: 60,  defaultH: 60,  description: '60x60 cm' },

  // ── OFFICINA/GARAGE ──────────────────────────────────────────────────────
  { id: 'ponte_sollevatore', name: 'Ponte sollevatore', category: 'Officina/Garage', emoji: '🚗', defaultW: 280, defaultH: 550, description: '280x550 cm' },
  { id: 'banco_attrezzi',    name: 'Banco attrezzi',    category: 'Officina/Garage', emoji: '🔧', defaultW: 80,  defaultH: 200, description: '80x200 cm' },
  { id: 'trapano_colonna',   name: 'Trapano colonna',   category: 'Officina/Garage', emoji: '⚙️', defaultW: 70,  defaultH: 70,  description: '50x50 cm' },
  { id: 'tornio',            name: 'Tornio',            category: 'Officina/Garage', emoji: '⚙️', defaultW: 100, defaultH: 250, description: '80x200 cm' },
  { id: 'saldatrice',        name: 'Saldatrice',        category: 'Officina/Garage', emoji: '🔩', defaultW: 70,  defaultH: 80,  description: '50x60 cm' },
  { id: 'compressore',       name: 'Compressore',       category: 'Officina/Garage', emoji: '💨', defaultW: 80,  defaultH: 80,  description: '60x60 cm' },
  { id: 'scaffale',          name: 'Scaffale',          category: 'Officina/Garage', emoji: '📦', defaultW: 40,  defaultH: 200, description: '40x200 cm' },
  { id: 'armadio_utensili',  name: 'Armadio utensili',  category: 'Officina/Garage', emoji: '🗄️', defaultW: 60,  defaultH: 100, description: '60x50 cm' },
  { id: 'auto',              name: 'Auto',              category: 'Officina/Garage', emoji: '🚙', defaultW: 200, defaultH: 450, description: '180x450 cm' },

  // ── UFFICIO ──────────────────────────────────────────────────────────────
  { id: 'scrivania',    name: 'Scrivania',    category: 'Ufficio',  emoji: '🖥️', defaultW: 80,  defaultH: 160, description: '80x160 cm' },
  { id: 'sedia',        name: 'Sedia',        category: 'Ufficio',  emoji: '🪑', defaultW: 55,  defaultH: 55,  description: '55x55 cm' },
  { id: 'tavolo_riunioni', name: 'Tavolo riunioni', category: 'Ufficio', emoji: '📋', defaultW: 100, defaultH: 240, description: '90x200 cm' },
  { id: 'armadio',      name: 'Armadio',      category: 'Ufficio',  emoji: '🗄️', defaultW: 60,  defaultH: 120, description: '60x120 cm' },

  // ── ALTRO ────────────────────────────────────────────────────────────────
  { id: 'scala',        name: 'Scala',        category: 'Altro',    emoji: '🪜', defaultW: 100, defaultH: 280, description: '100x280 cm' },
  { id: 'ascensore',    name: 'Ascensore',    category: 'Altro',    emoji: '🛗', defaultW: 120, defaultH: 130, description: '120x130 cm' },
];

export function getBlockDef(id: string): BlockDef | undefined {
  return BLOCKS.find(b => b.id === id);
}
