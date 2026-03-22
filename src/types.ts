
export type Point = { x: number; y: number };

export type Layer = {
  id: string;
  name: string;
  isVisible: boolean;
  color?: string;
};

export type DrawingElement = {
  id: string;
  type: 'wall' | 'line' | 'dimension' | 'angular_dimension' | 'room' | 'circle' | 'arc' | 'polyline' | 'freehand' | 'text' | 'door' | 'window' | 'scissors' | 'block';
  layerId: string;
  points: Point[];
  properties: {
    length?: number;
    angle?: number;
    label?: string;
    color?: string;
    thickness?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    radius?: number;
    startAngle?: number;
    endAngle?: number;
    linkedElementIds?: string[];
    dimensionType?: 'linear' | 'angular';
    textContent?: string;
    fontSize?: number;
    fontFamily?: string;
    offset?: number;      // offset/spessore parallelo per linee/pareti
    width?: number;       // larghezza porta o finestra (cm) oppure blocco (px)
    height?: number;      // altezza blocco (px)
    blockType?: string;   // tipo di blocco dalla libreria
    openAngle?: number;   // angolo apertura porta (gradi, default 90)
  };
  isSelected?: boolean;
};

export type Command = {
  action: 'draw' | 'delete' | 'undo' | 'clear' | 'select' | 'move' | 'rotate' | 'scale' | 'save' | 'load' | 'layer_toggle' | 'layer_add' | 'layer_select' | 'export_dxf' | 'export_pdf' | 'offset';
  target: 'wall' | 'line' | 'dimension' | 'room' | 'all' | 'selected' | 'layer' | 'circle' | 'polyline' | 'freehand' | 'text' | 'door' | 'window' | 'angular_dimension';
  params?: {
    length?: number;
    radius?: number;
    angle?: number;
    x?: number;
    y?: number;
    label?: string;
    id?: string;
    data?: string;
    layerName?: string;
    offset?: number;
    width?: number;
    openAngle?: number;
  };
};
