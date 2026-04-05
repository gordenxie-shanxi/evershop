import { GraphQLJSON } from 'graphql-type-json';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { CouponCollection } from '../../../services/CouponCollection.js';
import { getCouponsBaseQuery } from '../../../services/getCouponsBaseQuery.js';
import { getPromotionsBaseQuery } from '../../../services/getPromotionsBaseQuery.js';
import { PromotionCollection } from '../../../services/PromotionCollection.js';
import {
  getPromotionByUuid,
  createPromotion,
  updatePromotion,
  deletePromotion,
  detectPromotionConflicts
} from '../../../services/promotionService.js';

export default {
  JSON: GraphQLJSON,
  Query: {
    coupon: async (root, { id }, { pool }) => {
      const query = getCouponsBaseQuery();
      query.where('coupon_id', '=', id);
      const coupon = await query.load(pool);
      return coupon ? camelCase(coupon) : null;
    },
    coupons: async (_, { filters = [] }, { user }) => {
      if (!user) {
        return [];
      }
      const query = getCouponsBaseQuery();
      const root = new CouponCollection(query);
      await root.init(filters);
      return root;
    },
    promotion: async (_, { id }, { user }) => {
      if (!user || !id) {
        return null;
      }
      const promotion = await getPromotionByUuid(id);
      return promotion ? camelCase(promotion) : null;
    },
    promotions: async (_, { filters = [] }, { user }) => {
      if (!user) {
        return {
          items: [],
          currentPage: 1,
          total: 0,
          currentFilters: []
        };
      }

      const query = getPromotionsBaseQuery();
      const root = new PromotionCollection(query);
      await root.init(filters);
      return root;
    },
    promotionConflicts: async (_, __, { user }) => {
      if (!user) {
        return [];
      }
      return detectPromotionConflicts();
    }
  },
  Coupon: {
    targetProducts: ({ targetProducts }) => {
      if (!targetProducts) {
        return null;
      } else {
        return camelCase(targetProducts);
      }
    },
    condition: ({ condition }) => {
      if (!condition) {
        return null;
      } else {
        return camelCase(condition);
      }
    },
    userCondition: ({ userCondition }) => {
      if (!userCondition) {
        return null;
      } else {
        return {
          ...camelCase(userCondition),
          emails: Array.isArray(userCondition.emails)
            ? userCondition.emails
            : userCondition.emails.split(',').map((email) => email.trim())
        };
      }
    },
    buyxGety: ({ buyxGety }) => {
      if (!buyxGety) {
        return [];
      } else {
        return buyxGety.map((item) => camelCase(item));
      }
    },
    stackingRule: ({ stackingRule }) => stackingRule || 'exclusive',
    spendTiers: ({ spendTiers }) => {
      if (!spendTiers) return null;
      return spendTiers.map((tier) => ({
        minAmount: parseFloat(tier.min_amount),
        discountAmount: parseFloat(tier.discount_amount)
      }));
    },
    editUrl: ({ uuid }) => buildUrl('couponEdit', { id: uuid }),
    updateApi: (coupon) => buildUrl('updateCoupon', { id: coupon.uuid }),
    deleteApi: (coupon) => buildUrl('deleteCoupon', { id: coupon.uuid })
  },
  PromotionCollection: {
    items: async (collection) => {
      if (typeof collection.items === 'function') {
        return collection.items();
      }
      return collection.items || [];
    },
    total: async (collection) => {
      if (typeof collection.total === 'function') {
        return collection.total();
      }
      return collection.total || 0;
    },
    currentPage: (collection) => {
      const currentFilters =
        typeof collection.currentFilters === 'function'
          ? collection.currentFilters()
          : collection.currentFilters || [];
      const pageFilter = currentFilters.find((filter) => filter.key === 'page');
      return pageFilter ? parseInt(pageFilter.value, 10) : 1;
    },
    currentFilters: (collection) => {
      if (typeof collection.currentFilters === 'function') {
        return collection.currentFilters();
      }
      return collection.currentFilters || [];
    }
  },
  Promotion: {
    status: ({ status }) => (status ? 1 : 0),
    editUrl: ({ uuid }) => buildUrl('promotionEdit', { id: uuid }),
    updateApi: ({ uuid }) => buildUrl('updatePromotion', { id: uuid }),
    deleteApi: ({ uuid }) => buildUrl('deletePromotion', { id: uuid })
  },
  Mutation: {
    createPromotion: async (_, args, { user }) => {
      if (!user) {
        throw new Error('Unauthorized');
      }
      const promotion = await createPromotion(args);
      return camelCase(promotion);
    },
    updatePromotion: async (_, { id, ...rest }, { user }) => {
      if (!user) {
        throw new Error('Unauthorized');
      }
      const promotion = await updatePromotion(id, rest);
      return camelCase(promotion);
    },
    deletePromotion: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error('Unauthorized');
      }
      await deletePromotion(id);
      return true;
    }
  }
};
