import { createPromotion } from '../../services/promotionService.js';

export default async (request, response) => {
  const promotion = await createPromotion(request.body);
  return promotion;
};
