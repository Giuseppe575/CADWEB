import { DrawingElement, Layer } from '../types';

// Scala: 1 m = 100 px → coordinate DXF in metri
const PX_PER_M = 100;
const S = 1 / PX_PER_M;

// Konva Y cresce verso il basso; DXF Y cresce verso l'alto → neghiamo Y
const x = (v: number) => (v * S).toFixed(4);
const y = (v: number) => (-v * S).toFixed(4);

// ── Entità base ──────────────────────────────────────────────────────────────
function eLine(x1:number,y1:number,x2:number,y2:number,layer:string,ltype='CONTINUOUS') {
  return `0\nLINE\n8\n${layer}\n6\n${ltype}\n`
       + `10\n${x(x1)}\n20\n${y(y1)}\n30\n0.0000\n`
       + `11\n${x(x2)}\n21\n${y(y2)}\n31\n0.0000\n`;
}

function ePolyline(pts:{x:number,y:number}[], layer:string, closed=false) {
  if (pts.length < 2) return '';
  // In AC1009 usiamo POLYLINE + VERTEX + SEQEND (formato classico, massima compatibilità)
  let s = `0\nPOLYLINE\n8\n${layer}\n66\n1\n70\n${closed ? 1 : 0}\n`;
  for (const p of pts) {
    s += `0\nVERTEX\n8\n${layer}\n10\n${x(p.x)}\n20\n${y(p.y)}\n30\n0.0000\n`;
  }
  s += `0\nSEQEND\n8\n${layer}\n`;
  return s;
}

// ── Esportatore principale ────────────────────────────────────────────────────
export function generateDXF(elements: DrawingElement[], layers: Layer[]): string {

  // Calcola estensioni per header
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for (const el of elements) {
    for (const p of el.points) {
      if (p.x < minX) minX=p.x; if (p.x > maxX) maxX=p.x;
      if (p.y < minY) minY=p.y; if (p.y > maxY) maxY=p.y;
    }
  }
  if (!isFinite(minX)) { minX=0; minY=0; maxX=1000; maxY=1000; }
  const pad = 200; // px di margine
  const eMinX = x(minX - pad), eMinY = y(maxY + pad);
  const eMaxX = x(maxX + pad), eMaxY = y(minY - pad);

  // ── HEADER (formato AC1009 = R12, massima compatibilità con AutoCAD) ────────
  let d = '';
  d += '0\nSECTION\n2\nHEADER\n';
  d += `9\n$ACADVER\n1\nAC1009\n`;           // R12: niente subclass markers obbligatori
  d += `9\n$INSUNITS\n70\n6\n`;              // 6 = metres
  d += `9\n$EXTMIN\n10\n${eMinX}\n20\n${eMinY}\n30\n0.0000\n`;
  d += `9\n$EXTMAX\n10\n${eMaxX}\n20\n${eMaxY}\n30\n0.0000\n`;
  d += `9\n$LIMMIN\n10\n${eMinX}\n20\n${eMinY}\n`;
  d += `9\n$LIMMAX\n10\n${eMaxX}\n20\n${eMaxY}\n`;
  d += '0\nENDSEC\n';

  // ── TABLES ──────────────────────────────────────────────────────────────────
  d += '0\nSECTION\n2\nTABLES\n';

  // Linetype table
  d += '0\nTABLE\n2\nLTYPE\n70\n3\n';
  d += '0\nLTYPE\n2\nCONTINUOUS\n70\n64\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n';
  d += '0\nLTYPE\n2\nDASHED\n70\n64\n3\n__ __ __ __\n72\n65\n73\n2\n40\n0.75\n49\n0.5\n49\n-0.25\n';
  d += '0\nLTYPE\n2\nDOT\n70\n64\n3\n. . . . .\n72\n65\n73\n2\n40\n0.25\n49\n0.0\n49\n-0.25\n';
  d += '0\nENDTAB\n';

  // Layer table — layer "0" sempre presente
  const layerNames = ['0', ...layers.map(l => l.name.replace(/\s+/g,'_')).filter(n => n !== '0')];
  d += `0\nTABLE\n2\nLAYER\n70\n${layerNames.length}\n`;
  for (const n of layerNames) {
    d += `0\nLAYER\n2\n${n}\n70\n0\n62\n7\n6\nCONTINUOUS\n`;
  }
  d += '0\nENDTAB\n';
  d += '0\nENDSEC\n';

  // ── ENTITIES ─────────────────────────────────────────────────────────────────
  d += '0\nSECTION\n2\nENTITIES\n';

  for (const el of elements) {
    const layerObj = layers.find(l => l.id === el.layerId);
    const ln = layerObj ? layerObj.name.replace(/\s+/g,'_') : '0';

    switch (el.type) {
      case 'wall':
      case 'line':
        if (el.points.length >= 2)
          d += eLine(el.points[0].x, el.points[0].y,
                     el.points[el.points.length-1].x, el.points[el.points.length-1].y, ln);
        break;

      case 'polyline':
      case 'freehand':
        d += ePolyline(el.points, ln, false);
        break;

      case 'room':
        d += ePolyline(el.points, ln, true);
        break;

      case 'circle': {
        const c = el.points[0];
        const r = ((el.properties.radius || 0) * S).toFixed(4);
        d += `0\nCIRCLE\n8\n${ln}\n10\n${x(c.x)}\n20\n${y(c.y)}\n30\n0.0000\n40\n${r}\n`;
        break;
      }

      case 'text': {
        const p = el.points[0];
        const h = ((el.properties.fontSize || 14) * S).toFixed(4);
        const txt = (el.properties.textContent || '').replace(/[\r\n]+/g,' ');
        d += `0\nTEXT\n8\n${ln}\n10\n${x(p.x)}\n20\n${y(p.y)}\n30\n0.0000\n40\n${h}\n1\n${txt}\n`;
        break;
      }

      case 'dimension':
        if (el.points.length >= 2) {
          const p1=el.points[0], p2=el.points[1];
          const distM = (Math.hypot(p2.x-p1.x, p2.y-p1.y) / PX_PER_M).toFixed(2);
          d += eLine(p1.x, p1.y, p2.x, p2.y, ln);
          const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
          d += `0\nTEXT\n8\n${ln}\n10\n${x(mx)}\n20\n${y(my)}\n30\n0.0000\n40\n0.1000\n1\n${distM}m\n`;
        }
        break;

      case 'door':
        if (el.points.length >= 2) {
          const h2=el.points[0], j=el.points[1];
          const ddx=j.x-h2.x, ddy=j.y-h2.y;
          const wallAngle=Math.atan2(ddy,ddx);
          const doorPx=Math.hypot(ddx,ddy);
          const openRad=(el.properties.openAngle||90)*Math.PI/180;
          d += eLine(h2.x, h2.y, j.x, j.y, ln);
          // Arco swing (8 segmenti)
          for (let i=0; i<8; i++) {
            const a1=wallAngle+openRad*i/8, a2=wallAngle+openRad*(i+1)/8;
            d += eLine(h2.x+doorPx*Math.cos(a1), h2.y+doorPx*Math.sin(a1),
                       h2.x+doorPx*Math.cos(a2), h2.y+doorPx*Math.sin(a2), ln);
          }
          // Battente (tratteggiato)
          const lx=h2.x+doorPx*Math.cos(wallAngle+openRad);
          const ly=h2.y+doorPx*Math.sin(wallAngle+openRad);
          d += eLine(h2.x, h2.y, lx, ly, ln, 'DASHED');
        }
        break;

      case 'window':
        if (el.points.length >= 2) {
          const ws=el.points[0], we=el.points[1];
          const wdx=we.x-ws.x, wdy=we.y-ws.y;
          const wlen=Math.hypot(wdx,wdy);
          if (wlen > 0) {
            const off=6; // px
            const nx=-wdy/wlen*off, ny=wdx/wlen*off;
            d += eLine(ws.x, ws.y, we.x, we.y, ln);
            d += eLine(ws.x+nx, ws.y+ny, we.x+nx, we.y+ny, ln);
            d += eLine(ws.x-nx, ws.y-ny, we.x-nx, we.y-ny, ln);
            d += eLine(ws.x-nx, ws.y-ny, ws.x+nx, ws.y+ny, ln); // stipite sx
            d += eLine(we.x-nx, we.y-ny, we.x+nx, we.y+ny, ln); // stipite dx
          }
        }
        break;

      case 'block': {
        if (!el.points[0]) break;
        const bx = el.points[0].x;
        const by2 = el.points[0].y;
        const bw = el.properties.width  || 80;
        const bh = el.properties.height || 80;
        const bt = el.properties.blockType || '';

        // Rettangolo esterno (outline del blocco)
        d += ePolyline([
          {x: bx,    y: by2   },
          {x: bx+bw, y: by2   },
          {x: bx+bw, y: by2+bh},
          {x: bx,    y: by2+bh},
        ], ln, true);

        // Etichetta centrata
        const label = bt.replace(/_/g,' ').toUpperCase();
        const cx2 = bx + bw/2, cy2 = by2 + bh/2;
        const th2 = Math.min(bw, bh) * 0.12 * S;
        d += `0\nTEXT\n8\n${ln}\n10\n${x(cx2 - bw*0.3)}\n20\n${y(cy2)}\n30\n0.0000\n40\n${th2.toFixed(4)}\n1\n${label}\n`;

        // Simboli interni specifici per tipo
        switch (bt) {
          case 'wc':
            d += ePolyline([{x:bx+bw*0.1,y:by2+bh*0.2},{x:bx+bw*0.9,y:by2+bh*0.2},{x:bx+bw*0.9,y:by2+bh*0.95},{x:bx+bw*0.1,y:by2+bh*0.95}], ln, true);
            break;
          case 'lavandino': case 'lavabo_doppio':
            d += eLine(bx+bw*0.15, by2+bh*0.2, bx+bw*0.85, by2+bh*0.2, ln);
            d += eLine(bx+bw*0.15, by2+bh*0.2, bx+bw*0.15, by2+bh*0.9, ln);
            d += eLine(bx+bw*0.85, by2+bh*0.2, bx+bw*0.85, by2+bh*0.9, ln);
            d += eLine(bx+bw*0.15, by2+bh*0.9, bx+bw*0.85, by2+bh*0.9, ln);
            break;
          case 'vasca':
            d += ePolyline([{x:bx+bw*0.12,y:by2+bh*0.12},{x:bx+bw*0.88,y:by2+bh*0.12},{x:bx+bw*0.88,y:by2+bh*0.88},{x:bx+bw*0.12,y:by2+bh*0.88}], ln, true);
            break;
          case 'doccia':
            d += eLine(bx, by2, bx+bw*0.6, by2+bh, ln, 'DASHED');
            d += eLine(bx, by2, bx+bw, by2+bh*0.6, ln, 'DASHED');
            break;
          case 'piano_cottura': {
            const fuochi = [[0.28,0.28],[0.72,0.28],[0.28,0.72],[0.72,0.72]];
            fuochi.forEach(([fx,fy]) => {
              const r = bw*0.12;
              const steps = 8;
              const cPts = Array.from({length:steps+1},(_,i)=>({
                x: bx+bw*fx + r*Math.cos(i*2*Math.PI/steps),
                y: by2+bh*fy + r*Math.sin(i*2*Math.PI/steps),
              }));
              d += ePolyline(cPts, ln, true);
            });
            break;
          }
          case 'ponte_sollevatore':
            d += eLine(bx+bw*0.1, by2, bx+bw*0.1, by2+bh, ln);
            d += eLine(bx+bw*0.9, by2, bx+bw*0.9, by2+bh, ln);
            d += eLine(bx, by2+bh*0.3, bx+bw, by2+bh*0.3, ln);
            d += eLine(bx, by2+bh*0.7, bx+bw, by2+bh*0.7, ln);
            break;
          case 'scala': {
            const ns = 8;
            for (let i=0; i<ns; i++) {
              const sy = by2 + (i+0.5)*(bh/ns);
              d += eLine(bx, sy, bx+bw, sy, ln);
            }
            break;
          }
          case 'auto':
            d += ePolyline([{x:bx+bw*0.15,y:by2+bh*0.1},{x:bx+bw*0.85,y:by2+bh*0.1},{x:bx+bw*0.85,y:by2+bh*0.9},{x:bx+bw*0.15,y:by2+bh*0.9}], ln, true);
            break;
          default:
            // Croce centrata come simbolo generico
            d += eLine(cx2-bw*0.2, cy2, cx2+bw*0.2, cy2, ln);
            d += eLine(cx2, cy2-bh*0.2, cx2, cy2+bh*0.2, ln);
        }
        break;
      }

      default:
        break;
    }
  }

  d += '0\nENDSEC\n0\nEOF\n';
  return d;
}
