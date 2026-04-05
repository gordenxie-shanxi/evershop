import { DateField } from '@components/common/form/DateField.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import React from 'react';

interface PromotionGeneralProps {
  promotion?: {
    name?: string;
    description?: string;
    status?: number;
    type?: string;
    priority?: number;
    startDate?: {
      text?: string;
    };
    endDate?: {
      text?: string;
    };
  };
}

const PROMOTION_TYPE_OPTIONS = [
  {
    value: 'spend_and_save',
    label: 'Spend and Save'
  },
  {
    value: 'second_item_discount',
    label: 'Second Item Discount'
  },
  {
    value: 'limited_time_special',
    label: 'Limited Time Special'
  }
];

export default function PromotionGeneral({
  promotion
}: PromotionGeneralProps) {
  return (
    <div className="grid gap-5">
      <InputField
        name="name"
        label="Promotion name"
        required
        defaultValue={promotion?.name || ''}
        placeholder="Enter promotion name"
      />
      <TextareaField
        name="description"
        label="Description"
        defaultValue={promotion?.description || ''}
        placeholder="Describe the offer shown to administrators"
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <RadioGroupField
          name="status"
          label="Status"
          defaultValue={promotion?.status === 0 ? 0 : 1}
          options={[
            { label: 'Enabled', value: 1 },
            { label: 'Disabled', value: 0 }
          ]}
          required
        />
        <SelectField
          name="type"
          label="Promotion type"
          options={PROMOTION_TYPE_OPTIONS}
          defaultValue={promotion?.type || 'spend_and_save'}
          required
          helperText="Choose the rule type before filling the rule configuration below."
        />
        <NumberField
          name="priority"
          label="Priority"
          defaultValue={promotion?.priority || 0}
          allowDecimals={false}
          min={0}
          helperText="Higher priority promotions are reviewed first by administrators."
        />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <DateField
          name="start_date"
          label="Start date"
          defaultValue={promotion?.startDate?.text || ''}
        />
        <DateField
          name="end_date"
          label="End date"
          defaultValue={promotion?.endDate?.text || ''}
        />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'promotionEditGeneral',
  sortOrder: 10
};

export const query = `
  query Query {
    promotion(id: getContextValue("promotionUuid", null)) {
      name
      description
      status
      type
      priority
      startDate {
        text
      }
      endDate {
        text
      }
    }
  }
`;
