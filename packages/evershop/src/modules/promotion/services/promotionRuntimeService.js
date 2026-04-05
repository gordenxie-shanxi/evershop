import { getConfig } from '../../../lib/util/getConfig.js';
import { toPrice } from '../../checkout/services/toPrice.js';
import { runDiscountCalculators } from './discountCalculator.js';
import { buildPromotionCouponDefinition } from './promotionRuleHelpers.js';
import { getActivePromotions } from './promotionService.js';

function getItemMaximumDiscount(item) {
  const priceIncludingTax = getConfig('pricing.tax.price_including_tax', false);
  return priceIncludingTax
    ? toPrice(item.getData('line_total_incl_tax'))
    : toPrice(item.getData('line_total'));
}

export async function applyItemDiscountSnapshot(items, snapshot = {}) {
  await Promise.all(
    items.map(async (item) => {
      await item.setData('discount_amount', toPrice(snapshot[item.getId()] || 0));
    })
  );
}

export function captureItemDiscountSnapshot(items) {
  return items.reduce(
    (result, item) => {
      const discountAmount = toPrice(item.getData('discount_amount') || 0);
      return {
        total: toPrice(result.total + discountAmount),
        discounts: {
          ...result.discounts,
          [item.getId()]: discountAmount
        }
      };
    },
    { total: 0, discounts: {} }
  );
}

export async function getBestPromotionDiscount(cart, promotions = null) {
  const items = cart.getItems();
  const activePromotions = promotions || (await getActivePromotions());
  let bestCandidate = {
    promotion: null,
    total: 0,
    discounts: {}
  };

  await applyItemDiscountSnapshot(items, {});

  for (let i = 0; i < activePromotions.length; i += 1) {
    const promotion = activePromotions[i];
    const discountDefinition = buildPromotionCouponDefinition(promotion);

    if (!discountDefinition) {
      continue;
    }

    await applyItemDiscountSnapshot(items, {});
    await runDiscountCalculators(cart, discountDefinition);
    const snapshot = captureItemDiscountSnapshot(items);

    if (snapshot.total === 0) {
      continue;
    }

    if (
      snapshot.total > bestCandidate.total ||
      (snapshot.total === bestCandidate.total &&
        (promotion.priority || 0) > (bestCandidate.promotion?.priority || 0))
    ) {
      bestCandidate = {
        promotion,
        total: snapshot.total,
        discounts: snapshot.discounts
      };
    }
  }

  await applyItemDiscountSnapshot(items, bestCandidate.discounts);
  return bestCandidate;
}

export function mergeDiscountSnapshots(items, ...snapshots) {
  return items.reduce((result, item) => {
    const mergedDiscount = snapshots.reduce((total, snapshot) => {
      return total + (snapshot[item.getId()] || 0);
    }, 0);

    result[item.getId()] = Math.min(
      getItemMaximumDiscount(item),
      toPrice(mergedDiscount)
    );

    return result;
  }, {});
}
