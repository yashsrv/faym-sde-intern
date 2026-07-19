import * as db from '../config/db.js';

const requestWithdrawal = async (userId, amount) => {
  if (!amount || amount <= 0) {
    throw new Error('Invalid withdrawal amount');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT id, balance FROM public.users WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('User not found');
    }

    const { balance } = userRes.rows[0];

    const recentWithdrawal = await client.query(
      `SELECT id FROM public.transactions
       WHERE user_id = $1
         AND type = 'withdrawal'
         AND created_at > now() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId]
    );

    if (recentWithdrawal.rows.length > 0) {
      throw new Error('COOLDOWN_ACTIVE');
    }

    if (parseFloat(balance) < parseFloat(amount)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    const txnRes = await client.query(
      `INSERT INTO public.transactions (user_id, type, amount, status)
       VALUES ($1, 'withdrawal', $2, 'pending')
       RETURNING id, created_at`,
      [userId, -Math.abs(amount)]
    );

    await client.query(
      `UPDATE public.users SET balance = balance - $1, updated_at = now() WHERE user_id = $2`,
      [amount, userId]
    );

    await client.query('COMMIT');

    return {
      transactionId: txnRes.rows[0].id,
      status: 'pending',
      amount,
      requestedAt: txnRes.rows[0].created_at,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateWithdrawalStatus = async (transactionId, newStatus) => {
  const validStatuses = ['success', 'failed', 'cancelled', 'rejected'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('INVALID_STATUS');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const txnRes = await client.query(
      `SELECT id, user_id, amount, type, status
       FROM public.transactions
       WHERE id = $1
       FOR UPDATE`,
      [transactionId]
    );

    if (txnRes.rows.length === 0) {
      throw new Error('TRANSACTION_NOT_FOUND');
    }

    const txn = txnRes.rows[0];

    if (txn.type !== 'withdrawal') {
      throw new Error('NOT_A_WITHDRAWAL');
    }

    if (txn.status !== 'pending') {
      throw new Error(`Withdrawal already resolved as ${txn.status}`);
    }

    await client.query(
      `UPDATE public.transactions SET status = $1, updated_at = now() WHERE id = $2`,
      [newStatus, transactionId]
    );

    let reversal = null;

    if (['failed', 'cancelled', 'rejected'].includes(newStatus)) {
      const reversalAmount = Math.abs(parseFloat(txn.amount)); // credit back the debited amount

      const reversalRes = await client.query(
        `INSERT INTO public.transactions (user_id, type, amount, status, related_transaction_id)
         VALUES ($1, 'withdrawal_reversal', $2, 'success', $3)
         RETURNING id`,
        [txn.user_id, reversalAmount, transactionId]
      );

      await client.query(
        `UPDATE public.users SET balance = balance + $1, updated_at = now() WHERE user_id = $2`,
        [reversalAmount, txn.user_id]
      );

      reversal = {
        reversalTransactionId: reversalRes.rows[0].id,
        creditedBack: reversalAmount,
      };
    }

    await client.query('COMMIT');

    return {
      transactionId,
      status: newStatus,
      ...(reversal && { reversal }),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export { requestWithdrawal, updateWithdrawalStatus };
export default requestWithdrawal;