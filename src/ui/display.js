import figlet from 'figlet';
import gradient from 'gradient-string';
import chalk from 'chalk';
import Table from 'cli-table3';
import { colors, sym, divider, mutedText } from './theme.js';
import { getStats, weeklyChart, loadProgress } from '../progress/tracker.js';
import { listDecks } from '../cards/manager.js';
import { masteryLabel } from '../quiz/sm2.js';

// Custom gradient matching our palette
const brand = gradient(['#6C63FF', '#00D9FF', '#A78BFA']);
const warm  = gradient(['#FF6B9D', '#F59E0B']);

/**
 * Print the big ASCII banner.
 */
export function printBanner() {
  const art = figlet.textSync('StudyBuddy', {
    font: 'Small',
    horizontalLayout: 'default',
  });

  console.log('');
  console.log(brand(art));
  console.log(
    colors.muted('  AI-Powered Study Companion') +
    colors.dim('  \u2022  ') +
    colors.secondary('Ollama') +
    colors.dim('  \u2022  ') +
    colors.muted('100% Local')
  );
  console.log('');
}

/**
 * Print a one-line streak + mastery summary below the banner.
 */
export function printQuickStats() {
  const progress = loadProgress();
  const decks = listDecks();
  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);

  const streak = progress.streaks.current;
  const streakIcon = streak >= 7 ? sym.fire : streak > 0 ? sym.star : sym.clock;

  const parts = [
    `${streakIcon} ${colors.gold(streak + '-day streak')}`,
    `${sym.book} ${colors.text(decks.length + ' decks')}`,
    `${sym.card} ${colors.text(totalCards + ' cards')}`,
  ];

  if (progress.totalCardsStudied > 0) {
    const acc = Math.round((progress.totalCorrect / progress.totalCardsStudied) * 100);
    parts.push(`${sym.target} ${colors.text(acc + '% accuracy')}`);
  }

  console.log('  ' + parts.join(colors.dim('  \u2502  ')));
  console.log('');
}

/**
 * Print the full progress dashboard.
 */
export function printProgressDashboard() {
  const stats = getStats();
  const week = weeklyChart();

  console.log('');
  console.log(brand('  \u2550\u2550\u2550 Progress Dashboard \u2550\u2550\u2550'));
  console.log('');

  // Streak section
  const streakStr = stats.streaks.current;
  const streakMax = stats.streaks.longest;
  console.log(
    `  ${sym.fire} ${colors.gold.bold('Current Streak:')} ${colors.text(streakStr + ' day' + (streakStr !== 1 ? 's' : ''))}` +
    `   ${colors.muted('|')}   ${sym.trophy} ${colors.gold.bold('Longest:')} ${colors.text(streakMax + ' day' + (streakMax !== 1 ? 's' : ''))}`
  );
  console.log('');

  // Overall stats table
  const table = new Table({
    chars: {
      top: '\u2500', 'top-mid': '\u252C', 'top-left': '\u250C', 'top-right': '\u2510',
      bottom: '\u2500', 'bottom-mid': '\u2534', 'bottom-left': '\u2514', 'bottom-right': '\u2518',
      left: '\u2502', 'left-mid': '\u251C', mid: '\u2500', 'mid-mid': '\u253C',
      right: '\u2502', 'right-mid': '\u2524', middle: '\u2502'
    },
    style: { head: ['cyan'], border: ['gray'] },
  });
  table.push(
    [colors.secondary('Cards Studied'), colors.text(String(stats.totalCardsStudied))],
    [colors.success('Correct'),         colors.success(String(stats.totalCorrect))],
    [colors.error('Incorrect'),         colors.error(String(stats.totalIncorrect))],
    [colors.primary('Accuracy'),        colors.primary(stats.accuracy + '%')],
    [colors.gold('Decks Created'),      colors.text(String(stats.totalDecksCreated))],
  );
  console.log(table.toString());
  console.log('');

  // Weekly activity
  console.log(`  ${sym.chart} ${colors.secondary.bold('Last 7 Days')}`);
  console.log('');
  for (const day of week) {
    const barColor = day.count > 0 ? colors.primary : colors.dim;
    const countStr = day.count > 0 ? colors.text(` ${day.count}`) : colors.dim(' 0');
    console.log(`  ${colors.muted(day.dayName.padEnd(4))} ${barColor(day.bar.padEnd(16))}${countStr}`);
  }
  console.log('');
}

/**
 * Print a card for review display.
 */
export function printCard(index, total, front, showBack = false, back = '') {
  console.log('');
  console.log(
    `  ${colors.dim(`[${index + 1}/${total}]`)} ` +
    colors.primary.bold('Question:')
  );
  console.log(`  ${colors.text(front)}`);

  if (showBack) {
    console.log('');
    console.log(`  ${colors.success.bold('Answer:')}`);
    console.log(`  ${colors.success(back)}`);
  }
  console.log('');
}

/**
 * Print the result of a single card review.
 */
export function printReviewResult(correct, explanation = null) {
  if (correct) {
    console.log(`  ${colors.success(sym.check + ' Correct!')} ${sym.sparkle}`);
  } else {
    console.log(`  ${colors.error(sym.cross + ' Not quite.')}`);
  }

  if (explanation) {
    console.log('');
    console.log(`  ${sym.light} ${colors.highlight.bold('Explanation:')}`);
    // Wrap explanation text
    const words = explanation.split(' ');
    let line = '  ';
    for (const word of words) {
      if (line.length + word.length > 72) {
        console.log(colors.text(line));
        line = '  ';
      }
      line += word + ' ';
    }
    if (line.trim()) console.log(colors.text(line));
  }
  console.log('');
}

/**
 * Print a quiz summary at the end.
 */
export function printQuizSummary(results) {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  console.log('');
  console.log(brand('  \u2550\u2550\u2550 Quiz Complete! \u2550\u2550\u2550'));
  console.log('');

  let grade;
  if (pct >= 90) grade = colors.success.bold(`${sym.trophy} Outstanding!`);
  else if (pct >= 70) grade = colors.primary.bold(`${sym.star} Great job!`);
  else if (pct >= 50) grade = colors.warning.bold(`${sym.target} Getting there!`);
  else grade = colors.accent.bold(`${sym.heart} Keep practicing!`);

  console.log(`  ${grade}`);
  console.log(`  ${colors.text(`${correct}/${total} correct`)} ${colors.muted(`(${pct}%)`)} `);
  console.log('');
}

/**
 * Print a mastery breakdown for a deck's cards.
 */
export function printDeckMastery(cards) {
  const counts = { New: 0, Learning: 0, Reviewing: 0, Mastered: 0 };
  for (const card of cards) {
    const label = masteryLabel(card.sm2);
    counts[label] = (counts[label] || 0) + 1;
  }

  const total = cards.length || 1;
  const bar = (count, color) => {
    const len = Math.round((count / total) * 30);
    return color('\u2588'.repeat(len));
  };

  console.log(`  ${colors.muted('New')}       ${bar(counts.New, colors.dim)} ${counts.New}`);
  console.log(`  ${colors.warning('Learning')}  ${bar(counts.Learning, colors.warning)} ${counts.Learning}`);
  console.log(`  ${colors.primary('Reviewing')} ${bar(counts.Reviewing, colors.primary)} ${counts.Reviewing}`);
  console.log(`  ${colors.success('Mastered')}  ${bar(counts.Mastered, colors.success)} ${counts.Mastered}`);
}
