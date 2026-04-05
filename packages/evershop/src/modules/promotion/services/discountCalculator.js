import { getValueSync } from '../../../lib/util/registry.js';

export async function runDiscountCalculators(cart, discountDefinition) {
  const calculatorFunctions = getValueSync('discountCalculatorFunctions', []);
  let applied = false;

  for (let i = 0; i < calculatorFunctions.length; i += 1) {
    const result = await calculatorFunctions[i](cart, discountDefinition);
    if (result === true) {
      applied = true;
    }
  }

  return applied;
}

export async function calculateDiscount(cart, couponCode = null) {
  const couponLoader = getValueSync('couponLoaderFunction');
  const coupon = await couponLoader(couponCode);

  if (!coupon) {
    return false;
  }

  return runDiscountCalculators(cart, coupon);
}
