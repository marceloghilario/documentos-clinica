import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { documentService } from '../../services/documentService';
import { patientService } from '../../services/patientService';
import { DocumentSchema, parseBody } from '../../utils/validators';
import { handleError, HttpError, success } from '../../utils/response';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const patientId = event.pathParameters?.patientId;
    if (!patientId) throw new HttpError(404, 'Paciente não encontrado');
    await patientService.get(patientId);
    const input = parseBody(DocumentSchema, event.body);
    return success(await documentService.create(patientId, input), 201);
  } catch (err) {
    return handleError(err);
  }
};
