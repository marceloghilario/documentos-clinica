import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { patientService } from '../../services/patientService';
import { HttpError, handleError, success } from '../../utils/response';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const patientId = event.pathParameters?.patientId;
    if (!patientId) throw new HttpError(404, 'Paciente não encontrado');
    return success(await patientService.get(patientId));
  } catch (err) {
    return handleError(err);
  }
};
