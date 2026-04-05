import { Button } from '@components/common/ui/Button.js';
import React from 'react';

interface NewPromotionButtonProps {
  newPromotionUrl: string;
}

export default function NewPromotionButton({
  newPromotionUrl
}: NewPromotionButtonProps) {
  return (
    <Button
      onClick={() => (window.location.href = newPromotionUrl)}
      title="New Promotion"
    >
      New Promotion
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newPromotionUrl: url(routeId: "promotionNew")
  }
`;
