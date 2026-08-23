import type { DocumentType } from '../types';
export const API_URL = import.meta.env.VITE_API_URL ?? '';
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  NOTA_FISCAL: 'Nota Fiscal',
  LISTA_PRESENCA: 'Lista de Presença',
  PEI: 'PEI',
  RELATORIOS: 'Relatórios',
  OUTROS: 'Outros',
};
export const DOCUMENT_TYPES: DocumentType[] = [
  'NOTA_FISCAL',
  'LISTA_PRESENCA',
  'PEI',
  'RELATORIOS',
  'OUTROS',
];
