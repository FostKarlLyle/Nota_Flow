import type { DiagramKind, DiagramTemplate, NotaEdge, NotaNode, NotaNodeData, ShapeKey } from '../types';
import { SHAPE_META, autoHeight, defaultNodeData } from '../shapes';
import { dataForEdgeKind } from '../edges/kinds';
import { assignHandles, isContainerShape, layoutGraph, nodeSize, type Direction } from './layout';

/* --------------------------------------------------------------- helper --- */

function makeNode(id: string, shape: ShapeKey, label: string, extra: Partial<NotaNodeData> = {}): NotaNode {
  const meta = SHAPE_META[shape];
  const data: NotaNodeData = { ...defaultNodeData(shape), ...extra, shape, label };
  const width = extra.fontSize ? meta.width : meta.width;
  const height = autoHeight(shape, data, width) ?? meta.height;
  return {
    id,
    type: 'nota',
    position: { x: 0, y: 0 },
    width,
    height,
    style: { width, height },
    data,
    zIndex: isContainerShape(shape) ? 0 : 1,
  };
}

function makeEdge(id: string, source: string, target: string, kindId: string, diagram: DiagramKind, label?: string): NotaEdge {
  const data = dataForEdgeKind(kindId, diagram);
  if (label !== undefined) data.label = label;
  return { id, source, target, type: 'nota', data };
}

/** Layout hanya untuk sekumpulan node tertentu, lalu geser ke titik awal. */
function layoutBand(
  all: NotaNode[],
  edges: NotaEdge[],
  ids: string[],
  direction: Direction,
  origin: { x: number; y: number },
  spacing: { nodeSep?: number; rankSep?: number } = {},
): NotaNode[] {
  const laidOut = layoutGraph(all, edges, { direction, onlyNodeIds: ids, ...spacing });
  const members = laidOut.filter((n) => ids.includes(n.id));
  if (!members.length) return laidOut;
  const minX = Math.min(...members.map((n) => n.position.x));
  const minY = Math.min(...members.map((n) => n.position.y));
  const dx = origin.x - minX;
  const dy = origin.y - minY;
  return laidOut.map((n) => (ids.includes(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
}

/** Bungkus sekumpulan node dengan wadah (pool / boundary / partition). */
function frameContainer(
  nodes: NotaNode[],
  containerId: string,
  memberIds: string[],
  pad: { left?: number; right?: number; top?: number; bottom?: number } = {},
): NotaNode[] {
  const members = nodes.filter((n) => memberIds.includes(n.id));
  if (!members.length) return nodes;
  const left = pad.left ?? 40;
  const right = pad.right ?? 40;
  const top = pad.top ?? 40;
  const bottom = pad.bottom ?? 40;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const m of members) {
    const size = nodeSize(m);
    minX = Math.min(minX, m.position.x);
    minY = Math.min(minY, m.position.y);
    maxX = Math.max(maxX, m.position.x + size.width);
    maxY = Math.max(maxY, m.position.y + size.height);
  }
  const x = Math.round(minX - left);
  const y = Math.round(minY - top);
  const width = Math.round(maxX - minX + left + right);
  const height = Math.round(maxY - minY + top + bottom);
  return nodes.map((n) =>
    n.id === containerId
      ? { ...n, position: { x, y }, width, height, style: { ...n.style, width, height } }
      : n,
  );
}

function finish(nodes: NotaNode[], edges: NotaEdge[]): { nodes: NotaNode[]; edges: NotaEdge[] } {
  return { nodes, edges: assignHandles(nodes, edges) };
}

/** Susun partisi (swimlane horizontal) secara berurutan tanpa tumpang tindih. */
function stackBands(
  nodes: NotaNode[],
  bands: { id: string; ids: string[] }[],
  opts: { x: number; padTop?: number; padBottom?: number; padX?: number },
): NotaNode[] {
  const padTop = opts.padTop ?? 46;
  const padBottom = opts.padBottom ?? 34;
  const padX = opts.padX ?? 40;

  const metrics = bands.map((band) => {
    const members = nodes.filter((n) => band.ids.includes(n.id));
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const m of members) {
      const size = nodeSize(m);
      minX = Math.min(minX, m.position.x);
      minY = Math.min(minY, m.position.y);
      maxX = Math.max(maxX, m.position.x + size.width);
      maxY = Math.max(maxY, m.position.y + size.height);
    }
    return { band, minX, minY, maxX, maxY, count: members.length };
  });

  const ordered = metrics
    .filter((m) => m.count > 0)
    .sort((a, b) => a.minY - b.minY);

  const globalMinX = Math.min(...ordered.map((m) => m.minX));
  const globalMaxX = Math.max(...ordered.map((m) => m.maxX));
  const x = opts.x;
  const width = Math.round(globalMaxX - globalMinX + padX * 2);
  const dx = x - (globalMinX - padX);

  let cursor: number | null = null;
  const frames = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const m of ordered) {
    const top = cursor === null ? m.minY - padTop : cursor;
    const bottom = m.maxY + padBottom;
    frames.set(m.band.id, { x: Math.round(x), y: Math.round(top), width, height: Math.round(bottom - top) });
    cursor = bottom;
  }

  return nodes.map((n) => {
    const frame = frames.get(n.id);
    if (frame) {
      return { ...n, position: { x: frame.x, y: frame.y }, width: frame.width, height: frame.height, style: { ...n.style, width: frame.width, height: frame.height } };
    }
    if (bands.some((b) => b.ids.includes(n.id))) {
      return { ...n, position: { x: Math.round(n.position.x + dx), y: n.position.y } };
    }
    return n;
  });
}

/* ------------------------------------------------------------ template --- */

/* 1. BPMN sederhana ------------------------------------------------------- */
function bpmnSimple(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'bpmn';
  const nodes: NotaNode[] = [
    makeNode('b1', 'bpmnStart', 'Mulai'),
    makeNode('b2', 'bpmnUserTask', 'Terima Pengajuan'),
    makeNode('b3', 'bpmnServiceTask', 'Validasi Data'),
    makeNode('b4', 'bpmnGatewayExclusive', 'Valid?'),
    makeNode('b5', 'bpmnUserTask', 'Proses Persetujuan'),
    makeNode('b6', 'bpmnSendTask', 'Kirim Notifikasi'),
    makeNode('b7', 'bpmnEnd', 'Selesai'),
    makeNode('b8', 'bpmnUserTask', 'Perbaiki Data'),
    makeNode('b9', 'bpmnEnd', 'Ditolak'),
    makeNode('b10', 'bpmnDataObject', 'Berkas', { label: 'Berkas\nPengajuan' }),
  ];
  const edges: NotaEdge[] = [
    makeEdge('be1', 'b1', 'b2', 'bpmn.sequence', kind),
    makeEdge('be2', 'b2', 'b3', 'bpmn.sequence', kind),
    makeEdge('be3', 'b3', 'b4', 'bpmn.sequence', kind),
    makeEdge('be4', 'b4', 'b5', 'bpmn.conditional', kind, 'Ya'),
    makeEdge('be5', 'b5', 'b6', 'bpmn.sequence', kind),
    makeEdge('be6', 'b6', 'b7', 'bpmn.sequence', kind),
    makeEdge('be7', 'b4', 'b8', 'bpmn.conditional', kind, 'Tidak'),
    makeEdge('be8', 'b8', 'b9', 'bpmn.sequence', kind),
    makeEdge('be9', 'b10', 'b5', 'bpmn.dataAssoc', kind),
  ];
  const flow = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'];
  let laidOut = layoutBand(nodes, edges, flow, 'LR', { x: 80, y: 120 }, { nodeSep: 70, rankSep: 100 });
  laidOut = laidOut.map((n) => (n.id === 'b10' ? { ...n, position: { x: 430, y: 380 } } : n));
  return finish(laidOut, edges);
}

/* 2. BPMN kolaborasi 2 pool ---------------------------------------------- */
function bpmnCollaboration(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'bpmn';
  const nodes: NotaNode[] = [
    makeNode('p1', 'bpmnPool', 'Pembeli'),
    makeNode('p2', 'bpmnPool', 'Sistem Toko'),
    makeNode('c1', 'bpmnStart', ''),
    makeNode('c2', 'bpmnUserTask', 'Pilih Produk'),
    makeNode('c3', 'bpmnUserTask', 'Checkout'),
    makeNode('c4', 'bpmnIntermediateCatch', 'Menunggu', { trigger: 'message' }),
    makeNode('c5', 'bpmnEnd', ''),
    makeNode('c6', 'bpmnIntermediateCatch', 'Pesanan Masuk', { trigger: 'message' }),
    makeNode('c7', 'bpmnServiceTask', 'Validasi Stok'),
    makeNode('c8', 'bpmnGatewayExclusive', 'Stok ada?'),
    makeNode('c9', 'bpmnServiceTask', 'Proses Pembayaran'),
    makeNode('c10', 'bpmnSendTask', 'Kirim Konfirmasi'),
    makeNode('c11', 'bpmnEnd', ''),
    makeNode('c12', 'bpmnUserTask', 'Tawarkan Alternatif'),
  ];
  const edges: NotaEdge[] = [
    makeEdge('ce1', 'c1', 'c2', 'bpmn.sequence', kind),
    makeEdge('ce2', 'c2', 'c3', 'bpmn.sequence', kind),
    makeEdge('ce3', 'c3', 'c4', 'bpmn.sequence', kind),
    makeEdge('ce4', 'c4', 'c5', 'bpmn.sequence', kind),
    makeEdge('ce5', 'c3', 'c6', 'bpmn.message', kind, 'Pesanan'),
    makeEdge('ce6', 'c6', 'c7', 'bpmn.sequence', kind),
    makeEdge('ce7', 'c7', 'c8', 'bpmn.sequence', kind),
    makeEdge('ce8', 'c8', 'c9', 'bpmn.conditional', kind, 'Ya'),
    makeEdge('ce9', 'c9', 'c10', 'bpmn.sequence', kind),
    makeEdge('ce10', 'c10', 'c11', 'bpmn.sequence', kind),
    makeEdge('ce11', 'c10', 'c4', 'bpmn.message', kind, 'Konfirmasi'),
    makeEdge('ce12', 'c8', 'c12', 'bpmn.conditional', kind, 'Tidak'),
    makeEdge('ce13', 'c12', 'c4', 'bpmn.message', kind, 'Penawaran'),
  ];
  const buyer = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const shop = ['c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
  let laidOut = layoutBand(nodes, edges, buyer, 'LR', { x: 0, y: 0 }, { nodeSep: 60, rankSep: 90 });
  laidOut = layoutBand(laidOut, edges, shop, 'LR', { x: 0, y: 0 }, { nodeSep: 60, rankSep: 90 });
  laidOut = frameContainer(laidOut, 'p1', buyer, { left: 70, right: 50, top: 30, bottom: 30 });
  laidOut = frameContainer(laidOut, 'p2', shop, { left: 70, right: 50, top: 30, bottom: 30 });
  const pool1 = laidOut.find((n) => n.id === 'p1')!;
  const pool2 = laidOut.find((n) => n.id === 'p2')!;
  const moveIds = new Set(['p2', ...shop]);
  const dxPool = pool1.position.x - pool2.position.x;
  const dyPool = pool1.position.y + (pool1.height ?? 0) - pool2.position.y + 50;
  laidOut = laidOut.map((n) =>
    moveIds.has(n.id) ? { ...n, position: { x: n.position.x + dxPool, y: n.position.y + dyPool } } : n,
  );
  return finish(laidOut, edges);
}

/* 3. Use case dasar ------------------------------------------------------- */
function useCaseBasic(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'usecase';
  const nodes: NotaNode[] = [
    makeNode('a1', 'ucActor', 'Pelanggan'),
    makeNode('a2', 'ucActor', 'Admin'),
    makeNode('u1', 'ucUseCase', 'Registrasi Akun'),
    makeNode('u2', 'ucUseCase', 'Login'),
    makeNode('u3', 'ucUseCase', 'Lihat Katalog'),
    makeNode('u4', 'ucUseCase', 'Kelola Produk'),
    makeNode('u5', 'ucUseCase', 'Buat Pesanan'),
    makeNode('s1', 'ucBoundary', 'Sistem Toko Online'),
  ];
  const edges: NotaEdge[] = [
    makeEdge('ue1', 'a1', 'u1', 'uc.association', kind),
    makeEdge('ue2', 'a1', 'u2', 'uc.association', kind),
    makeEdge('ue3', 'a1', 'u3', 'uc.association', kind),
    makeEdge('ue4', 'a1', 'u5', 'uc.association', kind),
    makeEdge('ue5', 'a2', 'u4', 'uc.association', kind),
    makeEdge('ue6', 'a2', 'u2', 'uc.association', kind),
    makeEdge('ue7', 'u5', 'u2', 'uc.include', kind),
  ];
  const cases = ['u1', 'u2', 'u3', 'u4', 'u5'];
  let laidOut = layoutBand(nodes, edges, ['a1', 'a2'], 'LR', { x: 60, y: 190 }, { nodeSep: 90, rankSep: 120 });
  laidOut = layoutBand(laidOut, edges, cases, 'TB', { x: 330, y: 140 }, { nodeSep: 45, rankSep: 100 });
  laidOut = frameContainer(laidOut, 's1', cases, { left: 175, right: 60, top: 70, bottom: 70 });
  return finish(laidOut, edges);
}

/* 4. Use case lanjutan ---------------------------------------------------- */
function useCaseAdvanced(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'usecase';
  const nodes: NotaNode[] = [
    makeNode('a1', 'ucActor', 'Mahasiswa'),
    makeNode('a2', 'ucActor', 'Dosen'),
    makeNode('a3', 'ucActor', 'Administrator'),
    makeNode('u1', 'ucUseCase', 'Login'),
    makeNode('u2', 'ucUseCase', 'Autentikasi'),
    makeNode('u3', 'ucUseCase', 'Isi KRS'),
    makeNode('u4', 'ucUseCase', 'Lihat Nilai'),
    makeNode('u5', 'ucUseCase', 'Input Nilai'),
    makeNode('u6', 'ucUseCase', 'Cetak Transkrip'),
    makeNode('u7', 'ucUseCase', 'Kelola Pengguna'),
    makeNode('s1', 'ucBoundary', 'Sistem Akademik'),
  ];
  const edges: NotaEdge[] = [
    makeEdge('ue1', 'a1', 'u3', 'uc.association', kind),
    makeEdge('ue2', 'a1', 'u4', 'uc.association', kind),
    makeEdge('ue3', 'a1', 'u6', 'uc.association', kind),
    makeEdge('ue4', 'a2', 'u5', 'uc.association', kind),
    makeEdge('ue5', 'a2', 'u4', 'uc.association', kind),
    makeEdge('ue6', 'a3', 'u7', 'uc.association', kind),
    makeEdge('ue7', 'u3', 'u1', 'uc.include', kind),
    makeEdge('ue8', 'u4', 'u1', 'uc.include', kind),
    makeEdge('ue9', 'u5', 'u1', 'uc.include', kind),
    makeEdge('ue10', 'u1', 'u2', 'uc.include', kind),
    makeEdge('ue11', 'u6', 'u4', 'uc.extend', kind),
  ];
  const cases = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];
  let laidOut = layoutBand(nodes, edges, ['a1', 'a2', 'a3'], 'LR', { x: 60, y: 150 }, { nodeSep: 80, rankSep: 120 });
  laidOut = layoutBand(laidOut, edges, cases, 'TB', { x: 340, y: 120 }, { nodeSep: 45, rankSep: 100 });
  laidOut = frameContainer(laidOut, 's1', cases, { left: 190, right: 70, top: 70, bottom: 90 });
  return finish(laidOut, edges);
}

/* 5. Activity dasar ------------------------------------------------------- */
function activityBasic(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'activity';
  const nodes: NotaNode[] = [
    makeNode('t1', 'actInitial', ''),
    makeNode('t2', 'actAction', 'Buka Halaman Login'),
    makeNode('t3', 'actAction', 'Isi Username & Password'),
    makeNode('t4', 'actDecision', 'Data valid?'),
    makeNode('t5', 'actAction', 'Tampilkan Dashboard'),
    makeNode('t6', 'actFinal', ''),
    makeNode('t7', 'actAction', 'Tampilkan Pesan Error'),
    makeNode('t8', 'actMerge', ''),
  ];
  const edges: NotaEdge[] = [
    makeEdge('te1', 't1', 't2', 'act.control', kind),
    makeEdge('te2', 't2', 't3', 'act.control', kind),
    makeEdge('te3', 't3', 't4', 'act.control', kind),
    makeEdge('te4', 't4', 't5', 'act.control', kind, '[Ya]'),
    makeEdge('te5', 't5', 't6', 'act.control', kind),
    makeEdge('te6', 't4', 't7', 'act.control', kind, '[Tidak]'),
    makeEdge('te7', 't7', 't8', 'act.control', kind),
    makeEdge('te8', 't8', 't3', 'act.control', kind),
  ];
  const flow = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'];
  const laidOut = layoutBand(nodes, edges, flow, 'TB', { x: 200, y: 60 }, { nodeSep: 70, rankSep: 60 });
  return finish(laidOut, edges);
}

/* 6. Activity dengan partisi --------------------------------------------- */
function activityPartition(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'activity';
  const nodes: NotaNode[] = [
    makeNode('pa', 'actPartition', 'Mahasiswa'),
    makeNode('pb', 'actPartition', 'Sistem Akademik'),
    makeNode('v1', 'actInitial', ''),
    makeNode('v2', 'actAction', 'Isi Formulir KRS'),
    makeNode('v3', 'actAction', 'Validasi Mata Kuliah'),
    makeNode('v4', 'actFork', ''),
    makeNode('v5', 'actAction', 'Cek Kuota'),
    makeNode('v6', 'actAction', 'Cek Prasyarat'),
    makeNode('v7', 'actJoin', ''),
    makeNode('v8', 'actDecision', 'Disetujui?'),
    makeNode('v9', 'actAction', 'Simpan KRS'),
    makeNode('v10', 'actAction', 'Tampilkan Jadwal'),
    makeNode('v11', 'actFinal', ''),
    makeNode('v12', 'actAction', 'Tampilkan Alasan Penolakan'),
  ];
  const edges: NotaEdge[] = [
    makeEdge('ve1', 'v1', 'v2', 'act.control', kind),
    makeEdge('ve2', 'v2', 'v3', 'act.control', kind),
    makeEdge('ve3', 'v3', 'v4', 'act.control', kind),
    makeEdge('ve4', 'v4', 'v5', 'act.control', kind),
    makeEdge('ve5', 'v4', 'v6', 'act.control', kind),
    makeEdge('ve6', 'v5', 'v7', 'act.control', kind),
    makeEdge('ve7', 'v6', 'v7', 'act.control', kind),
    makeEdge('ve8', 'v7', 'v8', 'act.control', kind),
    makeEdge('ve9', 'v8', 'v9', 'act.control', kind, '[Ya]'),
    makeEdge('ve10', 'v9', 'v10', 'act.control', kind),
    makeEdge('ve11', 'v10', 'v11', 'act.control', kind),
    makeEdge('ve12', 'v8', 'v12', 'act.control', kind, '[Tidak]'),
    makeEdge('ve13', 'v12', 'v11', 'act.control', kind),
  ];
  const flow = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12'];
  let laidOut = layoutBand(nodes, edges, flow, 'TB', { x: 140, y: 80 }, { nodeSep: 60, rankSep: 60 });
  laidOut = stackBands(
    laidOut,
    [
      { id: 'pa', ids: ['v1', 'v2'] },
      { id: 'pb', ids: ['v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12'] },
    ],
    { x: 60 },
  );
  return finish(laidOut, edges);
}

/* 7. Class diagram -------------------------------------------------------- */
function classBasic(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'class';
  const nodes: NotaNode[] = [
    makeNode('k1', 'clsClass', 'Pengguna', {
      attributes: ['- id: int', '- nama: String', '- email: String'],
      methods: ['+ login(): boolean', '+ logout(): void'],
    }),
    makeNode('k2', 'clsClass', 'Pelanggan', {
      attributes: ['- alamat: String', '- noTelp: String'],
      methods: ['+ buatPesanan(): Pesanan'],
    }),
    makeNode('k3', 'clsClass', 'Admin', {
      attributes: ['- level: int'],
      methods: ['+ kelolaProduk(): void'],
    }),
    makeNode('k4', 'clsClass', 'Pesanan', {
      attributes: ['- idPesanan: String', '- tanggal: Date', '- total: double'],
      methods: ['+ hitungTotal(): double'],
    }),
    makeNode('k5', 'clsClass', 'ItemPesanan', {
      attributes: ['- jumlah: int', '- subtotal: double'],
      methods: [],
    }),
    makeNode('k6', 'clsClass', 'Produk', {
      attributes: ['- kode: String', '- nama: String', '- harga: double'],
      methods: ['+ cekStok(): int'],
    }),
  ];
  const edges: NotaEdge[] = [
    makeEdge('ke1', 'k2', 'k1', 'cls.inheritance', kind),
    makeEdge('ke2', 'k3', 'k1', 'cls.inheritance', kind),
    makeEdge('ke3', 'k2', 'k4', 'cls.directed', kind, '1 .. *'),
    makeEdge('ke4', 'k4', 'k5', 'cls.composition', kind, '1 .. *'),
    makeEdge('ke5', 'k5', 'k6', 'cls.association', kind, '* .. 1'),
  ];
  const laidOut = layoutBand(nodes, edges, nodes.map((n) => n.id), 'TB', { x: 120, y: 80 }, { nodeSep: 60, rankSep: 110 });
  return finish(laidOut, edges);
}

/* 8. DFD konteks ---------------------------------------------------------- */
function dfdContext(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'dfd';
  const nodes: NotaNode[] = [
    makeNode('p0', 'dfdProcessCircle', 'Sistem Penjualan', { number: '0' }),
    makeNode('d1', 'dfdExternal', 'Pelanggan'),
    makeNode('d2', 'dfdExternal', 'Supplier'),
    makeNode('d3', 'dfdExternal', 'Bagian Keuangan'),
  ];
  const edges: NotaEdge[] = [
    makeEdge('de1', 'd1', 'p0', 'dfd.flow', kind, 'data pesanan'),
    makeEdge('de2', 'p0', 'd1', 'dfd.flow', kind, 'konfirmasi & nota'),
    makeEdge('de3', 'd2', 'p0', 'dfd.flow', kind, 'data barang'),
    makeEdge('de4', 'p0', 'd3', 'dfd.flow', kind, 'laporan penjualan'),
    makeEdge('de5', 'p0', 'd2', 'dfd.flow', kind, 'pesanan barang'),
  ];
  const laidOut = layoutBand(nodes, edges, nodes.map((n) => n.id), 'LR', { x: 120, y: 120 }, { nodeSep: 90, rankSep: 150 });
  return finish(laidOut, edges);
}

/* 9. DFD level 1 ---------------------------------------------------------- */
function dfdLevel1(): { nodes: NotaNode[]; edges: NotaEdge[] } {
  const kind: DiagramKind = 'dfd';
  // tata letak tiga kolom: entitas | proses | data store (semua aliran searah)
  const nodes: NotaNode[] = [
    { ...makeNode('x1', 'dfdExternal', 'Pelanggan'), position: { x: 60, y: 60 } },
    { ...makeNode('x2', 'dfdExternal', 'Admin'), position: { x: 330, y: 400 } },
    { ...makeNode('y2', 'dfdProcess', 'Proses Pemesanan', { number: '2.0' }), position: { x: 330, y: 60 } },
    { ...makeNode('y3', 'dfdProcess', 'Pembuatan Laporan', { number: '3.0' }), position: { x: 640, y: 240 } },
    { ...makeNode('y1', 'dfdProcess', 'Kelola Data Produk', { number: '1.0' }), position: { x: 330, y: 560 } },
    { ...makeNode('z2', 'dfdDataStore', 'Pesanan', { number: 'D2' }), position: { x: 640, y: 60 } },
    { ...makeNode('z1', 'dfdDataStore', 'Produk', { number: 'D1' }), position: { x: 640, y: 500 } },
  ];
  const edges: NotaEdge[] = [
    makeEdge('xe1', 'x1', 'y2', 'dfd.flow', kind, 'pesanan'),
    makeEdge('xe2', 'y2', 'z2', 'dfd.flow', kind, 'simpan pesanan'),
    makeEdge('xe3', 'z2', 'y3', 'dfd.flow', kind, 'data pesanan'),
    makeEdge('xe4', 'y3', 'x2', 'dfd.flow', kind, 'laporan penjualan'),
    makeEdge('xe5', 'x2', 'y1', 'dfd.flow', kind, 'data produk'),
    makeEdge('xe6', 'y1', 'z1', 'dfd.flow', kind, 'simpan produk'),
    makeEdge('xe7', 'z1', 'y2', 'dfd.flow', kind, 'detail produk'),
  ];
  return finish(nodes, edges);
}

export const TEMPLATES: DiagramTemplate[] = [
  {
    id: 'bpmn-simple',
    name: 'BPMN — Alur Persetujuan',
    description: 'Start event, user task, gateway XOR dengan dua jalur, dan end event.',
    kind: 'bpmn',
    build: bpmnSimple,
  },
  {
    id: 'bpmn-collaboration',
    name: 'BPMN — Kolaborasi 2 Pool',
    description: 'Dua pool (Pembeli & Sistem Toko) dihubungkan message flow.',
    kind: 'bpmn',
    build: bpmnCollaboration,
  },
  {
    id: 'uc-basic',
    name: 'Use Case — Sistem Toko Online',
    description: 'Dua aktor, system boundary, asosiasi, dan relasi include.',
    kind: 'usecase',
    build: useCaseBasic,
  },
  {
    id: 'uc-advanced',
    name: 'Use Case — Sistem Akademik',
    description: 'Tiga aktor dengan relasi include dan extend.',
    kind: 'usecase',
    build: useCaseAdvanced,
  },
  {
    id: 'act-basic',
    name: 'Activity — Login Sistem',
    description: 'Initial node, action, decision, merge, dan activity final.',
    kind: 'activity',
    build: activityBasic,
  },
  {
    id: 'act-partition',
    name: 'Activity — KRS dengan Partisi',
    description: 'Partisi (swimlane), fork, join, dan decision.',
    kind: 'activity',
    build: activityPartition,
  },
  {
    id: 'class-basic',
    name: 'Class — Sistem Penjualan',
    description: 'Inheritance, komposisi, asosiasi berarah, dan multiplicity.',
    kind: 'class',
    build: classBasic,
  },
  {
    id: 'dfd-context',
    name: 'DFD — Diagram Konteks',
    description: 'Satu proses level 0 dengan tiga entitas eksternal.',
    kind: 'dfd',
    build: dfdContext,
  },
  {
    id: 'dfd-level1',
    name: 'DFD — Level 1',
    description: 'Tiga proses bernomor, dua data store, dan aliran data berlabel.',
    kind: 'dfd',
    build: dfdLevel1,
  },
];

export function templatesFor(kind: DiagramKind): DiagramTemplate[] {
  return TEMPLATES.filter((t) => t.kind === kind);
}
