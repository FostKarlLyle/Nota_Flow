import type { Edge, Node } from '@xyflow/react';

/** Jenis diagram yang didukung editor. */
export type DiagramKind = 'bpmn' | 'usecase' | 'activity' | 'class' | 'dfd';

export type TriggerKind =
  | 'none'
  | 'message'
  | 'timer'
  | 'error'
  | 'signal'
  | 'conditional'
  | 'terminate'
  | 'escalation';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type PathStyle = 'straight' | 'bezier' | 'smoothstep' | 'step';

/** Semua bentuk (stensil) yang dikenali editor. */
export type ShapeKey =
  // umum
  | 'note'
  | 'textBlock'
  // BPMN
  | 'bpmnStart'
  | 'bpmnEnd'
  | 'bpmnIntermediateCatch'
  | 'bpmnIntermediateThrow'
  | 'bpmnBoundaryEvent'
  | 'bpmnTask'
  | 'bpmnUserTask'
  | 'bpmnServiceTask'
  | 'bpmnScriptTask'
  | 'bpmnSendTask'
  | 'bpmnReceiveTask'
  | 'bpmnManualTask'
  | 'bpmnBusinessRuleTask'
  | 'bpmnSubProcess'
  | 'bpmnCallActivity'
  | 'bpmnGatewayExclusive'
  | 'bpmnGatewayParallel'
  | 'bpmnGatewayInclusive'
  | 'bpmnGatewayEventBased'
  | 'bpmnPool'
  | 'bpmnLane'
  | 'bpmnDataObject'
  | 'bpmnDataStore'
  | 'bpmnGroup'
  // Use case
  | 'ucActor'
  | 'ucUseCase'
  | 'ucBoundary'
  // Activity
  | 'actInitial'
  | 'actFinal'
  | 'actFlowFinal'
  | 'actAction'
  | 'actDecision'
  | 'actMerge'
  | 'actFork'
  | 'actJoin'
  | 'actObject'
  | 'actPartition'
  | 'actSendSignal'
  | 'actReceiveSignal'
  | 'actTimeEvent'
  // Class
  | 'clsClass'
  | 'clsInterface'
  | 'clsAbstract'
  | 'clsEnum'
  | 'clsPackage'
  // DFD
  | 'dfdExternal'
  | 'dfdProcess'
  | 'dfdProcessCircle'
  | 'dfdDataStore'
  | 'dfdDataStoreAlt';

export interface NotaNodeData extends Record<string, unknown> {
  shape: ShapeKey;
  label: string;
  description?: string;
  /** override warna isi */
  fill?: string;
  /** override warna garis */
  stroke?: string;
  /** override warna teks */
  textColor?: string;
  strokeStyle?: StrokeStyle;
  fontSize?: number;
  /** BPMN event */
  trigger?: TriggerKind;
  /** Class diagram */
  stereotype?: string;
  attributes?: string[];
  methods?: string[];
  /** DFD */
  number?: string;
}

export type EdgeArrow =
  | 'none'
  | 'arrow'
  | 'arrowFilled'
  | 'triangle'
  | 'diamond'
  | 'diamondFilled'
  | 'dot'
  | 'openDot';

export interface NotaEdgeData extends Record<string, unknown> {
  label?: string;
  kind: string;
  pathStyle?: PathStyle;
  strokeStyle?: StrokeStyle;
  color?: string;
  startArrow?: EdgeArrow;
  endArrow?: EdgeArrow;
  animated?: boolean;
  fontSize?: number;
}

export type NotaNode = Node<NotaNodeData>;
export type NotaEdge = Edge<NotaEdgeData>;

export interface DiagramDoc {
  id: string;
  name: string;
  kind: DiagramKind;
  nodes: NotaNode[];
  edges: NotaEdge[];
  createdAt: number;
  updatedAt: number;
}

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  kind: DiagramKind;
  build: () => { nodes: NotaNode[]; edges: NotaEdge[] };
}

export interface Issue {
  id: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  hint?: string;
  nodeId?: string;
  edgeId?: string;
}
