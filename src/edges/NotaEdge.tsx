import { useMemo } from 'react';
import { getBezierPath, getSmoothStepPath, getStraightPath, type EdgeProps, type Position } from '@xyflow/react';
import type { NotaEdgeData, PathStyle } from '../types';
import { EdgeScene } from './render';
import { useRenderTheme } from '../lib/renderTheme';

interface PathArgs {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
}

export function buildEdgePath(style: PathStyle, args: PathArgs): string {
  switch (style) {
    case 'straight':
      return getStraightPath(args)[0];
    case 'smoothstep':
      return getSmoothStepPath({ ...args, borderRadius: 14 })[0];
    case 'step':
      return getSmoothStepPath({ ...args, borderRadius: 0 })[0];
    case 'bezier':
    default:
      return getBezierPath(args)[0];
  }
}

export function NotaEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const theme = useRenderTheme();
  const d = (data ?? {}) as NotaEdgeData;
  const pathStyle: PathStyle = d.pathStyle ?? 'bezier';

  const path = useMemo(
    () => buildEdgePath(pathStyle, { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }),
    [pathStyle, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition],
  );

  return <EdgeScene data={d} path={path} selected={selected} theme={theme} />;
}
