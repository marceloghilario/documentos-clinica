import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
});
export const TABLES = {
  PATIENTS: process.env.PATIENTS_TABLE ?? '',
  DOCUMENTS: process.env.DOCUMENTS_TABLE ?? '',
} as const;
