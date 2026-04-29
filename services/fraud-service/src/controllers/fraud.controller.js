// ─── FRAUD CONFIG (mirrors consumer.js) ──────────────────────────────────────
const FRAUD_RULES = {
  MAX_SINGLE_TXN:     100_000,
  VELOCITY_WINDOW_MS: 60_000,
  VELOCITY_MAX_TXN:   5,
  LARGE_TXN_THRESHOLD:50_000,
  ODD_HOUR_START:     1,
  ODD_HOUR_END:       5,
};

const isOddHour = () => {
  const hour = new Date().getUTCHours();
  return hour >= FRAUD_RULES.ODD_HOUR_START && hour < FRAUD_RULES.ODD_HOUR_END;
};

const isRoundNumber = (amount) => amount >= 10_000 && amount % 1000 === 0;

/**
 * POST /api/fraud/check
 * Body: { from_account, to_account, amount, balance? }
 *
 * Used by admin panel or external tools for manual checks.
 * The real fraud enforcement happens via Kafka in consumer.js.
 */
export const checkFraud = async (req, res) => {
  try {
    const { from_account, to_account, amount, balance } = req.body;
    const numAmount = Number(amount);
    const flags = [];

    // ── Rule 1: Self-transfer ────────────────────────────────────────────────
    if (from_account === to_account) {
      return res.json({
        approved: false,
        rule:     "SELF_TRANSFER",
        severity: "HIGH",
        reason:   "Sender and receiver cannot be the same account",
      });
    }

    // ── Rule 2: Invalid amount ───────────────────────────────────────────────
    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
      return res.json({
        approved: false,
        rule:     "INVALID_AMOUNT",
        severity: "HIGH",
        reason:   "Transaction amount must be a positive number",
      });
    }

    // ── Rule 3: Per-transaction hard cap ─────────────────────────────────────
    if (numAmount > FRAUD_RULES.MAX_SINGLE_TXN) {
      return res.json({
        approved: false,
        rule:     "EXCEEDS_TXN_LIMIT",
        severity: "HIGH",
        reason:   `Amount $${numAmount.toLocaleString()} exceeds single-transaction limit of $${FRAUD_RULES.MAX_SINGLE_TXN.toLocaleString()}`,
      });
    }

    // ── Rule 4: Insufficient balance (if provided) ───────────────────────────
    if (balance !== undefined && numAmount > Number(balance)) {
      return res.json({
        approved: false,
        rule:     "INSUFFICIENT_BALANCE",
        severity: "MEDIUM",
        reason:   `Insufficient balance. Available: $${Number(balance).toFixed(2)}, Requested: $${numAmount.toFixed(2)}`,
      });
    }

    // ── Soft flags ────────────────────────────────────────────────────────────
    if (isOddHour() && numAmount > FRAUD_RULES.LARGE_TXN_THRESHOLD) {
      flags.push({ flag: "ODD_HOUR_LARGE_TXN", note: "Large transfer during unusual hours (1am–5am UTC)" });
    }

    if (isRoundNumber(numAmount)) {
      flags.push({ flag: "ROUND_NUMBER", note: "Suspiciously round transfer amount" });
    }

    if (balance !== undefined && numAmount > Number(balance) * 0.9 && numAmount > 5_000) {
      flags.push({ flag: "BALANCE_DRAIN", note: "Transfer is >90% of account balance" });
    }

    return res.json({
      approved: true,
      flags,
      note: flags.length > 0
        ? "Transaction approved with fraud flags — logged for review"
        : "Transaction approved — no fraud signals detected",
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};