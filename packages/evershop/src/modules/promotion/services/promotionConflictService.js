import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';

function isMissingTableError(error) {
  return error?.code === '42P01';
}

export async function detectPromotionConflicts() {
  const conflicts = [];

  try {
    const promotions = await select()
      .from('promotion')
      .where('status', '=', true)
      .execute(pool);

    for (let i = 0; i < promotions.length; i += 1) {
      for (let j = i + 1; j < promotions.length; j += 1) {
        const first = promotions[i];
        const second = promotions[j];

        if (first.type !== second.type) {
          continue;
        }

        const firstStart = first.start_date
          ? new Date(first.start_date)
          : new Date(0);
        const firstEnd = first.end_date
          ? new Date(first.end_date)
          : new Date('9999-12-31');
        const secondStart = second.start_date
          ? new Date(second.start_date)
          : new Date(0);
        const secondEnd = second.end_date
          ? new Date(second.end_date)
          : new Date('9999-12-31');

        if (firstStart <= secondEnd && secondStart <= firstEnd) {
          conflicts.push({
            type: 'OVERLAPPING_PROMOTIONS',
            severity: 'WARNING',
            message: `Promotions "${first.name}" and "${second.name}" of type "${first.type}" overlap in time period`,
            affectedIds: [String(first.promotion_id), String(second.promotion_id)]
          });
        }
      }
    }

    const unlimitedCoupons = await select()
      .from('coupon')
      .where('status', '=', true)
      .andWhere('max_uses_time_per_coupon', 'IS NULL', null)
      .andWhere('end_date', 'IS NULL', null)
      .execute(pool);

    if (unlimitedCoupons.length > 0) {
      conflicts.push({
        type: 'UNLIMITED_COUPONS',
        severity: 'INFO',
        message: `${unlimitedCoupons.length} coupon(s) have no usage limit and no expiry date. Consider adding limits.`,
        affectedIds: unlimitedCoupons.map((coupon) => String(coupon.coupon_id))
      });
    }

    const stackableCoupons = await select()
      .from('coupon')
      .where('status', '=', true)
      .andWhere('stacking_rule', '=', 'stackable')
      .execute(pool);

    if (stackableCoupons.length > 5) {
      conflicts.push({
        type: 'TOO_MANY_STACKABLE_COUPONS',
        severity: 'INFO',
        message: `There are ${stackableCoupons.length} active stackable coupons. Consider reviewing for potential revenue impact.`,
        affectedIds: []
      });
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  return conflicts;
}
