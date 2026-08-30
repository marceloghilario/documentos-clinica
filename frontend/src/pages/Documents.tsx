import { useCallback, useEffect, useState } from 'react';
import { Plus, UserPlus, Users } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import FinanceiroPatientPicker from '../components/FinanceiroPatientPicker';
import PatientForm from '../components/temp-patients/PatientForm';
import PatientTable from '../components/temp-patients/PatientTable';
import { ApiError, api } from '../services/api';
import type { Patient } from '../types';
import { useToast } from '../components/Toast';

export default function Documents() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { showError } = useToast();
  const load = useCallback(async () => {
    try {
      setPatients(await api.listPatients());
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível carregar os pacientes.',
      );
    } finally {
      setLoading(false);
    }
  }, [showError]);
  useEffect(() => {
    // A busca sincroniza o estado com a API externa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  return (
    <section>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-sm font-medium text-primary-600">
            Pro Avanço
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="mt-1 text-slate-500">
            Selecione um paciente para gerenciar seus anexos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="primary" onClick={() => setShowPicker(true)}>
            <UserPlus className="h-4 w-4" />
            Paciente do financeiro
          </button>
          <button className="secondary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Inserir paciente
          </button>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Users className="h-4 w-4 text-primary-600" />
        Pacientes
      </div>
      {loading ? <LoadingSpinner /> : <PatientTable patients={patients} />}
      {showForm && (
        <PatientForm
          onClose={() => setShowForm(false)}
          onCreated={() => void load()}
        />
      )}
      {showPicker && (
        <FinanceiroPatientPicker
          onClose={() => setShowPicker(false)}
          onAdded={() => void load()}
        />
      )}
    </section>
  );
}
