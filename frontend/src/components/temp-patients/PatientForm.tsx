import { useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { useToast } from '../Toast';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}
// TEMPORÁRIO: cadastro será substituído pela integração com o sistema de pacientes.
export default function PatientForm({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    responsavel: '',
    telefone: '',
  });
  const [saving, setSaving] = useState(false);
  const { showError, showSuccess } = useToast();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim() || !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(form.cpf)) {
      showError('Informe nome e um CPF válido com 11 dígitos.');
      return;
    }
    setSaving(true);
    try {
      await api.createPatient({
        ...form,
        dataNascimento: form.dataNascimento || undefined,
        responsavel: form.responsavel || undefined,
        telefone: form.telefone || undefined,
      });
      showSuccess('Paciente cadastrado.');
      onCreated();
      onClose();
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível cadastrar o paciente.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Inserir paciente</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            Nome
            <input
              required
              maxLength={100}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label>
            CPF
            <input
              required
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            />
          </label>
          <label>
            Data de nascimento
            <input
              type="date"
              value={form.dataNascimento}
              onChange={(e) =>
                setForm({ ...form, dataNascimento: e.target.value })
              }
            />
          </label>
          <label>
            Responsável
            <input
              value={form.responsavel}
              onChange={(e) =>
                setForm({ ...form, responsavel: e.target.value })
              }
            />
          </label>
          <label>
            Telefone
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar paciente'}
          </button>
        </div>
      </form>
    </div>
  );
}
