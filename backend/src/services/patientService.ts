import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import type { Patient } from '../models';
import { documentService } from './documentService';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';

const financeiroPatientId = (origemId: number): string => `fin-${origemId}`;

export const patientService = {
  async create(
    input: Omit<Patient, 'patientId' | 'createdAt'>,
  ): Promise<Patient> {
    const patient: Patient = {
      ...input,
      patientId: uuid(),
      origem: 'MANUAL',
      createdAt: new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.PATIENTS,
        Item: patient,
        ConditionExpression: 'attribute_not_exists(patientId)',
      }),
    );
    return patient;
  },
  async importFromFinanceiro(input: {
    origemId: number;
    nome: string;
    cpf?: string;
    convenio?: string;
  }): Promise<Patient> {
    const patientId = financeiroPatientId(input.origemId);
    const existing = await docClient.send(
      new GetCommand({ TableName: TABLES.PATIENTS, Key: { patientId } }),
    );
    const current = existing.Item as Patient | undefined;
    const patient: Patient = {
      ...current,
      ...input,
      patientId,
      origem: 'FINANCEIRO',
      createdAt: current?.createdAt ?? new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({ TableName: TABLES.PATIENTS, Item: patient }),
    );
    return patient;
  },
  async list(): Promise<Patient[]> {
    const result = await docClient.send(
      new ScanCommand({ TableName: TABLES.PATIENTS }),
    );
    return (result.Items ?? []) as Patient[];
  },
  async get(patientId: string): Promise<Patient> {
    const result = await docClient.send(
      new GetCommand({ TableName: TABLES.PATIENTS, Key: { patientId } }),
    );
    if (!result.Item) {
      throw new HttpError(404, 'Paciente não encontrado');
    }
    return result.Item as Patient;
  },
  async remove(patientId: string): Promise<void> {
    await this.get(patientId);
    if (await documentService.hasDocuments(patientId)) {
      throw new HttpError(
        409,
        'Não é possível excluir paciente que possui documentos',
      );
    }
    await docClient.send(
      new DeleteCommand({ TableName: TABLES.PATIENTS, Key: { patientId } }),
    );
  },
};
