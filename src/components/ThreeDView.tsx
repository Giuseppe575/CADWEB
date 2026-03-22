import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, Line } from '@react-three/drei';
import * as THREE from 'three';
import { DrawingElement } from '../types';

interface ThreeDViewProps {
  elements: DrawingElement[];
  layers: any[];
}

const Wall = ({ points, thickness, color, rotation = 0, scaleX = 1, scaleY = 1 }: { points: { x: number; y: number }[], thickness: number, color: string, rotation?: number, scaleX?: number, scaleY?: number }) => {
  const mesh = useMemo(() => {
    if (points.length < 2) return null;
    
    const scale = 0.05;
    const height = 3;
    
    const p1 = new THREE.Vector3(points[0].x * scale, 0, points[0].y * scale);
    const p2 = new THREE.Vector3(points[1].x * scale, 0, points[1].y * scale);
    
    const direction = new THREE.Vector3().subVectors(p2, p1);
    const length = direction.length() * scaleX;
    const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const angle = Math.atan2(direction.z, direction.x) - (rotation * Math.PI / 180);
    
    return { length, center, angle, height, thickness: thickness * scale * scaleY };
  }, [points, thickness, rotation, scaleX, scaleY]);

  if (!mesh) return null;

  return (
    <mesh position={[mesh.center.x, mesh.height / 2, mesh.center.z]} rotation={[0, -mesh.angle, 0]}>
      <boxGeometry args={[mesh.length, mesh.height, mesh.thickness]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

const Room = ({ points, color, rotation = 0, scaleX = 1, scaleY = 1 }: { points: { x: number; y: number }[], color: string, rotation?: number, scaleX?: number, scaleY?: number }) => {
  return (
    <group rotation={[0, -rotation * Math.PI / 180, 0]} scale={[scaleX, 1, scaleY]}>
      {points.slice(0, -1).map((p, i) => (
        <Wall key={i} points={[p, points[i + 1]]} thickness={10} color={color} />
      ))}
    </group>
  );
};

// ── Altezze 3D per tipo di blocco (in metri) ─────────────────────────────────
const BLOCK_HEIGHTS: Record<string, number> = {
  wc: 0.45, bidet: 0.40, lavandino: 0.85, lavabo_doppio: 0.85,
  vasca: 0.55, doccia: 2.20,
  frigo: 1.85, lavello: 0.90, piano_cottura: 0.90, lavastoviglie: 0.85,
  ponte_sollevatore: 0.20, banco_attrezzi: 0.90, trapano_colonna: 1.60,
  tornio: 1.20, saldatrice: 1.10, compressore: 1.00,
  scaffale: 2.10, armadio_utensili: 1.80, auto: 1.50,
  scrivania: 0.75, sedia: 1.00, tavolo_riunioni: 0.75, armadio: 2.00,
  scala: 0.10, ascensore: 2.80,
};

const BLOCK_COLORS: Record<string, string> = {
  wc: '#e0e0ff', bidet: '#e0e0ff', lavandino: '#e0e0ff', lavabo_doppio: '#e0e0ff',
  vasca: '#b0c4de', doccia: '#c0d0ff',
  frigo: '#c8e6ff', lavello: '#d4e8d4', piano_cottura: '#ffd0a0', lavastoviglie: '#c8e6ff',
  ponte_sollevatore: '#808090', banco_attrezzi: '#c8a060', trapano_colonna: '#9090a0',
  tornio: '#9090a0', saldatrice: '#a0a0b0', compressore: '#909898',
  scaffale: '#c0a060', armadio_utensili: '#b0906a', auto: '#6080c0',
  scrivania: '#c0a060', sedia: '#d09060', tavolo_riunioni: '#c0a060', armadio: '#b0906a',
  scala: '#c0b080', ascensore: '#c0c0d0',
};

const Block3D = ({ el, scale }: { el: any; scale: number }) => {
  const bt = el.properties.blockType || 'unknown';
  const bw = (el.properties.width  || 80) * scale;
  const bh = (el.properties.height || 80) * scale;
  const blockH = BLOCK_HEIGHTS[bt] ?? 0.8;
  const color  = BLOCK_COLORS[bt]  ?? '#aaaaaa';

  const px = el.points[0].x * scale + bw / 2;
  const pz = el.points[0].y * scale + bh / 2;

  return (
    <group>
      <mesh position={[px, blockH / 2, pz]} castShadow receiveShadow>
        <boxGeometry args={[bw, blockH, bh]} />
        <meshStandardMaterial color={color} transparent opacity={0.88} />
      </mesh>
      {/* Bordo wireframe */}
      <lineSegments position={[px, blockH / 2, pz]}>
        <edgesGeometry args={[new THREE.BoxGeometry(bw, blockH, bh)]} />
        <lineBasicMaterial color="#00ffff" />
      </lineSegments>
    </group>
  );
};

export const ThreeDView: React.FC<ThreeDViewProps> = ({ elements, layers }) => {
  const visibleLayerIds = layers.filter(l => l.isVisible).map(l => l.id);
  const visibleElements = elements.filter(el => visibleLayerIds.includes(el.layerId));
  const scale = 0.05;

  // Calculate the center of all visible elements to focus the camera
  const center = useMemo(() => {
    if (visibleElements.length === 0) return new THREE.Vector3(0, 0, 0);
    const box = new THREE.Box3();
    visibleElements.forEach(el => {
      el.points.forEach(p => {
        box.expandByPoint(new THREE.Vector3(p.x * scale, 0, p.y * scale));
      });
    });
    const c = new THREE.Vector3();
    box.getCenter(c);
    return c;
  }, [visibleElements, scale]);

  return (
    <div className="w-full h-full bg-[#0a0a0a] relative">
      <Canvas shadows camera={{ position: [center.x + 15, 15, center.z + 15], fov: 50 }}>
        <OrbitControls 
          makeDefault 
          target={[center.x, 0, center.z]} 
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.8}
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />
        
        <Grid 
          infiniteGrid 
          fadeDistance={100} 
          cellColor="#333" 
          sectionColor="#444" 
          sectionSize={5}
          cellSize={1}
        />
        
        <group>
          {visibleElements.map((el) => {
            if (el.type === 'wall') {
              return <Wall 
                key={el.id} 
                points={el.points} 
                thickness={el.properties.thickness || 10} 
                color={el.properties.color || "#00ff00"} 
                rotation={el.properties.rotation}
                scaleX={el.properties.scaleX}
                scaleY={el.properties.scaleY}
              />;
            }
            if (el.type === 'line' || el.type === 'polyline' || el.type === 'freehand') {
              return (
                <Line
                  key={el.id}
                  points={el.points.map(p => [p.x * scale, 0.02, p.y * scale])}
                  color={el.properties.color || '#ffffff'}
                  lineWidth={2}
                />
              );
            }
            if (el.type === 'circle') {
              const radius = (el.properties.radius || 0) * scale;
              return (
                <mesh key={el.id} position={[el.points[0].x * scale, 0.02, el.points[0].y * scale]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radius - 0.05, radius, 64]} />
                  <meshBasicMaterial color={el.properties.color || '#ffffff'} side={THREE.DoubleSide} />
                </mesh>
              );
            }
            if (el.type === 'room') {
              return <Room
                key={el.id}
                points={el.points}
                color={el.properties.color || "#00ffff"}
                rotation={el.properties.rotation}
                scaleX={el.properties.scaleX}
                scaleY={el.properties.scaleY}
              />;
            }
            if (el.type === 'block' && el.points[0]) {
              return <Block3D key={el.id} el={el} scale={scale} />;
            }
            return null;
          })}
        </group>
        
        <Environment preset="city" />
      </Canvas>
      
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded text-[10px] text-white/70 font-mono uppercase tracking-widest">
          Vista 3D Libera
        </div>
        <div className="bg-black/40 backdrop-blur-sm p-2 rounded text-[9px] text-white/50 font-mono">
          Tasto Sinistro: Ruota<br/>
          Tasto Destro: Pan<br/>
          Rotellina: Zoom
        </div>
      </div>
    </div>
  );
};
