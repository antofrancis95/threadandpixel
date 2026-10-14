"""Deterministic yardage and price engine. Gemini only classifies; numbers come from here."""

from dataclasses import dataclass

from .models import DesignSpec, Size


@dataclass(frozen=True)
class Fabric:
    id: str
    name: str
    cost_per_yard: float
    waste: float
    swatch_hex: str


FABRICS: dict[str, Fabric] = {f.id: f for f in [
    Fabric("cotton-poplin", "Cotton Poplin", 8, 0.10, "#f4f1ea"),
    Fabric("cotton-jersey", "Cotton Jersey", 9, 0.12, "#e9e6df"),
    Fabric("linen", "Linen", 16, 0.12, "#d8cbb0"),
    Fabric("denim", "Denim", 14, 0.10, "#3b5b8c"),
    Fabric("chiffon", "Polyester Chiffon", 10, 0.18, "#cfe3f5"),
    Fabric("silk-chiffon", "Silk Chiffon", 32, 0.18, "#dcecf8"),
    Fabric("silk-charmeuse", "Silk Charmeuse", 38, 0.15, "#efe0d0"),
    Fabric("satin", "Polyester Satin", 12, 0.15, "#e8d6e0"),
    Fabric("crepe", "Crepe", 15, 0.12, "#2d2d2d"),
    Fabric("velvet", "Velvet", 24, 0.15, "#5a1f33"),
    Fabric("wool-suiting", "Wool Suiting", 30, 0.12, "#4a4a52"),
    Fabric("tulle", "Tulle", 7, 0.20, "#f7eef2"),
    Fabric("lace", "Lace", 26, 0.22, "#faf7f2"),
    Fabric("organza", "Organza", 14, 0.20, "#f2f5f7"),
    Fabric("rayon-viscose", "Rayon Viscose", 9, 0.12, "#e3d9f0"),
]}

_L = ("cropped", "hip", "knee", "midi", "maxi", "full")
BASE_YARDS: dict[str, dict[str, float]] = {
    "dress":    dict(zip(_L, (1.6, 2.0, 2.5, 3.0, 3.8, 4.2))),
    "top":      dict(zip(_L, (1.0, 1.4, 1.8, 1.8, 1.8, 1.8))),
    "shirt":    dict(zip(_L, (1.4, 1.8, 2.2, 2.2, 2.2, 2.2))),
    "skirt":    dict(zip(_L, (0.8, 1.0, 1.4, 1.8, 2.6, 3.0))),
    "trousers": dict(zip(_L, (1.2, 1.4, 1.8, 2.2, 2.6, 2.8))),
    "jacket":   dict(zip(_L, (1.8, 2.2, 2.8, 3.2, 3.6, 3.8))),
    "jumpsuit": dict(zip(_L, (2.2, 2.6, 3.0, 3.4, 3.8, 4.0))),
    "suit":     dict(zip(_L, (3.0, 3.6, 4.4, 5.0, 5.8, 6.2))),
}
SLEEVE_YARDS = {"sleeveless": 0.0, "cap": 0.1, "short": 0.25, "three_quarter": 0.45, "long": 0.6}
SIZE_MULT: dict[str, float] = {"XS": 0.90, "S": 0.95, "M": 1.00, "L": 1.08, "XL": 1.16, "XXL": 1.25}

BASE_HOURS = {"dress": 4.0, "top": 2.0, "shirt": 3.0, "skirt": 2.0, "trousers": 3.0, "jacket": 6.0, "jumpsuit": 5.0, "suit": 8.0}
CLOSURE_HOURS = {"zipper": 0.5, "buttons": 0.8, "hooks": 0.3, "tie": 0.2, "none": 0.0}
CLOSURE_TRIM = {"zipper": 3.0, "buttons": 4.0, "hooks": 1.5, "tie": 0.0, "none": 0.0}
EMBELLISH_HOURS = {"embroidery": 3.0, "lace": 1.5, "beading": 4.0, "pleats": 1.5, "ruffles": 1.5, "print": 0.5}
EMBELLISH_TRIM = {"embroidery": 12.0, "lace": 10.0, "beading": 18.0, "pleats": 0.0, "ruffles": 0.0, "print": 8.0}
LINING_HOURS = 1.0
LINING_COST_PER_YARD = 6.0
LABOUR_RATE = 12.0
MARGIN_RATE = 0.25


def complexity_label(hours: float) -> str:
    if hours < 4:
        return "Low"
    if hours <= 8:
        return "Medium"
    return "High"


def quote(spec: DesignSpec, size: Size) -> dict:
    fabric = FABRICS.get(spec.fabric_id)
    if fabric is None:
        raise ValueError(f"Unknown fabric_id: {spec.fabric_id}")

    raw_yards = BASE_YARDS[spec.garment_type][spec.length] + SLEEVE_YARDS[spec.sleeve]
    yardage = round(raw_yards * SIZE_MULT[size] * (1 + fabric.waste), 2)
    waste_yards = round(yardage - raw_yards * SIZE_MULT[size], 2)

    closures = [c for c in set(spec.closures) if c != "none"]
    embellishments = sorted(set(spec.embellishments))
    hours = (
        BASE_HOURS[spec.garment_type]
        + sum(CLOSURE_HOURS[c] for c in closures)
        + sum(EMBELLISH_HOURS[e] for e in embellishments)
        + (LINING_HOURS if spec.lining else 0.0)
    )

    lines = [
        {"label": f"{fabric.name} × {yardage} yd", "amount": round(yardage * fabric.cost_per_yard, 2)},
        {"label": f"Labour {hours:.1f} h @ ${LABOUR_RATE:.0f}/h", "amount": round(hours * LABOUR_RATE, 2)},
    ]
    if spec.lining:
        lining_yards = round(raw_yards * SIZE_MULT[size] * 0.8, 2)
        lines.append({"label": f"Lining × {lining_yards} yd", "amount": round(lining_yards * LINING_COST_PER_YARD, 2)})
    for c in sorted(closures):
        if CLOSURE_TRIM[c]:
            lines.append({"label": f"Trim: {c}", "amount": CLOSURE_TRIM[c]})
    for e in embellishments:
        if EMBELLISH_TRIM[e]:
            lines.append({"label": f"Trim: {e}", "amount": EMBELLISH_TRIM[e]})

    subtotal = round(sum(line["amount"] for line in lines), 2)
    margin = round(subtotal * MARGIN_RATE, 2)
    lines.append({"label": "Platform & maker margin", "amount": margin})

    return {
        "currency": "USD",
        "size": size,
        "fabric": {"id": fabric.id, "name": fabric.name},
        "yardage": yardage,
        "waste_yards": waste_yards,
        "labour_hours": round(hours, 1),
        "complexity": complexity_label(hours),
        "lines": lines,
        "total": round(subtotal + margin, 2),
    }


def catalog() -> dict:
    return {
        "fabrics": [vars(f) for f in FABRICS.values()],
        "sizes": list(SIZE_MULT.keys()),
    }
