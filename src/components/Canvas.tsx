import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Node,
} from '@xyflow/react';
import { Maximize2, Minus, Plus, Redo2, Undo2 } from 'lucide-react';
import { useDiagram } from '../store/useDiagram';
import { SHAPE_META } from '../shapes';
import { shapeStyle, type ColorMode } from '../lib/theme';
import { useRenderTheme } from '../lib/renderTheme';
import type { NotaEdge, NotaNode, ShapeKey } from '../types';
import { NotaNodeView } from './NotaNodeView';
import { NotaEdgeComponent } from '../edges/NotaEdge';
import { TemplateGallery } from './TemplateGallery';
import { ValidationPanel } from './ValidationPanel';
import { SHAPE_DRAG_MIME } from '../lib/constants';

const nodeTypes = { nota: NotaNodeView };
const edgeTypes = { nota: NotaEdgeComponent };

export function Canvas() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  const nodes = useDiagram((s) => s.nodes);
  const edges = useDiagram((s) => s.edges);
  const theme = useRenderTheme();
  const showGrid = useDiagram((s) => s.showGrid);
  const snapToGrid = useDiagram((s) => s.snapToGrid);
  const pendingShape = useDiagram((s) => s.pendingShape);
  const viewVersion = useDiagram((s) => s.viewVersion);
  const setEditingNodeId = useDiagram((s) => s.setEditingNodeId);

  const onNodesChange = useDiagram((s) => s.onNodesChange);
  const onEdgesChange = useDiagram((s) => s.onEdgesChange);
  const onNodesDelete = useDiagram((s) => s.onNodesDelete);
  const onEdgesDelete = useDiagram((s) => s.onEdgesDelete);
  const connect = useDiagram((s) => s.connect);
  const isValidConnection = useDiagram((s) => s.isValidConnection);
  const addNodeAt = useDiagram((s) => s.addNodeAt);

  useEffect(() => {
    if (viewVersion === 0) return;
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, maxZoom: 1.1, duration: 400 });
    }, 80);
    return () => clearTimeout(timer);
  }, [viewVersion, fitView]);

  useEffect(() => {
    if (!pendingShape) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const center = bounds
      ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const position = screenToFlowPosition(center);
    const meta = SHAPE_META[pendingShape];
    let x = Math.round(position.x - (meta?.width ?? 140) / 2);
    let y = Math.round(position.y - (meta?.height ?? 70) / 2);
    // hindari tumpang tindih saat menambah beberapa bentuk berurutan
    const state = useDiagram.getState();
    let guard = 0;
    while (
      state.nodes.some((n) => Math.abs(n.position.x - x) < 16 && Math.abs(n.position.y - y) < 16) &&
      guard < 12
    ) {
      x += 28;
      y += 28;
      guard += 1;
    }
    addNodeAt(pendingShape, { x, y });
  }, [pendingShape, addNodeAt, screenToFlowPosition]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw =
        event.dataTransfer.getData(SHAPE_DRAG_MIME) || event.dataTransfer.getData('text/plain');
      if (!raw) return;
      const shape = raw as ShapeKey;
      const meta = SHAPE_META[shape];
      if (!meta) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNodeAt(shape, {
        x: Math.round(position.x - meta.width / 2),
        y: Math.round(position.y - meta.height / 2),
      });
    },
    [addNodeAt, screenToFlowPosition],
  );

  const miniMapColor = useCallback(
    (node: Node) => {
      const shape = (node as NotaNode).data?.shape ?? 'bpmnTask';
      return shapeStyle(shape, (node as NotaNode).data, theme.mode).stroke;
    },
    [theme.mode],
  );

  const flowTheme = theme.mode as ColorMode;

  const style = useMemo(
    () => ({
      background: theme.canvasBg,
    }),
    [theme.canvasBg],
  );

  return (
    <div
      ref={wrapperRef}
      className={`relative h-full w-full ${connecting ? 'nota-connecting' : ''}`}
      style={style}
    >
      <ReactFlow<NotaNode, NotaEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={connect}
        isValidConnection={isValidConnection}
        onNodeDoubleClick={(_event, node) => setEditingNodeId(node.id)}
        onPaneClick={() => setEditingNodeId(null)}
        onConnectStart={() => setConnecting(true)}
        onConnectEnd={() => setConnecting(false)}
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: theme.accent, strokeWidth: 2, strokeDasharray: '6 4' }}
        defaultEdgeOptions={{ type: 'nota' }}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        minZoom={0.15}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        selectionKeyCode="Shift"
        panOnScroll
        selectionOnDrag={false}
        proOptions={{ hideAttribution: false }}
      >
        {showGrid ? (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.4}
            color={theme.grid}
            style={{ opacity: flowTheme === 'dark' ? 0.7 : 0.9 }}
          />
        ) : null}

        <MiniMap
          pannable
          zoomable
          nodeColor={miniMapColor}
          nodeStrokeWidth={3}
          maskColor={flowTheme === 'dark' ? 'rgba(2,6,23,0.72)' : 'rgba(148,163,184,0.25)'}
          style={{
            background: flowTheme === 'dark' ? '#111a2b' : '#ffffff',
            border: `1px solid ${flowTheme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            borderRadius: 12,
            width: 168,
            height: 108,
          }}
        />

        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
          <ZoomButton title="Perkecil (Ctrl+-)" onClick={() => zoomOut({ duration: 200 })}>
            <Minus size={15} />
          </ZoomButton>
          <ZoomButton title="Perbesar (Ctrl++)" onClick={() => zoomIn({ duration: 200 })}>
            <Plus size={15} />
          </ZoomButton>
          <ZoomButton title="Pas ke layar (H)" onClick={() => fitView({ padding: 0.2, duration: 400 })}>
            <Maximize2 size={15} />
          </ZoomButton>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <ZoomButton title="Undo (Ctrl+Z)" onClick={() => useDiagram.getState().undo()}>
            <Undo2 size={15} />
          </ZoomButton>
          <ZoomButton title="Redo (Ctrl+Shift+Z)" onClick={() => useDiagram.getState().redo()}>
            <Redo2 size={15} />
          </ZoomButton>
        </div>
      </ReactFlow>

      <ValidationPanel onFocusNode={(nodeId) => {
        setEditingNodeId(null);
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        useDiagram.getState().selectOnly([nodeId]);
        const size = SHAPE_META[node.data.shape];
        setCenter(node.position.x + (size?.width ?? 120) / 2, node.position.y + (size?.height ?? 60) / 2, {
          zoom: Math.max(0.6, Math.min(1.2, 1)),
          duration: 500,
        });
      }} />

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="pointer-events-auto w-full max-w-3xl">
            <TemplateGallery empty />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ZoomButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
    >
      {children}
    </button>
  );
}
