import { normalizeCouponPayload } from '../../coupon/normalizeCouponPayload.js';

describe('normalizeCouponPayload', () => {
  it('should normalize spend tiers and promotion metadata', () => {
    const payload = normalizeCouponPayload({
      discount_type: 'spend_and_save',
      stacking_rule: 'stackable',
      max_uses_time_per_coupon: '10',
      max_uses_time_per_customer: '2',
      start_date: '2025-06-01',
      end_date: '2025-06-30',
      spend_tiers: [
        { minAmount: 100, discountAmount: 20 },
        { min_amount: 50, discount_amount: 5 }
      ]
    });

    expect(payload.stacking_rule).toEqual('stackable');
    expect(payload.max_uses_time_per_coupon).toEqual(10);
    expect(payload.max_uses_time_per_customer).toEqual(2);
    expect(payload.spend_tiers).toEqual([
      { min_amount: 50, discount_amount: 5 },
      { min_amount: 100, discount_amount: 20 }
    ]);
  });

  it('should reject invalid coupon date ranges', () => {
    expect(() =>
      normalizeCouponPayload({
        start_date: '2025-06-30',
        end_date: '2025-06-01'
      })
    ).toThrow('Coupon end date must be greater than or equal to the start date');
  });

  it('should reject duplicate spend tier thresholds', () => {
    expect(() =>
      normalizeCouponPayload({
        discount_type: 'spend_and_save',
        spend_tiers: [
          { min_amount: 100, discount_amount: 10 },
          { min_amount: 100, discount_amount: 20 }
        ]
      })
    ).toThrow('Spend and save tiers cannot share the same minimum spend');
  });

  it('should reject decimal usage limits', () => {
    expect(() =>
      normalizeCouponPayload({
        max_uses_time_per_coupon: '1.5'
      })
    ).toThrow('Coupon max uses per coupon must be a whole number greater than or equal to 0');
  });
});
