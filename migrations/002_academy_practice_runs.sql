BEGIN;

CREATE SCHEMA IF NOT EXISTS academy;

CREATE TABLE IF NOT EXISTS academy.practice_runs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_run_id uuid NOT NULL,
    code_id varchar(80) NOT NULL,
    title varchar(120) NOT NULL,
    difficulty varchar(20) NOT NULL,
    length varchar(20) NOT NULL,
    score integer NOT NULL DEFAULT 0,
    rank varchar(1) NOT NULL DEFAULT 'C',
    stars smallint NOT NULL DEFAULT 0,
    accuracy numeric(5, 2) NOT NULL DEFAULT 0,
    cpm integer NOT NULL DEFAULT 0,
    duration_seconds numeric(10, 1) NOT NULL DEFAULT 0,
    max_combo integer NOT NULL DEFAULT 0,
    attempts integer NOT NULL DEFAULT 0,
    correct_attempts integer NOT NULL DEFAULT 0,
    errors integer NOT NULL DEFAULT 0,
    corrections integer NOT NULL DEFAULT 0,
    completed_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT practice_runs_user_client_unique UNIQUE (user_id, client_run_id),
    CONSTRAINT practice_runs_difficulty_check CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT practice_runs_length_check CHECK (length IN ('short', 'medium', 'long')),
    CONSTRAINT practice_runs_rank_check CHECK (rank IN ('S', 'A', 'B', 'C')),
    CONSTRAINT practice_runs_stars_check CHECK (stars BETWEEN 0 AND 3),
    CONSTRAINT practice_runs_accuracy_check CHECK (accuracy BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS practice_runs_user_completed_idx
    ON academy.practice_runs (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS practice_runs_completed_idx
    ON academy.practice_runs (completed_at DESC);

COMMIT;
