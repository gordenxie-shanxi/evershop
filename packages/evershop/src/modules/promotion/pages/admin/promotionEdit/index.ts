import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const promotion = await select()
      .from('promotion')
      .where('promotion.uuid', '=', request.params.id)
      .load(pool);

    if (promotion === null) {
      response.redirect(302, buildUrl('promotionGrid'));
    } else {
      setContextValue(request, 'promotionUuid', promotion.uuid);
      setContextValue(request, 'promotionId', parseInt(promotion.promotion_id, 10));
      setPageMetaInfo(request, {
        title: promotion.name,
        description: promotion.description || promotion.name
      });
      next();
    }
  } catch (error) {
    next(error);
  }
};
