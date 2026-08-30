import { FINANCEIRO_API_URL } from '../utils/constants';
import type { FinanceiroPatient } from '../types';

const TOKEN_KEY = 'documentos.financeiro.token';

export class FinanceiroError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'FinanceiroError';
    this.status = status;
  }
}

export const financeiroToken = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

interface FinanceiroRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
}

async function request<T>(
  path: string,
  options: FinanceiroRequestOptions = {},
): Promise<T> {
  const token = options.token;
  const response = await fetch(`${FINANCEIRO_API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* resposta sem JSON */
  }
  if (!response.ok) {
    const detail =
      typeof payload === 'object' &&
      payload !== null &&
      typeof (payload as { detail?: unknown }).detail === 'string'
        ? (payload as { detail: string }).detail
        : `Erro na requisição ao financeiro (${response.status})`;
    throw new FinanceiroError(detail, response.status);
  }
  return payload as T;
}

interface LoginResponse {
  access_token?: string;
  pending?: boolean;
}

interface PatientResponse {
  id: number;
  name: string;
  cpf?: string | null;
  health_plan_name?: string | null;
  active?: number;
}

export const financeiro = {
  async login(email: string, password: string): Promise<string> {
    const data = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (!data.access_token) {
      throw new FinanceiroError(
        data.pending
          ? 'Usuário aguardando aprovação no sistema financeiro.'
          : 'Não foi possível autenticar no sistema financeiro.',
        403,
      );
    }
    financeiroToken.set(data.access_token);
    return data.access_token;
  },
  async listPatients(): Promise<FinanceiroPatient[]> {
    const token = financeiroToken.get();
    if (!token) throw new FinanceiroError('Não autenticado.', 401);
    const rows = await request<PatientResponse[]>('/patients', { token });
    return rows.map((row) => ({
      id: row.id,
      nome: row.name,
      cpf: row.cpf ?? undefined,
      convenio: row.health_plan_name ?? undefined,
      ativo: row.active !== 0,
    }));
  },
};
