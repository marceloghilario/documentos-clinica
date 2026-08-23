import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { documentService } from '../../services/documentService';
import { patientService } from '../../services/patientService';
import { HttpError, handleError, success } from '../../utils/response';
import { isDocumentType } from '../../utils/validators';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const patientId = event.pathParameters?.patientId;
    if (!patientId) throw new HttpError(404, 'Paciente não encontrado');
    await patientService.get(patientId);
    const tipo = event.queryStringParameters?.tipo;
    if (tipo && !isDocumentType(tipo))
      throw new HttpError(400, 'Tipo de documento inválido');
    return success(await documentService.list(patientId, tipo));
  } catch (err) {
    return handleError(err);
  }
};
