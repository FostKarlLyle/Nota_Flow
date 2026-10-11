import type { DiagramKind } from '../types';

export const kindLabels: Record<DiagramKind, string> = {
  bpmn: 'BPMN',
  usecase: 'Use Case',
  activity: 'Activity Diagram',
  class: 'Class Diagram',
  dfd: 'Data Flow Diagram',
};

export const kindShortLabels: Record<DiagramKind, string> = {
  bpmn: 'BPMN',
  usecase: 'Use Case',
  activity: 'Activity',
  class: 'Class',
  dfd: 'DFD',
};

export const kindDescriptions: Record<DiagramKind, string> = {
  bpmn: 'Alur proses bisnis dengan event, task, gateway, dan pool.',
  usecase: 'Interaksi aktor dengan fitur-fitur sistem.',
  activity: 'Alur kerja langkah demi langkah, bisa memakai partisi.',
  class: 'Struktur kelas, atribut, metode, dan relasinya.',
  dfd: 'Aliran data antar proses, entitas eksternal, dan data store.',
};

export const kindOrder: DiagramKind[] = ['bpmn', 'usecase', 'activity', 'class', 'dfd'];
