import {
  buildPromotionCouponDefinition,
  normalizePromotionPayload,
  parseTargetValues,
  validatePromotionPayload
} from '../../promotionRuleHelpers.js';

describe('promotionRuleHelpers', () => {
  it('should normalize and validate limited time specials', () => {
    const payload = normalizePromotionPayload(
      {
        name: 'Weekend Flash Sale',
        type: 'limited_time_special',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        conditions: {
          target_scope: 'sku',
          target_values: 'SKU-RED, SKU-BLUE'
        },
        actions: {
          discount_type: 'percentage',
          discount_amount: '15',
          badge_text: 'Weekend'
        }
      },
      { type: 'limited_time_special' }
    );

    expect(payload.conditions.target_values).toEqual(['SKU-RED', 'SKU-BLUE']);
    expect(payload.actions.discount_amount).toEqual(15);
    expect(() => validatePromotionPayload(payload)).not.toThrow();
  });

  it('should convert targeted flash sales to specific-product discounts', () => {
    const definition = buildPromotionCouponDefinition({
      uuid: 'promo-1',
      type: 'limited_time_special',
      conditions: {
        target_scope: 'category',
        target_values: ['3', '9']
      },
      actions: {
        discount_type: 'fixed_amount',
        discount_amount: 20
      }
    });

    expect(definition.discount_type).toEqual(
      'fixed_discount_to_specific_products'
    );
    expect(definition.target_products.products[0]).toEqual({
      key: 'category',
      operator: 'IN',
      value: ['3', '9']
    });
  });

  it('should parse comma and newline separated target values', () => {
    expect(parseTargetValues('SKU-1,\nSKU-2, SKU-3')).toEqual([
      'SKU-1',
      'SKU-2',
      'SKU-3'
    ]);
  });
});
