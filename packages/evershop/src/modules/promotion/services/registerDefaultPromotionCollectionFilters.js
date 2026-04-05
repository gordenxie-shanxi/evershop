import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

export async function registerDefaultPromotionCollectionFilters() {
  return [
    {
      key: 'name',
      operation: ['eq', 'like'],
      callback: (query, operation, value, currentFilters) => {
        if (operation === 'eq') {
          query.andWhere('promotion.name', '=', value);
        } else {
          query.andWhere('promotion.name', 'ILIKE', `%${value}%`);
        }
        currentFilters.push({
          key: 'name',
          operation,
          value
        });
      }
    },
    {
      key: 'type',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere('promotion.type', '=', value);
        currentFilters.push({
          key: 'type',
          operation,
          value
        });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const normalized =
          value === 1 || value === '1' || value === true || value === 'true';
        query.andWhere('promotion.status', OPERATION_MAP[operation], normalized);
        currentFilters.push({
          key: 'status',
          operation,
          value: normalized ? '1' : '0'
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const promotionCollectionSortBy = getValueSync(
          'promotionCollectionSortBy',
          {
            name: (baseQuery) => baseQuery.orderBy('promotion.name'),
            type: (baseQuery) => baseQuery.orderBy('promotion.type'),
            status: (baseQuery) => baseQuery.orderBy('promotion.status'),
            priority: (baseQuery) =>
              baseQuery.orderBy('promotion.priority', 'DESC')
          }
        );

        if (promotionCollectionSortBy[value]) {
          promotionCollectionSortBy[value](query, operation);
          currentFilters.push({
            key: 'ob',
            operation,
            value
          });
        }
      }
    }
  ];
}
