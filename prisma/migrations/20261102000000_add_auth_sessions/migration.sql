CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'auth_sessions_user_id_fkey'
          AND conrelid = 'auth_sessions'::regclass
    ) THEN
        ALTER TABLE "auth_sessions"
        ADD CONSTRAINT "auth_sessions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
