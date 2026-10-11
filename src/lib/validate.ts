import type { DiagramKind, Issue, NotaEdge, NotaNode, ShapeKey } from '../types';
import { SHAPE_META } from '../shapes';
import { nodeSize } from './layout';

function label(node: NotaNode): string {
  const text = (node.data?.label ?? '').trim();
  if (text) return text.split('\n')[0];
  return SHAPE_META[node.data.shape]?.label ?? 'Elemen';
}

function issue(
  level: Issue['level'],
  message: string,
  ref: { nodeId?: string; edgeId?: string } = {},
  hint?: string,
): Issue {
  return {
    id: `${level}-${message}-${ref.nodeId ?? ref.edgeId ?? Math.random().toString(36).slice(2, 7)}`,
    level,
    message,
    hint,
    ...ref,
  };
}

const FLOW_LIKE: ShapeKey[] = [
  'bpmnTask',
  'bpmnUserTask',
  'bpmnServiceTask',
  'bpmnScriptTask',
  'bpmnSendTask',
  'bpmnReceiveTask',
  'bpmnManualTask',
  'bpmnBusinessRuleTask',
  'bpmnSubProcess',
  'bpmnCallActivity',
];

const GATEWAYS: ShapeKey[] = [
  'bpmnGatewayExclusive',
  'bpmnGatewayParallel',
  'bpmnGatewayInclusive',
  'bpmnGatewayEventBased',
];

const EVENTS: ShapeKey[] = [
  'bpmnStart',
  'bpmnEnd',
  'bpmnIntermediateCatch',
  'bpmnIntermediateThrow',
  'bpmnBoundaryEvent',
];

export function validateDiagram(nodes: NotaNode[], edges: NotaEdge[], kind: DiagramKind): Issue[] {
  const issues: Issue[] = [];
  if (!nodes.length) return issues;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const outgoing = new Map<string, NotaEdge[]>();
  const incoming = new Map<string, NotaEdge[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push(issue('error', 'Ada konektor yang menunjuk elemen yang sudah dihapus', { edgeId: edge.id }));
      continue;
    }
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }

  const isAnnotation = (n: NotaNode) =>
    n.data.shape === 'note' || n.data.shape === 'textBlock' || n.data.shape === 'bpmnGroup';

  // 1. elemen tak terhubung
  for (const node of nodes) {
    if (isAnnotation(node)) continue;
    if (kind === 'bpmn' && (node.data.shape === 'bpmnPool' || node.data.shape === 'bpmnLane')) continue;
    if (kind === 'usecase' && node.data.shape === 'ucBoundary') continue;
    if (kind === 'activity' && node.data.shape === 'actPartition') continue;
    if (kind === 'class' && node.data.shape === 'clsPackage') continue;
    const connected = (outgoing.get(node.id)?.length ?? 0) + (incoming.get(node.id)?.length ?? 0);
    if (connected === 0) {
      issues.push(issue('warning', `"${label(node)}" belum terhubung ke elemen lain`, { nodeId: node.id }));
    }
  }

  if (kind === 'bpmn') {
    const starts = nodes.filter((n) => n.data.shape === 'bpmnStart');
    if (starts.length === 0) {
      issues.push(issue('error', 'Diagram BPMN belum punya Start Event', {}, 'Tambahkan Start Event sebagai awal alur.'));
    }
    for (const node of nodes) {
      const shape = node.data.shape;
      const out = outgoing.get(node.id)?.length ?? 0;
      const inc = incoming.get(node.id)?.length ?? 0;
      if (shape === 'bpmnStart' && inc > 0) {
        issues.push(issue('error', `Start Event "${label(node)}" tidak boleh punya alur masuk`, { nodeId: node.id }));
      }
      if (shape === 'bpmnEnd' && out > 0) {
        issues.push(issue('error', `End Event "${label(node)}" tidak boleh punya alur keluar`, { nodeId: node.id }));
      }
      if (shape === 'bpmnStart' && out === 0) {
        issues.push(issue('warning', `Start Event "${label(node)}" belum terhubung ke aktivitas`, { nodeId: node.id }));
      }
      if ((FLOW_LIKE.includes(shape) || GATEWAYS.includes(shape)) && out === 0 && inc > 0) {
        issues.push(issue('warning', `"${label(node)}" tidak punya alur keluar (alur buntu)`, { nodeId: node.id }));
      }
      if (GATEWAYS.includes(shape)) {
        if (out < 2 && inc < 2 && out + inc < 3) {
          issues.push(
            issue('info', `Gateway "${label(node)}" sebaiknya punya minimal 2 alur keluar atau 2 alur masuk`, { nodeId: node.id }),
          );
        }
      }
      if (EVENTS.includes(shape) && shape !== 'bpmnStart' && out === 0 && shape !== 'bpmnEnd' && shape !== 'bpmnIntermediateThrow' && shape !== 'bpmnBoundaryEvent') {
        issues.push(issue('warning', `Event "${label(node)}" belum punya alur keluar`, { nodeId: node.id }));
      }
      if (node.data.shape === 'bpmnGatewayExclusive' && out > 1) {
        const hasDefault = (outgoing.get(node.id) ?? []).some((e) => e.data?.kind === 'bpmn.default');
        const conditions = (outgoing.get(node.id) ?? []).filter((e) => (e.data?.label ?? '').trim().length > 0);
        if (!hasDefault && conditions.length < out) {
          issues.push(
            issue('info', `Gateway XOR "${label(node)}" punya beberapa alur keluar tanpa kondisi/label`, { nodeId: node.id }, 'Beri label kondisi pada tiap alur, misalnya [Ya] / [Tidak].'),
          );
        }
      }
    }
  }

  if (kind === 'usecase') {
    const boundaries = nodes.filter((n) => n.data.shape === 'ucBoundary');
    if (boundaries.length === 0) {
      issues.push(issue('info', 'Belum ada System Boundary untuk membatasi ruang lingkup sistem'));
    }
    for (const node of nodes) {
      if (node.data.shape !== 'ucActor') continue;
      if ((outgoing.get(node.id)?.length ?? 0) + (incoming.get(node.id)?.length ?? 0) === 0) {
        issues.push(issue('warning', `Aktor "${label(node)}" belum berelasi dengan use case mana pun`, { nodeId: node.id }));
      }
    }
    for (const node of nodes) {
      if (node.data.shape !== 'ucUseCase') continue;
      if (boundaries.length) {
        const size = nodeSize(node);
        const cx = node.position.x + size.width / 2;
        const cy = node.position.y + size.height / 2;
        const inside = boundaries.some((b) => {
          const bs = nodeSize(b);
          return cx >= b.position.x && cx <= b.position.x + bs.width && cy >= b.position.y && cy <= b.position.y + bs.height;
        });
        if (!inside) {
          issues.push(issue('info', `Use case "${label(node)}" berada di luar System Boundary`, { nodeId: node.id }));
        }
      }
    }
  }

  if (kind === 'activity') {
    const initials = nodes.filter((n) => n.data.shape === 'actInitial');
    if (initials.length === 0) {
      issues.push(issue('error', 'Activity Diagram harus punya satu Initial Node', {}, 'Tambahkan Initial Node (lingkaran penuh).'));
    } else if (initials.length > 1) {
      issues.push(issue('warning', `Ada ${initials.length} Initial Node — biasanya cukup satu`, { nodeId: initials[1].id }));
    }
    for (const node of nodes) {
      const shape = node.data.shape;
      const out = outgoing.get(node.id)?.length ?? 0;
      const inc = incoming.get(node.id)?.length ?? 0;
      if (shape === 'actFinal' && out > 0) {
        issues.push(issue('error', `Activity Final "${label(node)}" tidak boleh punya alur keluar`, { nodeId: node.id }));
      }
      if (shape === 'actDecision' && out < 2) {
        issues.push(issue('warning', `Decision "${label(node)}" punya kurang dari 2 alur keluar`, { nodeId: node.id }));
      }
      if (shape === 'actFork' && out < 2) {
        issues.push(issue('warning', 'Fork sebaiknya bercabang ke minimal 2 alur', { nodeId: node.id }));
      }
      if (shape === 'actJoin' && inc < 2) {
        issues.push(issue('warning', 'Join sebaiknya menggabungkan minimal 2 alur', { nodeId: node.id }));
      }
      if ((shape === 'actAction' || shape === 'actDecision' || shape === 'actMerge') && out === 0 && inc > 0) {
        issues.push(issue('warning', `"${label(node)}" adalah alur buntu (tidak ada kelanjutan)`, { nodeId: node.id }));
      }
    }
  }

  if (kind === 'class') {
    for (const node of nodes) {
      if (node.data.shape === 'clsPackage') continue;
      if (!(node.data.label ?? '').trim()) {
        issues.push(issue('error', 'Ada class tanpa nama', { nodeId: node.id }));
      }
      const attrs = node.data.attributes ?? [];
      if (node.data.shape !== 'clsEnum' && (node.data.shape === 'clsClass' || node.data.shape === 'clsAbstract') && attrs.length === 0) {
        issues.push(issue('info', `Class "${label(node)}" belum punya atribut`, { nodeId: node.id }));
      }
    }
    const classShapes: ShapeKey[] = ['clsClass', 'clsInterface', 'clsAbstract', 'clsEnum'];
    for (const edge of edges) {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) continue;
      const edgeKind = edge.data?.kind ?? '';
      if (edgeKind.startsWith('cls.') && (!classShapes.includes(source.data.shape) || !classShapes.includes(target.data.shape))) {
        issues.push(issue('info', 'Relasi class menghubungkan elemen yang bukan class', { edgeId: edge.id }));
      }
    }
  }

  if (kind === 'dfd') {
    const processes = nodes.filter((n) => n.data.shape === 'dfdProcess' || n.data.shape === 'dfdProcessCircle');
    if (processes.length === 0) {
      issues.push(issue('error', 'DFD harus punya minimal satu proses', {}, 'Tambahkan node Proses.'));
    }
    const numbers = new Map<string, number>();
    for (const process of processes) {
      const number = (process.data.number ?? '').trim();
      if (!number) {
        issues.push(issue('info', `Proses "${label(process)}" belum diberi nomor`, { nodeId: process.id }, 'DFD biasanya menomori proses (1.0, 2.0, ...).'));
      } else {
        numbers.set(number, (numbers.get(number) ?? 0) + 1);
      }
    }
    for (const [number, count] of numbers) {
      if (count > 1) issues.push(issue('warning', `Nomor proses ${number} dipakai lebih dari satu kali`));
    }
    for (const node of nodes) {
      const shape = node.data.shape;
      if (shape !== 'dfdProcess' && shape !== 'dfdProcessCircle') continue;
      const inc = (incoming.get(node.id) ?? []).filter((e) => !e.data?.kind?.startsWith('bpmn')).length;
      const out = (outgoing.get(node.id) ?? []).length;
      if (inc === 0) issues.push(issue('warning', `Proses "${label(node)}" belum punya aliran data masuk`, { nodeId: node.id }));
      if (out === 0) issues.push(issue('warning', `Proses "${label(node)}" belum punya aliran data keluar`, { nodeId: node.id }));
    }
    for (const edge of edges) {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) continue;
      const sShape = source.data.shape;
      const tShape = target.data.shape;
      const isExternal = (s: ShapeKey) => s === 'dfdExternal';
      const isStore = (s: ShapeKey) => s === 'dfdDataStore' || s === 'dfdDataStoreAlt';
      if (isExternal(sShape) && isExternal(tShape)) {
        issues.push(issue('error', `Entitas eksternal "${label(source)}" tidak boleh mengalir langsung ke "${label(target)}"`, { edgeId: edge.id }, 'Aliran harus melewati proses.'));
      }
      if ((isExternal(sShape) && isStore(tShape)) || (isStore(sShape) && isExternal(tShape))) {
        issues.push(
          issue('error', `${label(source)} dan ${label(target)} tidak boleh terhubung langsung`, { edgeId: edge.id }, 'Data store hanya boleh terhubung dengan proses.'),
        );
      }
      if (!(edge.data?.label ?? '').trim()) {
        issues.push(issue('info', 'Ada aliran data tanpa nama', { edgeId: edge.id }, 'Beri nama data yang mengalir, misalnya "data pesanan".'));
      }
    }
    const stores = nodes.filter((n) => n.data.shape === 'dfdDataStore' || n.data.shape === 'dfdDataStoreAlt');
    const storeNumbers = new Map<string, number>();
    for (const store of stores) {
      const number = (store.data.number ?? '').trim();
      if (number) storeNumbers.set(number, (storeNumbers.get(number) ?? 0) + 1);
    }
    for (const [number, count] of storeNumbers) {
      if (count > 1) issues.push(issue('warning', `Nomor data store ${number} dipakai lebih dari satu kali`));
    }
  }

  return issues;
}

export function summarize(issues: Issue[]) {
  return {
    error: issues.filter((i) => i.level === 'error').length,
    warning: issues.filter((i) => i.level === 'warning').length,
    info: issues.filter((i) => i.level === 'info').length,
  };
}
