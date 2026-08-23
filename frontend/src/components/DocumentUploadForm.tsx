import { useState } from 'react';
import type { FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { DocumentForm, DocumentType, UploadUrlResponse } from '../types';
import { SPECIALTIES } from '../utils/specialties';
import { useToast } from './Toast';
import { DOCUMENT_TYPE_LABELS } from '../utils/constants';

const MAX_SINGLE = 50 * 1024 * 1024;
const PART_SIZE = 10 * 1024 * 1024;
const initialForm = (tipo: DocumentType): DocumentForm => ({ tipo });
interface Props {
  patientId: string;
  tipo: DocumentType;
  onUploaded: () => void;
}
export default function DocumentUploadForm({
  patientId,
  tipo,
  onUploaded,
}: Props) {
  const [form, setForm] = useState<DocumentForm>(initialForm(tipo));
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState('');
  const { showError, showSuccess } = useToast();
  const setMonth = (value: string) =>
    setForm((old) => ({
      ...old,
      mes: value ? Number(value) : undefined,
    }));
  const setYear = (value: string) =>
    setForm((old) => ({
      ...old,
      ano: value ? Number(value) : undefined,
    }));
  const setSemester = (value: string) =>
    setForm((old) => ({
      ...old,
      semestre: value ? (Number(value) as 1 | 2) : undefined,
    }));
  const setSpecialty = (value: string) =>
    setForm((old) => {
      const specialty = SPECIALTIES.find((item) => item === value);
      return {
        ...old,
        especialidade: specialty,
      };
    });
  const validate = (): string | null => {
    if (!file) return 'Selecione um arquivo.';
    if (
      (tipo === 'NOTA_FISCAL' || tipo === 'LISTA_PRESENCA') &&
      (!form.mes || !form.ano)
    )
      return 'Mês e ano são obrigatórios.';
    if (
      (tipo === 'PEI' || tipo === 'RELATORIOS') &&
      (!form.semestre || !form.ano)
    )
      return 'Semestre e ano são obrigatórios.';
    if (tipo === 'RELATORIOS' && !form.especialidade)
      return 'Especialidade é obrigatória para relatórios.';
    return null;
  };
  const uploadSingle = async (url: string, selected: File) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': selected.type },
      body: selected,
    });
    if (!response.ok) throw new Error('Falha ao enviar o arquivo para o S3.');
  };
  const uploadMultipart = async (result: UploadUrlResponse, selected: File) => {
    if (!result.uploadId || !result.partUrls)
      throw new Error('Resposta inválida do upload multipart.');
    const parts: { partNumber: number; eTag: string }[] = [];
    for (const part of result.partUrls) {
      setProgress(
        `Enviando parte ${part.partNumber} de ${result.partUrls.length}...`,
      );
      const response = await fetch(part.url, {
        method: 'PUT',
        body: selected.slice(
          (part.partNumber - 1) * PART_SIZE,
          part.partNumber * PART_SIZE,
        ),
      });
      if (!response.ok) {
        throw new Error('Falha ao enviar uma parte do arquivo.');
      }
      const eTag = response.headers.get('ETag');
      if (!eTag) {
        throw new Error('S3 não retornou o ETag da parte.');
      }
      parts.push({ partNumber: part.partNumber, eTag });
    }
    await api.completeMultipart(patientId, {
      s3Key: result.s3Key,
      uploadId: result.uploadId,
      parts,
    });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = validate();
    if (message) {
      showError(message);
      return;
    }
    if (!file) return;
    try {
      setProgress('Preparando upload...');
      const multipart = file.size > MAX_SINGLE;
      const result = await api.getUploadUrl(patientId, {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        multipart,
        partCount: multipart ? Math.ceil(file.size / PART_SIZE) : undefined,
      });
      if (multipart) {
        await uploadMultipart(result, file);
      } else if (result.uploadUrl) {
        await uploadSingle(result.uploadUrl, file);
      } else {
        throw new Error('URL de upload não recebida.');
      }
      setProgress('Salvando informações...');
      await api.createDocument(patientId, {
        ...form,
        tipo,
        s3Key: result.s3Key,
        fileName: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
      });
      showSuccess('Documento enviado com sucesso.');
      setFile(null);
      setForm(initialForm(tipo));
      setProgress('');
      onUploaded();
    } catch (error) {
      setProgress('');
      showError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível enviar o documento.',
      );
    }
  };
  return (
    <form
      onSubmit={submit}
      className="mt-5 rounded-xl border border-primary-100 bg-primary-50/40 p-4"
    >
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <Upload className="h-4 w-4 text-primary-600" />
        Adicionar {DOCUMENT_TYPE_LABELS[tipo]}
      </h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <label>
          Arquivo
          <input
            type="file"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
        </label>
        {(tipo === 'NOTA_FISCAL' ||
          tipo === 'LISTA_PRESENCA' ||
          tipo === 'OUTROS') && (
          <label>
            Mês
            <select
              value={form.mes ?? ''}
              onChange={(event) => setMonth(event.target.value)}
            >
              <option value="">Selecione</option>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        {(tipo === 'PEI' || tipo === 'RELATORIOS') && (
          <label>
            Semestre
            <select
              value={form.semestre ?? ''}
              onChange={(event) => setSemester(event.target.value)}
            >
              <option value="">Selecione</option>
              <option value="1">1º semestre</option>
              <option value="2">2º semestre</option>
            </select>
          </label>
        )}
        <label>
          Ano
          <input
            type="number"
            min="2000"
            max="2100"
            value={form.ano ?? ''}
            onChange={(event) => setYear(event.target.value)}
          />
        </label>
        {tipo === 'RELATORIOS' && (
          <label>
            Especialidade
            <select
              value={form.especialidade ?? ''}
              onChange={(event) => setSpecialty(event.target.value)}
            >
              <option value="">Selecione</option>
              {SPECIALTIES.map((specialty) => (
                <option key={specialty}>{specialty}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button className="primary" disabled={Boolean(progress)}>
          {progress || 'Enviar documento'}
        </button>
        {file && (
          <span className="text-sm text-slate-500">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </span>
        )}
      </div>
    </form>
  );
}
