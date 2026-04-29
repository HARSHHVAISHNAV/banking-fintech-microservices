# ══════════════════════════════════════════════════════════════════════════════
#  NexBank Fraud Tester - PowerShell (encoding-safe)
# ══════════════════════════════════════════════════════════════════════════════

# ── FILL THESE IN ─────────────────────────────────────────────────────────────
$BASE         = "http://localhost"
$TOKEN        = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMThkMmZhMTItM2FmZi00Y2VhLTg4N2YtMTFmNGE2NzJmZjYwIiwiZW1haWwiOiJoYXJzaGV2aWx2YWlzaG5hdkBnbWFpbC5jb20iLCJuYW1lIjoiSGFyc2ggTmFuZGtpc2hvcmUgVmFpc2huYXYiLCJyb2xlIjoidXNlciIsImFjY291bnRfaWQiOiJkYjE3MDY2Mi04NGZmLTQ5ZDAtOWQyNi0xNzI0YzNkMzU2ZDUiLCJ1cGlfaWQiOiJoYXJzaDEyNTFAbmV4YmFuayIsIm1vYmlsZSI6Iis5MTgzNjk0NTQ1OTIiLCJpYXQiOjE3Nzc0NTkzNDQsImV4cCI6MTc3ODA2NDE0NH0.OmHVVLzj4aA5-xSmz0cC2fBIFTxGp2TrDd8MDDTLUjw"
$FROM_ACCOUNT = "4520879f-43a7-40c6-a03a-f2d119d1cdf8"
$TO_ACCOUNT   = "db170662-84ff-49d0-9d26-1724c3d356d5"

# ── HELPER FUNCTION ───────────────────────────────────────────────────────────
function Send-Transfer($amount, $from, $to, $label, $expectBlock) {
    Write-Host ""
    Write-Host "--------------------------------------------" 
    Write-Host "TEST : $label"
    Write-Host "FROM : $from"
    Write-Host "TO   : $to"
    Write-Host "AMT  : `$$amount"
    if ($expectBlock) {
        Write-Host "EXPECT: FRAUD BLOCKED (check logs after)" 
    } else {
        Write-Host "EXPECT: APPROVED"
    }
    Write-Host "--------------------------------------------"

    $hdrs = @{
        "Content-Type"    = "application/json"
        "Authorization"   = "Bearer $TOKEN"
        "Idempotency-Key" = [guid]::NewGuid().ToString()
    }
    $body = @{
        from_account = $from
        to_account   = $to
        amount       = $amount
    } | ConvertTo-Json

    try {
        $res = Invoke-RestMethod `
            -Uri "$BASE/api/transactions/transfer" `
            -Method POST `
            -Headers $hdrs `
            -Body $body
        Write-Host "HTTP OK - txn_id: $($res.transaction_id)"
        Write-Host "NOTE: 'Transaction initiated' always comes back immediately."
        Write-Host "      Check fraud-service logs + DB to see if it was APPROVED or FAILED."
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP ERROR $code - $($_.Exception.Message)"
    }
}

# ── DB CHECK HELPER ───────────────────────────────────────────────────────────
function Check-DB {
    Write-Host ""
    Write-Host "============================================"
    Write-Host "DB: Last 15 transactions"
    Write-Host "============================================"
    docker exec -it banking-postgres psql -U postgres -d banking `
        -c "SELECT substring(transaction_id::text,1,8) as txn, status, amount, created_at FROM transactions ORDER BY created_at DESC LIMIT 15;"

    Write-Host ""
    Write-Host "============================================"
    Write-Host "DB: Account balances and statuses"
    Write-Host "============================================"
    docker exec -it banking-postgres psql -U postgres -d banking `
        -c "SELECT substring(account_id::text,1,8) as acct, balance, status FROM accounts;"
}

# ══════════════════════════════════════════════════════════════════════════════
#  TESTS — comment out the ones you don't want to run
# ══════════════════════════════════════════════════════════════════════════════

# TEST 1 — Valid transfer (should end up APPROVED in DB)
Send-Transfer 100 $FROM_ACCOUNT $TO_ACCOUNT "T1: Valid transfer" $false

Start-Sleep -Seconds 2  # wait for Kafka to process

# TEST 2 — Self-transfer (should end up FAILED in DB)
Send-Transfer 100 $FROM_ACCOUNT $FROM_ACCOUNT "T2: Self-transfer" $true

Start-Sleep -Seconds 2

# TEST 3 — Zero amount (should end up FAILED in DB)
Send-Transfer 0 $FROM_ACCOUNT $TO_ACCOUNT "T3: Zero amount" $true

Start-Sleep -Seconds 2

# TEST 4 — Exceeds $100k hard cap (should end up FAILED in DB)
Send-Transfer 100001 $FROM_ACCOUNT $TO_ACCOUNT "T4: Over 100k cap" $true

Start-Sleep -Seconds 2

# TEST 5 — Insufficient balance (should end up FAILED in DB)
Send-Transfer 999999 $FROM_ACCOUNT $TO_ACCOUNT "T5: Insufficient balance" $true

Start-Sleep -Seconds 2

# TEST 6 — Fake recipient (should end up FAILED in DB)
Send-Transfer 100 $FROM_ACCOUNT "00000000-0000-0000-0000-000000000000" "T6: Fake recipient" $true

Start-Sleep -Seconds 2

# TEST 7 — Round number flag (should be APPROVED but fraud log shows flag)
Send-Transfer 10000 $FROM_ACCOUNT $TO_ACCOUNT "T7: Round number flag" $false

Start-Sleep -Seconds 2

# TEST 8 — Balance drain flag (should be APPROVED but fraud log shows flag)
# Works if sender has ~$1000 balance (default). $950 = 95% drain.
Send-Transfer 950 $FROM_ACCOUNT $TO_ACCOUNT "T8: Balance drain flag" $false

Start-Sleep -Seconds 3

# ── CHECK DB AFTER ALL TESTS ──────────────────────────────────────────────────
Check-DB

Write-Host ""
Write-Host "============================================"
Write-Host "Now check fraud-service logs:"
Write-Host "  docker compose logs fraud-service --tail=60"
Write-Host "============================================"

# ══════════════════════════════════════════════════════════════════════════════
#  VELOCITY TEST — run this block separately, 6 times in under 60 seconds
#  Select lines below and press F8 six times quickly
# ══════════════════════════════════════════════════════════════════════════════
# Send-Transfer 10 $FROM_ACCOUNT $TO_ACCOUNT "VELOCITY TEST (run 6x fast)" $true