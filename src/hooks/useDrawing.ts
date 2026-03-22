import { useState, useCallback } from 'react';
import { DrawingElement, Point, Command, Layer } from '../types';
import { generateDXF } from '../utils/dxfExporter';

const DEFAULT_LAYER: Layer = {
  id: 'default',
  name: 'Livello 0',
  isVisible: true,
  color: '#00ff00'
};

// 1 m = 100 px  →  1 cm = 1 px
const PX_PER_M = 100;

export function useDrawing() {
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [layers, setLayers] = useState<Layer[]>([DEFAULT_LAYER]);
  const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_LAYER.id);
  const [history, setHistory] = useState<{elements: DrawingElement[], layers: Layer[]}[]>([]);
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingElement['type'] | null>(null);
  const [tempElement, setTempElement] = useState<DrawingElement | null>(null);
  const [clipboard, setClipboard] = useState<DrawingElement[]>([]);

  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev, { elements, layers }]);
  }, [elements, layers]);

  const addElement = useCallback((element: DrawingElement) => {
    saveHistory();
    setElements(prev => [...prev, element]);
  }, [saveHistory]);

  const findClosestElementPoint = useCallback((point: Point, threshold: number = 20) => {
    let closest = { point, elementId: null as string | null, pointIndex: -1 };
    let minData = threshold;

    elements.forEach(el => {
      el.points.forEach((p, idx) => {
        const dist = Math.sqrt(Math.pow(point.x - p.x, 2) + Math.pow(point.y - p.y, 2));
        if (dist < minData) {
          minData = dist;
          closest = { point: p, elementId: el.id, pointIndex: idx };
        }
      });
    });

    return closest;
  }, [elements]);

  const startDrawing = useCallback((point: Point, tool: DrawingElement['type']) => {
    setIsDrawing(true);
    setCurrentTool(tool);

    const id = Math.random().toString(36).substr(2, 9);
    const snapped = findClosestElementPoint(point);
    const startPoint = snapped.point;

    const newElement: DrawingElement = {
      id,
      type: tool,
      layerId: activeLayerId,
      points: tool === 'text' ? [startPoint] : [startPoint, startPoint],
      properties: {
        color: tool === 'wall'      ? '#00ff00'
             : tool === 'dimension' ? '#ff9800'
             : tool === 'door'      ? '#00bfff'
             : tool === 'window'    ? '#87ceeb'
             : '#ffffff',
        thickness: tool === 'wall' ? 4 : tool === 'dimension' ? 1 : 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        linkedElementIds: snapped.elementId ? [snapped.elementId] : [],
        dimensionType: 'linear',
        textContent:  tool === 'text' ? 'Nuova Nota' : undefined,
        fontSize:     tool === 'text' ? 16 : undefined,
        fontFamily:   tool === 'text' ? 'Inter' : undefined,
        width:        tool === 'door'   ? 90
                    : tool === 'window' ? 100 : undefined,
        openAngle:    tool === 'door'   ? 90 : undefined,
      }
    };
    setTempElement(newElement);
  }, [activeLayerId, findClosestElementPoint]);

  const updateDrawing = useCallback((point: Point) => {
    if (!isDrawing || !tempElement) return;

    setTempElement(prev => {
      if (!prev) return null;
      const newPoints = [...prev.points];
      if (prev.type === 'freehand') {
        newPoints.push(point);
      } else if (prev.type === 'circle') {
        const center = prev.points[0];
        const radius = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
        return { ...prev, properties: { ...prev.properties, radius } };
      } else {
        newPoints[newPoints.length - 1] = point;
      }
      return { ...prev, points: newPoints };
    });
  }, [isDrawing, tempElement]);

  const addPointToDrawing = useCallback((point: Point) => {
    if (!isDrawing || !tempElement) return;
    setTempElement(prev => {
      if (!prev) return null;
      return { ...prev, points: [...prev.points, point] };
    });
  }, [isDrawing, tempElement]);

  const endDrawing = useCallback(() => {
    if (tempElement) {
      let finalPoints = [...tempElement.points];
      if (tempElement.type === 'polyline' || tempElement.type === 'angular_dimension') {
        finalPoints.pop();
      }

      if (tempElement.type === 'dimension') {
        const endSnapped = findClosestElementPoint(finalPoints[finalPoints.length - 1]);
        const updatedTemp = {
          ...tempElement,
          points: [finalPoints[0], endSnapped.point],
          properties: {
            ...tempElement.properties,
            linkedElementIds: [
              ...(tempElement.properties.linkedElementIds || []),
              ...(endSnapped.elementId ? [endSnapped.elementId] : [])
            ]
          }
        };
        addElement(updatedTemp);
      } else if (tempElement.type === 'angular_dimension') {
        const linkedIds: string[] = [];
        const snappedPoints = finalPoints.map(p => {
          const snapped = findClosestElementPoint(p);
          if (snapped.elementId) linkedIds.push(snapped.elementId);
          return snapped.point;
        });
        addElement({
          ...tempElement,
          points: snappedPoints.slice(0, 3),
          properties: {
            ...tempElement.properties,
            linkedElementIds: Array.from(new Set(linkedIds))
          }
        });
      } else if (tempElement.type === 'text') {
        addElement(tempElement);
      } else {
        addElement({ ...tempElement, points: finalPoints });
      }
    }
    setIsDrawing(false);
    setTempElement(null);
    setCurrentTool(null);
  }, [tempElement, addElement, findClosestElementPoint]);

  const undo = useCallback(() => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setElements(last.elements);
      setLayers(last.layers);
      setHistory(prev => prev.slice(0, -1));
    }
  }, [history]);

  const clear = useCallback(() => {
    saveHistory();
    setElements([]);
  }, [saveHistory]);

  const deleteSelected = useCallback(() => {
    saveHistory();
    setElements(prev => prev.filter(el => !el.isSelected));
  }, [saveHistory]);

  const selectElement = useCallback((id: string | null) => {
    setElements(prev => prev.map(el => ({ ...el, isSelected: el.id === id })));
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<DrawingElement>) => {
    setElements(prev => {
      const updated = prev.map(el => el.id === id ? { ...el, ...updates } : el);
      return updated.map(el => {
        if ((el.type === 'dimension' || el.type === 'angular_dimension') && el.properties.linkedElementIds?.length) {
          const linkedIds = el.properties.linkedElementIds;
          const linkedEls = updated.filter(le => linkedIds.includes(le.id));
          if (linkedEls.length > 0) {
            const newPoints = el.points.map(dp => {
              let minData = Infinity;
              let bestPoint = dp;
              linkedEls.forEach(le => {
                le.points.forEach(lp => {
                  const dist = Math.sqrt(Math.pow(dp.x - lp.x, 2) + Math.pow(dp.y - lp.y, 2));
                  if (dist < 50 && dist < minData) { minData = dist; bestPoint = lp; }
                });
              });
              return bestPoint;
            });
            return { ...el, points: newPoints };
          }
        }
        return el;
      });
    });
  }, []);

  // ── Copy / Paste ────────────────────────────────────────────────────────────
  const copySelected = useCallback(() => {
    const selected = elements.filter(el => el.isSelected);
    if (selected.length > 0) setClipboard(selected);
  }, [elements]);

  const pasteClipboard = useCallback(() => {
    if (clipboard.length === 0) return;
    saveHistory();
    const PASTE_OFFSET = 20;
    const pasted = clipboard.map(el => ({
      ...el,
      id: Math.random().toString(36).substr(2, 9),
      isSelected: true,
      points: el.points.map(p => ({ x: p.x + PASTE_OFFSET, y: p.y + PASTE_OFFSET }))
    }));
    // Deselect old
    setElements(prev => [
      ...prev.map(el => ({ ...el, isSelected: false })),
      ...pasted
    ]);
  }, [clipboard, saveHistory]);

  // ── Offset (crea parallela) ──────────────────────────────────────────────────
  // mode: 'both' crea DUE linee parallele (spessore parete), '+' o '-' crea solo una
  const offsetSelected = useCallback((offsetCm: number, mode: 'both' | '+' | '-' = 'both') => {
    const selected = elements.find(el => el.isSelected &&
      (el.type === 'wall' || el.type === 'line' || el.type === 'polyline') && el.points.length >= 2);
    if (!selected) return;

    // Calcola offset in px; garantisce almeno (spessore_originale/2 + 3) px
    // così le parallele non si sovrappongono mai visivamente
    const rawOffsetPx = (offsetCm / 100) * PX_PER_M;
    const origThickness = selected.properties.thickness || 2;
    const minOffsetPx = origThickness / 2 + 3;
    const offsetPx = Math.max(rawOffsetPx, minOffsetPx);
    const p1 = selected.points[0];
    const p2 = selected.points[selected.points.length - 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    // Vettore perpendicolare unitario
    const nx = -dy / len;
    const ny =  dx / len;

    const makeParallel = (sign: number): DrawingElement => ({
      id: Math.random().toString(36).substr(2, 9),
      type: selected.type,
      layerId: selected.layerId,
      points: selected.points.map(p => ({
        x: p.x + nx * offsetPx * sign,
        y: p.y + ny * offsetPx * sign
      })),
      // Le linee parallele (muri) hanno sempre spessore sottile per non sovraporsi visivamente
      properties: { ...selected.properties, thickness: 2 },
      isSelected: false
    });

    saveHistory();
    if (mode === 'both') {
      // Crea due parallele: una sopra e una sotto → spessore parete
      setElements(prev => [...prev, makeParallel(+1), makeParallel(-1)]);
    } else if (mode === '+') {
      setElements(prev => [...prev, makeParallel(+1)]);
    } else {
      setElements(prev => [...prev, makeParallel(-1)]);
    }
  }, [elements, saveHistory]);

  // ── Split/Taglia elemento nel punto più vicino al click ──────────────────────
  const splitElement = useCallback((elementId: string, clickPoint: Point) => {
    const el = elements.find(e => e.id === elementId);
    if (!el || el.points.length < 2) return;
    if (el.type !== 'wall' && el.type !== 'line' && el.type !== 'polyline') return;

    // Trova il segmento più vicino al punto cliccato e il punto di proiezione su quel segmento
    let bestT = 0;
    let bestSegIdx = 0;
    let bestDist = Infinity;
    let bestProjX = 0, bestProjY = 0;

    for (let i = 0; i < el.points.length - 1; i++) {
      const ax = el.points[i].x,     ay = el.points[i].y;
      const bx = el.points[i+1].x,   by = el.points[i+1].y;
      const dx = bx - ax, dy = by - ay;
      const lenSq = dx*dx + dy*dy;
      if (lenSq === 0) continue;
      const t = Math.max(0, Math.min(1, ((clickPoint.x-ax)*dx + (clickPoint.y-ay)*dy) / lenSq));
      const px = ax + t*dx, py = ay + t*dy;
      const dist = Math.sqrt((clickPoint.x-px)**2 + (clickPoint.y-py)**2);
      if (dist < bestDist) { bestDist = dist; bestT = t; bestSegIdx = i; bestProjX = px; bestProjY = py; }
    }

    // Non splittare se il clic è su un endpoint (t < 0.02 o t > 0.98)
    if (bestT < 0.02 || bestT > 0.98) return;

    const splitPt: Point = { x: Math.round(bestProjX), y: Math.round(bestProjY) };

    // Crea due nuovi elementi: punti[0..segIdx] + splitPt  e  splitPt + punti[segIdx+1..]
    const pts1 = [...el.points.slice(0, bestSegIdx + 1), splitPt];
    const pts2 = [splitPt, ...el.points.slice(bestSegIdx + 1)];

    const make = (pts: Point[]): DrawingElement => ({
      id: Math.random().toString(36).substr(2, 9),
      type: el.type,
      layerId: el.layerId,
      points: pts,
      properties: { ...el.properties },
      isSelected: false
    });

    saveHistory();
    setElements(prev => prev.filter(e => e.id !== elementId).concat([make(pts1), make(pts2)]));
  }, [elements, saveHistory]);

  // ── Inserimento blocco dalla libreria ────────────────────────────────────────
  const insertBlock = useCallback((blockId: string, blockW: number, blockH: number) => {
    // Posiziona al centro della vista (approssimato)
    const cx = 400, cy = 300;
    const newEl: DrawingElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'block',
      layerId: activeLayerId,
      points: [{ x: cx - blockW/2, y: cy - blockH/2 }],
      properties: {
        blockType: blockId,
        width: blockW,
        height: blockH,
        color: '#00ffff',
        thickness: 1.5,
      },
      isSelected: true,
    };
    saveHistory();
    // Deseleziona tutti e inserisce il nuovo blocco selezionato
    setElements(prev => [
      ...prev.map(e => ({ ...e, isSelected: false })),
      newEl
    ]);
  }, [activeLayerId, saveHistory]);

  // ── Layer helpers ────────────────────────────────────────────────────────────
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, isVisible: !l.isVisible } : l));
  }, []);

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...updates } : l));
  }, []);

  const addLayer = useCallback((name: string) => {
    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      isVisible: true,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, []);

  // ── File helpers ─────────────────────────────────────────────────────────────
  const saveToFile = useCallback(() => {
    const data = JSON.stringify({ elements, layers });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'planimetria.json'; a.click();
    URL.revokeObjectURL(url);
  }, [elements, layers]);

  const exportToDXF = useCallback(() => {
    const dxfContent = generateDXF(elements, layers);
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planimetria.dxf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [elements, layers]);

  const loadFromFile = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      saveHistory();
      if (data.elements) setElements(data.elements);
      if (data.layers) {
        setLayers(data.layers);
        if (data.layers.length > 0) setActiveLayerId(data.layers[0].id);
      } else {
        setElements(data);
      }
    } catch (e) {
      console.error('Failed to load file', e);
    }
  }, [saveHistory]);

  // ── Main command dispatcher ─────────────────────────────────────────────────
  const executeCommand = useCallback((cmd: Command) => {
    if (cmd.action === 'undo')       { undo(); return; }
    if (cmd.action === 'clear')      { clear(); return; }
    if (cmd.action === 'delete')     { deleteSelected(); return; }
    if (cmd.action === 'save')       { saveToFile(); return; }
    if (cmd.action === 'export_dxf') { exportToDXF(); return; }
    if (cmd.action === 'copy')       { copySelected(); return; }
    if (cmd.action === 'paste')      { pasteClipboard(); return; }

    if (cmd.action === 'layer_add' && cmd.params?.layerName) {
      addLayer(cmd.params.layerName); return;
    }

    if (cmd.action === 'offset') {
      offsetSelected(cmd.params?.offset ?? 20, cmd.params?.mode ?? 'both'); return;
    }

    if (cmd.action === 'scale' && cmd.target === 'selected' && cmd.params?.length) {
      const selected = elements.find(el => el.isSelected);
      if (selected && selected.points.length >= 2) {
        const p1 = selected.points[0];
        const p2 = selected.points[1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const newLength = cmd.params.length * PX_PER_M;
        updateElement(selected.id, {
          points: [p1, { x: p1.x + newLength * Math.cos(angle), y: p1.y + newLength * Math.sin(angle) }],
          properties: { ...selected.properties, length: cmd.params.length }
        });
      }
      return;
    }

    if (cmd.action === 'draw') {
      const lastElement = elements[elements.length - 1];
      let startPoint: Point = { x: 400, y: 300 };
      if (lastElement?.points.length > 0) {
        startPoint = lastElement.points[lastElement.points.length - 1];
      }
      if (cmd.params?.x !== undefined && cmd.params?.y !== undefined) {
        startPoint = { x: cmd.params.x, y: cmd.params.y };
      }

      const length    = (cmd.params?.length || 5) * PX_PER_M;
      const angleDeg  = cmd.params?.angle || 0;
      const angleRad  = angleDeg * (Math.PI / 180);
      const endPoint  = {
        x: startPoint.x + length * Math.cos(angleRad),
        y: startPoint.y - length * Math.sin(angleRad)
      };

      if (cmd.target === 'room') {
        const w = length, h = (cmd.params?.length || 5) * 30;
        const p1 = startPoint;
        const p2 = { x: p1.x + w, y: p1.y };
        const p3 = { x: p1.x + w, y: p1.y + h };
        const p4 = { x: p1.x,     y: p1.y + h };
        addElement({
          id: Math.random().toString(36).substr(2, 9),
          type: 'room', layerId: activeLayerId,
          points: [p1, p2, p3, p4, p1],
          properties: { label: cmd.params?.label || 'Stanza', color: '#00ffff', thickness: 3, rotation: 0, scaleX: 1, scaleY: 1 }
        });

      } else if (cmd.target === 'circle') {
        const radius = (cmd.params?.radius || 2) * PX_PER_M;
        addElement({
          id: Math.random().toString(36).substr(2, 9),
          type: 'circle', layerId: activeLayerId,
          points: [startPoint],
          properties: { radius, color: '#ffffff', thickness: 2, rotation: 0, scaleX: 1, scaleY: 1 }
        });

      } else if (cmd.target === 'text') {
        addElement({
          id: Math.random().toString(36).substr(2, 9),
          type: 'text', layerId: activeLayerId,
          points: [startPoint],
          properties: {
            textContent: cmd.params?.label || 'Nuova Nota',
            fontSize: cmd.params?.length || 16,
            fontFamily: 'Inter', color: '#ffffff', thickness: 1, rotation: 0, scaleX: 1, scaleY: 1
          }
        });

      } else if (cmd.target === 'door') {
        const doorWidthPx = ((cmd.params?.width ?? 90) / 100) * PX_PER_M;
        // Door placed horizontally by default; user can drag/reposition
        const endDoor = { x: startPoint.x + doorWidthPx, y: startPoint.y };
        addElement({
          id: Math.random().toString(36).substr(2, 9),
          type: 'door', layerId: activeLayerId,
          points: [startPoint, endDoor],
          properties: {
            color: '#00bfff', thickness: 2, rotation: 0, scaleX: 1, scaleY: 1,
            width: cmd.params?.width ?? 90,
            openAngle: cmd.params?.openAngle ?? 90
          }
        });

      } else if (cmd.target === 'window') {
        const winWidthPx = ((cmd.params?.width ?? 100) / 100) * PX_PER_M;
        const endWin = { x: startPoint.x + winWidthPx, y: startPoint.y };
        addElement({
          id: Math.random().toString(36).substr(2, 9),
          type: 'window', layerId: activeLayerId,
          points: [startPoint, endWin],
          properties: {
            color: '#87ceeb', thickness: 2, rotation: 0, scaleX: 1, scaleY: 1,
            width: cmd.params?.width ?? 100
          }
        });

      } else if (cmd.target === 'polyline' || cmd.target === 'freehand') {
        setCurrentTool(cmd.target as any);

      } else {
        addElement({
          id: Math.random().toString(36).substr(2, 9),
          type: cmd.target as any, layerId: activeLayerId,
          points: [startPoint, endPoint],
          properties: {
            length: cmd.params?.length || (length / PX_PER_M),
            angle: angleDeg,
            color: cmd.target === 'wall' ? '#00ff00' : '#ffffff',
            thickness: cmd.target === 'wall' ? 4 : 2,
            rotation: 0, scaleX: 1, scaleY: 1
          }
        });
      }
    }
  }, [elements, addLayer, activeLayerId, addElement, undo, clear, deleteSelected,
      saveToFile, exportToDXF, copySelected, pasteClipboard, offsetSelected, updateElement]);

  return {
    elements, layers, activeLayerId, cursorPos, setCursorPos,
    executeCommand, undo, clear, selectElement, updateElement, loadFromFile,
    toggleLayerVisibility, updateLayer, setActiveLayerId, addLayer,
    addPointToDrawing, startDrawing, updateDrawing, endDrawing,
    isDrawing, tempElement, currentTool, setCurrentTool,
    copySelected, pasteClipboard, offsetSelected, clipboard, splitElement, insertBlock
  };
}
