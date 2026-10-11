import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useDiagram } from '../store/useDiagram';
import { TEMPLATES } from '../lib/templates';
import { buildScene } from '../lib/exporter';
import { parseDoc, serializeDoc } from '../lib/exporter';

describe('aplikasi Nota Flow', () => {
  beforeEach(() => {
    useDiagram.getState().reset('bpmn');
  });

  it('merender kerangka aplikasi tanpa error', async () => {
    render(<App />);
    expect(await screen.findByText(/Nota/)).toBeTruthy();
    expect(screen.getByText('Konektor baru')).toBeTruthy();
    expect(screen.getAllByText('Properti').length).toBeGreaterThan(0);
  });

  it('menampilkan galeri template untuk kanvas kosong', async () => {
    render(<App />);
    expect(await screen.findByText(/Mulai dari template/i)).toBeTruthy();
  });

  it('memuat template lewat galeri kosong', async () => {
    const user = userEvent.setup();
    render(<App />);
    const card = await screen.findByText('Alur Persetujuan');
    await user.click(card);
    await waitFor(() => {
      expect(useDiagram.getState().nodes.length).toBeGreaterThan(5);
    });
    expect(useDiagram.getState().name).toContain('BPMN');
  });

  it('menambahkan bentuk dari palet ke kanvas', async () => {
    const user = userEvent.setup();
    render(<App />);
    const stencil = await screen.findByTitle('User Task');
    await user.click(stencil);
    await waitFor(() => {
      expect(useDiagram.getState().nodes.some((n) => n.data.shape === 'bpmnUserTask')).toBe(true);
    });
  });

  it('membuka dialog panduan', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTitle('Panduan & pintasan'));
    expect(await screen.findByRole('heading', { name: 'Pintasan' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cara pakai singkat' })).toBeTruthy();
  });

  it('mengubah teks elemen lewat klik ganda', async () => {
    const user = userEvent.setup();
    const id = useDiagram.getState().addNodeAt('bpmnTask', { x: 120, y: 120 });
    render(<App />);
    const nodeEl = await waitFor(() => {
      const el = document.querySelector(`.react-flow__node[data-id="${id}"]`);
      if (!el) throw new Error('node belum tampil');
      return el as Element;
    });
    await user.dblClick(nodeEl);
    const editor = await waitFor(() => {
      const el = document.querySelector('.nota-inline-editor');
      if (!el) throw new Error('editor belum muncul');
      return el as HTMLTextAreaElement;
    });
    await user.clear(editor);
    await user.type(editor, 'Verifikasi Berkas');
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(useDiagram.getState().nodes[0].data.label).toBe('Verifikasi Berkas');
    });
  });

  it('menampilkan temuan pada panel pemeriksaan', async () => {
    const user = userEvent.setup();
    // BPMN tanpa start event -> memicu error
    useDiagram.getState().addNodeAt('bpmnTask', { x: 50, y: 50 });
    render(<App />);
    await user.click(screen.getByTitle('Periksa kesesuaian aturan diagram'));
    expect(await screen.findByText(/Pemeriksaan diagram/i)).toBeTruthy();
    expect(await screen.findByText(/belum punya Start Event/i)).toBeTruthy();
  });

  it('merapikan tata letak otomatis', async () => {
    const template = TEMPLATES.find((t) => t.id === 'bpmn-simple')!;
    useDiagram.getState().loadTemplate(template);
    const before = useDiagram.getState().nodes.map((n) => ({ ...n.position }));
    useDiagram.getState().autoLayout('TB');
    const after = useDiagram.getState().nodes.map((n) => ({ ...n.position }));
    expect(after).not.toEqual(before);
    // pada layout TB, node berikutnya harus berada di bawah node sebelumnya
    const state = useDiagram.getState();
    const edge = state.edges[0];
    const source = state.nodes.find((n) => n.id === edge.source)!;
    const target = state.nodes.find((n) => n.id === edge.target)!;
    expect(target.position.y).toBeGreaterThan(source.position.y);
  });

  it('mengganti tema menjadi gelap', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTitle('Mode gelap'));
    expect(useDiagram.getState().theme).toBe('dark');
  });
});

describe('ekspor', () => {
  it('menghasilkan SVG dengan elemen lengkap', () => {
    const template = TEMPLATES.find((t) => t.id === 'class-basic')!;
    const { nodes, edges } = template.build();
    const scene = buildScene(nodes, edges, { padding: 30 });
    expect(scene.svg.startsWith('<svg')).toBe(true);
    expect(scene.svg).toContain('</svg>');
    expect(scene.width).toBeGreaterThan(300);
    expect(scene.height).toBeGreaterThan(200);
    // label class harus ikut terekspor
    expect(scene.svg).toContain('Pelanggan');
    // marker inheritance (segitiga kosong) harus memakai warna latar ekspor
    expect(scene.svg).toContain('fill="#ffffff" stroke=');
  });

  it('round-trip JSON mempertahankan isi diagram', () => {
    const template = TEMPLATES.find((t) => t.id === 'dfd-level1')!;
    const { nodes, edges } = template.build();
    const text = serializeDoc({
      id: 'doc',
      name: template.name,
      kind: template.kind,
      nodes,
      edges,
      createdAt: 0,
      updatedAt: 0,
    });
    const parsed = parseDoc(text);
    expect(parsed.kind).toBe('dfd');
    expect(parsed.nodes).toHaveLength(nodes.length);
    expect(parsed.edges).toHaveLength(edges.length);
    expect(parsed.nodes[0].data.shape).toBeTruthy();
  });

  it('menolak berkas yang tidak dikenali', () => {
    expect(() => parseDoc('{"foo":1}')).toThrow();
  });
});

describe('seret & lepas stensil', () => {
  it('menaruh elemen pada posisi drop di kanvas', async () => {
    useDiagram.getState().reset('bpmn');
    const { container } = render(<App />);
    const wrapper = container.querySelector('.react-flow')!.parentElement as HTMLElement;
    expect(wrapper).toBeTruthy();

    const data = {
      data: { 'application/notaflow-shape': 'bpmnServiceTask' } as Record<string, string>,
      getData(type: string) {
        return this.data[type] ?? '';
      },
      setData(type: string, value: string) {
        this.data[type] = value;
      },
      dropEffect: 'copy',
      effectAllowed: 'copy',
      types: ['application/notaflow-shape'],
    };
    fireEvent.dragOver(wrapper, { dataTransfer: data });
    fireEvent.drop(wrapper, { dataTransfer: data, clientX: 400, clientY: 300 });

    await waitFor(() => {
      const node = useDiagram.getState().nodes.find((n) => n.data.shape === 'bpmnServiceTask');
      expect(node).toBeTruthy();
      expect(Number.isFinite(node!.position.x)).toBe(true);
      expect(Number.isFinite(node!.position.y)).toBe(true);
    });
  });
});
