import pytest

from typing import List, Tuple

def export_mtga(deck: List[Tuple[str, int]]) -> str:
    lines = ["Deck"]
    for name, qty in deck:
        lines.append(f"{qty} {name}")
    return "\n".join(lines)

def export_mtgo(deck: List[Tuple[str, int]]) -> str:
    return "\n".join([f"{qty}x {name}" for name, qty in deck])

def export_moxfield(deck: List[Tuple[str, int]]) -> str:
    return "\n".join([f"{qty}x {name}" for name, qty in deck])

def test_export_formats():
    deck = [("Lightning Bolt", 4), ("Counterspell", 2)]
    mtga = export_mtga(deck)
    mtgo = export_mtgo(deck)
    moxfield = export_moxfield(deck)
    assert "Deck" in mtga
    assert "4 Lightning Bolt" in mtga
    assert "4x Lightning Bolt" in mtgo
    assert "2x Counterspell" in moxfield 