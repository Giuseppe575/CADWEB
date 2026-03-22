import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Text, Circle, Ellipse, Group, Transformer, Arc } from 'react-konva';
import { DrawingElement, Point } from '../types';

interface CADCanvasProps {
  elements: DrawingElement[];
  cursorPos: Point;
  onCursorMove: (p: Point) => void;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<DrawingElement>) => void;
  layers: any[];
  isDrawing: boolean;
  tempElement: DrawingElement | null;
  currentTool: DrawingElement['type'] | null;
  onStartDrawing: (p: Point, tool: DrawingElement['type']) => void;
  onUpdateDrawing: (p: Point) => void;
  onAddPoint: (p: Point) => void;
  onEndDrawing: () => void;
  onExecuteCommand: (cmd: any) => void;
  onSplitElement: (id: string, pt: Point) => void;
  stageExportRef?: React.MutableRefObject<(() => string | null) | null>;
}

export const CADCanvas: React.FC<CADCanvasProps> = ({
  elements,
  cursorPos,
  onCursorMove,
  onSelect,
  onUpdate,
  layers,
  isDrawing,
  tempElement,
  currentTool,
  onStartDrawing,
  onUpdateDrawing,
  onAddPoint,
  onEndDrawing,
  onExecuteCommand,
  onSplitElement,
  stageExportRef
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scaleValue, setScaleValue] = useState<string>('');
  const [offsetValue, setOffsetValue] = useState<string>('');
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; stageX: number; stageY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<any>(null);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Blocca il menu contestuale e lo scorrimento automatico sul tasto centrale
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };
    el.addEventListener('mousedown', prevent);
    el.addEventListener('auxclick', prevent);
    return () => {
      el.removeEventListener('mousedown', prevent);
      el.removeEventListener('auxclick', prevent);
    };
  }, []);

  // Expose stage export function for PDF
  useEffect(() => {
    if (stageExportRef) {
      stageExportRef.current = () =>
        stageRef.current ? stageRef.current.toDataURL({ pixelRatio: 2 }) : null;
    }
  }, [stageExportRef]);

  const visibleLayerIds = layers.filter(l => l.isVisible).map(l => l.id);
  const visibleElements = elements.filter(el => visibleLayerIds.includes(el.layerId));
  const selectedElement = visibleElements.find(el => el.isSelected);

  useEffect(() => {
    if (transformerRef.current && selectedElement) {
      const node = transformerRef.current.getStage().findOne('#' + selectedElement.id);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedElement]);

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Pan con tasto centrale tenuto premuto
    if (isPanning && panStart.current) {
      const dx = pointer.x - panStart.current.x;
      const dy = pointer.y - panStart.current.y;
      setStagePos({ x: panStart.current.stageX + dx, y: panStart.current.stageY + dy });
      return;
    }

    const worldPos = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY()
    };
    onCursorMove(worldPos);
    if (isDrawing) {
      onUpdateDrawing(worldPos);
    }
  };

  const handleMouseDown = (e: any) => {
    // Tasto centrale (rotellina premuta) → avvia pan
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setIsPanning(true);
      panStart.current = { x: pointer.x, y: pointer.y, stageX: stagePos.x, stageY: stagePos.y };
      return;
    }

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldPos = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY()
    };

    if (currentTool && currentTool !== 'polyline') {
      onStartDrawing(worldPos, currentTool);
      return;
    }

    if (e.target === e.target.getStage()) {
      onSelect(null);
      return;
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    // Use current state values for calculation to ensure consistency
    const oldScale = stageScale;
    
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zoom range: 5% to 5000%
    if (newScale < 0.05 || newScale > 50) return;

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePos(newPos);
  };

  const handleMouseUp = (e: any) => {
    // Rilascio tasto centrale → fine pan
    if (e?.evt?.button === 1) {
      setIsPanning(false);
      panStart.current = null;
      return;
    }
    if (isDrawing && currentTool !== 'polyline') {
      onEndDrawing();
    }
  };

  const renderElement = (el: DrawingElement, isHovered = false) => {
    const points = el.points.flatMap(p => [p.x, p.y]);
    const isSelected = el.isSelected;
    const color = isSelected ? '#3b82f6' : (el.properties.color || '#ffffff');
    const strokeWidth = el.properties.thickness || 2;
    // Glow/highlight when selected
    const shadowColor = isSelected ? '#3b82f6' : 'transparent';
    const shadowBlur = isSelected ? 8 : 0;
    
    switch (el.type) {
      case 'wall':
      case 'line':
      case 'polyline':
      case 'freehand':
        return (
          <Line
            points={points}
            stroke={color}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            tension={el.type === 'freehand' ? 0.5 : 0}
            hitStrokeWidth={20}
            shadowColor={shadowColor}
            shadowBlur={shadowBlur}
            shadowEnabled={isSelected}
          />
        );
      case 'circle':
        return (
          <Circle
            x={el.points[0].x}
            y={el.points[0].y}
            radius={el.properties.radius || 0}
            stroke={color}
            strokeWidth={el.properties.thickness || 2}
          />
        );
      case 'room':
        return (
          <Group>
            <Line
              points={points}
              stroke={color}
              strokeWidth={el.properties.thickness || 3}
              closed
              fill="rgba(0, 255, 255, 0.1)"
            />
            {el.properties.label && (
              <Text
                x={el.points[0].x + 10}
                y={el.points[0].y + 10}
                text={el.properties.label}
                fill="#00ffff"
                fontSize={14}
                fontFamily="JetBrains Mono"
                fontStyle="bold"
              />
            )}
          </Group>
        );
      case 'dimension':
        if (el.points.length < 2) return null;
        const p1 = el.points[0];
        const p2 = el.points[1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const angleDeg = angle * (180 / Math.PI);
        const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) / 100;
        
        // Extension lines offset
        const offset = 20;
        const offsetX = Math.cos(angle + Math.PI / 2) * offset;
        const offsetY = Math.sin(angle + Math.PI / 2) * offset;

        return (
          <Group>
            {/* Extension lines */}
            <Line
              points={[p1.x, p1.y, p1.x + offsetX, p1.y + offsetY]}
              stroke="#ff9800"
              strokeWidth={1}
              opacity={0.5}
            />
            <Line
              points={[p2.x, p2.y, p2.x + offsetX, p2.y + offsetY]}
              stroke="#ff9800"
              strokeWidth={1}
              opacity={0.5}
            />
            {/* Dimension line */}
            <Line
              points={[p1.x + offsetX, p1.y + offsetY, p2.x + offsetX, p2.y + offsetY]}
              stroke="#ff9800"
              strokeWidth={1}
            />
            {/* Arrows */}
            <Circle x={p1.x + offsetX} y={p1.y + offsetY} radius={2} fill="#ff9800" />
            <Circle x={p2.x + offsetX} y={p2.y + offsetY} radius={2} fill="#ff9800" />
            
            <Text
              x={midX + offsetX}
              y={midY + offsetY}
              text={`${dist.toFixed(2)}m`}
              fill="#ff9800"
              fontSize={12}
              rotation={angleDeg}
              offsetY={15}
              fontFamily="JetBrains Mono"
              fontStyle="bold"
              align="center"
            />
          </Group>
        );
      case 'angular_dimension':
        if (el.points.length === 0) return null;
        const vertex = el.points[0];
        const pA = el.points.length > 1 ? el.points[1] : cursorPos;
        const pB = el.points.length > 2 ? el.points[2] : (el.points.length > 1 ? cursorPos : null);

        const angleA = Math.atan2(pA.y - vertex.y, pA.x - vertex.x);
        const angleB = pB ? Math.atan2(pB.y - vertex.y, pB.x - vertex.x) : angleA;
        let diff = (angleB - angleA) * (180 / Math.PI);
        if (diff < 0) diff += 360;
        if (diff > 180) diff = 360 - diff;

        const radius = 40;
        const midAngle = (angleA + angleB) / 2;
        const textX = vertex.x + (radius + 15) * Math.cos(midAngle);
        const textY = vertex.y + (radius + 15) * Math.sin(midAngle);

        return (
          <Group>
            {/* Construction lines */}
            <Line
              points={[vertex.x, vertex.y, pA.x, pA.y]}
              stroke="#ff9800"
              strokeWidth={1}
              dash={[2, 2]}
              opacity={0.5}
            />
            {pB && (
              <Line
                points={[vertex.x, vertex.y, pB.x, pB.y]}
                stroke="#ff9800"
                strokeWidth={1}
                dash={[2, 2]}
                opacity={0.5}
              />
            )}
            {pB && (
              <Text
                x={textX}
                y={textY}
                text={`${diff.toFixed(1)}°`}
                fill="#ff9800"
                fontSize={12}
                fontFamily="JetBrains Mono"
                fontStyle="bold"
              />
            )}
          </Group>
        );
      case 'door': {
        if (el.points.length < 2) return null;
        const hinge  = el.points[0];
        const jamb   = el.points[1];
        const dx     = jamb.x - hinge.x;
        const dy     = jamb.y - hinge.y;
        const wallAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
        const doorPx = Math.sqrt(dx * dx + dy * dy);
        const openDeg = el.properties.openAngle ?? 90;
        return (
          <Group>
            {/* Opening line */}
            <Line points={[hinge.x, hinge.y, jamb.x, jamb.y]}
              stroke={color} strokeWidth={el.properties.thickness || 2} />
            {/* Door leaf (dashed, swings 90°) */}
            <Line
              points={[
                hinge.x, hinge.y,
                hinge.x + doorPx * Math.cos((wallAngleDeg + openDeg) * Math.PI / 180),
                hinge.y + doorPx * Math.sin((wallAngleDeg + openDeg) * Math.PI / 180)
              ]}
              stroke={color} strokeWidth={el.properties.thickness || 2} dash={[6, 3]}
            />
            {/* Swing arc */}
            <Arc
              x={hinge.x} y={hinge.y}
              innerRadius={0} outerRadius={doorPx}
              angle={openDeg}
              rotation={wallAngleDeg}
              stroke={color} strokeWidth={1} fill="transparent" opacity={0.6}
            />
            {/* Hinge dot */}
            <Circle x={hinge.x} y={hinge.y} radius={3} fill={color} />
          </Group>
        );
      }
      case 'window': {
        if (el.points.length < 2) return null;
        const ws = el.points[0];
        const we = el.points[1];
        const wdx = we.x - ws.x;
        const wdy = we.y - ws.y;
        const wlen = Math.sqrt(wdx * wdx + wdy * wdy);
        if (wlen === 0) return null;
        const wnx = -wdy / wlen;
        const wny =  wdx / wlen;
        const reveal = 4; // px, glass reveal
        return (
          <Group>
            {/* Outer line 1 */}
            <Line points={[ws.x, ws.y, we.x, we.y]}
              stroke={color} strokeWidth={el.properties.thickness || 2} />
            {/* Glass line 1 */}
            <Line
              points={[
                ws.x + wnx * reveal, ws.y + wny * reveal,
                we.x + wnx * reveal, we.y + wny * reveal
              ]}
              stroke={color} strokeWidth={1} opacity={0.7}
            />
            {/* Glass line 2 */}
            <Line
              points={[
                ws.x - wnx * reveal, ws.y - wny * reveal,
                we.x - wnx * reveal, we.y - wny * reveal
              ]}
              stroke={color} strokeWidth={1} opacity={0.7}
            />
            {/* Jamb caps */}
            <Line points={[ws.x - wnx * reveal, ws.y - wny * reveal, ws.x + wnx * reveal, ws.y + wny * reveal]}
              stroke={color} strokeWidth={el.properties.thickness || 2} />
            <Line points={[we.x - wnx * reveal, we.y - wny * reveal, we.x + wnx * reveal, we.y + wny * reveal]}
              stroke={color} strokeWidth={el.properties.thickness || 2} />
          </Group>
        );
      }
      case 'text':
        return (
          <Text
            x={el.points[0].x}
            y={el.points[0].y}
            text={el.properties.textContent || 'Testo'}
            fontSize={el.properties.fontSize || 16}
            fontFamily={el.properties.fontFamily || 'Inter'}
            fill={el.layerId === 'default' ? '#00ff00' : '#ffffff'}
            onClick={() => onSelect(el.id)}
            draggable={el.isSelected}
            onDragEnd={(e) => {
              onUpdate(el.id, {
                points: [{ x: e.target.x(), y: e.target.y() }]
              });
            }}
          />
        );
      case 'block':
        return renderBlock(el, color, isSelected);

      default:
        return null;
    }
  };

  // ── Rendering blocchi simbolo (Konva shapes) ────────────────────────────────
  const renderBlock = (el: DrawingElement, color: string, isSelected: boolean) => {
    if (!el.points[0]) return null;
    const bx = el.points[0].x;
    const by = el.points[0].y;
    const bw = el.properties.width  || 80;
    const bh = el.properties.height || 80;
    const bt = el.properties.blockType || '';
    const sw = isSelected ? 2.5 : 1.5;
    const fillAlpha = isSelected ? 0.15 : 0.08;
    const fc = color;

    const shapeProps = (key: string, extra: object = {}) => ({
      key, stroke: fc, strokeWidth: sw, ...extra
    });

    const shapes: React.ReactNode[] = [];

    switch (bt) {
      case 'wc': {
        const tw = bw*0.8, th = bh*0.22, tx = bx+(bw-bw*0.8)/2;
        shapes.push(<Line key="tank" points={[tx,by, tx+tw,by, tx+tw,by+th, tx,by+th, tx,by]} closed {...shapeProps('tank')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Ellipse key="bowl_c" x={bx+bw/2} y={by+th+bh*0.4} radiusX={bw*0.44} radiusY={bh*0.36} {...shapeProps('bowl')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Ellipse key="hole" x={bx+bw/2} y={by+th+bh*0.43} radiusX={bw*0.18} radiusY={bh*0.18} {...shapeProps('hole')} fill="none" />);
        break;
      }
      case 'bidet': {
        shapes.push(<Ellipse key="body" x={bx+bw/2} y={by+bh*0.5} radiusX={bw*0.44} radiusY={bh*0.46} {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Ellipse key="basin" x={bx+bw/2} y={by+bh*0.55} radiusX={bw*0.22} radiusY={bh*0.22} {...shapeProps('basin')} fill="none" />);
        break;
      }
      case 'lavandino':
      case 'lavabo_doppio': {
        shapes.push(<Line key="outer" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('outer')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        if (bt === 'lavabo_doppio') {
          shapes.push(<Ellipse key="b1" x={bx+bw*0.28} y={by+bh*0.55} radiusX={bw*0.2} radiusY={bh*0.3} {...shapeProps('b1')} fill="none" />);
          shapes.push(<Ellipse key="b2" x={bx+bw*0.72} y={by+bh*0.55} radiusX={bw*0.2} radiusY={bh*0.3} {...shapeProps('b2')} fill="none" />);
          shapes.push(<Line key="div" points={[bx+bw/2,by, bx+bw/2,by+bh]} {...shapeProps('div')} strokeWidth={0.8} />);
        } else {
          shapes.push(<Ellipse key="basin" x={bx+bw/2} y={by+bh*0.55} radiusX={bw*0.3} radiusY={bh*0.32} {...shapeProps('basin')} fill="none" />);
        }
        break;
      }
      case 'vasca': {
        shapes.push(<Line key="outer" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('outer')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="inner" points={[bx+8,by+bh*0.18, bx+bw-8,by+bh*0.18, bx+bw-8,by+bh*0.88, bx+8,by+bh*0.88]} closed {...shapeProps('inner')} fill="none" />);
        shapes.push(<Circle key="drain" x={bx+bw/2} y={by+bh*0.8} radius={5} {...shapeProps('drain')} fill="none" />);
        break;
      }
      case 'doccia': {
        shapes.push(<Line key="outer" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('outer')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Arc key="shower" x={bx} y={by} innerRadius={0} outerRadius={bw*0.8} angle={90} rotation={0} {...shapeProps('shower')} fill="none" />);
        shapes.push(<Circle key="drain" x={bx+bw/2} y={by+bh/2} radius={6} {...shapeProps('drain')} fill="none" />);
        break;
      }
      case 'frigo': {
        shapes.push(<Line key="body" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="div" points={[bx,by+bh*0.35, bx+bw,by+bh*0.35]} {...shapeProps('div')} />);
        shapes.push(<Circle key="h1" x={bx+bw-8} y={by+bh*0.18} radius={3} {...shapeProps('h1')} fill="none" />);
        shapes.push(<Circle key="h2" x={bx+bw-8} y={by+bh*0.65} radius={3} {...shapeProps('h2')} fill="none" />);
        break;
      }
      case 'lavello': {
        shapes.push(<Line key="outer" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('outer')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="basin" points={[bx+6,by+bh*0.15, bx+bw-6,by+bh*0.15, bx+bw-6,by+bh*0.85, bx+6,by+bh*0.85]} closed {...shapeProps('basin')} fill="none" />);
        shapes.push(<Circle key="drain" x={bx+bw/2} y={by+bh*0.58} radius={5} {...shapeProps('drain')} fill="none" />);
        break;
      }
      case 'piano_cottura': {
        shapes.push(<Line key="body" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        [[0.28,0.28],[0.72,0.28],[0.28,0.72],[0.72,0.72]].forEach(([fx,fy],i) => {
          shapes.push(<Circle key={`f${i}`} x={bx+bw*fx} y={by+bh*fy} radius={bw*0.15} {...shapeProps(`f${i}`)} fill="none" />);
          shapes.push(<Circle key={`fc${i}`} x={bx+bw*fx} y={by+bh*fy} radius={bw*0.04} {...shapeProps(`fc${i}`)} fill={fc} />);
        });
        break;
      }
      case 'lavastoviglie': {
        shapes.push(<Line key="body" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="panel" points={[bx+bw*0.1,by+bh*0.08, bx+bw*0.9,by+bh*0.08, bx+bw*0.9,by+bh*0.22, bx+bw*0.1,by+bh*0.22]} closed {...shapeProps('panel')} fill="none" />);
        shapes.push(<Line key="rack1" points={[bx+bw*0.1,by+bh*0.45, bx+bw*0.9,by+bh*0.45]} {...shapeProps('rack1')} />);
        shapes.push(<Line key="rack2" points={[bx+bw*0.1,by+bh*0.65, bx+bw*0.9,by+bh*0.65]} {...shapeProps('rack2')} />);
        break;
      }
      case 'ponte_sollevatore': {
        const rw2 = bw*0.08;
        shapes.push(<Line key="r1" points={[bx+bw*0.08,by, bx+bw*0.08+rw2,by, bx+bw*0.08+rw2,by+bh, bx+bw*0.08,by+bh]} closed {...shapeProps('r1')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="r2" points={[bx+bw*0.84,by, bx+bw*0.84+rw2,by, bx+bw*0.84+rw2,by+bh, bx+bw*0.84,by+bh]} closed {...shapeProps('r2')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="b1" points={[bx+bw*0.08,by+bh*0.3, bx+bw*0.92,by+bh*0.3]} {...shapeProps('b1')} strokeWidth={sw*2} />);
        shapes.push(<Line key="b2" points={[bx+bw*0.08,by+bh*0.7, bx+bw*0.92,by+bh*0.7]} {...shapeProps('b2')} strokeWidth={sw*2} />);
        shapes.push(<Line key="car" points={[bx+bw*0.2,by+bh*0.15, bx+bw*0.8,by+bh*0.15, bx+bw*0.8,by+bh*0.85, bx+bw*0.2,by+bh*0.85]} closed {...shapeProps('car')} fill="none" dash={[6,4]} />);
        break;
      }
      case 'banco_attrezzi': {
        shapes.push(<Line key="top" points={[bx,by, bx+bw,by, bx+bw,by+bh*0.35, bx,by+bh*0.35]} closed {...shapeProps('top')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="body" points={[bx,by+bh*0.4, bx+bw,by+bh*0.4, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        [0,1,2].forEach(i => {
          const dy2 = by+bh*0.42 + i*(bh*0.52/3);
          shapes.push(<Line key={`d${i}`} points={[bx+bw*0.1,dy2, bx+bw*0.9,dy2, bx+bw*0.9,dy2+bh*0.14, bx+bw*0.1,dy2+bh*0.14]} closed {...shapeProps(`d${i}`)} fill="none" />);
          shapes.push(<Circle key={`dh${i}`} x={bx+bw/2} y={dy2+bh*0.07} radius={3} {...shapeProps(`dh${i}`)} fill={fc} />);
        });
        break;
      }
      case 'trapano_colonna': {
        shapes.push(<Line key="base" points={[bx+bw*0.2,by+bh*0.82, bx+bw*0.8,by+bh*0.82, bx+bw*0.8,by+bh, bx+bw*0.2,by+bh]} closed {...shapeProps('base')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="col" points={[bx+bw*0.42,by+bh*0.22, bx+bw*0.58,by+bh*0.22, bx+bw*0.58,by+bh*0.82, bx+bw*0.42,by+bh*0.82]} closed {...shapeProps('col')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Ellipse key="head" x={bx+bw/2} y={by+bh*0.18} radiusX={bw*0.3} radiusY={bh*0.14} {...shapeProps('head')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Circle key="drill" x={bx+bw/2} y={by+bh*0.33} radius={bw*0.09} {...shapeProps('drill')} fill="none" />);
        break;
      }
      case 'tornio': {
        shapes.push(<Line key="bed" points={[bx,by+bh*0.55, bx+bw,by+bh*0.55, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('bed')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="head" points={[bx,by+bh*0.2, bx+bw*0.45,by+bh*0.2, bx+bw*0.45,by+bh*0.55, bx,by+bh*0.55]} closed {...shapeProps('head')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Circle key="chuck" x={bx+bw*0.25} y={by+bh*0.38} radius={bw*0.18} {...shapeProps('chuck')} fill="none" />);
        shapes.push(<Circle key="ctr" x={bx+bw*0.25} y={by+bh*0.38} radius={bw*0.05} {...shapeProps('ctr')} fill={fc} />);
        shapes.push(<Line key="tail" points={[bx+bw*0.58,by+bh*0.32, bx+bw,by+bh*0.32, bx+bw,by+bh*0.55, bx+bw*0.58,by+bh*0.55]} closed {...shapeProps('tail')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        break;
      }
      case 'scaffale': {
        shapes.push(<Line key="frame" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('frame')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        [0,1,2,3,4].forEach(i => {
          const sy = by+4 + i*(bh-8)/5;
          shapes.push(<Line key={`s${i}`} points={[bx+4,sy, bx+bw-4,sy]} {...shapeProps(`s${i}`)} />);
        });
        break;
      }
      case 'armadio_utensili':
      case 'armadio': {
        shapes.push(<Line key="body" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="div" points={[bx+bw/2,by, bx+bw/2,by+bh]} {...shapeProps('div')} strokeWidth={0.8} />);
        shapes.push(<Circle key="h1" x={bx+bw*0.35} y={by+bh/2} radius={3} {...shapeProps('h1')} fill="none" />);
        shapes.push(<Circle key="h2" x={bx+bw*0.65} y={by+bh/2} radius={3} {...shapeProps('h2')} fill="none" />);
        if (bt === 'armadio') shapes.push(<Line key="top" points={[bx,by+bh*0.12, bx+bw,by+bh*0.12]} {...shapeProps('top')} strokeWidth={0.8} />);
        break;
      }
      case 'auto': {
        shapes.push(<Line key="body" points={[bx+bw*0.1,by+bh*0.05, bx+bw*0.9,by+bh*0.05, bx+bw*0.9,by+bh*0.95, bx+bw*0.1,by+bh*0.95]} closed {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="cabin" points={[bx+bw*0.18,by+bh*0.28, bx+bw*0.82,by+bh*0.28, bx+bw*0.82,by+bh*0.72, bx+bw*0.18,by+bh*0.72]} closed {...shapeProps('cabin')} fill="none" />);
        [[0.05,0.12],[0.05,0.7],[0.78,0.12],[0.78,0.7]].forEach(([wx,wy],i) => {
          shapes.push(<Line key={`w${i}`} points={[bx+bw*wx,by+bh*wy, bx+bw*(wx+0.17),by+bh*wy, bx+bw*(wx+0.17),by+bh*(wy+0.18), bx+bw*wx,by+bh*(wy+0.18)]} closed {...shapeProps(`w${i}`)} fill={`rgba(0,255,255,${fillAlpha})`} />);
        });
        break;
      }
      case 'scrivania': {
        shapes.push(<Line key="top" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('top')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="mon" points={[bx+bw*0.2,by+bh*0.12, bx+bw*0.8,by+bh*0.12, bx+bw*0.8,by+bh*0.5, bx+bw*0.2,by+bh*0.5]} closed {...shapeProps('mon')} fill="none" />);
        shapes.push(<Line key="kbd" points={[bx+bw*0.15,by+bh*0.6, bx+bw*0.85,by+bh*0.6, bx+bw*0.85,by+bh*0.8, bx+bw*0.15,by+bh*0.8]} closed {...shapeProps('kbd')} fill="none" />);
        break;
      }
      case 'sedia': {
        shapes.push(<Line key="seat" points={[bx+bw*0.1,by+bh*0.25, bx+bw*0.9,by+bh*0.25, bx+bw*0.9,by+bh*0.95, bx+bw*0.1,by+bh*0.95]} closed {...shapeProps('seat')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="back" points={[bx+bw*0.15,by+bh*0.05, bx+bw*0.85,by+bh*0.05, bx+bw*0.85,by+bh*0.25, bx+bw*0.15,by+bh*0.25]} closed {...shapeProps('back')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        break;
      }
      case 'tavolo_riunioni': {
        shapes.push(<Line key="top" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('top')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        [0,1,2,3].forEach(i => {
          const cy2 = by+bh*0.12 + i*(bh*0.76/4);
          shapes.push(<Line key={`sl${i}`} points={[bx-6,cy2, bx,cy2, bx,cy2+bh*0.15, bx-6,cy2+bh*0.15]} closed {...shapeProps(`sl${i}`)} fill="none" />);
          shapes.push(<Line key={`sr${i}`} points={[bx+bw,cy2, bx+bw+6,cy2, bx+bw+6,cy2+bh*0.15, bx+bw,cy2+bh*0.15]} closed {...shapeProps(`sr${i}`)} fill="none" />);
        });
        break;
      }
      case 'scala': {
        shapes.push(<Line key="frame" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('frame')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        [0,1,2,3,4,5,6,7,8].forEach(i => {
          const sy = by+4 + i*(bh-8)/9;
          shapes.push(<Line key={`s${i}`} points={[bx+4,sy, bx+bw-4,sy]} {...shapeProps(`s${i}`)} />);
        });
        break;
      }
      case 'ascensore': {
        shapes.push(<Line key="body" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('body')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Line key="dp" points={[bx+bw/2,by+bh*0.1, bx+bw/2,by+bh*0.9]} {...shapeProps('dp')} strokeWidth={0.8} />);
        shapes.push(<Line key="au" points={[bx+bw*0.35,by+bh*0.42, bx+bw*0.5,by+bh*0.25, bx+bw*0.65,by+bh*0.42]} {...shapeProps('au')} fill="none" />);
        shapes.push(<Line key="ad" points={[bx+bw*0.35,by+bh*0.58, bx+bw*0.5,by+bh*0.75, bx+bw*0.65,by+bh*0.58]} {...shapeProps('ad')} fill="none" />);
        break;
      }
      default: {
        shapes.push(<Line key="def" points={[bx,by, bx+bw,by, bx+bw,by+bh, bx,by+bh]} closed {...shapeProps('def')} fill={`rgba(0,255,255,${fillAlpha})`} />);
        shapes.push(<Text key="lbl" x={bx+4} y={by+bh/2-6} text={bt} fill={color} fontSize={10} fontFamily="monospace" />);
      }
    }

    // Etichetta nome blocco se selezionato
    if (isSelected) {
      shapes.push(
        <Text key="blk_lbl" x={bx} y={by-14} text={bt.replace(/_/g,' ')}
          fill="#3b82f6" fontSize={10} fontFamily="JetBrains Mono" fontStyle="bold" />
      );
    }

    return <>{shapes}</>;
  };

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-[#1e1e1e] cad-grid relative overflow-hidden ${currentTool === 'scissors' ? 'cursor-none' : isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      style={{
        backgroundSize: `${20 * stageScale}px ${20 * stageScale}px`,
        backgroundPosition: `${stagePos.x}px ${stagePos.y}px`
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          const stage = e.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (!pointer) return;
          const worldPos = {
            x: (pointer.x - stage.x()) / stage.scaleX(),
            y: (pointer.y - stage.y()) / stage.scaleY()
          };

          // ── Modalità Scissors: taglia la linea più vicina al punto cliccato ─
          if (currentTool === 'scissors') {
            // Cerca la linea/parete/polilinea più vicina al cursore
            let bestId: string | null = null;
            let bestDist = 30; // soglia massima in px (world space / scale)
            const snapRadius = 30 / stageScale;
            for (const el of visibleElements) {
              if (el.type !== 'wall' && el.type !== 'line' && el.type !== 'polyline') continue;
              for (let i = 0; i < el.points.length - 1; i++) {
                const ax = el.points[i].x, ay = el.points[i].y;
                const bx = el.points[i+1].x, by = el.points[i+1].y;
                const dx = bx-ax, dy = by-ay;
                const lenSq = dx*dx + dy*dy;
                if (lenSq === 0) continue;
                const t = Math.max(0, Math.min(1, ((worldPos.x-ax)*dx + (worldPos.y-ay)*dy)/lenSq));
                const px = ax+t*dx, py = ay+t*dy;
                const dist = Math.sqrt((worldPos.x-px)**2 + (worldPos.y-py)**2);
                if (dist < bestDist * snapRadius / 30) { bestDist = dist; bestId = el.id; }
              }
            }
            if (bestId) { onSplitElement(bestId, worldPos); }
            return;
          }

          // ── Modalità disegno polilinea / quota angolare ──────────────────
          if (currentTool === 'polyline' || currentTool === 'angular_dimension') {
            if (!isDrawing) {
              onStartDrawing(worldPos, currentTool);
            } else {
              if (currentTool === 'angular_dimension' && tempElement && tempElement.points.length >= 3) {
                onEndDrawing();
              } else {
                onAddPoint(worldPos);
              }
            }
            return;
          }

          // ── Selezione elemento (qualsiasi tool non-disegno) ──────────────
          if (!isDrawing) {
            if (e.target === stage) {
              // Clic sul fondo → deseleziona
              onSelect(null);
            } else {
              // Risali l'albero dei nodi Konva per trovare il Group con id
              let node: any = e.target;
              while (node && node !== stage) {
                const nid = node.id ? node.id() : null;
                if (nid) {
                  onSelect(nid);
                  return;
                }
                node = node.parent;
              }
            }
          }
        }}
        onDblClick={() => {
          if (isDrawing && (currentTool === 'polyline' || currentTool === 'freehand')) {
            onEndDrawing();
          }
        }}
      >
        <Layer>
          {visibleElements.map((el) => (
            <Group 
              key={el.id}
              id={el.id}
              draggable={!isDrawing && el.isSelected}
              rotation={el.properties.rotation || 0}
              scaleX={el.properties.scaleX || 1}
              scaleY={el.properties.scaleY || 1}
              onDragEnd={(e) => {
                onUpdate(el.id, {
                  points: el.points.map(p => ({
                    x: p.x + e.target.x(),
                    y: p.y + e.target.y()
                  }))
                });
                e.target.position({ x: 0, y: 0 });
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                onUpdate(el.id, {
                  properties: {
                    ...el.properties,
                    scaleX: node.scaleX(),
                    scaleY: node.scaleY(),
                    rotation: node.rotation(),
                  }
                });
              }}
              onClick={(e) => {
                // Se non stiamo disegnando, clic su un elemento lo seleziona sempre
                // (disattiva anche il tool corrente per passare in modalità selezione)
                if (!isDrawing) {
                  e.cancelBubble = true;
                  onSelect(el.id);
                }
              }}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container && !isDrawing) container.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'crosshair';
              }}
            >
              {renderElement(el)}
              {el.isSelected && (el.type === 'line' || el.type === 'wall') && el.points.length >= 2 && (
                <Text
                  x={(el.points[0].x + el.points[1].x) / 2}
                  y={(el.points[0].y + el.points[1].y) / 2 - 20}
                  text={`${(Math.sqrt(Math.pow(el.points[1].x - el.points[0].x, 2) + Math.pow(el.points[1].y - el.points[0].y, 2)) / 100).toFixed(2)}m`}
                  fill="#3b82f6"
                  fontSize={12}
                  fontFamily="JetBrains Mono"
                  fontStyle="bold"
                />
              )}
            </Group>
          ))}
          
          {tempElement && renderElement(tempElement)}

          {/* Mirino scissors: cerchio rosso sul punto di taglio */}
          {currentTool === 'scissors' && (
            <Group listening={false}>
              <Circle
                x={cursorPos.x} y={cursorPos.y}
                radius={10/stageScale}
                stroke="#ff3333" strokeWidth={2/stageScale}
                fill="rgba(255,51,51,0.15)"
              />
              <Line points={[cursorPos.x-14/stageScale, cursorPos.y, cursorPos.x+14/stageScale, cursorPos.y]}
                stroke="#ff3333" strokeWidth={1.5/stageScale} listening={false} />
              <Line points={[cursorPos.x, cursorPos.y-14/stageScale, cursorPos.x, cursorPos.y+14/stageScale]}
                stroke="#ff3333" strokeWidth={1.5/stageScale} listening={false} />
            </Group>
          )}

          {selectedElement && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}

          {/* Crosshair Cursor — listening={false} per non intercettare i click */}
          <Group listening={false}>
            <Line points={[cursorPos.x - 20/stageScale, cursorPos.y, cursorPos.x + 20/stageScale, cursorPos.y]} stroke="#ffffff" strokeWidth={1/stageScale} opacity={0.5} listening={false} />
            <Line points={[cursorPos.x, cursorPos.y - 20/stageScale, cursorPos.x, cursorPos.y + 20/stageScale]} stroke="#ffffff" strokeWidth={1/stageScale} opacity={0.5} listening={false} />
            <Circle x={cursorPos.x} y={cursorPos.y} radius={3/stageScale} stroke="#ffffff" strokeWidth={1/stageScale} opacity={0.5} listening={false} />
          </Group>
        </Layer>
      </Stage>

      <div className="absolute bottom-4 left-4 font-mono text-xs text-white/50 bg-black/40 px-2 py-1 rounded border border-white/10">
        X: {cursorPos.x.toFixed(0)} Y: {cursorPos.y.toFixed(0)}
      </div>

      {/* ── Pannello Offset / Spessore Parete ── */}
      {selectedElement && (selectedElement.type === 'wall' || selectedElement.type === 'line' || selectedElement.type === 'polyline') && (
        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-md border border-amber-500/40 rounded-xl p-3 flex flex-col gap-2 z-30 w-60 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Offset / Spessore Parete</span>
          </div>

          {/* Spessori rapidi con direzione */}
          <div className="grid grid-cols-5 gap-1">
            {[10, 15, 20, 25, 30].map(cm => (
              <button key={cm}
                onClick={() => onExecuteCommand({ action: 'offset', target: 'selected', params: { offset: cm, mode: 'both' } })}
                title={`Crea parete spessa ${cm}cm (2 linee parallele)`}
                className="bg-amber-700/70 hover:bg-amber-500 text-white text-[10px] font-bold py-1 rounded transition-colors text-center">
                {cm}
              </button>
            ))}
          </div>
          <div className="text-[9px] text-white/30 text-center -mt-1">cm — crea 2 parallele (↑ e ↓)</div>

          {/* Singola direzione */}
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => onExecuteCommand({ action: 'offset', target: 'selected', params: { offset: offsetValue ? parseFloat(offsetValue) : 20, mode: '+' } })}
              className="flex-1 bg-indigo-700/70 hover:bg-indigo-500 text-white text-[10px] font-bold py-1 rounded transition-colors">
              ↑ Su
            </button>
            <input
              type="number" step="1" min="1" placeholder="cm"
              value={offsetValue}
              onChange={(e) => setOffsetValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && offsetValue) {
                  onExecuteCommand({ action: 'offset', target: 'selected', params: { offset: parseFloat(offsetValue), mode: 'both' } });
                  setOffsetValue('');
                }
              }}
              className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white text-center outline-none focus:border-amber-500"
            />
            <button
              onClick={() => onExecuteCommand({ action: 'offset', target: 'selected', params: { offset: offsetValue ? parseFloat(offsetValue) : 20, mode: '-' } })}
              className="flex-1 bg-indigo-700/70 hover:bg-indigo-500 text-white text-[10px] font-bold py-1 rounded transition-colors">
              ↓ Giù
            </button>
          </div>

          {/* Scala lunghezza */}
          <div className="border-t border-white/10 pt-2 flex gap-2">
            <input
              type="number" step="0.1" placeholder="Scala a (m)…"
              value={scaleValue}
              onChange={(e) => setScaleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && scaleValue) {
                  onExecuteCommand({ action: 'scale', target: 'selected', params: { length: parseFloat(scaleValue) } });
                  setScaleValue('');
                }
              }}
              className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
            />
            <button onClick={() => { if (scaleValue) { onExecuteCommand({ action: 'scale', target: 'selected', params: { length: parseFloat(scaleValue) } }); setScaleValue(''); } }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors">↔ scala</button>
          </div>
        </div>
      )}

      {/* ── Barra colori universale (appare per qualsiasi elemento selezionato) ── */}
      {selectedElement && !isDrawing && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl">
          <span className="text-[10px] text-white/40 font-mono mr-1">COLORE</span>
          {[
            { color: '#ffffff', label: 'Bianco' },
            { color: '#00ff00', label: 'Verde' },
            { color: '#ff3333', label: 'Rosso' },
            { color: '#ffff00', label: 'Giallo' },
            { color: '#3b82f6', label: 'Blu' },
            { color: '#00ffff', label: 'Ciano' },
            { color: '#ff9800', label: 'Arancio' },
            { color: '#ff00ff', label: 'Viola' },
            { color: '#888888', label: 'Grigio' },
          ].map(({ color, label }) => (
            <button
              key={color}
              title={label}
              onClick={() => onUpdate(selectedElement.id, { properties: { ...selectedElement.properties, color } })}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 active:scale-90"
              style={{
                backgroundColor: color,
                borderColor: selectedElement.properties.color === color ? '#fff' : 'transparent'
              }}
            />
          ))}
          {/* Color picker libero */}
          <input
            type="color"
            title="Colore personalizzato"
            value={selectedElement.properties.color || '#ffffff'}
            onChange={(e) => onUpdate(selectedElement.id, { properties: { ...selectedElement.properties, color: e.target.value } })}
            className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent"
          />
          {/* Spessore tratto */}
          <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
            <span className="text-[10px] text-white/40 font-mono">SP</span>
            <input
              type="range" min="1" max="20"
              value={selectedElement.properties.thickness || 2}
              onChange={(e) => onUpdate(selectedElement.id, { properties: { ...selectedElement.properties, thickness: parseInt(e.target.value) } })}
              className="w-16 accent-indigo-400"
            />
            <span className="text-[10px] text-white/60 w-4">{selectedElement.properties.thickness || 2}</span>
          </div>
          {/* Taglia (attiva scissors tool) */}
          {(selectedElement.type === 'wall' || selectedElement.type === 'line' || selectedElement.type === 'polyline') && (
            <button
              title="Taglia linea ✂ — clicca sul punto dove dividere"
              onClick={() => {/* Il tool viene impostato da App tramite il bottone toolbar Scissors */
                // Hint: use scissors tool from toolbar
              }}
              className="ml-2 border-l border-white/10 pl-2 text-amber-400 hover:text-amber-300 text-xs transition-colors font-bold"
            >✂</button>
          )}
          {/* Elimina */}
          <button
            title="Elimina (Del)"
            onClick={() => onExecuteCommand({ action: 'delete', target: 'selected' })}
            className="ml-2 border-l border-white/10 pl-2 text-red-400 hover:text-red-300 text-xs transition-colors"
          >✕</button>
        </div>
      )}
    </div>
  );
};
