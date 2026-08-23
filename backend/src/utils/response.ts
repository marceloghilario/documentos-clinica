import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

export const success = (
  data: unknown,
  statusCode = 200,
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers,
  body: JSON.stringify({ success: true, data }),
});

export const error = (
  message: string,
  statusCode = 400,
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers,
  body: JSON.stringify({ success: false, error: message }),
});

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const handleError = (err: unknown): APIGatewayProxyResultV2 => {
  if (err instanceof HttpError) return error(err.message, err.statusCode);
  if (err instanceof Error && err.name === 'ZodError')
    return error(err.message);
  console.error('Unhandled error:', err);
  return error('Erro interno do servidor', 500);
};
