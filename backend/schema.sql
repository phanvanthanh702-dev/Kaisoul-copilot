-- =========================================================
-- KAISOUL AI DATABASE
-- PostgreSQL
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    kaisoul_id VARCHAR(100) UNIQUE NOT NULL,

    username VARCHAR(50) NOT NULL,

    display_name VARCHAR(100),

    avatar_url TEXT,

    plan VARCHAR(20) NOT NULL DEFAULT 'FREE'
        CHECK (plan IN ('FREE', 'PRO_1')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- SESSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT UNIQUE NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
ON sessions(token_hash);


-- =========================================================
-- CHATS
-- =========================================================

CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL DEFAULT 'Chat mới',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id
ON chats(user_id);

CREATE INDEX IF NOT EXISTS idx_chats_updated_at
ON chats(updated_at DESC);


-- =========================================================
-- MESSAGES
-- =========================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    chat_id UUID NOT NULL
        REFERENCES chats(id)
        ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('user', 'assistant', 'system')),

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id
ON messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
ON messages(created_at);


-- =========================================================
-- FILES
-- =========================================================

CREATE TABLE IF NOT EXISTS chat_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    chat_id UUID
        REFERENCES chats(id)
        ON DELETE CASCADE,

    filename VARCHAR(255) NOT NULL,

    mime_type VARCHAR(150),

    file_size BIGINT NOT NULL DEFAULT 0,

    storage_path TEXT,

    extracted_text TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_files_user_id
ON chat_files(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_files_chat_id
ON chat_files(chat_id);


-- =========================================================
-- MEMORY
-- =========================================================

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user_id
ON memories(user_id);


-- =========================================================
-- SETTINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    theme VARCHAR(20) NOT NULL DEFAULT 'dark'
        CHECK (theme IN ('dark', 'light', 'system')),

    notifications BOOLEAN NOT NULL DEFAULT FALSE,

    memory_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- USAGE
-- =========================================================

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    period_type VARCHAR(20) NOT NULL
        CHECK (period_type IN ('day', 'month')),

    period_key VARCHAR(20) NOT NULL,

    used_count INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        user_id,
        period_type,
        period_key
    )
);

CREATE INDEX IF NOT EXISTS idx_usage_user_period
ON usage_records(
    user_id,
    period_type,
    period_key
);


-- =========================================================
-- LOGIN HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- AUTO UPDATE updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS users_updated_at
ON users;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


DROP TRIGGER IF EXISTS chats_updated_at
ON chats;

CREATE TRIGGER chats_updated_at
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


DROP TRIGGER IF EXISTS memories_updated_at
ON memories;

CREATE TRIGGER memories_updated_at
BEFORE UPDATE ON memories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


DROP TRIGGER IF EXISTS settings_updated_at
ON user_settings;

CREATE TRIGGER settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


DROP TRIGGER IF EXISTS usage_updated_at
ON usage_records;

CREATE TRIGGER usage_updated_at
BEFORE UPDATE ON usage_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
