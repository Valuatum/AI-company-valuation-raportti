# Vaihe 2 – Pisteytys + skenaariot validator.
# Recomputes the weighted expected value from the scenarios and checks the
# method-weight / probability bookkeeping. Real arithmetic, not a rubber stamp.

def _num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _scen_value(s):
    # The value key name varies per model output — read all known spellings.
    for k in ("owner_value_tEUR", "owner_value", "equity_value_tEUR",
              "equity_value", "value"):
        if k in s and _num(s[k]) is not None:
            return _num(s[k])
    return None


def _prob(s):
    for k in ("probability", "probability_pct", "weight", "p"):
        if k in s and _num(s[k]) is not None:
            v = _num(s[k])
            return v / 100.0 if v > 1.0 else v  # accept 0.4 or 40
    return None


def _scenarios(output):
    if isinstance(output.get("scenarios"), list):
        return output["scenarios"]
    mr = output.get("machine_readable", {}) or {}
    if isinstance(mr.get("scenarios"), list):
        return mr["scenarios"]
    return []


def _weights(output):
    for key in ("method_weights", "methods", "weights"):
        w = output.get(key)
        if isinstance(w, dict):
            return [_num(v) for v in w.values() if _num(v) is not None]
        if isinstance(w, list):
            out = []
            for it in w:
                if isinstance(it, dict):
                    for k in ("weight", "weight_pct", "share"):
                        if k in it and _num(it[k]) is not None:
                            out.append(_num(it[k]))
                            break
                elif _num(it) is not None:
                    out.append(_num(it))
            return out
    return []


def validate(output: dict, context: dict) -> dict:
    checks = []

    def chk(name, ok, detail=""):
        checks.append({"name": name, "passed": bool(ok), "detail": detail})

    weights = _weights(output)
    if weights:
        s = sum(weights)
        norm = s / 100.0 if s > 1.5 else s  # accept fractions or percents
        chk("method weights sum to 100%", abs(norm - 1.0) <= 0.005,
            f"sum = {round(s, 3)}")
    else:
        chk("method weights present", False, "no method_weights/methods found")

    scen = _scenarios(output)
    chk("scenarios present", bool(scen),
        f"{len(scen)} scenarios" if scen else "none found")

    probs, recomputed = [], 0.0
    floor_ok = True
    for i, s in enumerate(scen):
        if not isinstance(s, dict):
            continue
        p = _prob(s)
        v = _scen_value(s)
        if p is not None:
            probs.append(p)
        if v is not None and v < 0:
            floor_ok = False
            chk(f"scenario[{i}] owner_value >= 0 (floor)", False, f"value = {v}")
        if p is not None and v is not None:
            recomputed += p * max(0.0, v)  # floored value

    if floor_ok:
        chk("all scenario values >= 0 (floor)", True, "")

    if probs:
        ps = sum(probs)
        chk("probabilities sum to 100%", abs(ps - 1.0) <= 0.005,
            f"sum = {round(ps * 100, 2)}%")

    ev = _num(output.get("expected_value"))
    if ev is None:
        mr = output.get("machine_readable", {}) or {}
        ev = _num(mr.get("expected_value"))
    if ev is not None and scen:
        chk("expected_value == Σ(prob × floored value) (±1 tEUR)",
            abs(ev - recomputed) <= 1.0,
            f"stated {round(ev, 2)} vs recomputed {round(recomputed, 2)}")
    else:
        chk("expected_value present", ev is not None, "no expected_value found")

    return {"passed": all(c["passed"] for c in checks), "checks": checks}
