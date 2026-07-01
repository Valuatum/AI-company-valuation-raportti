# Grounding validator for the NARRATIVE stages (2: profiili + kilpailijat,
# 5: analyysi-osiot). These two stages previously had NO validator, so a
# fabricated market size, funding amount or competitor figure shipped untouched
# — the highest reputational/legal exposure in the report.
#
# This is ADVISORY (never fails the run), matching the stage-3 / stage-6 orphan
# pattern. It surfaces every prose figure that does not trace to (a) the verified
# financials in input_data, (b) a simple derivation of them, or (c) a SOURCED
# enrichment figure (competitor size, market-signal amount, source register) —
# all of which are already in `context` from the upstream stages. A figure that
# traces to none of those is a candidate fabrication for the operator to review.
# The matcher is heuristic (derived ratios, sign, rounding), so it reports rather
# than blocks; the deliver-gate + human review are the real gate.
import re

# Finnish number formatting: space/NBSP/narrow-NBSP/thin-space thousands
# separators, decimal comma, minus as '-' or U+2212, optional trailing %.
# Thousands groups must be EXACTLY 3 digits so a year glued to the next value
# ("2023 12 596") does not match as one impossible number.
_SEP = "[    ]"
_NUM_RE = re.compile(r"[−-]?(?:\d{1,3}(?:" + _SEP + r"\d{3})+|\d+)(?:,\d+)?\s*%?")
_WS = re.compile(r"[\s   ]")


def _parse(tok):
    is_pct = "%" in tok
    t = _WS.sub("", tok.replace("%", "").replace("−", "-")).replace(",", ".")
    try:
        return float(t), is_pct
    except ValueError:
        return None, is_pct


def _walk(obj):
    if isinstance(obj, dict):
        for v in obj.values():
            yield from _walk(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk(v)
    else:
        yield obj


def _numbers_of(obj):
    nums = set()
    for v in _walk(obj):
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


def _derive(base):
    """Whitelisted simple calcs over the financials: growth %, margin %, net
    diff, pairwise sum. Bounded to stay within the validator timeout."""
    allowed = set(base)
    b = list(base)
    if len(b) > 400:
        return allowed  # too many — skip pairwise (advisory tolerates misses)
    for a in b:
        for c in b:
            if c != 0:
                allowed.add((a - c) / c * 100.0)   # growth %
                allowed.add(a / c * 100.0)          # margin %
            allowed.add(a - c)                      # net diff
            allowed.add(a + c)                      # sum
    return allowed


def _is_structural(val, is_pct):
    # years and tiny structural counts create noise; skip them (heuristic).
    if is_pct:
        return False
    if val == int(val):
        iv = int(val)
        if 1900 <= iv <= 2100:   # a year
            return True
        if 0 <= iv <= 12:        # small count / month / index / rank
            return True
    return False


def _match(val, is_pct, allowed):
    # Sign-insensitive: Finnish prose states magnitudes ("kulut 5 213 tEUR")
    # while the source stores them signed (-5213) — match on magnitude too.
    tol = 0.5 if is_pct else max(1.0, 0.005 * abs(val))
    av = abs(val)
    return any(abs(val - a) <= tol or abs(av - abs(a)) <= tol for a in allowed)


def validate(output: dict, context: dict) -> dict:
    checks = []

    def chk(name, ok, detail=""):
        checks.append({"name": name, "passed": bool(ok), "detail": detail})

    ctx = context or {}
    input_data = ctx.get("input_data") or {}
    # Legitimate figures = every number anywhere upstream (input_data, enrichment
    # competitor/market/source data, scoring, scenarios, locked numeric sections)
    # plus simple derivations of the financials. Anything a narrative figure can
    # legitimately be equals one of these.
    allowed = _numbers_of(ctx) | _derive(_numbers_of(input_data))

    orphans = []
    for sec in (output.get("sections") or []):
        if not isinstance(sec, dict):
            continue
        sid = str(sec.get("id"))
        for bi, b in enumerate(sec.get("blocks") or []):
            if not isinstance(b, dict) or b.get("type") not in ("paragraph", "callout"):
                continue
            v = b.get("text")
            if not isinstance(v, str) or len(v) < 12:
                continue
            for m in _NUM_RE.findall(v):
                val, is_pct = _parse(m)
                if val is None or _is_structural(val, is_pct):
                    continue
                if not _match(val, is_pct, allowed):
                    orphans.append(f"{m.strip()} @ section {sid} block {bi}")

    chk("prose figures traced to financials or sourced enrichment (advisory, non-blocking)",
        True,
        (f"{len(orphans)} figure(s) did not auto-trace — review for fabrication "
         f"(invented market size / funding amount / competitor figure): "
         + "; ".join(orphans[:25])) if orphans else "all prose figures reconcile")

    return {"passed": all(c["passed"] for c in checks), "checks": checks}
