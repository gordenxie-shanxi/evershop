import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { toPrice } from '../../checkout/services/toPrice.js';

/**
 * Second-item-discount (第二件折扣) calculator.
 * Coupon must have discount_type = 'second_item_discount'
 * discount_amount = the discount percentage for the second item (e.g. 50 = 50% off)
 * target_products can optionally restrict which products qualify
 */
export async function secondItemDiscountCalculator(cart, coupon) {
  if (coupon.discount_type !== 'second_item_discount') {
    return false;
  }

  const priceIncludingTax = getConfig('pricing.tax.price_including_tax', false);
  const discountPercent = Math.min(parseFloat(coupon.discount_amount) || 0, 100);

  if (discountPercent <= 0) {
    return false;
  }

  const items = cart.getItems();
  const discounts = {};
  const targetProducts = coupon.target_products?.products || [];
  const maxQty = parseInt(coupon.target_products?.maxQty, 10) || 0;
  const eligibleUnits = [];
  let collections = [];

  if (targetProducts.some((targetProduct) => targetProduct.key === 'collection')) {
    collections = await select()
      .from('product_collection')
      .where(
        'product_id',
        'IN',
        items.map((item) => item.getData('product_id'))
      )
      .execute(pool);
  }

  const matchesTargetProducts = (item) => {
    if (targetProducts.length === 0) {
      return true;
    }

    let flag = true;

    targetProducts.forEach((targetProduct) => {
      if (flag === false) {
        return;
      }

      const { key } = targetProduct;
      let { operator } = targetProduct;
      const { value } = targetProduct;

      if (key === 'attribute_group') {
        if (!['IN', 'NOT IN'].includes(operator) || !Array.isArray(value)) {
          flag = false;
          return;
        }
        const attributeGroupIds = value.map((id) => parseInt(id.trim(), 10));
        flag =
          operator === 'IN'
            ? attributeGroupIds.includes(item.getData('group_id'))
            : !attributeGroupIds.includes(item.getData('group_id'));
      }

      if (key === 'category') {
        if (!['IN', 'NOT IN'].includes(operator) || !Array.isArray(value)) {
          flag = false;
          return;
        }
        const requiredCategoryIds = value.map((id) => parseInt(id.trim(), 10));
        flag =
          operator === 'IN'
            ? requiredCategoryIds.includes(item.getData('category_id'))
            : !requiredCategoryIds.includes(item.getData('category_id'));
      }

      if (key === 'collection') {
        if (!['IN', 'NOT IN'].includes(operator) || !Array.isArray(value)) {
          flag = false;
          return;
        }
        const requiredCollectionIds = value.map((id) => parseInt(id.trim(), 10));
        const isMatched = collections.some(
          (collection) =>
            requiredCollectionIds.includes(parseInt(collection.collection_id, 10)) &&
            parseInt(collection.product_id, 10) === item.getData('product_id')
        );
        flag = operator === 'IN' ? isMatched : !isMatched;
      }

      if (key === 'price') {
        if (!['=', '!=', '>', '>=', '<', '<='].includes(operator)) {
          flag = false;
          return;
        }
        const price = parseFloat(value);
        const comparablePrice = priceIncludingTax
          ? item.getData('final_price_incl_tax')
          : item.getData('final_price');
        if (Number.isNaN(price)) {
          flag = false;
          return;
        }
        if (operator === '=') {
          operator = '===';
        }
        flag = eval(`${comparablePrice} ${operator} ${price}`);
      }

      if (key === 'sku') {
        if (!['IN', 'NOT IN'].includes(operator) || !Array.isArray(value)) {
          flag = false;
          return;
        }
        const skus = value.map((entry) => entry.trim());
        flag =
          operator === 'IN'
            ? skus.includes(item.getData('product_sku'))
            : !skus.includes(item.getData('product_sku'));
      }
    });

    return flag;
  };

  items.forEach((item) => {
    discounts[item.getId()] = 0;

    if (!matchesTargetProducts(item)) {
      return;
    }
    const eligibleQty = maxQty > 0 ? Math.min(item.getData('qty'), maxQty) : item.getData('qty');
    if (eligibleQty <= 0) {
      return;
    }

    const unitPrice = priceIncludingTax
      ? item.getData('final_price_incl_tax')
      : item.getData('final_price');

    for (let index = 0; index < eligibleQty; index += 1) {
      eligibleUnits.push({
        itemId: item.getId(),
        unitPrice
      });
    }
  });

  if (eligibleUnits.length < 2) {
    await Promise.all(
      items.map(async (item) => {
        await item.setData('discount_amount', 0);
      })
    );
    return true;
  }

  eligibleUnits
    .sort((a, b) => b.unitPrice - a.unitPrice)
    .forEach((unit, index) => {
      if ((index + 1) % 2 === 0) {
        discounts[unit.itemId] = toPrice(
          discounts[unit.itemId] + (discountPercent * unit.unitPrice) / 100
        );
      }
    });

  items.forEach((item) => {
    discounts[item.getId()] = toPrice(discounts[item.getId()] || 0);
  });

  await Promise.all(
    items.map(async (item) => {
      await item.setData('discount_amount', discounts[item.getId()] || 0);
    })
  );

  return true;
}
