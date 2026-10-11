import { renderToStaticMarkup } from 'react-dom/server';
import { Position } from '@xyflow/react';
import type { DiagramDoc, DiagramKind, NotaEdge, NotaNode, NotaNodeData, ShapeKey } from '../types';
import { SHAPE_RENDERERS, autoHeight } from '../shapes';
import { shapeStyle } from './theme';
import { buildEdgePath } from '../edges/NotaEdge';
import { EdgeScene } from '../edges/render';
import { LIGHT_THEME, DARK_THEME, type RenderTheme } from './renderTheme';
import { measureText } from './text';
import { nodeSize } from './layout';

export interface ExportOptions {
  background?: 'white' | 'dark' | 'transparent';
  padding?: number;
  scale?: number;
  theme?: RenderTheme;
}

const OVERFLOW_LABEL_SHAPES: ShapeKey[] = [
  'bpmnStart',
  'bpmnEnd',
  'bpmnIntermediateCatch',
  'bpmnIntermediateThrow',
  'bpmnBoundaryEvent',
  'bpmnGatewayExclusive',
  'bpmnGatewayParallel',
  'bpmnGatewayInclusive',
  'bpmnGatewayEventBased',
  'actInitial',
  'actFinal',
  'actFlowFinal',
  'actDecision',
  'actMerge',
  'actFork',
  'actJoin',
];

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overflowFor(node: NotaNode, size: { width: number; height: number }) {
  const shape = node.data?.shape;
  let left = 2;
  let right = 2;
  let top = 2;
  let bottom = 2;

  if (OVERFLOW_LABEL_SHAPES.includes(shape)) {
    const text = (node.data.label ?? '').trim();
    if (text) {
      const lines = text.split('\n').slice(0, 3);
      const size11 = 11.5;
      const width = lines.reduce((max, line) => Math.max(max, measureText(line, size11, 600)), 0);
      const extra = Math.max(0, (width - size.width) / 2 + 6);
      left = Math.max(left, extra);
      right = Math.max(right, extra);
      bottom = Math.max(bottom, lines.length * size11 * 1.25 + 10);
    }
  }

  if (shape === 'clsClass' || shape === 'clsInterface' || shape === 'clsAbstract' || shape === 'clsEnum') {
    const needed = autoHeight(shape, node.data as NotaNodeData, size.width);
    if (needed && needed > size.height) bottom = Math.max(bottom, needed - size.height + 4);
  }

  return { left, right, top, bottom };
}

function nodeBounds(node: NotaNode): Bounds {
  const size = nodeSize(node);
  const overflow = overflowFor(node, size);
  return {
    x: node.position.x - overflow.left,
    y: node.position.y - overflow.top,
    width: size.width + overflow.left + overflow.right,
    height: size.height + overflow.top + overflow.bottom,
  };
}

function handlePoint(node: NotaNode, handleId: string | null | undefined, fallback: 'source' | 'target') {
  const size = nodeSize(node);
  const x = node.position.x;
  const y = node.position.y;
  const side = (handleId ?? '').split('-')[0];
  switch (side) {
    case 'top':
      return { x: x + size.width / 2, y, position: Position.Top };
    case 'bottom':
      return { x: x + size.width / 2, y: y + size.height, position: Position.Bottom };
    case 'left':
      return { x, y: y + size.height / 2, position: Position.Left };
    case 'right':
      return { x: x + size.width, y: y + size.height / 2, position: Position.Right };
    default: {
      // tebak sisi bila handle tidak diketahui
      return fallback === 'source'
        ? { x: x + size.width, y: y + size.height / 2, position: Position.Right }
        : { x, y: y + size.height / 2, position: Position.Left };
    }
  }
}

export interface SceneResult {
  svg: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export function buildScene(nodes: NotaNode[], edges: NotaEdge[], options: ExportOptions = {}): SceneResult {
  const padding = options.padding ?? 40;
  const baseTheme = options.theme ?? (options.background === 'dark' ? DARK_THEME : LIGHT_THEME);
  // warna latar dipakai juga oleh elemen transparan (mis. isian segitiga generalisasi)
  const theme: RenderTheme =
    options.background === 'transparent'
      ? baseTheme
      : { ...baseTheme, canvasBg: options.background === 'dark' ? '#0b1120' : '#ffffff' };

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const boxes = nodes.map(nodeBounds);
  const minX = boxes.length ? Math.min(...boxes.map((b) => b.x)) : 0;
  const minY = boxes.length ? Math.min(...boxes.map((b) => b.y)) : 0;
  const maxX = boxes.length ? Math.max(...boxes.map((b) => b.x + b.width)) : 0;
  const maxY = boxes.length ? Math.max(...boxes.map((b) => b.y + b.height)) : 0;

  const width = Math.max(80, Math.ceil(maxX - minX + padding * 2));
  const height = Math.max(60, Math.ceil(maxY - minY + padding * 2));
  const offsetX = Math.round(-minX + padding);
  const offsetY = Math.round(-minY + padding);

  const bg = options.background ?? (theme.mode === 'dark' ? 'dark' : 'white');
  const bgColor = bg === 'white' ? '#ffffff' : bg === 'dark' ? '#0b1120' : 'transparent';

  const edgeElements = edges.map((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return null;
    const from = handlePoint(source, edge.sourceHandle, 'source');
    const to = handlePoint(target, edge.targetHandle, 'target');
    const path = buildEdgePath(edge.data?.pathStyle ?? 'bezier', {
      sourceX: from.x,
      sourceY: from.y,
      sourcePosition: from.position,
      targetX: to.x,
      targetY: to.y,
      targetPosition: to.position,
    });
    return <EdgeScene key={edge.id} data={edge.data ?? { kind: 'gen.arrow' }} path={path} theme={theme} static />;
  });

  const nodeElements = nodes.map((node) => {
    const size = nodeSize(node);
    const style = shapeStyle(node.data.shape, node.data, theme.mode);
    const renderer = SHAPE_RENDERERS[node.data.shape] ?? SHAPE_RENDERERS.bpmnTask;
    return (
      <g key={node.id} transform={`translate(${node.position.x},${node.position.y})`}>
        {renderer({ w: size.width, h: size.height, data: node.data, style, selected: false, preview: false })}
      </g>
    );
  });

  const scene = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={theme.font}
    >
      {bgColor !== 'transparent' ? <rect x={0} y={0} width={width} height={height} fill={bgColor} /> : null}
      <g transform={`translate(${offsetX},${offsetY})`}>
        {edgeElements}
        {nodeElements}
      </g>
    </svg>
  );

  return { svg: renderToStaticMarkup(scene), width, height, offsetX, offsetY };
}

/* --------------------------------------------------------------- unduhan - */

export function download(filename: string, content: string | Blob, mime = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFileName(name: string, extension: string): string {
  const base = (name || 'diagram').replace(/[^\w\d-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'diagram'}.${extension}`;
}

export function exportSvg(nodes: NotaNode[], edges: NotaEdge[], name: string, options: ExportOptions = {}) {
  const scene = buildScene(nodes, edges, options);
  download(safeFileName(name, 'svg'), `<?xml version="1.0" encoding="UTF-8"?>\n${scene.svg}`, 'image/svg+xml');
  return scene;
}

export async function svgToPngBlob(svg: string, width: number, height: number, scale = 2): Promise<Blob> {
  const image = new Image();
  image.decoding = 'sync';
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Gagal memuat gambar SVG'));
    image.src = encoded;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal membuat PNG'));
    }, 'image/png');
  });
}

export async function exportPng(nodes: NotaNode[], edges: NotaEdge[], name: string, options: ExportOptions = {}) {
  const scale = options.scale ?? 2;
  const scene = buildScene(nodes, edges, options);
  const blob = await svgToPngBlob(scene.svg, scene.width, scene.height, scale);
  download(safeFileName(name, 'png'), blob, 'image/png');
}

/* ------------------------------------------------------------------ JSON - */

export interface SerializedDoc {
  app: 'nota-flow';
  version: 1;
  name: string;
  kind: DiagramKind;
  nodes: NotaNode[];
  edges: NotaEdge[];
}

export function serializeDoc(doc: DiagramDoc): string {
  const payload: SerializedDoc = {
    app: 'nota-flow',
    version: 1,
    name: doc.name,
    kind: doc.kind,
    nodes: doc.nodes.map((n) => ({
      id: n.id,
      type: 'nota',
      position: n.position,
      width: n.width,
      height: n.height,
      style: n.style,
      data: n.data,
      zIndex: n.zIndex,
    })),
    edges: doc.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'nota',
      data: e.data,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function parseDoc(text: string): { name?: string; kind?: DiagramKind; nodes: NotaNode[]; edges: NotaEdge[] } {
  const raw = JSON.parse(text) as Partial<SerializedDoc> & { nodes?: NotaNode[]; edges?: NotaEdge[] };
  if (!raw || !Array.isArray(raw.nodes)) throw new Error('Berkas tidak dikenali');
  const kind = raw.kind && ['bpmn', 'usecase', 'activity', 'class', 'dfd'].includes(raw.kind) ? raw.kind : 'bpmn';
  return {
    name: raw.name ?? 'Diagram Impor',
    kind: kind as DiagramKind,
    nodes: raw.nodes.map((n) => ({ ...n, type: 'nota', selected: false })),
    edges: (raw.edges ?? []).map((e) => ({ ...e, type: 'nota', selected: false })),
  };
}
