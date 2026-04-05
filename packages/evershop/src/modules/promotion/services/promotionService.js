import {
  commit,
  del,
  insert,
  rollback,
  select,
  sql,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../lib/postgres/connection.js';
import { hookable } from '../../../lib/util/hookable.js';
import { detectPromotionConflicts } from './promotionConflictService.js';
import {
  normalizePromotionPayload,
  validatePromotionPayload
} from './promotionRuleHelpers.js';

function serializePromotionPayload(data = {}) {
  return {
    ...data,
    conditions:
      data.conditions !== undefined
        ? data.conditions
          ? JSON.stringify(data.conditions)
          : null
        : undefined,
    actions:
      data.actions !== undefined
        ? data.actions
          ? JSON.stringify(data.actions)
          : null
        : undefined
  };
}

export async function getActivePromotions() {
  const query = select()
    .from('promotion')
    .where('status', '=', true)
    .orderBy('priority', 'DESC');
  query.andWhere('start_date', 'IS NULL', null).or('start_date', '<=', sql('NOW()'));
  query.andWhere('end_date', 'IS NULL', null).or('end_date', '>=', sql('NOW()'));
  return query.execute(pool);
}

export async function getPromotionById(id, connection = pool) {
  return select()
    .from('promotion')
    .where('promotion_id', '=', id)
    .load(connection);
}

export async function getPromotionByUuid(uuid, connection = pool) {
  return select().from('promotion').where('uuid', '=', uuid).load(connection);
}

async function insertPromotionData(data, connection) {
  const normalizedData = normalizePromotionPayload(data, {
    type: data.type
  });
  validatePromotionPayload(normalizedData);
  const promotion = await insert('promotion')
    .given(serializePromotionPayload(normalizedData))
    .execute(connection);
  return getPromotionById(promotion.insertId, connection);
}

export async function createPromotion(data) {
  const connection = await getConnection();
  await startTransaction(connection);

  try {
    const promotion = await hookable(insertPromotionData, { connection })(
      data,
      connection
    );
    await commit(connection);
    return promotion;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}

async function updatePromotionData(uuid, data, connection) {
  const existing = await getPromotionByUuid(uuid, connection);

  if (!existing) {
    throw new Error('Requested promotion not found');
  }

  const normalizedData = normalizePromotionPayload(data, {
    type: data.type || existing.type
  });
  validatePromotionPayload({
    name: existing.name,
    description: existing.description,
    status: existing.status,
    type: existing.type,
    priority: existing.priority,
    start_date: existing.start_date,
    end_date: existing.end_date,
    conditions: existing.conditions || {},
    actions: existing.actions || {},
    ...normalizedData
  });

  try {
    await update('promotion')
      .given(serializePromotionPayload(normalizedData))
      .where('uuid', '=', uuid)
      .execute(connection);
  } catch (error) {
    if (!error.message.includes('No data was provided')) {
      throw error;
    }
  }

  return getPromotionByUuid(uuid, connection);
}

export async function updatePromotion(uuid, data) {
  const connection = await getConnection();
  await startTransaction(connection);

  try {
    const promotion = await hookable(updatePromotionData, { connection })(
      uuid,
      data,
      connection
    );
    await commit(connection);
    return promotion;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}

async function deletePromotionData(uuid, connection) {
  await del('promotion').where('uuid', '=', uuid).execute(connection);
}

export async function deletePromotion(uuid) {
  const connection = await getConnection();
  await startTransaction(connection);

  try {
    const promotion = await getPromotionByUuid(uuid, connection);

    if (!promotion) {
      throw new Error('Invalid promotion id');
    }

    await hookable(deletePromotionData, { connection, promotion })(
      uuid,
      connection
    );
    await commit(connection);
    return promotion;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}

export { detectPromotionConflicts };
