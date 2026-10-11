import dagre from 'dagre';
import type { NotaEdge, NotaNode, ShapeKey } from '../types';
import { SHAPE_META } from '../shapes';

export type Direction = 'TB' | 'LR' | 'BT' | 'RL';

/** Bentuk yang tidak diikutkan dalam perhitungan auto-layout (wadah & anotasi). */
export const NON_FLOW_SHAPES: ShapeKey[] = [
  'bpmnPool',
  'bpmnLane',
  'bpmnGroup',
  'ucBoundary',
  'actPartition',
  'note',
  'textBlock',
];

/** Wadah yang perlu disesuaikan ukurannya mengikuti isinya. */
export const CONTAINER_SHAPES: ShapeKey[] = ['bpmnPool', 'bpmnLane', 'ucBoundary', 'actPartition', 'bpmnGroup'];

export function isContainerShape(shape: ShapeKey): boolean {
  return (
    shape === 'bpmnPool' ||
    shape === 'bpmnLane' ||
    shape === 'ucBoundary' ||
    shape === 'actPartition' ||
    shape === 'bpmnGroup' ||
    shape === 'bpmnSubProcess'
  );
}

export function nodeSize(node: NotaNode): { width: number; height: number } {
  const measured = (node as { measured?: { width?: number; height?: number } }).measured;
  const meta = SHAPE_META[node.data.shape];
  const width = node.width ?? measured?.width ?? meta?.width ?? 120;
  const height = node.height ?? measured?.height ?? meta?.height ?? 60;
  return { width, height };
}

export interface LayoutOptions {
  direction?: Direction;
  nodeSep?: number;
  rankSep?: number;
  /** id node yang diikutkan; bila kosong semua node alur */
  onlyNodeIds?: string[];
}

export function layoutGraph(nodes: NotaNode[], edges: NotaEdge[], options: LayoutOptions = {}): NotaNode[] {
  const { direction = 'LR', nodeSep = 60, rankSep = 90 } = options;
  const include = new Set(
    options.onlyNodeIds ?? nodes.filter((n) => !NON_FLOW_SHAPES.includes(n.data.shape)).map((n) => n.id),
  );
  const flowNodes = nodes.filter((n) => include.has(n.id) && !NON_FLOW_SHAPES.includes(n.data.shape));
  if (flowNodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph({ multigraph: true, compound: false });
  g.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep, marginx: 20, marginy: 20, ranker: 'network-simplex' });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of flowNodes) {
    const { width, height } = nodeSize(node);
    g.setNode(node.id, { width, height });
  }

  const seen = new Set<string>();
  for (const edge of edges) {
    if (!include.has(edge.source) || !include.has(edge.target)) continue;
    if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) continue;
    const key = `${edge.source}->${edge.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    g.setEdge(edge.source, edge.target, {}, key);
  }

  dagre.layout(g);

  const positioned = new Map<string, { x: number; y: number }>();
  for (const id of g.nodes()) {
    const node = g.node(id) as { x: number; y: number; width: number; height: number };
    positioned.set(id, { x: Math.round(node.x - node.width / 2), y: Math.round(node.y - node.height / 2) });
  }

  return nodes.map((node) => {
    const pos = positioned.get(node.id);
    if (!pos) return node;
    return { ...node, position: pos };
  });
}

type Side = 'top' | 'right' | 'bottom' | 'left';

/** Tentukan sisi handle terbaik untuk tiap konektor berdasarkan posisi relatif node. */
export function assignHandles(nodes: NotaNode[], edges: NotaEdge[]): NotaEdge[] {
  const map = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((edge) => {
    const source = map.get(edge.source);
    const target = map.get(edge.target);
    if (!source || !target) return edge;
    const a = nodeSize(source);
    const b = nodeSize(target);
    const ax = source.position.x + a.width / 2;
    const ay = source.position.y + a.height / 2;
    const bx = target.position.x + b.width / 2;
    const by = target.position.y + b.height / 2;

    const { sourceSide, targetSide } = bestSides(ax, ay, bx, by, a, b);
    const sourceHandle = `${sourceSide}-s`;
    const targetHandle = `${targetSide}-t`;
    if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) return edge;
    return { ...edge, sourceHandle, targetHandle };
  });
}

export function bestSides(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  a: { width: number; height: number },
  b: { width: number; height: number },
): { sourceSide: Side; targetSide: Side } {
  const dx = bx - ax;
  const dy = by - ay;
  // bandingkan jarak tepi secara horizontal vs vertikal
  const gapX = Math.abs(dx) - (a.width + b.width) / 2;
  const gapY = Math.abs(dy) - (a.height + b.height) / 2;

  if (gapX >= gapY) {
    if (dx >= 0) return { sourceSide: 'right', targetSide: 'left' };
    return { sourceSide: 'left', targetSide: 'right' };
  }
  if (dy >= 0) return { sourceSide: 'bottom', targetSide: 'top' };
  return { sourceSide: 'top', targetSide: 'bottom' };
}


/* ------------------------------------------------------------ wadah ------- */

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function boxOf(node: NotaNode, size = nodeSize(node)): Box {
  return { x: node.position.x, y: node.position.y, width: size.width, height: size.height };
}

function containsPoint(box: Box, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

function containsBox(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** Wadah yang dipakai sebagai pengelompokan saat auto-layout. */
export const LAYOUT_CONTAINERS: ShapeKey[] = ['bpmnPool', 'bpmnLane', 'ucBoundary', 'actPartition'];

/**
 * Tentukan wadah induk tiap elemen berdasarkan posisi saat ini.
 * Induk = wadah terkecil yang memuat titik pusat elemen (wadah bertingkat
 * seperti lane di dalam pool dideteksi lewat aturan tambahan).
 */
export function computeContainerParents(nodes: NotaNode[]): Map<string, string> {
  const containers = nodes.filter((n) => CONTAINER_SHAPES.includes(n.data.shape));
  const parents = new Map<string, string>();

  for (const node of nodes) {
    if (CONTAINER_SHAPES.includes(node.data.shape)) {
      // wadah: induknya adalah wadah terkecil yang memuat seluruh kotaknya;
      // bila tidak ada (mis. wadah digeser sedikit oleh pengguna), pakai
      // wadah terkecil yang memuat titik pusatnya agar tetap terdeteksi
      const size = nodeSize(node);
      const box = boxOf(node, size);
      const cx = node.position.x + size.width / 2;
      const cy = node.position.y + size.height / 2;
      let best: NotaNode | null = null;
      let bestArea = Infinity;
      let fallback: NotaNode | null = null;
      let fallbackArea = Infinity;
      for (const container of containers) {
        if (container.id === node.id) continue;
        const csize = nodeSize(container);
        const cbox = boxOf(container, csize);
        const area = csize.width * csize.height;
        if (containsBox(cbox, box)) {
          if (area < bestArea) {
            best = container;
            bestArea = area;
          }
        } else if (containsPoint(cbox, cx, cy) && area < fallbackArea) {
          fallback = container;
          fallbackArea = area;
        }
      }
      const parent = best ?? fallback;
      if (parent) parents.set(node.id, parent.id);
      continue;
    }

    // elemen biasa: induk = wadah terkecil yang memuat titik pusatnya
    const size = nodeSize(node);
    const cx = node.position.x + size.width / 2;
    const cy = node.position.y + size.height / 2;
    let best: NotaNode | null = null;
    let bestArea = Infinity;
    for (const container of containers) {
      const csize = nodeSize(container);
      if (!containsPoint(boxOf(container, csize), cx, cy)) continue;
      const area = csize.width * csize.height;
      if (area < bestArea) {
        best = container;
        bestArea = area;
      }
    }
    if (best) parents.set(node.id, best.id);
  }

  return parents;
}

/** Semua keturunan sebuah wadah (langsung maupun bertingkat). */
function descendantsOf(containerId: string, parents: Map<string, string>): string[] {
  const result: string[] = [];
  const queue = [...parents.entries()].filter(([, parent]) => parent === containerId).map(([child]) => child);
  while (queue.length) {
    const id = queue.shift()!;
    if (result.includes(id)) continue;
    result.push(id);
    queue.push(...[...parents.entries()].filter(([, parent]) => parent === id).map(([child]) => child));
  }
  return result;
}

/**
 * Susun ulang wadah (pool, lane, partisi, boundary) agar membungkus isinya.
 * `parents` opsional — pakai hasil `computeContainerParents` dari posisi
 * sebelum penataan agar keanggotaan tetap konsisten.
 */
export function refitContainers(nodes: NotaNode[], precomputedParents?: Map<string, string>): NotaNode[] {
  const containers = nodes.filter((n) => CONTAINER_SHAPES.includes(n.data.shape));
  if (!containers.length) return nodes;

  const working = new Map<string, NotaNode>(nodes.map((n) => [n.id, { ...n, style: { ...n.style } }]));
  const parents = precomputedParents ?? computeContainerParents(nodes);

  // sesuaikan dari wadah terdalam (paling kecil) ke terluar
  const ordered = [...containers].sort((a, b) => {
    const sa = nodeSize(a);
    const sb = nodeSize(b);
    return sa.width * sa.height - sb.width * sb.height;
  });

  for (const container of ordered) {
    const members = descendantsOf(container.id, parents).filter((id) => {
      const [direct] = [parents.get(id)];
      // langsung atau turunan tetap ikut dihitung lewat kotaknya
      return !!direct;
    });
    if (!members.length) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of members) {
      const member = working.get(id);
      if (!member) continue;
      const size = nodeSize(member);
      minX = Math.min(minX, member.position.x);
      minY = Math.min(minY, member.position.y);
      maxX = Math.max(maxX, member.position.x + size.width);
      maxY = Math.max(maxY, member.position.y + size.height);
    }
    if (!Number.isFinite(minX)) continue;

    const shape = container.data.shape;
    const band = shape === 'bpmnPool' || shape === 'bpmnLane' ? 46 : shape === 'actPartition' ? 44 : 34;
    const padTop = shape === 'ucBoundary' ? 62 : shape === 'actPartition' ? 58 : band;
    const minSize = shape === 'bpmnLane' ? { width: 300, height: 90 } : { width: 240, height: 130 };
    const width = Math.max(minSize.width, Math.round(maxX - minX + band + 34));
    const height = Math.max(minSize.height, Math.round(maxY - minY + padTop + 34));
    const current = working.get(container.id)!;
    working.set(container.id, {
      ...current,
      position: { x: Math.round(minX - band), y: Math.round(minY - padTop) },
      width,
      height,
      style: { ...current.style, width, height },
    });
  }

  return nodes.map((node) => {
    const updated = working.get(node.id);
    if (!updated) return node;
    return {
      ...node,
      position: updated.position,
      width: updated.width ?? node.width,
      height: updated.height ?? node.height,
      style: { ...node.style, width: updated.width ?? node.style?.width, height: updated.height ?? node.style?.height },
    };
  });
}

/**
 * Tata letak otomatis yang sadar wadah.
 *
 * Diagram dikelompokkan menurut wadah teratas (pool/lane/boundary/partisi).
 * Isi tiap kelompok ditata terpisah agar tidak tercampur, wadah disesuaikan
 * ukurannya, lalu kelompok-kelompok ditumpuk berurutan sehingga tidak saling
 * menimpa — sesuai konvensi BPMN/UML (pool dan swimlane bertumpuk).
 */
export function layoutAll(nodes: NotaNode[], edges: NotaEdge[], options: LayoutOptions = {}): NotaNode[] {
  const direction = options.direction ?? 'LR';
  const containers = nodes.filter((n) => LAYOUT_CONTAINERS.includes(n.data.shape));
  if (!containers.length) return layoutGraph(nodes, edges, options);

  const parents = computeContainerParents(nodes);
  const roots = containers.filter((c) => !parents.has(c.id));

  // kelompok: tiap wadah teratas + isinya, ditambah elemen bebas di luar wadah
  const groups: { root: string | null; members: string[] }[] = [];
  const grouped = new Set<string>();
  for (const root of roots) {
    const descendants = descendantsOf(root.id, parents);
    groups.push({ root: root.id, members: [root.id, ...descendants] });
    grouped.add(root.id);
    for (const id of descendants) grouped.add(id);
  }
  const free = nodes
    .filter((n) => !grouped.has(n.id) && !LAYOUT_CONTAINERS.includes(n.data.shape))
    .map((n) => n.id);
  if (free.length) groups.push({ root: null, members: free });

  const gap = 80;
  let result = nodes;

  const boxOfIds = (ids: string[]): Box => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      const node = result.find((n) => n.id === id);
      if (!node) continue;
      const size = nodeSize(node);
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + size.width);
      maxY = Math.max(maxY, node.position.y + size.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const translate = (ids: string[], dx: number, dy: number) => {
    const set = new Set(ids);
    result = result.map((node) =>
      set.has(node.id)
        ? { ...node, position: { x: Math.round(node.position.x + dx), y: Math.round(node.position.y + dy) } }
        : node,
    );
  };

  // 1. tata isi tiap kelompok, lalu sesuaikan ukuran wadahnya
  for (const group of groups) {
    const flowIds = group.members.filter((id) => {
      const node = nodes.find((n) => n.id === id);
      return node && !LAYOUT_CONTAINERS.includes(node.data.shape);
    });
    if (!flowIds.length) continue;
    result = layoutGraph(result, edges, { direction, onlyNodeIds: flowIds, nodeSep: options.nodeSep, rankSep: options.rankSep });
    const content = boxOfIds(group.members);
    if (!Number.isFinite(content.x)) continue;
    translate(group.members, -content.x, -content.y);
    // wadah (termasuk yang bertingkat) menyesuaikan isinya; setelah ini
    // kotak wadah sudah membungkus seluruh isi kelompok
    result = refitContainers(result, parents);
    const box = boxOfIds(group.members);
    translate(group.members, -box.x, -box.y);
  }

  // 2. tumpuk kelompok secara berurutan agar tidak saling menimpa
  let cursorY = 0;
  const ordered = [...groups].sort((a, b) => boxOfIds(a.members).y - boxOfIds(b.members).y);
  for (const group of ordered) {
    const box = boxOfIds(group.members);
    if (!Number.isFinite(box.x)) continue;
    translate(group.members, -box.x, cursorY - box.y);
    cursorY += box.height + gap;
  }

  return result;
}

/* ------------------------------------------------------------ perataan --- */

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export function alignNodes(nodes: NotaNode[], mode: AlignMode): NotaNode[] {
  const selected = nodes.filter((n) => n.selected);
  if (selected.length < 2) return nodes;
  const boxes = selected.map((n) => ({ node: n, size: nodeSize(n) }));
  const minX = Math.min(...boxes.map((b) => b.node.position.x));
  const maxX = Math.max(...boxes.map((b) => b.node.position.x + b.size.width));
  const minY = Math.min(...boxes.map((b) => b.node.position.y));
  const maxY = Math.max(...boxes.map((b) => b.node.position.y + b.size.height));

  return nodes.map((node) => {
    const box = boxes.find((b) => b.node.id === node.id);
    if (!box) return node;
    const { width, height } = box.size;
    switch (mode) {
      case 'left':
        return { ...node, position: { ...node.position, x: minX } };
      case 'right':
        return { ...node, position: { ...node.position, x: maxX - width } };
      case 'center':
        return { ...node, position: { ...node.position, x: (minX + maxX) / 2 - width / 2 } };
      case 'top':
        return { ...node, position: { ...node.position, y: minY } };
      case 'bottom':
        return { ...node, position: { ...node.position, y: maxY - height } };
      case 'middle':
        return { ...node, position: { ...node.position, y: (minY + maxY) / 2 - height / 2 } };
      default:
        return node;
    }
  });
}

export function distributeNodes(nodes: NotaNode[], axis: 'horizontal' | 'vertical', gap = 40): NotaNode[] {
  const selected = nodes.filter((n) => n.selected);
  if (selected.length < 3) return nodes;
  const boxes = selected
    .map((n) => ({ node: n, size: nodeSize(n) }))
    .sort((a, b) =>
      axis === 'horizontal' ? a.node.position.x - b.node.position.x : a.node.position.y - b.node.position.y,
    );
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  const totalSize = boxes.reduce((sum, b) => sum + (axis === 'horizontal' ? b.size.width : b.size.height), 0);
  const span =
    axis === 'horizontal'
      ? last.node.position.x + last.size.width - first.node.position.x
      : last.node.position.y + last.size.height - first.node.position.y;
  const step = (span - totalSize) / Math.max(1, boxes.length - 1);

  let cursor = axis === 'horizontal' ? first.node.position.x : first.node.position.y;
  const positions = new Map<string, number>();
  for (const box of boxes) {
    positions.set(box.node.id, cursor);
    cursor += (axis === 'horizontal' ? box.size.width : box.size.height) + Math.max(step, gap * 0.2);
  }

  return nodes.map((node) => {
    const value = positions.get(node.id);
    if (value === undefined) return node;
    return axis === 'horizontal'
      ? { ...node, position: { ...node.position, x: Math.round(value) } }
      : { ...node, position: { ...node.position, y: Math.round(value) } };
  });
}
