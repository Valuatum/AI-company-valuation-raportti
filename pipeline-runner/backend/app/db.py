"""SQLite single source of truth. Plain sqlite3, JSON columns for nested data."""
import json
import os
import sqlite3
import threading

_DB_PATH = os.getenv("PIPELINE_DB", "pipeline.db")
_local = threading.local()


def _conn() -> sqlite3.Connection:
    c = getattr(_local, "conn", None)
    if c is None:
        c = sqlite3.connect(_DB_PATH, check_same_thread=False)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("PRAGMA foreign_keys=ON")
        _local.conn = c
    return c


SCHEMA = """
CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stages (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    model TEXT NOT NULL,
    prompt_template TEXT NOT NULL DEFAULT '',
    temperature REAL NOT NULL DEFAULT 0.2,
    max_tokens INTEGER NOT NULL DEFAULT 16000,
    reasoning_effort TEXT,
    expects_json INTEGER NOT NULL DEFAULT 1,
    validator_code TEXT,
    input_mapping TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    input_data TEXT,
    status TEXT NOT NULL,
    stop_on_failure INTEGER NOT NULL DEFAULT 1,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stage_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    request_payload TEXT,
    raw_response TEXT,
    parsed_json TEXT,
    validator_passed INTEGER,
    validator_report TEXT,
    tokens_prompt INTEGER DEFAULT 0,
    tokens_completion INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    finish_reason TEXT,
    error_message TEXT,
    started_at TEXT,
    finished_at TEXT
);
"""


def init_db():
    c = _conn()
    c.executescript(SCHEMA)
    c.commit()


def query(sql, params=()):
    cur = _conn().execute(sql, params)
    return [dict(r) for r in cur.fetchall()]


def query_one(sql, params=()):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=()):
    c = _conn()
    cur = c.execute(sql, params)
    c.commit()
    return cur


def jdump(v):
    return json.dumps(v, ensure_ascii=False) if v is not None else None


def jload(v):
    if v is None or v == "":
        return None
    try:
        return json.loads(v)
    except (json.JSONDecodeError, TypeError):
        return None
