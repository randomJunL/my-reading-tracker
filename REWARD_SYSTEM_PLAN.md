# Reward System Plan

## Purpose

The reward system helps a household celebrate durable reading habits without
turning reading time or page count into standalone competitions. Each reader
earns permanent badges, receives reward credits, and can redeem household-
configured gifts with parent oversight.

## Badge categories and rules

### Books finished

- First Book: 1 book
- Book Explorer: 5 books
- Book Adventurer: 10 books
- Book Champion: 25 books
- Reading Legend: 50 books
- After 50 books, one bonus credit is awarded every additional 25 books.

A reader-book counts once when its library status is `finished`.

### Weekly consistency

Reading days are counted inside a Monday-Sunday week. Multiple sessions on the
same date count as one day, and the days do not need to be consecutive.

- Steady Reader: 3 days in one week
- Strong Reading Week: 5 days in one week
- Perfect Reading Week: 7 days in one week

### Weekly streak

A successful week contains at least three separate reading days.

- Building a Habit: 2 consecutive successful weeks
- Monthly Momentum: 4 consecutive successful weeks
- Reading Routine: 8 consecutive successful weeks
- Season of Reading: 12 consecutive successful weeks
- After 12 weeks, one bonus credit is awarded every four additional consecutive
  successful weeks.

### Continuous reading days

At least one session must exist on every consecutive calendar date.

- Three-Day Reader: 3 days
- One-Week Reader: 7 days
- Two-Week Reader: 14 days
- Monthly Reader: 30 days
- Reading Marathon: 60 days
- After 60 days, one bonus credit is awarded every additional 30 continuous
  days.

## Permanence and corrections

Badges, credits, fulfilled gifts, and longest-run records never reset when an
active run ends. Current daily and weekly runs reset when continuity is broken.
Session edits and deletions recalculate current progress, but previously earned
badges remain unless a future parent-controlled revocation explicitly reverses
them through the credit ledger.

## Credits and gifts

Every permanent badge and recurring bonus grants one credit. Parents configure
gift names, descriptions, costs, availability, and optional quantity. A
redemption deducts credits immediately and begins as `pending`. Rejected or
cancelled requests refund credits; approved requests may be marked `fulfilled`.
All credit changes are append-only ledger transactions with idempotency keys.

## Product surfaces

- Dashboard: balance, current daily run, weekly progress, latest badge, and
  nearest milestones.
- Rewards / Progress: current and longest runs plus milestone progress.
- Rewards / Badges: earned and locked badge collection.
- Rewards / Gift shop: active household gifts and redemption action.
- Rewards / History: credit ledger and redemption status history.
- Parent controls: create, update, activate, and retire gifts.

## Security and data ownership

All progress, gifts, transactions, and redemptions are resolved through the
authenticated household. Awarding and spending credits are transactional and
idempotent. Reward data is included in the complete JSON backup.

## Delivery sequence

1. Add reward tables and seed the built-in badge catalog.
2. Implement milestone calculations and transactional badge/bonus awards.
3. Evaluate progress after session and reader-book status changes.
4. Add progress, badge, gift, ledger, and redemption APIs.
5. Build Rewards UI and dashboard summary.
6. Extend complete JSON backup.
7. Verify boundary calculations, duplicate prevention, refunds, insufficient
   balances, household isolation, accessibility, and browser behavior.
