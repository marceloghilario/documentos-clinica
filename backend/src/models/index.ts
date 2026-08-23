import type { Specialty } from './specialties';

// TEMPORÁRIO: será substituído pela integração real com o sistema de pacientes.
export interface Patient {
  patientId: string;
  nome: string;
  cpf: string;
  dataNascimento?: string;
  responsavel?: string;
  telefone?: string;
  createdAt: string;
}

export type DocumentType =
  | 'NOTA_FISCAL'
  | 'LISTA_PRESENCA'
  | 'PEI'
  | 'RELATORIOS'
  | 'OUTROS';

export interface Document {
  documentId: string;
  patientId: string;
  tipo: DocumentType;
  mes?: number;
  ano?: number;
  semestre?: 1 | 2;
  especialidade?: Specialty;
  fileName: string;
  s3Key: string;
  size: number;
  contentType: string;
  createdAt: string;
}
