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

export const patientService = {
  async create(
    input: Omit<Patient, 'patientId' | 'createdAt'>,
  ): Promise<Patient> {
    const patient: Patient = {
      ...input,
      patientId: uuid(),
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
