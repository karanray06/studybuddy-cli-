import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), '.studybuddy');
const PROGRESS_FILE = join(DATA_DIR, 'progress.json');

function defaultProgress() {
  return {
    streaks: {
      current: 0,
      longest: 0,
      lastStudyDate: null,
    },
    totalCardsStudied: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalDecksCreated: 0,
    dailyHistory: {},
  };
}

/**
 * Load the global progress file.
 */
export function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return defaultProgress();
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return defaultProgress();
  }
}

/**
 * Save the global progress file.
 */
export function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Record the result of a single card review.
 */
export function recordReview(correct) {
  const progress = loadProgress();
  const today = new Date().toISOString().slice(0, 10);

  // Update totals
  progress.totalCardsStudied += 1;
  if (correct) {
    progress.totalCorrect += 1;
  } else {
    progress.totalIncorrect += 1;
  }

  // Update daily history
  if (!progress.dailyHistory[today]) {
    progress.dailyHistory[today] = { cardsStudied: 0, correct: 0, incorrect: 0 };
  }
  progress.dailyHistory[today].cardsStudied += 1;
  progress.dailyHistory[today][correct ? 'correct' : 'incorrect'] += 1;

  // Update streaks
  updateStreak(progress, today);

  saveProgress(progress);
  return progress;
}

/**
 * Increment the "decks created" counter.
 */
export function recordDeckCreated() {
  const progress = loadProgress();
  progress.totalDecksCreated += 1;
  saveProgress(progress);
}

/**
 * Update the study streak.
 */
function updateStreak(progress, today) {
  const last = progress.streaks.lastStudyDate;

  if (!last) {
    // First ever study session
    progress.streaks.current = 1;
    progress.streaks.longest = 1;
  } else if (last === today) {
    // Already studied today — nothing to change
  } else {
    const lastDate = new Date(last);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      progress.streaks.current += 1;
    } else {
      // Streak broken
      progress.streaks.current = 1;
    }
  }

  progress.streaks.longest = Math.max(progress.streaks.longest, progress.streaks.current);
  progress.streaks.lastStudyDate = today;
}

/**
 * Calculate aggregate statistics for display.
 */
export function getStats() {
  const progress = loadProgress();
  const accuracy =
    progress.totalCardsStudied > 0
      ? Math.round((progress.totalCorrect / progress.totalCardsStudied) * 100)
      : 0;

  // Last 7 days activity
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = progress.dailyHistory[key] || { cardsStudied: 0, correct: 0, incorrect: 0 };
    last7.push({ date: key, ...day });
  }

  return {
    ...progress,
    accuracy,
    last7,
  };
}

/**
 * Generate a mini bar chart of the last 7 days of study activity.
 * Returns an array of strings (one per day).
 */
export function weeklyChart() {
  const stats = getStats();
  const max = Math.max(1, ...stats.last7.map((d) => d.cardsStudied));

  return stats.last7.map((day) => {
    const barLen = Math.round((day.cardsStudied / max) * 15);
    const bar = '\u2588'.repeat(barLen) || '\u2591';
    const dayName = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    return { dayName, bar, count: day.cardsStudied };
  });
}
