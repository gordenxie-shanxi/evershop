import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import couponDataSchema from './couponDataSchema.json' with { type: 'json' };
import { normalizeCouponPayload } from './normalizeCouponPayload.js';

function validateSpendAndSaveCouponData(data, existingCoupon = null) {
  const effectiveDiscountType = data.discount_type || existingCoupon?.discount_type;
  const effectiveSpendTiers =
    data.spend_tiers !== undefined ? data.spend_tiers : existingCoupon?.spend_tiers;

  if (
    effectiveDiscountType === 'spend_and_save' &&
    (!Array.isArray(effectiveSpendTiers) || effectiveSpendTiers.length === 0)
  ) {
    throw new Error('Spend and save coupons require at least one spend tier');
  }
}

function validateCouponDataBeforeInsert(data) {
  const ajv = getAjv();
  couponDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateCouponDataJsonSchema',
    couponDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateCouponData(uuid, data, connection) {
  const coupon = await select()
    .from('coupon')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!coupon) {
    throw new Error('Requested coupon not found');
  }

  try {
    const newCoupon = await update('coupon')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);

    if (data.coupon && data.coupon !== coupon.coupon) {
      await update('order')
        .given({ coupon: data.coupon })
        .where('coupon', '=', coupon.coupon)
        .execute(connection);

      await update('customer_coupon_use')
        .given({ coupon: data.coupon })
        .where('coupon_id', '=', coupon.coupon_id)
        .execute(connection);
    }

    return newCoupon;
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    } else {
      return coupon;
    }
  }
}

/**
 * Update coupon service. This service will update a coupon with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function updateCoupon(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const existingCoupon = await select()
      .from('coupon')
      .where('uuid', '=', uuid)
      .load(connection);

    if (!existingCoupon) {
      throw new Error('Requested coupon not found');
    }

    const couponData = normalizeCouponPayload(
      await getValue('couponDataBeforeUpdate', data)
    );
    validateSpendAndSaveCouponData(couponData, existingCoupon);
    // Validate coupon data
    validateCouponDataBeforeInsert(couponData);

    // Insert coupon data
    const coupon = await hookable(updateCouponData, { ...context, connection })(
      uuid,
      couponData,
      connection
    );

    await commit(connection);
    return coupon;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (uuid, data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const coupon = await hookable(updateCoupon, context)(uuid, data, context);
  return coupon;
};
