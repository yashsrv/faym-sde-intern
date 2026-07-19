import { reconcileSale } from '../services/reconciliation.service.js';

export const reconcileSaleController = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    const result = await reconcileSale(id, status);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Reconciliation error:', err);
    if (err.message === 'Sale not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('Invalid status') || err.message.includes('cannot reconcile again')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}