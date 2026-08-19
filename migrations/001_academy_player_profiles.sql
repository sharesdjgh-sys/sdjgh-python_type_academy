BEGIN;

CREATE SCHEMA IF NOT EXISTS academy;

CREATE TABLE IF NOT EXISTS academy.player_profiles (
    user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    profile jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT player_profiles_profile_object_check
        CHECK (jsonb_typeof(profile) = 'object')
);

COMMIT;
