"""Seed a starter 6-stage pipeline on first run. Every field stays editable.

Validators are loaded from backend/validators_seed/*.py so they live as real,
runnable source — not placeholder strings.
"""
import os

from . import db, store
from .models import DATA_FETCHER_MODEL

_SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "validators_seed")

PLACEHOLDER = "[[ LIITÄ VAIHEEN {n} PROMPTI TÄHÄN — muokattavissa UI:ssa ]]"


def _load_validator(fname):
    path = os.path.join(_SEED_DIR, fname)
    with open(path, encoding="utf-8") as f:
        return f.read()


def _stages():
    return [
        {
            "order": 0,
            "name": "Vaihe 0 – FAKTAT (data fetch)",
            "model": DATA_FETCHER_MODEL,
            "prompt_template": "",  # special: runs the fetcher, not a prompt
            "expects_json": True,
            "validator_code": _load_validator("stage0_schema.py"),
            "input_mapping": {},
        },
        {
            "order": 1,
            "name": "Vaihe 1 – Enrichment (web haku)",
            "model": "google/gemini-2.5-flash",
            "prompt_template": PLACEHOLDER.format(n=1)
            + "\n\nFAKTAT:\n{{input_data}}",
            "expects_json": True,
            "validator_code": None,
            "input_mapping": {"input_data": "Vaihe 0 FAKTAT"},
        },
        {
            "order": 2,
            "name": "Vaihe 2 – Pisteytys + skenaariot",
            "model": "deepseek/deepseek-v4-flash",
            "prompt_template": PLACEHOLDER.format(n=2)
            + "\n\nFAKTAT:\n{{input_data}}\n\nENRICHMENT:\n{{enrichment}}",
            "expects_json": True,
            "validator_code": _load_validator("stage2_scoring.py"),
            "input_mapping": {
                "input_data": "Vaihe 0 FAKTAT",
                "enrichment": "Vaihe 1 enrichment",
            },
        },
        {
            "order": 3,
            "name": "Vaihe 3 – Numero-osiot (DCF/EVA)",
            "model": "deepseek/deepseek-v4-flash",
            "prompt_template": PLACEHOLDER.format(n=3)
            + "\n\nFAKTAT:\n{{input_data}}\n\nPISTEYTYS:\n{{scoring}}",
            "expects_json": True,
            "validator_code": _load_validator("stage3_numbers.py"),
            "input_mapping": {
                "input_data": "Vaihe 0 FAKTAT",
                "scoring": "Vaihe 2 pisteytys",
            },
        },
        {
            "order": 4,
            "name": "Vaihe 4 – Analyysi-osiot",
            "model": "deepseek/deepseek-v4-pro",
            "prompt_template": PLACEHOLDER.format(n=4)
            + "\n\nFAKTAT:\n{{input_data}}\n\nNUMEROT:\n{{sections_numeric}}",
            "expects_json": True,
            "validator_code": None,
            "input_mapping": {
                "input_data": "Vaihe 0 FAKTAT",
                "sections_numeric": "Vaihe 3 numerot",
            },
        },
        {
            "order": 5,
            "name": "Vaihe 5 – Tiivistelmä + kokoaja",
            "model": "deepseek/deepseek-v4-pro",
            "prompt_template": PLACEHOLDER.format(n=5)
            + "\n\nKAIKKI OSIOT:\n{{sections_analysis}}\n\nPISTEYTYS:\n{{scoring}}",
            "expects_json": True,
            "validator_code": _load_validator("stage5_final.py"),
            "input_mapping": {
                "sections_analysis": "Vaihe 4 analyysi",
                "scoring": "Vaihe 2 pisteytys",
            },
        },
    ]


def ensure_seeded():
    db.init_db()
    if db.query_one("SELECT id FROM pipelines LIMIT 1"):
        return
    p = store.create_pipeline("Valuaatio-pipeline (oletus)")
    for s in _stages():
        store.add_stage(p["id"], s)
