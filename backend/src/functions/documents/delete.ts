import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { documentService } from '../../services/documentService';
import { HttpError, handleError, success } from '../../utils/response';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const patientId = event.pathParameters?.patientId;
    const documentId = event.pathParameters?.documentId;
    if (!patientId || !documentId)
      throw new HttpError(404, 'Documento não encontrado');
    await documentService.remove(patientId, documentId);
    return success({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
};
