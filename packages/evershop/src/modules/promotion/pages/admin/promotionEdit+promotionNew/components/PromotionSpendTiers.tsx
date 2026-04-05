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

interface PromotionSpendTier {
  minAmount?: number | string;
  discountAmount?: number | string;
}

export function PromotionSpendTiers({
  tiers = []
}: {
  tiers?: PromotionSpendTier[];
}) {
  const { unregister } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray<{
    actions: {
      spend_tiers: {
        min_amount: number;
        discount_amount: number;
      }[];
    };
  }>({
    name: 'actions.spend_tiers'
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

    return () => unregister('actions.spend_tiers');
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium">Spend thresholds</h4>
        <p className="text-sm text-muted-foreground">
          Configure the spend ladder for spend-and-save promotions.
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
                  name={`actions.spend_tiers.${index}.min_amount`}
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
                  name={`actions.spend_tiers.${index}.discount_amount`}
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
        Add threshold
      </Button>
    </div>
  );
}
