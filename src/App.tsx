import { useEffect, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { PanelLeft, PanelRight, ShieldCheck } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { Palette } from './components/Palette';
import { Inspector } from './components/Inspector';
import { Canvas } from './components/Canvas';
import { Toasts } from './components/Toasts';
import { TemplateGallery } from './components/TemplateGallery';
import { HelpDialog } from './components/HelpDialog';
import { Modal } from './components/ui';
import { DARK_THEME, LIGHT_THEME, RenderThemeProvider } from './lib/renderTheme';
import { useDiagram } from './store/useDiagram';
import { summarize, validateDiagram } from './lib/validate';
import { kindShortLabels } from './lib/kindLabels';
import { download, safeFileName, serializeDoc } from './lib/exporter';

export default function App() {
  const theme = useDiagram((s) => s.theme);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const renderTheme = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  return (
    <RenderThemeProvider value={renderTheme}>
      <ReactFlowProvider>
        <div className={theme === 'dark' ? 'dark' : ''}>
          <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <Toolbar onOpenTemplates={() => setTemplatesOpen(true)} onOpenHelp={() => setHelpOpen(true)} />
            <div className="relative flex min-h-0 flex-1">
              <aside
                className={`absolute inset-y-0 left-0 z-20 w-64 shrink-0 border-r border-slate-200 bg-white shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none dark:border-slate-700 dark:bg-slate-900 ${
                  leftOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
              >
                <Palette />
              </aside>

              <main className="relative min-w-0 flex-1">
                <Canvas />
              </main>

              <aside
                className={`absolute inset-y-0 right-0 z-20 w-80 shrink-0 border-l border-slate-200 bg-white shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none dark:border-slate-700 dark:bg-slate-900 ${
                  rightOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                }`}
              >
                <Inspector />
              </aside>
            </div>
            <StatusBar
              onToggleLeft={() => setLeftOpen(!leftOpen)}
              onToggleRight={() => setRightOpen(!rightOpen)}
            />
          </div>
        </div>

        <Shortcuts />
        <Toasts />

        <Modal open={templatesOpen} onClose={() => setTemplatesOpen(false)} title="Template diagram">
          <TemplateGallery onClose={() => setTemplatesOpen(false)} />
        </Modal>
        <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      </ReactFlowProvider>
    </RenderThemeProvider>
  );
}

function StatusBar({ onToggleLeft, onToggleRight }: { onToggleLeft: () => void; onToggleRight: () => void }) {
  const nodes = useDiagram((s) => s.nodes);
  const edges = useDiagram((s) => s.edges);
  const kind = useDiagram((s) => s.kind);
  const setEditingNodeId = useDiagram((s) => s.setEditingNodeId);
  const showValidation = useDiagram((s) => s.showValidation);
  const toggleValidation = useDiagram((s) => s.toggleValidation);
  const stats = summarize(validateDiagram(nodes, edges, kind));

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-2 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      <button
        type="button"
        onClick={onToggleLeft}
        className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
      >
        <PanelLeft size={13} /> Stensil
      </button>
      <span className="hidden font-medium text-slate-600 sm:inline dark:text-slate-300">{kindShortLabels[kind]}</span>
      <span>{nodes.length} elemen</span>
      <span>{edges.length} konektor</span>
      <button
        type="button"
        onClick={() => toggleValidation()}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
          showValidation ? 'text-indigo-600 dark:text-indigo-300' : ''
        }`}
      >
        <ShieldCheck size={12} />
        {stats.error === 0 && stats.warning === 0 ? (
          <span>Tanpa temuan</span>
        ) : (
          <span>
            {stats.error} error · {stats.warning} perhatian
          </span>
        )}
      </button>
      <span className="ml-auto hidden truncate md:block">
        Klik ganda elemen untuk mengubah teks · Tarik dari titik tepi untuk menyambung · Tekan L untuk merapikan tata letak
      </span>
      <button
        type="button"
        onClick={() => {
          setEditingNodeId(null);
          onToggleRight();
        }}
        className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
      >
        <PanelRight size={13} /> Properti
      </button>
    </footer>
  );
}

/** Pintasan papan tulis. */
function Shortcuts() {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const state = useDiagram.getState();
      const mod = event.ctrlKey || event.metaKey;

      if (mod) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) state.redo();
            else state.undo();
            return;
          case 'y':
            event.preventDefault();
            state.redo();
            return;
          case 'a':
            event.preventDefault();
            state.selectAll();
            return;
          case 'c':
            state.copySelection();
            return;
          case 'v':
            state.pasteClipboard();
            return;
          case 'd':
            event.preventDefault();
            state.duplicateSelected();
            return;
          case 's':
            event.preventDefault();
            download(safeFileName(state.name, 'json'), serializeDoc(state.toDocument()), 'application/json');
            state.toast('Berkas JSON diunduh', 'success');
            return;
          default:
            return;
        }
      }

      switch (event.key.toLowerCase()) {
        case 'l':
          state.autoLayout('LR');
          state.toast('Tata letak dirapikan (kiri → kanan)', 'info');
          break;
        case 't':
          state.autoLayout('TB');
          state.toast('Tata letak dirapikan (atas → bawah)', 'info');
          break;
        case 'h':
          fitView({ padding: 0.2, duration: 400 });
          break;
        case 'g':
          state.toggleGrid();
          break;
        case 'escape':
          state.clearSelection();
          state.setEditingNodeId(null);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fitView]);

  return null;
}
