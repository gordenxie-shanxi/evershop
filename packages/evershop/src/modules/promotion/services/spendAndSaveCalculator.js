import { getConfig } from '../../../lib/util/getConfig.js';
import { toPrice } from '../../checkout/services/toPrice.js';

/**
 * Spend-and-save (满减) calculator.
 * Coupon must have discount_type = 'spend_and_save'
 * and spend_tiers = [{"min_amount": 50, "discount_amount": 5}, ...]
 * Applies the highest qualifying tier discount.
 */
export async function spendAndSaveCalculator(cart, coupon) {
  if (coupon.discount_type !== 'spend_and_save') {
    return false;
  }

  const spendTiers = coupon.spend_tiers;
  if (!spendTiers || !Array.isArray(spendTiers) || spendTiers.length === 0) {
    return false;
  }

  const priceIncludingTax = getConfig('pricing.tax.price_including_tax', false);
  const cartSubTotal = priceIncludingTax
    ? cart.getData('sub_total_incl_tax')
    : cart.getData('sub_total');

  // Sort tiers by min_amount descending to find the best applicable tier
  const sortedTiers = [...spendTiers].sort(
    (a, b) => parseFloat(b.min_amount) - parseFloat(a.min_amount)
  );

  let applicableTier = null;
  for (const tier of sortedTiers) {
    const minAmount = parseFloat(tier.min_amount) || 0;
    if (cartSubTotal >= minAmount) {
      applicableTier = tier;
      break;
    }
  }

  if (!applicableTier) {
    return false;
  }

  let cartDiscountAmount = toPrice(parseFloat(applicableTier.discount_amount) || 0);
  cartDiscountAmount = Math.min(cartDiscountAmount, cartSubTotal);

  if (cartDiscountAmount <= 0) {
    return false;
  }

  // Distribute discount proportionally across items
  let distributedAmount = 0;
  const discounts = {};
  const items = cart.getItems();

  items.forEach((item, index) => {
    let sharedDiscount = 0;
    if (index === items.length - 1) {
      const precision = getConfig('pricing.precision', '2');
      const precisionFix = parseInt(`1${'0'.repeat(precision)}`, 10);
      sharedDiscount =
        (cartDiscountAmount * precisionFix - distributedAmount * precisionFix) /
        precisionFix;
      sharedDiscount = parseFloat(sharedDiscount.toFixed(precision));
    } else {
      const lineTotal = priceIncludingTax
        ? item.getData('line_total_incl_tax')
        : item.getData('line_total');
      sharedDiscount = toPrice((lineTotal * cartDiscountAmount) / cartSubTotal, 0);
    }
    discounts[item.getId()] = sharedDiscount;
    distributedAmount += sharedDiscount;
  });

  await Promise.all(
    items.map(async (item) => {
      await item.setData('discount_amount', discounts[item.getId()] || 0);
    })
  );

  return true;
}
