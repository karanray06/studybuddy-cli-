// SM-2 Spaced Repetition Algorithm
// Based on the SuperMemo 2 algorithm by Piotr Wozniak
//
// Quality ratings:
//   0 — Complete blackout
//   1 — Incorrect, but upon seeing the answer it felt familiar
//   2 — Incorrect, but the answer seemed easy to recall
//   3 — Correct with serious difficulty
//   4 — Correct after some hesitation
//   5 — Perfect, instant recall

/**
 * Create a fresh SM-2 state for a new card.
 */
export function createSM2State() {
  return {
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
  };
}

/**
 * Calculate updated SM-2 state after a review.
 * @param {object} sm2 - Current SM-2 state of the card
 * @param {number} quality - Quality of the response (0-5)
 * @returns {object} Updated SM-2 state
 */
export function calculateSM2(sm2, quality) {
  let { easiness, interval, repetitions } = sm2;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update easiness factor (never below 1.3)
  easiness += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easiness = Math.max(1.3, easiness);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easiness: Math.round(easiness * 100) / 100,
    interval,
    repetitions,
    nextReview: nextReview.toISOString(),
    lastReview: new Date().toISOString(),
  };
}

/**
 * Determine whether a card is due for review right now.
 */
export function isDue(sm2) {
  return new Date(sm2.nextReview) <= new Date();
}

/**
 * Sort cards so the most overdue appear first.
 */
export function sortByDue(cards) {
  return [...cards].sort((a, b) => {
    const da = new Date(a.sm2.nextReview);
    const db = new Date(b.sm2.nextReview);
    return da - db;
  });
}

/**
 * Get a human-friendly label for how well the card is known.
 */
export function masteryLabel(sm2) {
  if (sm2.repetitions === 0) return 'New';
  if (sm2.repetitions <= 2) return 'Learning';
  if (sm2.interval < 21) return 'Reviewing';
  return 'Mastered';
}

/**
 * Map a simple correct / incorrect boolean to a quality score.
 * selfRated lets the user optionally say how easy it was.
 */
export function qualityFromResult(correct, selfRated = null) {
  if (selfRated !== null) return selfRated;
  return correct ? 4 : 1;
}
