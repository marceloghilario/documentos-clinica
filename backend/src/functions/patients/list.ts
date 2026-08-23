import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { patientService } from '../../services/patientService';
import { handleError, success } from '../../utils/response';

export const handler = async (): Promise<APIGatewayProxyResultV2> => {
  try {
    return success(await patientService.list());
  } catch (err) {
    return handleError(err);
  }
};
