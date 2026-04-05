import { DateField } from '@components/common/form/DateField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import React from 'react';

const STACKING_RULE_OPTIONS = [
  { value: 'exclusive', label: 'Exclusive (cannot stack with other coupons)' },
  { value: 'stackable', label: 'Stackable (can be combined with other promotions)' }
];

export const Setting: React.FC<{
  discountAmount?: number;
  startDate?: string;
  endDate?: string;
  stackingRule?: string;
  maxUsesTimePerCoupon?: number;
  maxUsesTimePerCustomer?: number;
}> = ({
  discountAmount,
  startDate,
  endDate,
  stackingRule,
  maxUsesTimePerCoupon,
  maxUsesTimePerCustomer
}) => {
  return (
    <div className="space-y-5 form-field-container">
      <div className="grid grid-cols-3 gap-5">
        <div>
          <NumberField
            name="discount_amount"
            defaultValue={discountAmount}
            placeholder="Discount amount"
            required
            label="Discount amount"
            validation={{
              required: 'Discount amount is required'
            }}
          />
        </div>
        <div>
          <DateField
            name="start_date"
            label="Start date"
            placeholder="Start date"
            defaultValue={startDate}
          />
        </div>
        <div>
          <DateField
            placeholder="End date"
            name="end_date"
            label="End date"
            defaultValue={endDate}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div>
          <SelectField
            name="stacking_rule"
            label="Stacking Rule"
            options={STACKING_RULE_OPTIONS}
            defaultValue={stackingRule || 'exclusive'}
            helperText="Controls whether this coupon can be combined with other active promotions."
          />
        </div>
        <div>
          <NumberField
            name="max_uses_time_per_coupon"
            defaultValue={maxUsesTimePerCoupon}
            placeholder="Unlimited"
            label="Max uses per coupon"
            allowDecimals={false}
            helperText="Total number of times this coupon can be used across all customers. Leave empty for unlimited."
          />
        </div>
        <div>
          <NumberField
            name="max_uses_time_per_customer"
            defaultValue={maxUsesTimePerCustomer}
            placeholder="Unlimited"
            label="Max uses per customer"
            allowDecimals={false}
            helperText="Number of times each customer can use this coupon. Leave empty for unlimited."
          />
        </div>
      </div>
    </div>
  );
};
