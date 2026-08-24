"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
require("dotenv").config({ quiet: true });

const root = path.resolve(__dirname, "..");
const migrationDirectory = path.join(root, "migrations");

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL이 설정되지 않았습니다.");
    }

    const migrationFiles = fs.readdirSync(migrationDirectory)
        .filter((file) => /^\d+_[a-z0-9_]+\.sql$/i.test(file))
        .sort((left, right) => left.localeCompare(right, "en"));
    if (migrationFiles.length === 0) {
        throw new Error("적용할 마이그레이션 파일이 없습니다.");
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1
    });

    try {
        for (const file of migrationFiles) {
            const sql = fs.readFileSync(path.join(migrationDirectory, file), "utf8");
            await pool.query(sql);
            console.log(`적용 완료: ${file}`);
        }

        const verification = await pool.query(`
            SELECT to_regclass('academy.player_profiles') AS player_profiles,
                   to_regclass('academy.practice_runs') AS practice_runs,
                   (
                       SELECT count(*)::integer
                       FROM pg_indexes
                       WHERE schemaname = 'academy'
                         AND tablename = 'practice_runs'
                   ) AS practice_run_indexes
        `);
        const result = verification.rows[0];
        if (!result.player_profiles || !result.practice_runs || result.practice_run_indexes < 3) {
            throw new Error("마이그레이션 검증에 실패했습니다.");
        }
        console.log(`검증 완료: practice_runs 인덱스 ${result.practice_run_indexes}개`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error(`DB 마이그레이션 실패: ${error.message}`);
    process.exitCode = 1;
});
