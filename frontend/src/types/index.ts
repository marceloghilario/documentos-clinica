import type { Specialty } from '../utils/specialties';

export type DocumentType =
  'NOTA_FISCAL' | 'LISTA_PRESENCA' | 'PEI' | 'RELATORIOS' | 'OUTROS';

export type PatientOrigin = 'MANUAL' | 'FINANCEIRO';

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

export interface FinanceiroPatient {
  id: number;
  nome: string;
  cpf?: string;
  convenio?: string;
  ativo: boolean;
}

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
  downloadUrl?: string;
}

export interface UploadUrlResponse {
  uploadUrl?: string;
  s3Key: string;
  uploadId?: string;
  partUrls?: { partNumber: number; url: string }[];
}

export type DocumentForm = Pick<
  Document,
  'tipo' | 'mes' | 'ano' | 'semestre' | 'especialidade'
>;

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string };
