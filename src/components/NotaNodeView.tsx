import { memo, useEffect, useRef, useState } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import type { NotaNode } from '../types';
import { SHAPE_META, SHAPE_RENDERERS, shapeMinSize } from '../shapes';
import { shapeStyle } from '../lib/theme';
import { useRenderTheme } from '../lib/renderTheme';
import { useDiagram } from '../store/useDiagram';
import { isContainerShape } from '../lib/layout';

const SIDES: { id: string; position: Position }[] = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
];

const ROUND_SHAPES = new Set([
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
  'dfdProcessCircle',
]);

function NotaNodeViewInner({ id, data, selected, width, height }: NodeProps<NotaNode>) {
  const theme = useRenderTheme();
  const editingNodeId = useDiagram((s) => s.editingNodeId);
  const setEditingNodeId = useDiagram((s) => s.setEditingNodeId);
  const min = shapeMinSize(data.shape);
  const meta = SHAPE_META[data.shape];
  const w = width ?? meta?.width ?? 140;
  const h = height ?? meta?.height ?? 70;
  const style = shapeStyle(data.shape, data, theme.mode);
  const renderer = SHAPE_RENDERERS[data.shape] ?? SHAPE_RENDERERS.bpmnTask;
  const isEditing = editingNodeId === id;
  const [draft, setDraft] = useState(data.label ?? '');
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(data.label ?? '');
      requestAnimationFrame(() => {
        areaRef.current?.focus();
        areaRef.current?.select();
      });
    }
  }, [isEditing, data.label]);

  const commit = () => {
    useDiagram.getState().updateNodeData(id, { label: draft }, 'now');
    setEditingNodeId(null);
  };

  const container = isContainerShape(data.shape);

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={min.width}
        minHeight={min.height}
        keepAspectRatio={ROUND_SHAPES.has(data.shape)}
        lineClassName="nota-resize-line"
        handleClassName="nota-resize-handle"
      />
      <div className="nota-node-inner" style={{ width: '100%', height: '100%' }}>
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ display: 'block', overflow: 'visible' }}
          className="nota-node-svg"
        >
          {renderer({ w, h, data, style, selected: !!selected, preview: false })}
        </svg>

        {isEditing ? (
          <foreignObject x={0} y={Math.min(24, h / 2)} width={w} height={Math.max(32, h - 24)} className="nodrag nopan">
            <div style={{ width: '100%', height: '100%', padding: 2 }}>
              <textarea
                ref={areaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    commit();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setEditingNodeId(null);
                  }
                  event.stopPropagation();
                }}
                className="nota-inline-editor"
                style={{ fontSize: data.fontSize ?? 12.5 }}
              />
            </div>
          </foreignObject>
        ) : null}
      </div>

      {SIDES.map((side) => (
        <div key={side.id}>
          <Handle
            type="source"
            id={`${side.id}-s`}
            position={side.position}
            className={`nota-handle ${container ? 'nota-handle-container' : ''}`}
          />
          <Handle
            type="target"
            id={`${side.id}-t`}
            position={side.position}
            className={`nota-handle ${container ? 'nota-handle-container' : ''}`}
          />
        </div>
      ))}
    </>
  );
}

export const NotaNodeView = memo(NotaNodeViewInner);
