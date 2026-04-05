import { NumberField } from '@components/common/form/NumberField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

interface SpendTier {
  minAmount?: number | string;
  discountAmount?: number | string;
}

interface SpendTiersProps {
  tiers?: SpendTier[];
}

export const SpendTiers: React.FC<SpendTiersProps> = ({ tiers = [] }) => {
  const { unregister } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray<{
    spend_tiers: {
      min_amount: number;
      discount_amount: number;
    }[];
  }>({
    name: 'spend_tiers'
  });

  useEffect(() => {
    replace(
      (tiers.length > 0 ? tiers : [{ minAmount: 0, discountAmount: 0 }]).map(
        (tier) => ({
          min_amount: Number(tier.minAmount) || 0,
          discount_amount: Number(tier.discountAmount) || 0
        })
      )
    );

    return () => {
      unregister('spend_tiers');
    };
  }, []);

  return (
    <div className="mt-6">
      <div className="mb-3">
        <h4 className="text-sm font-semibold">Spend &amp; Save Tiers</h4>
        <p className="text-sm text-muted-foreground">
          Define threshold-based discounts. The highest matched tier is applied.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Minimum spend</TableHead>
            <TableHead>Discount amount</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((tier, index) => (
            <TableRow key={tier.id}>
              <TableCell>
                <NumberField
                  name={`spend_tiers.${index}.min_amount`}
                  defaultValue={tier.min_amount}
                  min={0}
                  required
                  validation={{
                    required: 'Minimum spend is required'
                  }}
                  placeholder="0"
                  wrapperClassName="form-field mb-0"
                />
              </TableCell>
              <TableCell>
                <NumberField
                  name={`spend_tiers.${index}.discount_amount`}
                  defaultValue={tier.discount_amount}
                  min={0}
                  required
                  validation={{
                    required: 'Discount amount is required'
                  }}
                  placeholder="0"
                  wrapperClassName="form-field mb-0"
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  disabled={fields.length === 1}
                  onClick={(e) => {
                    e.preventDefault();
                    remove(index);
                  }}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-3">
        <Button
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            append({
              min_amount: 0,
              discount_amount: 0
            });
          }}
        >
          Add tier
        </Button>
      </div>
    </div>
  );
};
