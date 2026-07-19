import requestWithdrawal, { updateWithdrawalStatus } from '../services/withdrawal.service.js';

export const createWithdrawal = async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount are required' });
  }

  try {
    const result = await requestWithdrawal(userId, amount);
    return res.status(201).json(result);
  } catch (err) {
    console.error('Withdrawal error:', err);
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'COOLDOWN_ACTIVE') {
      return res.status(409).json({ error: 'Withdrawal already requested within the last 24 hours' });
    }
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const updateWithdrawalStatusController = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    const result = await updateWithdrawalStatus(id, status);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Withdrawal status update error:', err);
    if (err.message === 'TRANSACTION_NOT_FOUND') {
      return res.status(404).json({ error: 'Withdrawal transaction not found' });
    }
    if (err.message === 'NOT_A_WITHDRAWAL') {
      return res.status(400).json({ error: 'Transaction is not a withdrawal' });
    }
    if (err.message === 'INVALID_STATUS') {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    if (err.message.includes('already resolved')) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}