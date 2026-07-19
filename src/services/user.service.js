import * as db from '../config/db.js';

const getUserBalance = async (userId) => {
  const client = await db.getClient();

  const result = await client.query(
    `SELECT user_id, balance FROM public.users WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('USER_NOT_FOUND');
  }

  return result.rows[0];
};

const getUserTransactions = async (userId) => {
  const client = await db.getClient();

  const userRes = await client.query(
    `SELECT id FROM public.users WHERE user_id = $1`,
    [userId]
  );

  if (userRes.rows.length === 0) {
    throw new Error('USER_NOT_FOUND');
  }

  const result = await client.query(
    `SELECT id, type, amount, status, sale_id, related_transaction_id, created_at
     FROM public.transactions
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );

  return result.rows;
};

export { getUserBalance, getUserTransactions };