import * as db from '../config/db.js';

export async function reconcileSale(saleId, newStatus) {
  if (!['approved', 'rejected'].includes(newStatus)) {
    throw new Error('Invalid status. Must be approved or rejected.');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Lock the sale row to prevent concurrent reconciliation attempts
    const saleRes = await client.query(
      `SELECT id, user_id, earning, status FROM public.sales WHERE id = $1 FOR UPDATE`,
      [saleId]
    );

    if (saleRes.rows.length === 0) {
      throw new Error('Sale not found');
    }

    const sale = saleRes.rows[0];

    if (sale.status !== 'pending') {
      throw new Error(`Sale is already ${sale.status}, cannot reconcile again`);
    }

    // Find advance already paid for this sale (0 if none)
    const advanceRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_advance
       FROM public.transactions
       WHERE sale_id = $1 AND type = 'advance_payout' AND status = 'success'`,
      [saleId]
    );

    const advancePaid = parseFloat(advanceRes.rows[0].total_advance);
    const earning = parseFloat(sale.earning);

    const adjustment = newStatus === 'approved'
      ? parseFloat((earning - advancePaid).toFixed(2))
      : parseFloat((-advancePaid).toFixed(2));

    const txnRes = await client.query(
      `INSERT INTO public.transactions (user_id, sale_id, type, amount, status)
       VALUES ($1, $2, 'final_adjustment', $3, 'success')
       RETURNING id`,
      [sale.user_id, saleId, adjustment]
    );

    await client.query(
      `UPDATE public.users SET balance = balance + $1, updated_at = now() WHERE user_id = $2`,
      [adjustment, sale.user_id]
    );

    await client.query(
      `UPDATE public.sales SET status = $1, updated_at = now() WHERE id = $2`,
      [newStatus, saleId]
    );

    await client.query('COMMIT');

    return {
      saleId,
      status: newStatus,
      earning,
      advancePaid,
      finalAdjustment: adjustment,
      transactionId: txnRes.rows[0].id,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}