from datetime import date

from app.services.rewards import continuous_runs, reading_days_by_week, weekly_runs


def test_continuous_runs_track_current_and_longest() -> None:
    dates = [
        date(2026, 7, 1),
        date(2026, 7, 2),
        date(2026, 8, 10),
        date(2026, 8, 11),
        date(2026, 8, 12),
    ]

    assert continuous_runs(dates, date(2026, 8, 13)) == (3, 3)
    assert continuous_runs(dates, date(2026, 8, 15)) == (0, 3)


def test_weekly_runs_distinguish_consistency_and_consecutive_weeks() -> None:
    dates = [
        date(2026, 7, 20),
        date(2026, 7, 22),
        date(2026, 7, 24),
        date(2026, 7, 27),
        date(2026, 7, 29),
        date(2026, 7, 31),
        date(2026, 8, 3),
        date(2026, 8, 4),
        date(2026, 8, 5),
        date(2026, 8, 6),
        date(2026, 8, 7),
    ]
    weekly_days = reading_days_by_week(dates)

    assert max(weekly_days.values()) == 5
    assert weekly_runs(weekly_days, date(2026, 8, 13)) == (3, 3)
