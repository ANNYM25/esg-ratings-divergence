"""
Numeric primitives that behave exactly like their JavaScript counterparts.

The Python package reproduces the TypeScript engine to the last decimal, and the
test suite proves it against data/reference.json. Three JS behaviours matter:

* ``Math.round`` rounds half *up* (towards +inf); Python's ``round`` rounds half to even.
* JS sums floats left to right; Python 3.12+ ``sum()`` uses compensated summation.
* The bootstrap and permutation tests draw from a seeded mulberry32 generator.
"""
from __future__ import annotations

import math
from collections.abc import Callable, Iterable

_MASK = 0xFFFFFFFF


def js_round(value: float, dp: int = 1) -> float:
    """``Math.round(value * 10**dp) / 10**dp``."""
    f = 10**dp
    return math.floor(value * f + 0.5) / f


def js_sum(values: Iterable[float]) -> float:
    total = 0.0
    for v in values:
        total += v
    return total


def mean(values: list[float]) -> float:
    return 0.0 if not values else js_sum(values) / len(values)


def _imul(a: int, b: int) -> int:
    """``Math.imul``: 32-bit multiply, result as an unsigned 32-bit int."""
    return (a * b) & _MASK


def make_rng(seed: int) -> Callable[[], float]:
    """mulberry32, bit-for-bit identical to ``makeRng`` in src/lib/statistics.ts."""
    state = seed & _MASK

    def rng() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & _MASK
        t = _imul(state ^ (state >> 15), 1 | state)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) & _MASK) ^ t
        return ((t ^ (t >> 14)) & _MASK) / 4294967296

    return rng
