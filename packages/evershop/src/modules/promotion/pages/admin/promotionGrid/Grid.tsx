import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { SortableHeader } from '@components/admin/grid/header/Sortable.js';
import { Status } from '@components/admin/Status.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import { Alert, AlertDescription, AlertTitle } from '@components/common/ui/Alert.js';
import { Badge } from '@components/common/ui/Badge.js';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader
} from '@components/common/ui/Card.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

interface PromotionRow {
  promotionId: number;
  uuid: string;
  name: string;
  type: string;
  priority: number;
  status: number;
  editUrl: string;
  updateApi: string;
  deleteApi: string;
  startDate?: { text?: string };
  endDate?: { text?: string };
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
}

interface PromotionFilter {
  key: string;
  operation: string;
  value: string;
}

interface PromotionConflict {
  type: string;
  severity: string;
  message: string;
}

interface PromotionGridProps {
  promotions: {
    items: PromotionRow[];
    total: number;
    currentFilters?: PromotionFilter[];
  };
  promotionConflicts?: PromotionConflict[];
}

function getTypeLabel(type) {
  switch (type) {
    case 'spend_and_save':
      return 'Spend and Save';
    case 'second_item_discount':
      return 'Second Item Discount';
    case 'limited_time_special':
      return 'Limited Time Special';
    default:
      return type;
  }
}

function getSeverityVariant(severity) {
  switch (severity) {
    case 'WARNING':
      return 'warning';
    case 'ERROR':
      return 'destructive';
    default:
      return 'default';
  }
}

function getRuleSummary(promotion) {
  const actions = promotion.actions || {};
  const conditions = promotion.conditions || {};

  if (promotion.type === 'spend_and_save') {
    const tiers = actions.spendTiers || actions.spend_tiers || [];
    if (tiers.length === 0) {
      return 'No spend thresholds configured';
    }
    return `${tiers.length} threshold${tiers.length > 1 ? 's' : ''} configured`;
  }

  if (promotion.type === 'second_item_discount') {
    const percent = actions.discountPercent || actions.discount_percent || 0;
    const scope = conditions.targetScope || conditions.target_scope || 'all';
    return `${percent}% off every second item (${scope})`;
  }

  if (promotion.type === 'limited_time_special') {
    const discountType =
      actions.discountType || actions.discount_type || 'fixed_amount';
    const amount = actions.discountAmount || actions.discount_amount || 0;
    return `${amount}${discountType === 'percentage' ? '%' : ''} limited-time offer`;
  }

  return 'Configured promotion';
}

function Actions({
  promotions = [],
  selectedIds = []
}: {
  promotions?: PromotionRow[];
  selectedIds?: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();

  const updatePromotions = async (status) => {
    await Promise.all(
      promotions
        .filter((promotion) => selectedIds.includes(promotion.uuid))
        .map((promotion) => axios.patch(promotion.updateApi, { status }))
    );
    window.location.reload();
  };

  const deletePromotions = async () => {
    await Promise.all(
      promotions
        .filter((promotion) => selectedIds.includes(promotion.uuid))
        .map((promotion) => axios.delete(promotion.deleteApi))
    );
    window.location.reload();
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <TableRow>
      <TableCell colSpan={100}>
        <ButtonGroup>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              openAlert({
                heading: `Enable ${selectedIds.length} promotions`,
                content: 'Are you sure?',
                primaryAction: {
                  title: 'Cancel',
                  onAction: closeAlert,
                  variant: 'secondary'
                },
                secondaryAction: {
                  title: 'Enable',
                  onAction: async () => updatePromotions(1),
                  variant: 'destructive'
                }
              });
            }}
          >
            Enable
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              openAlert({
                heading: `Disable ${selectedIds.length} promotions`,
                content: 'Are you sure?',
                primaryAction: {
                  title: 'Cancel',
                  onAction: closeAlert,
                  variant: 'secondary'
                },
                secondaryAction: {
                  title: 'Disable',
                  onAction: async () => updatePromotions(0),
                  variant: 'destructive'
                }
              });
            }}
          >
            Disable
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              openAlert({
                heading: `Delete ${selectedIds.length} promotions`,
                content: `Selected promotions will be permanently removed.`,
                primaryAction: {
                  title: 'Cancel',
                  onAction: closeAlert,
                  variant: 'secondary'
                },
                secondaryAction: {
                  title: 'Delete',
                  onAction: async () => deletePromotions(),
                  variant: 'destructive'
                }
              });
            }}
          >
            Delete
          </Button>
        </ButtonGroup>
      </TableCell>
    </TableRow>
  );
}

Actions.propTypes = {
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  promotions: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      updateApi: PropTypes.string.isRequired,
      deleteApi: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function PromotionGrid({
  promotions: { items: promotions, total, currentFilters = [] },
  promotionConflicts = []
}: PromotionGridProps) {
  const pageFilter = currentFilters.find((filter) => filter.key === 'page');
  const limitFilter = currentFilters.find((filter) => filter.key === 'limit');
  const page = pageFilter ? parseInt(pageFilter.value, 10) : 1;
  const limit = limitFilter ? parseInt(limitFilter.value, 10) : 20;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <div className="grid gap-5">
      {promotionConflicts.length > 0 && (
        <div className="grid gap-3">
          {promotionConflicts.map((conflict, index) => (
            <Alert
              key={`${conflict.type}-${index}`}
              variant={
                conflict.severity === 'ERROR' ? 'destructive' : 'default'
              }
            >
              <AlertTitle className="flex items-center gap-2">
                <span>Conflict alert</span>
                <Badge variant={getSeverityVariant(conflict.severity)}>
                  {conflict.severity}
                </Badge>
              </AlertTitle>
              <AlertDescription>{conflict.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
      <Card>
        <CardHeader className="flex justify-between">
          <Form submitBtn={false} id="promotionGridFilter">
            <div className="flex gap-5 justify-center items-center">
              <InputField
                name="name"
                placeholder="Search promotions"
                defaultValue={currentFilters.find((f) => f.key === 'name')?.value}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    const url = new URL(document.location.toString());
                    const value = (e.target as HTMLInputElement).value;
                    if (value) {
                      url.searchParams.set('name[operation]', 'like');
                      url.searchParams.set('name[value]', value);
                    } else {
                      url.searchParams.delete('name[operation]');
                      url.searchParams.delete('name[value]');
                    }
                    window.location.href = url.href;
                  }
                }}
              />
              <Select
                value={currentFilters.find((f) => f.key === 'type')?.value}
                onValueChange={(value) => {
                  const url = new URL(document.location.toString());
                  if (value) {
                    url.searchParams.set('type', value);
                  } else {
                    url.searchParams.delete('type');
                  }
                  window.location.href = url.href;
                }}
              >
                <SelectTrigger>
                  <SelectValue>Type</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Type</SelectLabel>
                    <SelectItem value="spend_and_save">Spend and Save</SelectItem>
                    <SelectItem value="second_item_discount">
                      Second Item Discount
                    </SelectItem>
                    <SelectItem value="limited_time_special">
                      Limited Time Special
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={currentFilters.find((f) => f.key === 'status')?.value}
                onValueChange={(value) => {
                  const url = new URL(document.location.toString());
                  if (value) {
                    url.searchParams.set('status', value);
                  } else {
                    url.searchParams.delete('status');
                  }
                  window.location.href = url.href;
                }}
              >
                <SelectTrigger>
                  <SelectValue>Status</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Status</SelectLabel>
                    <SelectItem value="1">Enabled</SelectItem>
                    <SelectItem value="0">Disabled</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </Form>
          <CardAction>
            <Button
              variant="link"
              onClick={() => {
                const url = new URL(document.location.toString());
                url.search = '';
                window.location.href = url.href;
              }}
            >
              Clear filters
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="form-field mb-0">
                    <Checkbox
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRows(promotions.map((promotion) => promotion.uuid));
                        } else {
                          setSelectedRows([]);
                        }
                      }}
                    />
                  </div>
                </TableHead>
                <Area
                  id="promotionGridHeader"
                  noOuter
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <SortableHeader
                            title="Promotion"
                            name="name"
                            currentFilters={currentFilters}
                          />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: () => (
                          <SortableHeader
                            title="Type"
                            name="type"
                            currentFilters={currentFilters}
                          />
                        )
                      },
                      sortOrder: 20
                    },
                    {
                      component: {
                        default: () => (
                          <SortableHeader
                            title="Priority"
                            name="priority"
                            currentFilters={currentFilters}
                          />
                        )
                      },
                      sortOrder: 30
                    },
                    {
                      component: {
                        default: () => (
                          <SortableHeader
                            title="Status"
                            name="status"
                            currentFilters={currentFilters}
                          />
                        )
                      },
                      sortOrder: 40
                    },
                    {
                      component: {
                        default: () => <TableHead>Schedule</TableHead>
                      },
                      sortOrder: 50
                    }
                  ]}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              <Actions promotions={promotions} selectedIds={selectedRows} />
              {promotions.map((promotion) => (
                <TableRow key={promotion.promotionId}>
                  <TableHead>
                    <div className="form-field mb-0">
                      <Checkbox
                        checked={selectedRows.includes(promotion.uuid)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRows(selectedRows.concat([promotion.uuid]));
                          } else {
                            setSelectedRows(
                              selectedRows.filter((row) => row !== promotion.uuid)
                            );
                          }
                        }}
                      />
                    </div>
                  </TableHead>
                  <TableCell>
                    <a className="text-interactive" href={promotion.editUrl}>
                      {promotion.name}
                    </a>
                    <div className="text-sm text-muted-foreground">
                      {getRuleSummary(promotion)}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeLabel(promotion.type)}</TableCell>
                  <TableCell>{promotion.priority}</TableCell>
                  <TableCell>
                    <Status status={promotion.status} />
                  </TableCell>
                  <TableCell>
                    {promotion.startDate?.text || '--'} →{' '}
                    {promotion.endDate?.text || '--'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {promotions.length === 0 && (
            <div className="flex w-full justify-center mt-2">
              There is no promotion to display
            </div>
          )}
          <GridPagination total={total} limit={limit} page={page} />
        </CardContent>
      </Card>
    </div>
  );
}

PromotionGrid.propTypes = {
  promotions: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        promotionId: PropTypes.number.isRequired,
        uuid: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        priority: PropTypes.number.isRequired,
        status: PropTypes.number.isRequired,
        editUrl: PropTypes.string.isRequired,
        updateApi: PropTypes.string.isRequired,
        deleteApi: PropTypes.string.isRequired,
        startDate: PropTypes.shape({
          text: PropTypes.string
        }),
        endDate: PropTypes.shape({
          text: PropTypes.string
        }),
        conditions: PropTypes.object,
        actions: PropTypes.object
      })
    ).isRequired,
    total: PropTypes.number.isRequired,
    currentFilters: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        operation: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired,
  promotionConflicts: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      severity: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired
    })
  )
};

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    promotions(filters: $filters) {
      items {
        promotionId
        uuid
        name
        type
        priority
        status
        startDate {
          text
        }
        endDate {
          text
        }
        conditions
        actions
        editUrl
        updateApi
        deleteApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
    promotionConflicts {
      type
      severity
      message
      affectedIds
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
