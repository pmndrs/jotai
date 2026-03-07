# Benchmark Comparison: `main` vs `performance-optimizations`

**Date:** 2026-03-07

## simple-read

| Test Case | main (ops/s) | perf-opt (ops/s) | Change | Speedup |
|-----------|-------------:|-----------------:|-------:|--------:|
| atoms=100 | 9,152,800 | 37,407,096 | +308.7% | 4.09x |
| atoms=1,000 | 9,219,016 | 36,796,409 | +299.2% | 3.99x |
| atoms=10,000 | 9,207,003 | 36,883,556 | +300.6% | 4.01x |
| atoms=100,000 | 8,761,196 | 36,854,072 | +320.7% | 4.21x |
| atoms=1,000,000 | 9,252,560 | 36,995,086 | +299.8% | 4.00x |

**Average speedup: ~4.06x faster**

## simple-write

| Test Case | main (ops/s) | perf-opt (ops/s) | Change | Speedup |
|-----------|-------------:|-----------------:|-------:|--------:|
| atoms=100 | 696,015 | 780,525 | +12.1% | 1.12x |
| atoms=1,000 | 702,592 | 779,318 | +10.9% | 1.11x |
| atoms=10,000 | 705,954 | 784,363 | +11.1% | 1.11x |
| atoms=100,000 | 703,348 | 785,624 | +11.7% | 1.12x |
| atoms=1,000,000 | 705,465 | 782,264 | +10.9% | 1.11x |

**Average speedup: ~1.11x faster**

## derived-read

| Test Case | main (ops/s) | perf-opt (ops/s) | Change | Speedup |
|-----------|-------------:|-----------------:|-------:|--------:|
| chain depth=1 | 4,416,831 | 38,363,355 | +768.6% | 8.69x |
| chain depth=5 | 1,530,522 | 36,789,979 | +2,303.6% | 24.04x |
| chain depth=10 | 839,548 | 37,948,683 | +4,420.2% | 45.20x |
| chain depth=50 | 184,067 | 36,777,752 | +19,881.1% | 199.81x |
| chain depth=100 | 91,974 | 37,849,134 | +41,053.3% | 411.53x |
| wide deps=10 | 847,096 | 38,042,002 | +4,391.3% | 44.91x |
| wide deps=50 | 188,409 | 37,784,501 | +19,957.7% | 200.55x |
| wide deps=100 | 94,734 | 37,728,297 | +39,727.5% | 398.28x |
| wide deps=500 | 18,515 | 37,840,742 | +204,274.1% | 2,043.74x |

**Massive improvements across the board.** The `performance-optimizations` branch eliminates the O(n) dependency chain traversal cost, making derived atom reads nearly constant-time regardless of chain depth or dependency width.

## subscribe-write

| Test Case | main (ops/s) | perf-opt (ops/s) | Change | Speedup |
|-----------|-------------:|-----------------:|-------:|--------:|
| atoms=100 | 368,980 | 303,638 | -17.7% | 0.82x |
| atoms=1,000 | 516,059 | 545,255 | +5.7% | 1.06x |
| atoms=10,000 | 455,455 | 397,838 | -12.6% | 0.87x |
| atoms=100,000 | 430,498 | 441,793 | +2.6% | 1.03x |
| atoms=1,000,000 | 467,709 | 484,949 | +3.7% | 1.04x |

**Note:** subscribe-write results have high variance (±87% in some cases), making direct comparison unreliable. The results are roughly comparable between branches.

---

## Summary

| Benchmark | Average Speedup | Verdict |
|-----------|:-----------:|---------|
| simple-read | **4.06x** | Significant improvement |
| simple-write | **1.11x** | Moderate improvement |
| derived-read | **8.69x - 2,043x** | Dramatic improvement (scales with depth/width) |
| subscribe-write | ~1.0x | Roughly equivalent (high variance) |

The `performance-optimizations` branch delivers transformative performance gains for read operations, especially for derived atoms with deep dependency chains or wide dependency graphs. The simple-read benchmark shows a consistent ~4x speedup. Write operations see a modest ~11% improvement. Subscribe-write performance is roughly unchanged.
