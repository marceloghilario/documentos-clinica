import { z, ZodError } from 'zod';
import type { DocumentType } from '../models';
import { SPECIALTIES } from '../models/specialties';
import { HttpError } from './response';

const year = z
  .number()
  .int()
  .min(2000)
  .max(2100, 'Ano deve estar entre 2000 e 2100');
const month = z.number().int().min(1).max(12);
const semester = z.union([z.literal(1), z.literal(2)]);

const common = {
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
};

export const PatientSchema = z
  .object({
    nome: z.string().trim().min(1, 'Nome é obrigatório').max(100),
    cpf: z
      .string()
      .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF deve conter 11 dígitos'),
    dataNascimento: z.string().optional(),
    responsavel: z.string().max(100).optional(),
    telefone: z.string().max(30).optional(),
  })
  .transform((value) => ({
    ...value,
    cpf: value.cpf.replace(/\D/g, ''),
  }));

export const UploadUrlSchema = z
  .object({
    ...common,
    multipart: z.boolean().optional(),
    partCount: z.number().int().min(1).max(10000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.multipart && !value.partCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partCount'],
        message: 'Quantidade de partes é obrigatória',
      });
    }
  });

const dateFields = {
  mes: month.optional(),
  ano: year.optional(),
  semestre: semester.optional(),
  especialidade: z.enum(SPECIALTIES).optional(),
};

export const DocumentSchema = z
  .object({
    tipo: z.enum([
      'NOTA_FISCAL',
      'LISTA_PRESENCA',
      'PEI',
      'RELATORIOS',
      'OUTROS',
    ]),
    ...dateFields,
    s3Key: z.string().min(1),
    fileName: z.string().min(1).max(200),
    size: z.number().int().positive(),
    contentType: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    const addIssue = (
      path: ['mes' | 'ano' | 'semestre' | 'especialidade'],
      message: string,
    ): void => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message,
      });
    };

    switch (value.tipo) {
      case 'NOTA_FISCAL':
      case 'LISTA_PRESENCA':
        if (value.mes === undefined || value.ano === undefined) {
          addIssue(['mes'], 'Mês e ano são obrigatórios para este tipo');
        }
        if (value.semestre !== undefined) {
          addIssue(['semestre'], 'Semestre não é permitido para este tipo');
        }
        if (value.especialidade !== undefined) {
          addIssue(
            ['especialidade'],
            'Especialidade só é permitida em relatórios',
          );
        }
        break;
      case 'PEI':
        if (value.semestre === undefined || value.ano === undefined) {
          addIssue(
            ['semestre'],
            'Semestre e ano são obrigatórios para este tipo',
          );
        }
        if (value.mes !== undefined) {
          addIssue(['mes'], 'Mês não é permitido para este tipo');
        }
        if (value.especialidade !== undefined) {
          addIssue(
            ['especialidade'],
            'Especialidade só é permitida em relatórios',
          );
        }
        break;
      case 'RELATORIOS':
        if (value.semestre === undefined || value.ano === undefined) {
          addIssue(
            ['semestre'],
            'Semestre e ano são obrigatórios para este tipo',
          );
        }
        if (value.mes !== undefined) {
          addIssue(['mes'], 'Mês não é permitido para este tipo');
        }
        if (value.especialidade === undefined) {
          addIssue(
            ['especialidade'],
            'Especialidade é obrigatória para relatórios',
          );
        }
        break;
      case 'OUTROS':
        if (value.semestre !== undefined) {
          addIssue(['semestre'], 'Semestre não é permitido para este tipo');
        }
        if (value.especialidade !== undefined) {
          addIssue(
            ['especialidade'],
            'Especialidade só é permitida em relatórios',
          );
        }
        break;
    }
  });

export const MultipartCompleteSchema = z.object({
  s3Key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        eTag: z.string().min(1),
      }),
    )
    .min(1),
});

export const parseBody = <T>(
  schema: z.ZodType<T>,
  body: string | null | undefined,
): T => {
  let parsed: unknown;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    throw new HttpError(400, 'Corpo da requisição inválido (JSON malformado)');
  }

  try {
    return schema.parse(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      throw new HttpError(400, message);
    }
    throw err;
  }
};

export const isDocumentType = (
  value: string | undefined,
): value is DocumentType =>
  ['NOTA_FISCAL', 'LISTA_PRESENCA', 'PEI', 'RELATORIOS', 'OUTROS'].includes(
    value ?? '',
  );
