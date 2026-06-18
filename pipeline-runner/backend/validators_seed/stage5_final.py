# Vaihe 5 – Tiivistelmä + kokoaja final-consistency validator.
# Checks the assembled report agrees with its own machine_readable block.
import re

_NUM_RE = re.compile(r"[−-]?\d[\d  ]*(?:,\d+)?\s*%?")


def _parse(tok):
    is_pct = "%" in tok
    t = (tok.replace("%", "").replace("−", "-")
         .replace(" ", "").replace(" ", "").replace(",", ".").strip())
    try:
        return float(t), is_pct
    except ValueError:
        return None, is_pct


def _walk(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk(v, f"{path}.{k}" if path else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _walk(v, f"{path}[{i}]")
    else:
        yield path, obj


def _numbers_of(obj):
    nums = set()
    for _, v in _walk(obj):
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            nums.add(float(v))
        elif isinstance(v, str):
            for m in _NUM_RE.findall(v):
                val, _ = _parse(m)
                if val is not None:
                    nums.add(val)
    return nums


def _match(val, is_pct, allowed):
    tol = 0.5 if is_pct else max(1.0, 0.005 * abs(val))
    return any(abs(val - a) <= tol for a in allowed)


def validate(output: dict, context: dict) -> dict:
    checks = []

    def chk(name, ok, detail=""):
        checks.append({"name": name, "passed": bool(ok), "detail": detail})

    mr = output.get("machine_readable") or output.get("machine") or {}
    chk("machine_readable present", bool(mr),
        "missing machine_readable block" if not mr else "")
    mr_nums = _numbers_of(mr)

    # 1. Every prose number in the sections appears in machine_readable.
    orphans = []
    for path, v in _walk(output):
        if path.startswith("machine_readable") or path.startswith("machine"):
            continue
        if not isinstance(v, str) or len(v) < 12:
            continue
        for m in _NUM_RE.findall(v):
            val, is_pct = _parse(m)
            if val is None:
                continue
            if is_pct is False and val == int(val) and 1900 <= int(val) <= 2100:
                continue  # year
            if not _match(val, is_pct, mr_nums):
                orphans.append(f"{m.strip()} @ {path}")
    chk("no section references a figure absent from machine_readable",
        not orphans,
        f"{len(orphans)} orphan(s): " + "; ".join(orphans[:25]) if orphans else "ok")

    # 2. Cover headline value == expected_value from scoring stage.
    scoring = (context or {}).get("scoring", {}) or {}
    ev = scoring.get("expected_value")
    if ev is None:
        ev = (scoring.get("machine_readable", {}) or {}).get("expected_value")
    cover = None
    for path, v in _walk(output):
        key = path.split(".")[-1].lower()
        if key in ("cover_value", "headline_value", "expected_value") and isinstance(
            v, (int, float)
        ) and not isinstance(v, bool):
            cover = float(v)
            break
    if ev is not None and cover is not None:
        chk("cover headline == scoring expected_value (±1 tEUR)",
            abs(float(ev) - cover) <= 1.0,
            f"cover {cover} vs scoring {ev}")
    else:
        chk("cover headline == scoring expected_value", True,
            "skipped: scoring.expected_value or cover value not found")

    return {"passed": all(c["passed"] for c in checks), "checks": checks}
