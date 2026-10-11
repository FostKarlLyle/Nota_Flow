import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CircleHelp,
  Download,
  FileJson,
  Image as ImageIcon,
  LayoutTemplate,
  Moon,
  Redo2,
  ShieldCheck,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Workflow,
} from 'lucide-react';
import { useDiagram } from '../store/useDiagram';
import { kindOrder, kindShortLabels } from '../lib/kindLabels';
import { summarize, validateDiagram } from '../lib/validate';
import { exportPng, exportSvg, parseDoc, safeFileName, serializeDoc, download } from '../lib/exporter';
import { SelectInput } from './ui';
import type { DiagramKind } from '../types';

export function Toolbar({ onOpenTemplates, onOpenHelp }: { onOpenTemplates: () => void; onOpenHelp: () => void }) {
  const kind = useDiagram((s) => s.kind);
  const name = useDiagram((s) => s.name);
  const setName = useDiagram((s) => s.setName);
  const theme = useDiagram((s) => s.theme);
  const setTheme = useDiagram((s) => s.setTheme);
  const nodes = useDiagram((s) => s.nodes);
  const edges = useDiagram((s) => s.edges);
  const reset = useDiagram((s) => s.reset);
  const loadDoc = useDiagram((s) => s.loadDoc);
  const autoLayout = useDiagram((s) => s.autoLayout);
  const undo = useDiagram((s) => s.undo);
  const redo = useDiagram((s) => s.redo);
  const past = useDiagram((s) => s.past.length);
  const future = useDiagram((s) => s.future.length);
  const toast = useDiagram((s) => s.toast);
  const toggleValidation = useDiagram((s) => s.toggleValidation);
  const showValidation = useDiagram((s) => s.showValidation);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const stats = summarize(validateDiagram(nodes, edges, kind));

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeKind = (next: DiagramKind) => {
    if (next === kind) return;
    if (nodes.length && !window.confirm('Mengganti jenis diagram akan mengosongkan kanvas. Lanjutkan?')) return;
    reset(next);
    toast(`Beralih ke diagram ${kindShortLabels[next]}`, 'info');
  };

  const handleExportPng = async (scale: number) => {
    setExportOpen(false);
    if (!nodes.length) {
      toast('Kanvas masih kosong', 'warning');
      return;
    }
    setBusy(true);
    try {
      await exportPng(nodes, edges, name, { scale, background: theme === 'dark' ? 'dark' : 'white' });
      toast('Diagram diunduh sebagai PNG', 'success');
    } catch {
      toast('Gagal membuat PNG', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleExportSvg = () => {
    setExportOpen(false);
    if (!nodes.length) {
      toast('Kanvas masih kosong', 'warning');
      return;
    }
    exportSvg(nodes, edges, name, { background: theme === 'dark' ? 'dark' : 'white' });
    toast('Diagram diunduh sebagai SVG', 'success');
  };

  const handleExportJson = () => {
    setExportOpen(false);
    const doc = useDiagram.getState().toDocument();
    download(safeFileName(name, 'json'), serializeDoc(doc), 'application/json');
    toast('Berkas JSON diunduh', 'success');
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseDoc(text);
      loadDoc({ name: parsed.name, kind: parsed.kind, nodes: parsed.nodes, edges: parsed.edges });
      toast('Diagram berhasil dimuat', 'success');
    } catch {
      toast('Berkas tidak bisa dibaca', 'error');
    }
  };

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 pr-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Workflow size={17} />
        </span>
        <span className="hidden text-sm font-bold tracking-tight text-slate-800 sm:block dark:text-slate-100">
          Nota<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
        </span>
      </div>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nama diagram"
        className="w-36 rounded-lg border border-transparent bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white sm:w-48 dark:bg-slate-800 dark:text-slate-100"
      />

      <div className="w-40 shrink-0">
        <SelectInput
          value={kind}
          onChange={(value) => changeKind(value as DiagramKind)}
          options={kindOrder.map((item) => ({
            value: item,
            label: `${kindShortLabels[item]}${item === 'bpmn' ? '' : ''}`,
          }))}
        />
      </div>

      <div className="mx-1 hidden h-6 w-px bg-slate-200 md:block dark:bg-slate-700" />

      <ToolButton title="Rapikan tata letak kiri → kanan (L)" onClick={() => autoLayout('LR')}>
        <ArrowRight size={15} />
      </ToolButton>
      <ToolButton title="Rapikan tata letak atas → bawah (T)" onClick={() => autoLayout('TB')}>
        <ArrowDown size={15} />
      </ToolButton>
      <ToolButton title="Template siap pakai" onClick={onOpenTemplates}>
        <LayoutTemplate size={15} />
      </ToolButton>

      <button
        type="button"
        onClick={() => toggleValidation()}
        title="Periksa kesesuaian aturan diagram"
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
          showValidation
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`}
      >
        <ShieldCheck size={15} />
        <span className="hidden lg:inline">Validasi</span>
        {stats.error > 0 ? (
          <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">{stats.error}</span>
        ) : stats.warning > 0 ? (
          <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">{stats.warning}</span>
        ) : null}
      </button>

      <div className="ml-auto flex items-center gap-1">
        <ToolButton title="Undo (Ctrl+Z)" onClick={undo} disabled={past === 0}>
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={future === 0}>
          <Redo2 size={15} />
        </ToolButton>

        <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <ToolButton title="Impor berkas JSON" onClick={() => fileRef.current?.click()}>
          <Upload size={15} />
        </ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
            event.target.value = '';
          }}
        />

        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            disabled={busy}
          >
            <Download size={15} />
            <span className="hidden sm:inline">{busy ? 'Menyiapkan...' : 'Ekspor'}</span>
          </button>
          {exportOpen ? (
            <div className="absolute right-0 z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <MenuItem onClick={() => void handleExportPng(2)} icon={<ImageIcon size={14} />} label="PNG (kualitas 2x)" />
              <MenuItem onClick={() => void handleExportPng(1)} icon={<ImageIcon size={14} />} label="PNG (ukuran asli)" />
              <MenuItem onClick={handleExportSvg} icon={<FileJson size={14} />} label="SVG (vektor)" />
              <MenuItem onClick={handleExportJson} icon={<FileJson size={14} />} label="JSON (bisa diimpor lagi)" />
            </div>
          ) : null}
        </div>

        <ToolButton title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </ToolButton>
        <ToolButton
          title="Kosongkan kanvas"
          onClick={() => {
            if (!nodes.length || window.confirm('Hapus semua elemen di kanvas?')) reset(kind);
          }}
        >
          <Trash2 size={15} />
        </ToolButton>
        <ToolButton title="Panduan & pintasan" onClick={onOpenHelp}>
          <CircleHelp size={15} />
        </ToolButton>
      </div>
    </header>
  );
}

function ToolButton({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function MenuItem({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  );
}
