const PROMOTION_TYPES = [
  'spend_and_save',
  'second_item_discount',
  'limited_time_special'
];

const TARGET_SCOPES = ['all', 'category', 'collection', 'sku'];
const LIMITED_TIME_DISCOUNT_TYPES = ['fixed_amount', 'percentage'];

function toTrimmedString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function toNullableText(value) {
  const normalized = toTrimmedString(value);
  return normalized === '' ? null : normalized;
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

function toPositiveNumber(value, fieldName, { allowZero = false } = {}) {
  const parsed = typeof value === 'number' ? value : parseFloat(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (allowZero ? parsed < 0 : parsed <= 0) {
    throw new Error(
      `${fieldName} must be ${allowZero ? 'greater than or equal to' : 'greater than'} 0`
    );
  }

  return parsed;
}

function normalizeTier(tier, index) {
  return {
    min_amount: toPositiveNumber(
      tier?.min_amount ?? tier?.minAmount,
      `Spend tier #${index + 1} minimum amount`,
      { allowZero: true }
    ),
    discount_amount: toPositiveNumber(
      tier?.discount_amount ?? tier?.discountAmount,
      `Spend tier #${index + 1} discount amount`
    )
  };
}

export function parseTargetValues(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toTrimmedString(entry))
      .filter((entry) => entry !== '');
  }

  if (value === undefined || value === null) {
    return [];
  }

  return String(value)
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

export function buildTargetProductsFromScope(
  scope,
  targetValues,
  { maxQty = 999999 } = {}
) {
  if (!scope || scope === 'all') {
    return null;
  }

  const parsedValues = parseTargetValues(targetValues);
  if (parsedValues.length === 0) {
    return null;
  }

  return {
    maxQty,
    products: [
      {
        key: scope,
        operator: 'IN',
        value: parsedValues
      }
    ]
  };
}

function normalizePromotionConditions(type, conditions = {}) {
  if (conditions === null) {
    return null;
  }

  if (typeof conditions !== 'object' || Array.isArray(conditions)) {
    throw new Error('Promotion conditions must be an object');
  }

  if (type === 'spend_and_save') {
    return {};
  }

  const targetScope =
    toTrimmedString(conditions.target_scope ?? conditions.targetScope) || 'all';

  if (!TARGET_SCOPES.includes(targetScope)) {
    throw new Error('Promotion target scope is invalid');
  }

  const normalized = {
    target_scope: targetScope,
    target_values:
      targetScope === 'all'
        ? []
        : parseTargetValues(
            conditions.target_values ?? conditions.targetValues ?? []
          )
  };

  const notes = toNullableText(conditions.notes);
  if (notes) {
    normalized.notes = notes;
  }

  return normalized;
}

function normalizePromotionActions(type, actions = {}) {
  if (actions === null) {
    return null;
  }

  if (typeof actions !== 'object' || Array.isArray(actions)) {
    throw new Error('Promotion actions must be an object');
  }

  if (type === 'spend_and_save') {
    const spendTiers = actions.spend_tiers ?? actions.spendTiers ?? [];
    return {
      spend_tiers: spendTiers.map(normalizeTier).sort((a, b) => {
        if (a.min_amount === b.min_amount) {
          return b.discount_amount - a.discount_amount;
        }
        return a.min_amount - b.min_amount;
      })
    };
  }

  if (type === 'second_item_discount') {
    return {
      discount_percent: toPositiveNumber(
        actions.discount_percent ?? actions.discountPercent,
        'Second item discount percentage'
      )
    };
  }

  const discountType =
    toTrimmedString(actions.discount_type ?? actions.discountType) ||
    'fixed_amount';

  if (!LIMITED_TIME_DISCOUNT_TYPES.includes(discountType)) {
    throw new Error('Limited time special discount type is invalid');
  }

  const normalized = {
    discount_type: discountType,
    discount_amount: toPositiveNumber(
      actions.discount_amount ?? actions.discountAmount,
      'Limited time special discount amount'
    )
  };

  const badgeText = toNullableText(actions.badge_text ?? actions.badgeText);
  if (badgeText) {
    normalized.badge_text = badgeText;
  }

  return normalized;
}

export function normalizePromotionPayload(data = {}, { type } = {}) {
  const normalized = {};
  const promotionType = type || data.type;

  if (data.name !== undefined) {
    normalized.name = toTrimmedString(data.name);
  }

  if (data.description !== undefined) {
    normalized.description = toNullableText(data.description);
  }

  if (data.status !== undefined) {
    normalized.status =
      data.status === 1 ||
      data.status === '1' ||
      data.status === true ||
      data.status === 'true';
  }

  if (data.type !== undefined) {
    normalized.type = data.type;
  }

  if (data.priority !== undefined) {
    const parsedPriority = parseInt(data.priority, 10);
    if (Number.isNaN(parsedPriority) || parsedPriority < 0) {
      throw new Error('Promotion priority must be a whole number greater than or equal to 0');
    }
    normalized.priority = parsedPriority;
  }

  if (data.startDate !== undefined || data.start_date !== undefined) {
    normalized.start_date = toNullableDate(
      data.startDate ?? data.start_date,
      'Promotion start date'
    );
  }

  if (data.endDate !== undefined || data.end_date !== undefined) {
    normalized.end_date = toNullableDate(
      data.endDate ?? data.end_date,
      'Promotion end date'
    );
  }

  if (data.conditions !== undefined) {
    normalized.conditions = normalizePromotionConditions(
      promotionType,
      data.conditions
    );
  }

  if (data.actions !== undefined) {
    normalized.actions = normalizePromotionActions(promotionType, data.actions);
  }

  return normalized;
}

export function validatePromotionPayload(data = {}) {
  const type = data.type;

  if (!PROMOTION_TYPES.includes(type)) {
    throw new Error('Promotion type is invalid');
  }

  if (!toTrimmedString(data.name)) {
    throw new Error('Promotion name is required');
  }

  if (data.priority !== undefined && (!Number.isInteger(data.priority) || data.priority < 0)) {
    throw new Error('Promotion priority must be a whole number greater than or equal to 0');
  }

  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (startDate > endDate) {
      throw new Error('Promotion end date must be greater than or equal to the start date');
    }
  }

  if (type === 'spend_and_save') {
    const spendTiers = data.actions?.spend_tiers;
    if (!Array.isArray(spendTiers) || spendTiers.length === 0) {
      throw new Error('Spend and save promotions require at least one spend tier');
    }

    const duplicatedThreshold = spendTiers.findIndex(
      (tier, index) =>
        spendTiers.findIndex(
          (candidate) => candidate.min_amount === tier.min_amount
        ) !== index
    );

    if (duplicatedThreshold !== -1) {
      throw new Error('Spend and save tiers cannot share the same minimum spend');
    }
  }

  if (type === 'second_item_discount') {
    const discountPercent = data.actions?.discount_percent;
    if (typeof discountPercent !== 'number') {
      throw new Error('Second item discount promotions require a discount percentage');
    }
    if (discountPercent <= 0 || discountPercent > 100) {
      throw new Error('Second item discount percentage must be between 0 and 100');
    }
  }

  if (type === 'limited_time_special') {
    if (!data.actions) {
      throw new Error('Limited time special promotions require a discount action');
    }
    if (!data.start_date || !data.end_date) {
      throw new Error('Limited time special promotions require both a start and end date');
    }

    if (data.actions?.discount_type === 'percentage') {
      if (data.actions.discount_amount > 100) {
        throw new Error('Percentage based limited time specials cannot exceed 100%');
      }
    }
  }

  const targetScope = data.conditions?.target_scope || 'all';
  if (targetScope !== 'all' && (data.conditions?.target_values || []).length === 0) {
    throw new Error('Restricted promotions must define at least one target value');
  }
}

export function buildPromotionCouponDefinition(promotion) {
  const conditions = promotion?.conditions || {};
  const actions = promotion?.actions || {};

  if (promotion?.type === 'spend_and_save') {
    return {
      coupon: `promotion:${promotion.uuid || promotion.promotion_id}`,
      discount_type: 'spend_and_save',
      spend_tiers: actions.spend_tiers ?? actions.spendTiers ?? []
    };
  }

  if (promotion?.type === 'second_item_discount') {
    return {
      coupon: `promotion:${promotion.uuid || promotion.promotion_id}`,
      discount_type: 'second_item_discount',
      discount_amount:
        actions.discount_percent ?? actions.discountPercent ?? 0,
      target_products: buildTargetProductsFromScope(
        conditions.target_scope ?? conditions.targetScope ?? 'all',
        conditions.target_values ?? conditions.targetValues ?? []
      )
    };
  }

  if (promotion?.type === 'limited_time_special') {
    const discountType =
      actions.discount_type ?? actions.discountType ?? 'fixed_amount';
    const targetProducts = buildTargetProductsFromScope(
      conditions.target_scope ?? conditions.targetScope ?? 'all',
      conditions.target_values ?? conditions.targetValues ?? []
    );

    if (targetProducts) {
      return {
        coupon: `promotion:${promotion.uuid || promotion.promotion_id}`,
        discount_type:
          discountType === 'percentage'
            ? 'percentage_discount_to_specific_products'
            : 'fixed_discount_to_specific_products',
        discount_amount:
          actions.discount_amount ?? actions.discountAmount ?? 0,
        target_products: targetProducts
      };
    }

    return {
      coupon: `promotion:${promotion.uuid || promotion.promotion_id}`,
      discount_type:
        discountType === 'percentage'
          ? 'percentage_discount_to_entire_order'
          : 'fixed_discount_to_entire_order',
      discount_amount: actions.discount_amount ?? actions.discountAmount ?? 0
    };
  }

  return null;
}

export const promotionRuleConstants = {
  PROMOTION_TYPES,
  TARGET_SCOPES,
  LIMITED_TIME_DISCOUNT_TYPES
};
