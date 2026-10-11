import { describe, expect, it } from 'vitest';
import { TEMPLATES, templatesFor } from '../lib/templates';
import { validateDiagram, summarize } from '../lib/validate';
import { CONTAINER_SHAPES, assignHandles, alignNodes, distributeNodes, layoutGraph, nodeSize, NON_FLOW_SHAPES } from '../lib/layout';
import { defaultNodeData } from '../shapes';
import { useDiagram as useDiagramTest } from '../store/useDiagram';
import type { DiagramKind, NotaEdge, NotaNode } from '../types';

const ALL_KINDS: DiagramKind[] = ['bpmn', 'usecase', 'activity', 'class', 'dfd'];

function makeNode(id: string, position: { x: number; y: number }, shape: Parameters<typeof defaultNodeData>[0] = 'bpmnTask'): NotaNode {
  return {
    id,
    type: 'nota',
    position,
    width: 120,
    height: 60,
    data: { ...defaultNodeData(shape), label: id },
  } as NotaNode;
}

describe('template', () => {
  it('tersedia untuk semua jenis diagram', () => {
    for (const kind of ALL_KINDS) {
      expect(templatesFor(kind).length, `template untuk ${kind}`).toBeGreaterThan(0);
    }
  });

  it('semua konektor mengarah ke elemen yang ada', () => {
    for (const template of TEMPLATES) {
      const { nodes, edges } = template.build();
      const ids = new Set(nodes.map((n) => n.id));
      expect(new Set(ids).size).toBe(nodes.length);
      for (const edge of edges) {
        expect(ids.has(edge.source), `${template.id}: ${edge.source}`).toBe(true);
        expect(ids.has(edge.target), `${template.id}: ${edge.target}`).toBe(true);
        expect(edge.data?.kind, `${template.id}: ${edge.id} tanpa jenis`).toBeTruthy();
      }
    }
  });

  it('tidak ada elemen yang saling menimpa', () => {
    for (const template of TEMPLATES) {
      const { nodes } = template.build();
      const flow = nodes.filter((n) => !NON_FLOW_SHAPES.includes(n.data.shape));
      for (let i = 0; i < flow.length; i += 1) {
        for (let j = i + 1; j < flow.length; j += 1) {
          const a = flow[i];
          const b = flow[j];
          const sa = nodeSize(a);
          const sb = nodeSize(b);
          const overlap =
            a.position.x + sa.width - 6 > b.position.x &&
            b.position.x + sb.width - 6 > a.position.x &&
            a.position.y + sa.height - 6 > b.position.y &&
            b.position.y + sb.height - 6 > a.position.y;
          expect(overlap, `${template.id}: ${a.id} menimpa ${b.id}`).toBe(false);
        }
      }
    }
  });

  it('tanpa temuan error pada semua template', () => {
    for (const template of TEMPLATES) {
      const { nodes, edges } = template.build();
      const issues = validateDiagram(nodes, edges, template.kind);
      const errors = issues.filter((i) => i.level === 'error');
      expect(errors.map((e) => `${template.id}: ${e.message}`)).toEqual([]);
    }
  });
});

describe('layout', () => {
  it('layoutGraph mengatur posisi node mengikuti konektor', () => {
    const nodes = [makeNode('a', { x: 999, y: 999 }), makeNode('b', { x: 999, y: 999 })];
    const edges = [{ id: 'e1', source: 'a', target: 'b' } as NotaEdge];
    const result = layoutGraph(nodes, edges, { direction: 'LR' });
    const a = result.find((n) => n.id === 'a')!;
    const b = result.find((n) => n.id === 'b')!;
    expect(a.position.x).toBeLessThan(b.position.x);
    expect(Math.abs(a.position.y - b.position.y)).toBeLessThan(4);
  });

  it('assignHandles memilih sisi yang sesuai arah', () => {
    const nodes = [makeNode('a', { x: 0, y: 0 }), makeNode('b', { x: 400, y: 0 }), makeNode('c', { x: 0, y: 400 })];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' } as NotaEdge,
      { id: 'e2', source: 'a', target: 'c' } as NotaEdge,
    ];
    const [horizontal, vertical] = assignHandles(nodes, edges);
    expect(horizontal.sourceHandle).toBe('right-s');
    expect(horizontal.targetHandle).toBe('left-t');
    expect(vertical.sourceHandle).toBe('bottom-s');
    expect(vertical.targetHandle).toBe('top-t');
  });

  it('alignNodes & distributeNodes bekerja pada pilihan', () => {
    const nodes = [
      { ...makeNode('a', { x: 0, y: 0 }), selected: true },
      { ...makeNode('b', { x: 100, y: 40 }), selected: true },
      { ...makeNode('c', { x: 300, y: 90 }), selected: true },
    ];
    const aligned = alignNodes(nodes, 'top');
    expect(new Set(aligned.map((n) => n.position.y)).size).toBe(1);

    const spread = distributeNodes(aligned, 'horizontal');
    const xs = spread.map((n) => n.position.x).sort((p, q) => p - q);
    const gaps = [xs[1] - xs[0], xs[2] - xs[1]];
    expect(Math.abs(gaps[0] - gaps[1])).toBeLessThan(2);
  });
});

describe('validasi', () => {
  const node = (id: string, shape: Parameters<typeof defaultNodeData>[0], label = ''): NotaNode => ({
    ...makeNode(id, { x: 0, y: 0 }, shape),
    data: { ...defaultNodeData(shape), label },
  });

  it('menandai BPMN tanpa start event', () => {
    const nodes = [node('t', 'bpmnTask', 'Kerjakan')];
    const issues = validateDiagram(nodes, [], 'bpmn');
    expect(issues.some((i) => i.level === 'error' && i.message.includes('Start Event'))).toBe(true);
  });

  it('menandai alur keluar dari End Event', () => {
    const nodes = [node('s', 'bpmnStart'), node('e', 'bpmnEnd'), node('t', 'bpmnTask')];
    const edges: NotaEdge[] = [
      { id: '1', source: 's', target: 't', data: { kind: 'bpmn.sequence' } },
      { id: '2', source: 'e', target: 't', data: { kind: 'bpmn.sequence' } },
    ];
    const issues = validateDiagram(nodes, edges, 'bpmn');
    expect(issues.some((i) => i.level === 'error' && i.message.includes('End Event'))).toBe(true);
  });

  it('menandai DFD dengan aliran langsung entitas ke data store', () => {
    const nodes = [node('x', 'dfdExternal', 'Pelanggan'), node('d', 'dfdDataStore', 'Tabel')];
    const edges: NotaEdge[] = [{ id: '1', source: 'x', target: 'd', data: { kind: 'dfd.flow', label: 'data' } }];
    const issues = validateDiagram(nodes, edges, 'dfd');
    expect(issues.some((i) => i.level === 'error')).toBe(true);
  });

  it('activity diagram yang benar tidak menghasilkan error', () => {
    const nodes = [
      node('i', 'actInitial'),
      node('a', 'actAction', 'Mulai kerja'),
      node('d', 'actDecision'),
      node('f', 'actFinal'),
      node('g', 'actAction', 'Alternatif'),
    ];
    const edges: NotaEdge[] = [
      { id: '1', source: 'i', target: 'a', data: { kind: 'act.control' } },
      { id: '2', source: 'a', target: 'd', data: { kind: 'act.control' } },
      { id: '3', source: 'd', target: 'f', data: { kind: 'act.control', label: '[Ya]' } },
      { id: '4', source: 'd', target: 'g', data: { kind: 'act.control', label: '[Tidak]' } },
      { id: '5', source: 'g', target: 'f', data: { kind: 'act.control' } },
    ];
    const stats = summarize(validateDiagram(nodes, edges, 'activity'));
    expect(stats.error).toBe(0);
  });
});

describe('palet stensil', () => {
  it('nama grup unik untuk setiap jenis diagram', async () => {
    const { shapesFor } = await import('../shapes');
    for (const kind of ALL_KINDS) {
      const groups = shapesFor(kind);
      const names = groups.map((g) => g.group);
      expect(new Set(names).size, `grup duplikat pada ${kind}: ${names.join(', ')}`).toBe(names.length);
      const shapes = groups.flatMap((g) => g.items);
      expect(new Set(shapes).size, `stensil duplikat pada ${kind}`).toBe(shapes.length);
      expect(shapes.length).toBeGreaterThanOrEqual(5);
      // bentuk umum selalu tersedia di setiap jenis diagram
      expect(shapes).toEqual(expect.arrayContaining(['note', 'textBlock']));
    }
  });
});

describe('penyesuaian wadah', () => {
  const checkInside = (nodes: NotaNode[], kind: DiagramKind) => {
    const containers = nodes.filter((n) => CONTAINER_SHAPES.includes(n.data.shape));
    const flow = nodes.filter((n) => !CONTAINER_SHAPES.includes(n.data.shape) && !NON_FLOW_SHAPES.includes(n.data.shape));
    for (const node of flow) {
      const size = nodeSize(node);
      const cx = node.position.x + size.width / 2;
      const cy = node.position.y + size.height / 2;
      const inside = containers.some((c) => {
        const cs = nodeSize(c);
        return cx >= c.position.x && cx <= c.position.x + cs.width && cy >= c.position.y && cy <= c.position.y + cs.height;
      });
      expect(inside, `${kind}: ${node.id} berada di luar semua wadah`).toBe(true);
    }
  };

  it('pool BPMN membungkus anggotanya setelah auto-layout', () => {
    const template = TEMPLATES.find((t) => t.id === 'bpmn-collaboration')!;
    const store = useDiagramTest.getState();
    store.loadTemplate(template);
    store.autoLayout('LR');
    const nodes = useDiagramTest.getState().nodes;
    checkInside(nodes, 'bpmn');
    // pool tidak boleh saling menimpa
    const pools = nodes
      .filter((n) => n.data.shape === 'bpmnPool')
      .map((n) => ({ x: n.position.x, y: n.position.y, w: nodeSize(n).width, h: nodeSize(n).height }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < pools.length; i += 1) {
      expect(pools[i].y, 'pool saling menimpa').toBeGreaterThanOrEqual(pools[i - 1].y + pools[i - 1].h);
    }
  });

  it('boundary use case membungkus use case setelah auto-layout', () => {
    const template = TEMPLATES.find((t) => t.id === 'uc-advanced')!;
    const store = useDiagramTest.getState();
    store.loadTemplate(template);
    store.autoLayout('TB');
    const nodes = useDiagramTest.getState().nodes;
    const boundary = nodes.find((n) => n.data.shape === 'ucBoundary')!;
    const box = nodeSize(boundary);
    for (const node of nodes.filter((n) => n.data.shape === 'ucUseCase')) {
      const size = nodeSize(node);
      expect(node.position.x).toBeGreaterThanOrEqual(boundary.position.x);
      expect(node.position.y).toBeGreaterThanOrEqual(boundary.position.y);
      expect(node.position.x + size.width).toBeLessThanOrEqual(boundary.position.x + box.width + 1);
      expect(node.position.y + size.height).toBeLessThanOrEqual(boundary.position.y + box.height + 1);
    }
  });
});
