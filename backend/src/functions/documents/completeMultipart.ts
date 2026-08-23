import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { documentService } from '../../services/documentService';
import { patientService } from '../../services/patientService';
import { HttpError, handleError, success } from '../../utils/response';
import { MultipartCompleteSchema, parseBody } from '../../utils/validators';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const patientId = event.pathParameters?.patientId;
    if (!patientId) throw new HttpError(404, 'Paciente não encontrado');
    await patientService.get(patientId);
    await documentService.completeMultipart(
      patientId,
      parseBody(MultipartCompleteSchema, event.body),
    );
    return success({ completed: true });
  } catch (err) {
    return handleError(err);
  }
};
