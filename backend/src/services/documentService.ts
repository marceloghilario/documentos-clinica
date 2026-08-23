import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  UploadPartCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import type { Document } from '../models';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET ?? '';
const safeName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
const prefix = (patientId: string): string => `patients/${patientId}/`;
const ensureKeyBelongsTo = (s3Key: string, patientId: string): void => {
  if (!s3Key.startsWith(prefix(patientId)))
    throw new HttpError(400, 'Chave S3 inválida para este paciente');
};

const buildDownloadUrl = async (
  item: Pick<Document, 's3Key' | 'fileName'>,
): Promise<string> =>
  getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: item.s3Key,
      ResponseContentDisposition: `attachment; filename="${safeName(item.fileName)}"`,
    }),
    { expiresIn: 3600 },
  );

export interface UploadInput {
  fileName: string;
  contentType: string;
  size: number;
  multipart?: boolean;
  partCount?: number;
}

export interface DocumentWithUrl extends Document {
  downloadUrl: string;
}

export const documentService = {
  async getUploadUrl(
    patientId: string,
    input: UploadInput,
  ): Promise<{
    uploadUrl?: string;
    s3Key: string;
    uploadId?: string;
    partUrls?: { partNumber: number; url: string }[];
  }> {
    const s3Key = `${prefix(patientId)}${uuid()}-${safeName(input.fileName)}`;
    if (!input.multipart) {
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          ContentType: input.contentType,
        }),
        { expiresIn: 300 },
      );
      return { uploadUrl, s3Key };
    }
    const started = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: s3Key,
        ContentType: input.contentType,
      }),
    );
    if (!started.UploadId || !input.partCount) {
      throw new HttpError(500, 'Não foi possível iniciar o upload multipart');
    }
    const partUrls = await Promise.all(
      Array.from({ length: input.partCount }, async (_, index) => ({
        partNumber: index + 1,
        url: await getSignedUrl(
          s3,
          new UploadPartCommand({
            Bucket: BUCKET,
            Key: s3Key,
            UploadId: started.UploadId,
            PartNumber: index + 1,
          }),
          { expiresIn: 300 },
        ),
      })),
    );
    return { s3Key, uploadId: started.UploadId, partUrls };
  },
  async completeMultipart(
    patientId: string,
    input: {
      s3Key: string;
      uploadId: string;
      parts: { partNumber: number; eTag: string }[];
    },
  ): Promise<void> {
    ensureKeyBelongsTo(input.s3Key, patientId);
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: input.s3Key,
        UploadId: input.uploadId,
        MultipartUpload: {
          Parts: input.parts.map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.eTag,
          })),
        },
      }),
    );
  },
  async create(
    patientId: string,
    input: Omit<Document, 'documentId' | 'patientId' | 'createdAt'>,
  ): Promise<Document> {
    ensureKeyBelongsTo(input.s3Key, patientId);
    const document: Document = {
      ...input,
      patientId,
      documentId: uuid(),
      createdAt: new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.DOCUMENTS,
        Item: document,
        ConditionExpression: 'attribute_not_exists(documentId)',
      }),
    );
    return document;
  },
  async list(patientId: string, tipo?: string): Promise<DocumentWithUrl[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DOCUMENTS,
        IndexName: 'patientId-createdAt-index',
        KeyConditionExpression: 'patientId = :patientId',
        ExpressionAttributeValues: tipo
          ? { ':patientId': patientId, ':tipo': tipo }
          : { ':patientId': patientId },
        FilterExpression: tipo ? 'tipo = :tipo' : undefined,
        ScanIndexForward: false,
      }),
    );
    return Promise.all(
      ((result.Items ?? []) as Document[]).map(async (item) => ({
        ...item,
        downloadUrl: await buildDownloadUrl(item),
      })),
    );
  },
  async get(patientId: string, documentId: string): Promise<Document> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.DOCUMENTS,
        Key: { documentId },
      }),
    );
    const item = result.Item as Document | undefined;
    if (!item || item.patientId !== patientId) {
      throw new HttpError(404, 'Documento não encontrado');
    }
    return item;
  },
  async downloadUrl(patientId: string, documentId: string): Promise<string> {
    const item = await this.get(patientId, documentId);
    return buildDownloadUrl(item);
  },
  async remove(patientId: string, documentId: string): Promise<void> {
    const item = await this.get(patientId, documentId);
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: item.s3Key }));
    await docClient.send(
      new DeleteCommand({ TableName: TABLES.DOCUMENTS, Key: { documentId } }),
    );
  },
  async hasDocuments(patientId: string): Promise<boolean> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DOCUMENTS,
        IndexName: 'patientId-createdAt-index',
        KeyConditionExpression: 'patientId = :patientId',
        ExpressionAttributeValues: { ':patientId': patientId },
        Limit: 1,
        Select: 'COUNT',
      }),
    );
    return (result.Count ?? 0) > 0;
  },
  ensureKeyBelongsTo,
};
