import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const promotion = await getDelegate('createPromotion', request);
  response.status(OK);
  response.json({
    data: {
      ...promotion,
      links: [
        {
          rel: 'promotionGrid',
          href: buildUrl('promotionGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('promotionEdit', { id: promotion.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
