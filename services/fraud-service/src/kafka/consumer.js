import axios from "axios";
import { consumer, producer } from "../config/kafka.js";

// ─── SERVICE URLS ─────────────────────────────────────────────────────────────
const ACCOUNT_SERVICE = "http://account-service:4001/api/accounts";

// ─── FRAUD CONFIG ─────────────────────────────────────────────────────────────
const FRAUD_RULES = {
  MAX_SINGLE_TXN:       100_000,   // per-transaction hard cap
  DAILY_LIMIT:          200_000,   // max cumulative outflow per day
  VELOCITY_WINDOW_MS:   60_000,    // 1 minute window for velocity check
  VELOCITY_MAX_TXN:     5,         // max transactions in the velocity window
  LARGE_TXN_THRESHOLD:  50_000,    // flag (not block) for manual review logging
  ODD_HOUR_START:       1,         // hours considered unusual (1am–5am)
  ODD_HOUR_END:         5,
};

// ─── IN-MEMORY VELOCITY STORE ─────────────────────────────────────────────────
// Maps account_id → array of timestamps of recent outgoing transactions
// Note: In production replace with Redis
const velocityStore = new Map();

const recordVelocity = (account_id) => {
  const now = Date.now();
  const timestamps = (velocityStore.get(account_id) || [])
    .filter(ts => now - ts < FRAUD_RULES.VELOCITY_WINDOW_MS);
  timestamps.push(now);
  velocityStore.set(account_id, timestamps);
  return timestamps.length; // returns count in window
};

const getVelocityCount = (account_id) => {
  const now = Date.now();
  const timestamps = (velocityStore.get(account_id) || [])
    .filter(ts => now - ts < FRAUD_RULES.VELOCITY_WINDOW_MS);
  return timestamps.length;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const isOddHour = () => {
  const hour = new Date().getUTCHours();
  return hour >= FRAUD_RULES.ODD_HOUR_START && hour < FRAUD_RULES.ODD_HOUR_END;
};

const isRoundNumber = (amount) => amount >= 10_000 && amount % 1000 === 0;

const emit = async (topic, payload) => {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
};

// ─── FETCH ACCOUNT DETAILS ────────────────────────────────────────────────────
const fetchAccount = async (account_id) => {
  try {
    const res = await axios.get(`${ACCOUNT_SERVICE}/${account_id}`);
    return res.data; // { account_id, user_id, balance, status, upi_id }
  } catch (err) {
    console.error(`❌ Could not fetch account ${account_id}:`, err.message);
    return null;
  }
};

// ─── FRAUD ENGINE ─────────────────────────────────────────────────────────────
const runFraudChecks = async ({ transaction_id, from_account, to_account, amount }) => {
  const checks = [];

  // ── Rule 1: Self-transfer ─────────────────────────────────────────────────
  if (from_account === to_account) {
    return {
      approved: false,
      reason:   "Self-transfer not allowed",
      rule:     "SELF_TRANSFER",
      severity: "HIGH",
    };
  }

  // ── Rule 2: Invalid amount ────────────────────────────────────────────────
  if (!amount || amount <= 0 || isNaN(amount)) {
    return {
      approved: false,
      reason:   "Invalid transaction amount",
      rule:     "INVALID_AMOUNT",
      severity: "HIGH",
    };
  }

  // ── Rule 3: Per-transaction hard cap ──────────────────────────────────────
  if (amount > FRAUD_RULES.MAX_SINGLE_TXN) {
    return {
      approved: false,
      reason:   `Amount $${amount.toLocaleString()} exceeds single-transaction limit of $${FRAUD_RULES.MAX_SINGLE_TXN.toLocaleString()}`,
      rule:     "EXCEEDS_TXN_LIMIT",
      severity: "HIGH",
    };
  }

  // ── Rule 4: Fetch sender account (balance + status) ───────────────────────
  const senderAccount = await fetchAccount(from_account);

  if (!senderAccount) {
    return {
      approved: false,
      reason:   "Sender account could not be verified",
      rule:     "ACCOUNT_UNVERIFIABLE",
      severity: "HIGH",
    };
  }

  // ── Rule 5: Account status check ─────────────────────────────────────────
  if (senderAccount.status !== "ACTIVE") {
    return {
      approved: false,
      reason:   `Sender account is ${senderAccount.status}. Only ACTIVE accounts can transfer funds`,
      rule:     "ACCOUNT_NOT_ACTIVE",
      severity: "HIGH",
      block_account: false, // already blocked/frozen by admin
    };
  }

  // ── Rule 6: Insufficient balance ─────────────────────────────────────────
  const balance = parseFloat(senderAccount.balance);
  if (amount > balance) {
    return {
      approved: false,
      reason:   `Insufficient balance. Available: $${balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
      rule:     "INSUFFICIENT_BALANCE",
      severity: "MEDIUM",
    };
  }

  // ── Rule 7: Receiver account existence + status ───────────────────────────
  const receiverAccount = await fetchAccount(to_account);

  if (!receiverAccount) {
    return {
      approved: false,
      reason:   "Recipient account does not exist",
      rule:     "INVALID_RECIPIENT",
      severity: "HIGH",
    };
  }

  if (receiverAccount.status !== "ACTIVE") {
    return {
      approved: false,
      reason:   `Recipient account is ${receiverAccount.status} and cannot receive funds`,
      rule:     "RECIPIENT_NOT_ACTIVE",
      severity: "HIGH",
    };
  }

  // ── Rule 8: Velocity check (too many txns in short window) ────────────────
  const velocityCount = getVelocityCount(from_account);
  if (velocityCount >= FRAUD_RULES.VELOCITY_MAX_TXN) {
    return {
      approved:      false,
      reason:        `Too many transactions. Max ${FRAUD_RULES.VELOCITY_MAX_TXN} transfers per minute allowed`,
      rule:          "VELOCITY_EXCEEDED",
      severity:      "HIGH",
      block_account: true, // suspicious — auto-block
    };
  }

  // ── Rule 9: Odd-hour large transfer flag ──────────────────────────────────
  if (isOddHour() && amount > FRAUD_RULES.LARGE_TXN_THRESHOLD) {
    console.warn(
      `⚠️  [FRAUD FLAG] Odd-hour large transfer: $${amount} from ${from_account} at ${new Date().toISOString()}`
    );
    // Log & flag but don't block — let through with warning
    checks.push("ODD_HOUR_LARGE_TXN");
  }

  // ── Rule 10: Round-number suspicion flag ──────────────────────────────────
  if (isRoundNumber(amount)) {
    console.warn(
      `⚠️  [FRAUD FLAG] Suspicious round-number transfer: $${amount} from ${from_account}`
    );
    checks.push("ROUND_NUMBER");
  }

  // ── Rule 11: Balance drain (sending >90% of balance) ─────────────────────
  if (amount > balance * 0.9 && amount > 5_000) {
    console.warn(
      `⚠️  [FRAUD FLAG] Balance drain attempt: $${amount} of $${balance} from ${from_account}`
    );
    checks.push("BALANCE_DRAIN");
  }

  // ── All hard rules passed ─────────────────────────────────────────────────
  return {
    approved: true,
    flags:    checks, // soft flags — logged but not blocked
  };
};

// ─── KAFKA CONNECT ────────────────────────────────────────────────────────────
const connectKafka = async () => {
  let retries = 5;
  while (retries) {
    try {
      await consumer.connect();
      await producer.connect();
      console.log("✅ Kafka connected (fraud-service)");
      return;
    } catch (err) {
      console.log(`❌ Kafka not ready (fraud-service), retrying... (${retries} left)`);
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  throw new Error("Kafka connection failed after retries");
};

// ─── MAIN CONSUMER ───────────────────────────────────────────────────────────
const runConsumer = async () => {
  await connectKafka();

  await consumer.subscribe({ topic: "transaction-created", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let data;
      try {
        data = JSON.parse(message.value.toString());
      } catch {
        console.error("❌ Could not parse Kafka message");
        return;
      }

      const { transaction_id, from_account, to_account } = data;
      const amount = Number(data.amount);

      console.log(`\n🔍 Fraud check for txn ${transaction_id} | $${amount} | ${from_account} → ${to_account}`);

      const result = await runFraudChecks({ transaction_id, from_account, to_account, amount });

      if (!result.approved) {
        console.log(`🚨 FRAUD BLOCKED [${result.rule}]: ${result.reason}`);

        // Auto-block account if rule demands it
        if (result.block_account) {
          console.log(`🔒 Auto-blocking account: ${from_account}`);
          await emit("account-block", { account_id: from_account, reason: result.rule });
        }

        await emit("transaction-failed", {
          transaction_id,
          from_account,
          to_account,
          amount,
          reason:   result.reason,
          rule:     result.rule,
          severity: result.severity,
        });

        return;
      }

      // Record velocity only for approved transactions
      const velocityCount = recordVelocity(from_account);
      console.log(`✅ Fraud check passed (velocity: ${velocityCount}/${FRAUD_RULES.VELOCITY_MAX_TXN}) | flags: [${(result.flags || []).join(", ") || "none"}]`);

      await emit("transaction-approved", {
        transaction_id,
        from_account,
        to_account,
        amount,
        flags: result.flags || [],
      });
    },
  });
};

runConsumer();