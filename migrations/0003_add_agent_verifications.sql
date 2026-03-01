-- Migrace 0003: Tabulka pro OTP ověření rezervací přes AI agenty
-- Každý záznam reprezentuje čekající rezervaci odeslanou AI agentem,
-- která čeká na SMS ověření zákazníkovým OTP kódem.

CREATE TABLE IF NOT EXISTS agent_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Unikátní token vrácený AI agentovi pro krok 2 (/api/agent/verify)
    verification_token TEXT UNIQUE NOT NULL,
    -- Serializovaná data rezervace (JSON) – obsahuje workerId, date, time, items, customerName, customerPhone, customerEmail, note
    reservation_data TEXT NOT NULL,
    -- 6místný OTP kód zaslaný zákazníkovi SMS
    otp_code TEXT NOT NULL,
    -- Telefonní číslo zákazníka (normalizováno na +420XXXXXXXXX)
    phone TEXT NOT NULL,
    -- Počet neplatných pokusů o ověření (max. 3)
    attempts INTEGER DEFAULT 0,
    -- Čas vypršení záznamu (30 minut od vytvoření)
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index pro rychlé vyhledávání podle tokenu
CREATE INDEX IF NOT EXISTS idx_agent_verifications_token ON agent_verifications(verification_token);

-- Index pro čištění vypršených záznamů
CREATE INDEX IF NOT EXISTS idx_agent_verifications_expires ON agent_verifications(expires_at);

-- Index pro ochranu před spamem (limit pending rezervací na telefon)
CREATE INDEX IF NOT EXISTS idx_agent_verifications_phone ON agent_verifications(phone);
