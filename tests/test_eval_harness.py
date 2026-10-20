"""
Test suite for the Quiet Check-In routine intelligence evaluation harness.
Asserts that statistical baselines achieve the required precision, recall, and false alarm targets.
"""
import pytest
from eval.harness import run_evaluation_harness


def test_evaluation_harness_performance_benchmarks():
    """
    Simulates 5 distinct personas over a 14-day evaluation period
    and asserts performance meets PRD benchmarks.
    """
    results = run_evaluation_harness(eval_days=14)

    assert results.total_days_simulated == 5 * 14
    assert results.injected_breaks > 0
    # PRD Target: Detection Recall >= 90%
    assert results.recall >= 0.90, f"Recall {results.recall} is below 90% benchmark"
    # PRD Target: False positive alerts < 1.0 per person-month
    assert results.false_alarms_per_person_month < 1.0, f"FP rate {results.false_alarms_per_person_month} exceeds 1.0/mo benchmark"
    # Precision benchmark >= 85%
    assert results.precision >= 0.85, f"Precision {results.precision} is below 85% benchmark"
