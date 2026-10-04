import chalk from 'chalk';

// ─── Color Palette ──────────────────────────────────────────────
// A curated palette that looks stunning in modern terminals.

export const colors = {
  primary:    chalk.hex('#6C63FF'),   // Soft violet
  secondary:  chalk.hex('#00D9FF'),   // Electric cyan
  accent:     chalk.hex('#FF6B9D'),   // Coral pink
  success:    chalk.hex('#00E676'),   // Bright green
  warning:    chalk.hex('#FFD600'),   // Amber
  error:      chalk.hex('#FF5252'),   // Coral red
  muted:      chalk.hex('#6B7280'),   // Cool gray
  dim:        chalk.hex('#4B5563'),   // Darker gray
  text:       chalk.hex('#E5E7EB'),   // Light text
  highlight:  chalk.hex('#A78BFA'),   // Light purple
  gold:       chalk.hex('#F59E0B'),   // Gold for streaks
};

// ─── Symbols ────────────────────────────────────────────────────
// Safe Unicode symbols that render in Windows Terminal and most fonts.

export const sym = {
  check:    '\u2714',   // ✔
  cross:    '\u2718',   // ✘
  bullet:   '\u2022',   // •
  arrow:    '\u25B6',   // ▶
  star:     '\u2605',   // ★
  heart:    '\u2665',   // ♥
  fire:     '\uD83D\uDD25',  // 🔥
  brain:    '\uD83E\uDDE0',  // 🧠
  book:     '\uD83D\uDCDA',  // 📚
  chart:    '\uD83D\uDCCA',  // 📊
  gear:     '\u2699',   // ⚙
  wave:     '\uD83D\uDC4B',  // 👋
  sparkle:  '\u2728',   // ✨
  trophy:   '\uD83C\uDFC6',  // 🏆
  mic:      '\uD83C\uDFA4',  // 🎤
  clock:    '\u23F0',   // ⏰
  target:   '\uD83C\uDFAF',  // 🎯
  rocket:   '\uD83D\uDE80',  // 🚀
  folder:   '\uD83D\uDCC1',  // 📁
  card:     '\uD83C\uDCCF',  // 🃏
  light:    '\uD83D\uDCA1',  // 💡
};

// ─── Styled Text Helpers ────────────────────────────────────────

export function heading(text) {
  return colors.primary.bold(text);
}

export function subheading(text) {
  return colors.secondary(text);
}

export function successMsg(text) {
  return `${colors.success(sym.check)} ${colors.text(text)}`;
}

export function errorMsg(text) {
  return `${colors.error(sym.cross)} ${colors.text(text)}`;
}

export function warnMsg(text) {
  return `${colors.warning('!')} ${colors.text(text)}`;
}

export function mutedText(text) {
  return colors.muted(text);
}

export function divider(width = 50) {
  return colors.dim('\u2500'.repeat(width));
}

export function label(key, value) {
  return `${colors.muted(key + ':')} ${colors.text(value)}`;
}
