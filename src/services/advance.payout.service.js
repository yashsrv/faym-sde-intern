import * as db from '../config/db.js';

const runAdvancePayout = async (userId) => {
  const client = await db.getClient();
  const results = [];

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT id FROM public.users WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('User not found');
    }

    const eligibleSales = await client.query(
      `SELECT s.id, s.earning
       FROM public.sales s
       WHERE s.user_id = $1
         AND s.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM public.transactions t
           WHERE t.sale_id = s.id
             AND t.type = 'advance_payout'
             AND t.status = 'success'
         )`,
      [userId]
    );

    for (const sale of eligibleSales.rows) {
      const advanceAmount = parseFloat((sale.earning * 0.10).toFixed(2));

      const txnRes = await client.query(
        `INSERT INTO public.transactions (user_id, sale_id, type, amount, status)
         VALUES ($1, $2, 'advance_payout', $3, 'success')
         RETURNING id`,
        [userId, sale.id, advanceAmount]
      );

      await client.query(
        `UPDATE public.users SET balance = balance + $1, updated_at = now() 
				 WHERE user_id = $2`,
        [advanceAmount, userId]
      );

      results.push({
        saleId: sale.id,
        transactionId: txnRes.rows[0].id,
        amount: advanceAmount,
        status: 'success',
      });
    }

    await client.query('COMMIT');

    return {
      processed: results.length,
      totalAdvanced: parseFloat(results.reduce((sum, r) => sum + r.amount, 0).toFixed(2)),
      details: results,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default runAdvancePayout;