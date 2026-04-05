import { select } from '@evershop/postgres-query-builder';

export const getPromotionsBaseQuery = () =>
  select().from('promotion').orderBy('promotion.priority', 'DESC');
