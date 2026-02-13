export const checkFraud = async (req, res) => {
  try {
    const { from_account, to_account, amount } = req.body;

    // Rule 1: Same account transfer
    if (from_account === to_account) {
      return res.json({
        approved: false,
        reason: "Sender and receiver cannot be same",
      });
    }

    // Rule 2: Large transfer threshold
    if (amount > 100000) {
      return res.json({
        approved: false,
        reason: "Amount exceeds safe threshold",
      });
    }

    // Rule 3: Amount must be positive
    if (amount <= 0) {
      return res.json({
        approved: false,
        reason: "Invalid amount",
      });
    }

    // Approved
    return res.json({ approved: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};