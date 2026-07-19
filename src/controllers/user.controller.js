import { getUserBalance, getUserTransactions } from '../services/user.service.js';

export const getUserBalanceController = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await getUserBalance(userId);
    return res.status(200).json({
      userId: result.user_id,
      balance: result.balance,
    });
  } catch (err) {
    console.error('Get balance error:', err);
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const getUserTransactionsController = async (req, res) => {
  const { userId } = req.params;

  try {
    const transactions = await getUserTransactions(userId);
    return res.status(200).json(transactions);
  } catch (err) {
    console.error('Get transactions error:', err);
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}