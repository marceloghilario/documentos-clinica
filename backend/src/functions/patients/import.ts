import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { patientService } from '../../services/patientService';
import { PatientImportSchema, parseBody } from '../../utils/validators';
import { handleError, success } from '../../utils/response';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    return success(
      await patientService.importFromFinanceiro(
        parseBody(PatientImportSchema, event.body),
      ),
      201,
    );
  } catch (err) {
    return handleError(err);
  }
};
