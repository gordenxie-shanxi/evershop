import { updatePromotion } from '../../services/promotionService.js';

export default async (request, response) => {
  const promotion = await updatePromotion(request.params.id, request.body);
  return promotion;
};
