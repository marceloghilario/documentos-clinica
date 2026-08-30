import type { Specialty } from './specialties';

export type PatientOrigin = 'MANUAL' | 'FINANCEIRO';

// TEMPORÁRIO: o cadastro manual será substituído pela integração real com o
// sistema de pacientes. Pacientes com origem FINANCEIRO vêm do sistema
// financeiro e usam o patientId `fin-<id do financeiro>`.
export interface Patient {
  patientId: string;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  responsavel?: string;
  telefone?: string;
  origem?: PatientOrigin;
  origemId?: number;
  convenio?: string;
  createdAt: string;
}

export type DocumentType =
  'NOTA_FISCAL' | 'LISTA_PRESENCA' | 'PEI' | 'RELATORIOS' | 'OUTROS';

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
