import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, FileText, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import DocumentUploadForm from '../components/DocumentUploadForm';
import { ApiError, api } from '../services/api';
import type { Document, DocumentType, Patient } from '../types';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from '../utils/constants';
import { useToast } from '../components/Toast';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR');
const formatSize = (size: number) =>
  size < 1024 * 1024
    ? `${(size / 1024).toFixed(0)} KB`
    : `${(size / 1024 / 1024).toFixed(1)} MB`;
const reference = (doc: Document): string => {
  if (doc.semestre && doc.ano) {
    return `${doc.semestre}º semestre de ${doc.ano}`;
  }
  if (doc.mes && doc.ano) {
    return `${String(doc.mes).padStart(2, '0')}/${doc.ano}`;
  }
  if (doc.ano) {
    return String(doc.ano);
  }
  return 'Sem referência';
};

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [active, setActive] = useState<DocumentType>('NOTA_FISCAL');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      const [patientResult, documentResult] = await Promise.all([
        api.getPatient(patientId),
        api.listDocuments(patientId),
      ]);
      setPatient(patientResult);
      setDocuments(documentResult);
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível carregar o paciente.',
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, showError]);
  useEffect(() => {
    // A busca sincroniza o estado com a API externa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const visible = useMemo(
    () => documents.filter((doc) => doc.tipo === active),
    [documents, active],
  );
  const remove = async (doc: Document) => {
    if (!patientId || !window.confirm(`Excluir "${doc.fileName}"?`)) return;
    try {
      await api.deleteDocument(patientId, doc.documentId);
      setDocuments((items) =>
        items.filter((item) => item.documentId !== doc.documentId),
      );
      showSuccess('Documento excluído.');
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível excluir o documento.',
      );
    }
  };
  const download = async (doc: Document) => {
    if (!patientId) return;
    try {
      const result = await api.getDownloadUrl(patientId, doc.documentId);
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível gerar o download.',
      );
    }
  };
  const deletePatient = async () => {
    if (!patientId || !window.confirm('Excluir este paciente?')) return;
    try {
      await api.deletePatient(patientId);
      showSuccess('Paciente excluído.');
      navigate('/documentos');
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível excluir o paciente.',
      );
    }
  };
  if (loading) return <LoadingSpinner />;
  if (!patient)
    return (
      <div className="rounded-xl bg-white p-8 text-center">
        Paciente não encontrado.
      </div>
    );
  return (
    <section>
      <Link
        to="/documentos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para pacientes
      </Link>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold">{patient.nome}</h1>
          <p className="mt-1 text-slate-500">
            CPF: {patient.cpf}
            {patient.responsavel
              ? ` · Responsável: ${patient.responsavel}`
              : ''}
          </p>
        </div>
        <button className="danger" onClick={() => void deletePatient()}>
          <Trash2 className="h-4 w-4" />
          Excluir paciente
        </button>
      </div>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b">
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActive(type)}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${
              active === type
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {DOCUMENT_TYPE_LABELS[type]}
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {documents.filter((doc) => doc.tipo === type).length}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">
          {DOCUMENT_TYPE_LABELS[active]}
        </h2>
        {visible.length ? (
          <div className="mt-4 divide-y">
            {visible.map((doc) => (
              <div
                key={doc.documentId}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-lg bg-primary-50 p-2 text-primary-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.fileName}</p>
                    <p className="text-sm text-slate-500">
                      {reference(doc)}
                      {doc.especialidade ? ` · ${doc.especialidade}` : ''}
                      {' · '}
                      {formatSize(doc.size)}
                      {' · Criado em '}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pl-12 sm:pl-0">
                  <button
                    className="secondary"
                    onClick={() => void download(doc)}
                  >
                    <Download className="h-4 w-4" />
                    Baixar
                  </button>
                  <button
                    className="icon-danger"
                    onClick={() => void remove(doc)}
                    aria-label="Excluir documento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-slate-500">
            Nenhum anexo nesta categoria.
          </p>
        )}
        <DocumentUploadForm
          key={active}
          patientId={patient.patientId}
          tipo={active}
          onUploaded={() => void load()}
        />
      </div>
    </section>
  );
}
