function toNullableInteger(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const normalizedValue =
    typeof value === 'string' ? value.trim() : value;

  if (
    (typeof normalizedValue === 'string' && !/^\d+$/.test(normalizedValue)) ||
    !Number.isInteger(Number(normalizedValue)) ||
    Number(normalizedValue) < 0
  ) {
    throw new Error(`${fieldName} must be a whole number greater than or equal to 0`);
  }

  return Number(normalizedValue);
}

function toNullableDate(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return value;
}

function normalizeSpendTier(tier, index) {
  const minAmount = parseFloat(tier?.min_amount ?? tier?.minAmount);
  const discountAmount = parseFloat(
    tier?.discount_amount ?? tier?.discountAmount
  );

  if (Number.isNaN(minAmount) || minAmount < 0) {
    throw new Error(
      `Spend tier #${index + 1} minimum amount must be greater than or equal to 0`
    );
  }

  if (Number.isNaN(discountAmount) || discountAmount <= 0) {
    throw new Error(`Spend tier #${index + 1} discount amount must be greater than 0`);
  }

  return {
    min_amount: minAmount,
    discount_amount: discountAmount
  };
}

export function normalizeCouponPayload(data = {}) {
  const normalized = { ...data };

  if (data.stacking_rule !== undefined) {
    if (!['exclusive', 'stackable'].includes(data.stacking_rule)) {
      throw new Error('Coupon stacking rule is invalid');
    }
    normalized.stacking_rule = data.stacking_rule;
  }

  if (data.max_uses_time_per_coupon !== undefined) {
    normalized.max_uses_time_per_coupon = toNullableInteger(
      data.max_uses_time_per_coupon,
      'Coupon max uses per coupon'
    );
  }
  if (data.max_uses_time_per_customer !== undefined) {
    normalized.max_uses_time_per_customer = toNullableInteger(
      data.max_uses_time_per_customer,
      'Coupon max uses per customer'
    );
  }

  if (data.start_date !== undefined) {
    normalized.start_date = toNullableDate(
      data.start_date,
      'Coupon start date'
    );
  }
  if (data.end_date !== undefined) {
    normalized.end_date = toNullableDate(data.end_date, 'Coupon end date');
  }

  if (normalized.start_date && normalized.end_date) {
    const startDate = new Date(normalized.start_date);
    const endDate = new Date(normalized.end_date);
    if (startDate > endDate) {
      throw new Error('Coupon end date must be greater than or equal to the start date');
    }
  }

  if (data.spend_tiers !== undefined) {
    if (!Array.isArray(data.spend_tiers)) {
      throw new Error('Coupon spend tiers must be an array');
    }

    normalized.spend_tiers = data.spend_tiers
      .map(normalizeSpendTier)
      .sort((a, b) => a.min_amount - b.min_amount);

    const duplicatedThreshold = normalized.spend_tiers.findIndex(
      (tier, index) =>
        normalized.spend_tiers.findIndex(
          (candidate) => candidate.min_amount === tier.min_amount
        ) !== index
    );

    if (duplicatedThreshold !== -1) {
      throw new Error('Spend and save tiers cannot share the same minimum spend');
    }

    if (
      data.discount_type === 'spend_and_save' &&
      normalized.spend_tiers.length === 0
    ) {
      throw new Error('Spend and save coupons require at least one spend tier');
    }
  } else if (
    data.discount_type !== undefined &&
    data.discount_type !== 'spend_and_save'
  ) {
    normalized.spend_tiers = null;
  }

  return normalized;
}
