export type Vec2 = { x: number; y: number };
export type Size = { w: number; h: number };

export type CAProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  background?: string;
};

export type LayerBase = {
  id: string;
  name: string;
  position: Vec2;
  size: Size;
  opacity?: number;
  rotation?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  visible?: boolean;
};

export type ImageLayer = LayerBase & {
  type: 'image';
  src: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
};

export type TextLayer = LayerBase & {
  type: 'text';
  text: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export type ShapeKind = 'rect' | 'circle' | 'rounded-rect';
export type ShapeLayer = LayerBase & {
  type: 'shape';
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
};

export type GroupLayer = LayerBase & {
  type: 'group';
  children: AnyLayer[];
};

export type AnyLayer = ImageLayer | TextLayer | ShapeLayer | GroupLayer;

// Animation types (minimal)
export type AnimatableScalarProp =
  | 'position.x'
  | 'position.y'
  | 'size.w'
  | 'size.h'
  | 'rotation'
  | 'opacity';

export type Keyframe = {
  time: number; // seconds
  value: number;
  easing?: 'linear';
};

export type LayerPropertyAnimation = {
  id: string;
  layerId: string;
  property: AnimatableScalarProp;
  keyframes: Keyframe[]; // sorted by time ascending
};

export type TimelineState = {
  duration: number; // seconds
  fps: number;
  currentTime: number; // seconds
  playing: boolean;
  loop: boolean;
};

export type CAAsset = {
  path: string;
  data: Blob | ArrayBuffer | string;
};

export type CAProjectBundle = {
  project: CAProject;
  root: AnyLayer;
  assets?: Record<string, CAAsset>;
};
