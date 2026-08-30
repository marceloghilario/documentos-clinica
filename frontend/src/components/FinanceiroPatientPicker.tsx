import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { ApiError, api } from '../services/api';
import {
  FinanceiroError,
  financeiro,
  financeiroToken,
} from '../services/financeiro';
import type { FinanceiroPatient } from '../types';
import { formatCpf } from '../utils/cpf';
import { useToast } from './Toast';

interface Props {
  onClose: () => void;
  onAdded: (patientId: string) => void;
}

const describe = (patient: FinanceiroPatient): string =>
  [
    patient.nome,
    patient.cpf ? formatCpf(patient.cpf) : null,
    patient.convenio,
  ]
    .filter(Boolean)
    .join(' · ');

export default function FinanceiroPatientPicker({ onClose, onAdded }: Props) {
  const [authenticated, setAuthenticated] = useState(
    () => financeiroToken.get() !== null,
  );
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [patients, setPatients] = useState<FinanceiroPatient[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showError, showSuccess } = useToast();

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      setPatients(await financeiro.listPatients());
    } catch (error) {
      if (error instanceof FinanceiroError && error.status === 401) {
        financeiroToken.clear();
        setAuthenticated(false);
        showError('Sessão do financeiro expirada. Entre novamente.');
      } else {
        showError(
          error instanceof FinanceiroError
            ? error.message
            : 'Não foi possível carregar os pacientes do financeiro.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!authenticated) return;
    // A busca sincroniza o estado com a API do financeiro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPatients();
  }, [authenticated, loadPatients]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await financeiro.login(credentials.email, credentials.password);
      setAuthenticated(true);
    } catch (error) {
      showError(
        error instanceof FinanceiroError
          ? error.message
          : 'Não foi possível entrar no sistema financeiro.',
      );
    } finally {
      setSaving(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const patient = patients.find((item) => String(item.id) === selected);
    if (!patient) {
      showError('Selecione um paciente.');
      return;
    }
    setSaving(true);
    try {
      const created = await api.importPatient({
        origemId: patient.id,
        nome: patient.nome,
        cpf: patient.cpf,
        convenio: patient.convenio,
      });
      showSuccess('Paciente vinculado.');
      onAdded(created.patientId);
      onClose();
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível vincular o paciente.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={authenticated ? add : login}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Paciente do financeiro</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        {authenticated ? (
          <div className="grid gap-4">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <label>
                Paciente
                <select
                  required
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={String(patient.id)}>
                      {describe(patient)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="secondary justify-self-start"
              onClick={() => {
                financeiroToken.clear();
                setAuthenticated(false);
                setPatients([]);
                setSelected('');
              }}
            >
              Sair do financeiro
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm text-slate-500">
              Entre com seu usuário do sistema financeiro para listar os
              pacientes já cadastrados lá.
            </p>
            <label>
              E-mail
              <input
                required
                type="email"
                autoComplete="username"
                value={credentials.email}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Senha
              <input
                required
                type="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={saving || loading}>
            {authenticated
              ? saving
                ? 'Vinculando...'
                : 'Vincular paciente'
              : saving
                ? 'Entrando...'
                : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
