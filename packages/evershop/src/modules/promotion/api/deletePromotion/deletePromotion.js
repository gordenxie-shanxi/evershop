import { OK } from '../../../../lib/util/httpStatus.js';
import { deletePromotion } from '../../services/promotionService.js';

export default async (request, response) => {
  await deletePromotion(request.params.id);
  response.status(OK);
  response.json({
    data: { success: true }
  });
};
