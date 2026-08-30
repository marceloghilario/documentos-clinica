import { API_URL } from '../utils/constants';
import type {
  ApiFailure,
  Document,
  DocumentForm,
  Patient,
  UploadUrlResponse,
} from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
}
const isFailure = (value: unknown): value is ApiFailure =>
  typeof value === 'object' &&
  value !== null &&
  (value as { success?: unknown }).success === false;
async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_URL)
    throw new ApiError(
      'API URL não configurada. Defina VITE_API_URL no .env.',
      500,
    );
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* resposta sem JSON */
  }
  if (!response.ok)
    throw new ApiError(
      isFailure(payload)
        ? payload.error
        : `Erro na requisição (${response.status})`,
      response.status,
    );
  if (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { success?: unknown }).success === true
  )
    return (payload as { data: T }).data;
  throw new ApiError('Resposta inesperada da API', 500);
}
export const api = {
  listPatients: () => request<Patient[]>('/patients'),
  createPatient: (input: Omit<Patient, 'patientId' | 'createdAt'>) =>
    request<Patient>('/patients', { method: 'POST', body: input }),
  importPatient: (input: {
    origemId: number;
    nome: string;
    cpf?: string;
    convenio?: string;
  }) => request<Patient>('/patients/import', { method: 'POST', body: input }),
  getPatient: (id: string) => request<Patient>(`/patients/${id}`),
  deletePatient: (id: string) =>
    request<{ deleted: boolean }>(`/patients/${id}`, { method: 'DELETE' }),
  listDocuments: (id: string, tipo?: string) =>
    request<Document[]>(
      `/patients/${id}/documents${tipo ? `?tipo=${tipo}` : ''}`,
    ),
  getUploadUrl: (
    id: string,
    input: {
      fileName: string;
      contentType: string;
      size: number;
      multipart?: boolean;
      partCount?: number;
    },
  ) =>
    request<UploadUrlResponse>(`/patients/${id}/documents/upload-url`, {
      method: 'POST',
      body: input,
    }),
  completeMultipart: (
    id: string,
    input: {
      s3Key: string;
      uploadId: string;
      parts: { partNumber: number; eTag: string }[];
    },
  ) =>
    request<{ completed: boolean }>(
      `/patients/${id}/documents/multipart/complete`,
      { method: 'POST', body: input },
    ),
  createDocument: (
    id: string,
    input: DocumentForm & {
      s3Key: string;
      fileName: string;
      size: number;
      contentType: string;
    },
  ) =>
    request<Document>(`/patients/${id}/documents`, {
      method: 'POST',
      body: input,
    }),
  getDownloadUrl: (patientId: string, documentId: string) =>
    request<{ downloadUrl: string }>(
      `/patients/${patientId}/documents/${documentId}/download-url`,
    ),
  deleteDocument: (patientId: string, documentId: string) =>
    request<{ deleted: boolean }>(
      `/patients/${patientId}/documents/${documentId}`,
      { method: 'DELETE' },
    ),
};
