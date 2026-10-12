import pytest

from app.models import DesignSpec
from app.pricing import FABRICS, quote


def spec(**overrides) -> DesignSpec:
    base = dict(
        garment_type="dress", length="maxi", sleeve="short", fabric_id="chiffon",
        color_hex="#B8D4F0", closures=["zipper"], embellishments=["embroidery"], lining=True,
    )
    return DesignSpec(**(base | overrides))


def test_total_equals_sum_of_lines():
    q = quote(spec(), "M")
    assert q["total"] == pytest.approx(sum(line["amount"] for line in q["lines"]), abs=0.01)


def test_larger_size_costs_more():
    assert quote(spec(), "XXL")["total"] > quote(spec(), "XS")["total"]


def test_silk_costs_more_than_polyester():
    assert quote(spec(fabric_id="silk-chiffon"), "M")["total"] > quote(spec(fabric_id="chiffon"), "M")["total"]


def test_complexity_levels():
    assert quote(spec(garment_type="top", length="hip", closures=["none"], embellishments=[], lining=False), "M")["complexity"] == "Low"
    assert quote(spec(embellishments=["embroidery", "beading"]), "M")["complexity"] == "High"


def test_unknown_fabric_rejected():
    with pytest.raises(ValueError):
        quote(spec(fabric_id="unobtanium"), "M")


def test_catalog_ids_are_unique():
    assert len(FABRICS) == 15
