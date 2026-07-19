import runAdvancePayout from '../services/advance.payout.service.js';

export const triggerAdvancePayout = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await runAdvancePayout(userId);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Advance payout error:', err);
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}