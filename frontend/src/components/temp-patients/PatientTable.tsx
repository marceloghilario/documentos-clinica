import { Link } from 'react-router-dom';
import { ChevronRight, UserRound } from 'lucide-react';
import type { Patient } from '../../types';
// TEMPORÁRIO: tabela será substituída pelo componente da integração de pacientes.
export default function PatientTable({ patients }: { patients: Patient[] }) {
  if (!patients.length)
    return (
      <div className="rounded-xl border border-dashed bg-white p-12 text-center text-slate-500">
        Nenhum paciente cadastrado.
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">Paciente</th>
            <th className="px-5 py-3">CPF</th>
            <th className="px-5 py-3">Telefone</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y">
          {patients.map((patient) => (
            <tr key={patient.patientId} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <Link
                  to={`/documentos/${patient.patientId}`}
                  className="flex items-center gap-3 font-medium text-primary-700"
                >
                  <span className="rounded-full bg-primary-50 p-2">
                    <UserRound className="h-4 w-4" />
                  </span>
                  {patient.nome}
                </Link>
              </td>
              <td className="px-5 py-4 text-slate-600">{patient.cpf}</td>
              <td className="px-5 py-4 text-slate-600">
                {patient.telefone || '—'}
              </td>
              <td className="px-5 py-4 text-right">
                <Link
                  to={`/documentos/${patient.patientId}`}
                  aria-label="Abrir paciente"
                >
                  <ChevronRight className="ml-auto h-5 w-5 text-slate-400" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
