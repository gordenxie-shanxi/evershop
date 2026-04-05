import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@components/common/ui/Alert.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import React from 'react';

interface PromotionEditFormProps {
  action: string;
  gridUrl: string;
  promotion?: {
    promotionId: number;
  };
  promotionConflicts?: {
    type: string;
    message: string;
    affectedIds?: string[];
  }[];
}

export default function PromotionEditForm({
  action,
  gridUrl,
  promotion,
  promotionConflicts = []
}: PromotionEditFormProps) {
  const filteredConflicts = promotion?.promotionId
    ? promotionConflicts.filter(
        (conflict) =>
          !conflict.affectedIds?.length ||
          conflict.affectedIds.includes(String(promotion.promotionId))
      )
    : promotionConflicts;

  return (
    <Form action={action} method="PATCH" id="promotionEditForm" submitBtn={false}>
      <div className="grid grid-cols-1 gap-5">
        {filteredConflicts.length > 0 && (
          <div className="grid gap-3">
            {filteredConflicts.map((conflict, index) => (
              <Alert key={`${conflict.type}-${index}`}>
                <AlertTitle>Conflict warning</AlertTitle>
                <AlertDescription>{conflict.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Update the promotion identity, schedule and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Area id="promotionEditGeneral" noOuter />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rule Configuration</CardTitle>
            <CardDescription>
              Review or adjust the configured offer rules and restrictions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Area id="promotionEditRule" noOuter />
          </CardContent>
        </Card>
      </div>
      <FormButtons formId="promotionEditForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updatePromotion", params: [{key: "id", value: getContextValue("promotionUuid")}]),
    gridUrl: url(routeId: "promotionGrid")
    promotion(id: getContextValue("promotionUuid", null)) {
      promotionId
    }
    promotionConflicts {
      type
      severity
      message
      affectedIds
    }
  }
`;
