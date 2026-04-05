/**
 * Validates stacking rules when applying a coupon.
 * Exclusive coupons replace automatic promotions.
 * Stackable coupons can be combined with the best active promotion.
 */
export async function stackingRuleValidator(cart, coupon) {
  return ['exclusive', 'stackable', undefined, null].includes(
    coupon.stacking_rule
  );
}
