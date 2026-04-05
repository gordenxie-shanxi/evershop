import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { Alert, AlertDescription, AlertTitle } from '@components/common/ui/Alert.js';
import React from 'react';
import { useWatch } from 'react-hook-form';
import { get } from '../../../../../lib/util/get.js';
import { PromotionSpendTiers } from './components/PromotionSpendTiers.js';

interface PromotionRuleProps {
  promotion?: {
    type?: string;
    conditions?: Record<string, unknown>;
    actions?: Record<string, unknown>;
  };
}

const TARGET_SCOPE_OPTIONS = [
  { value: 'all', label: 'All products' },
  { value: 'category', label: 'Specific categories' },
  { value: 'collection', label: 'Specific collections' },
  { value: 'sku', label: 'Specific SKUs' }
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'fixed_amount', label: 'Fixed amount off' },
  { value: 'percentage', label: 'Percentage off' }
];

const getTargetValuesDefault = (condition) => {
  const value = get(condition, 'targetValues', get(condition, 'target_values', ''));
  return Array.isArray(value) ? value.join(', ') : value || '';
};

export default function PromotionRule({ promotion }: PromotionRuleProps) {
  const selectedType = useWatch({
    name: 'type',
    defaultValue: promotion?.type || 'spend_and_save'
  });
  const conditions = promotion?.conditions || {};
  const actions = promotion?.actions || {};

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Rule configuration</AlertTitle>
        <AlertDescription>
          Configure business rules using dedicated inputs instead of raw JSON. The
          saved data is stored in the promotion conditions/actions payload.
        </AlertDescription>
      </Alert>

      {selectedType === 'spend_and_save' && (
        <PromotionSpendTiers
          tiers={get(actions, 'spendTiers', get(actions, 'spend_tiers', []))}
        />
      )}

      {selectedType === 'second_item_discount' && (
        <div className="grid gap-5">
          <NumberField
            name="actions.discount_percent"
            label="Second item discount (%)"
            defaultValue={get(
              actions,
              'discountPercent',
              get(actions, 'discount_percent', 50)
            )}
            min={0}
            max={100}
            helperText="Discount percentage applied to each second item."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              name="conditions.target_scope"
              label="Restriction scope"
              defaultValue={get(
                conditions,
                'targetScope',
                get(conditions, 'target_scope', 'all')
              )}
              options={TARGET_SCOPE_OPTIONS}
              helperText="Choose whether this offer is restricted to categories, collections or SKUs."
            />
            <InputField
              name="conditions.target_values"
              label="Restricted values"
              defaultValue={getTargetValuesDefault(conditions)}
              placeholder="e.g. 3,5,8 or SKU-RED-TSHIRT"
              helperText="Comma separated values for the selected scope. Leave empty for all products."
            />
          </div>
          <TextareaField
            name="conditions.notes"
            label="Internal notes"
            defaultValue={get(conditions, 'notes', '')}
            placeholder="Explain how merchandisers should use this second-item offer."
          />
        </div>
      )}

      {selectedType === 'limited_time_special' && (
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              name="actions.discount_type"
              label="Discount type"
              defaultValue={get(
                actions,
                'discountType',
                get(actions, 'discount_type', 'fixed_amount')
              )}
              options={DISCOUNT_TYPE_OPTIONS}
            />
            <NumberField
              name="actions.discount_amount"
              label="Discount amount"
              defaultValue={get(
                actions,
                'discountAmount',
                get(actions, 'discount_amount', 0)
              )}
              min={0}
            />
          </div>
          <InputField
            name="actions.badge_text"
            label="Badge text"
            defaultValue={get(
              actions,
              'badgeText',
              get(actions, 'badge_text', 'Limited time')
            )}
            placeholder="Limited time"
            helperText="Optional label shown to administrators when reviewing the promotion."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              name="conditions.target_scope"
              label="Restriction scope"
              defaultValue={get(
                conditions,
                'targetScope',
                get(conditions, 'target_scope', 'all')
              )}
              options={TARGET_SCOPE_OPTIONS}
            />
            <InputField
              name="conditions.target_values"
              label="Restricted values"
              defaultValue={getTargetValuesDefault(conditions)}
              placeholder="Comma separated product/category identifiers"
            />
          </div>
          <TextareaField
            name="conditions.notes"
            label="Internal notes"
            defaultValue={get(conditions, 'notes', '')}
            placeholder="Capture merchandising guidance or hand-off notes."
          />
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'promotionEditRule',
  sortOrder: 20
};

export const query = `
  query Query {
    promotion(id: getContextValue("promotionUuid", null)) {
      type
      conditions
      actions
    }
  }
`;
