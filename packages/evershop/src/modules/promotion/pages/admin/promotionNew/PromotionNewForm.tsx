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
import { toast } from 'react-toastify';

interface PromotionNewFormProps {
  action: string;
  gridUrl: string;
  promotionConflicts?: {
    type: string;
    message: string;
  }[];
}

export default function PromotionNewForm({
  action,
  gridUrl,
  promotionConflicts = []
}: PromotionNewFormProps) {
  return (
    <Form
      action={action}
      method="POST"
      id="promotionNewForm"
      submitBtn={false}
      onSuccess={(response) => {
        toast.success('Promotion created successfully!');
        const editUrl = response.data.links.find((link) => link.rel === 'edit').href;
        window.location.href = editUrl;
      }}
    >
      <div className="grid grid-cols-1 gap-5">
        {promotionConflicts.length > 0 && (
          <div className="grid gap-3">
            {promotionConflicts.map((conflict, index) => (
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
              Define the promotion identity, availability window and priority.
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
              Configure thresholds, restrictions and offer details for this promotion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Area id="promotionEditRule" noOuter />
          </CardContent>
        </Card>
      </div>
      <FormButtons formId="promotionNewForm" cancelUrl={gridUrl} />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "createPromotion")
    gridUrl: url(routeId: "promotionGrid")
    promotionConflicts {
      type
      severity
      message
      affectedIds
    }
  }
`;
