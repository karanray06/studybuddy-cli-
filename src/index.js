import { input, confirm, select, editor } from '@inquirer/prompts';
import { existsSync } from 'fs';
import ora from 'ora';

import { checkOllama, pickModel } from './ai/ollama.js';
import { generateDeck } from './cards/generator.js';
import { extractText, isSupported, SUPPORTED_EXTENSIONS } from './cards/importer.js';
import { listDecks, loadDeck, deleteDeck, getDataDir } from './cards/manager.js';
import { runQuiz } from './quiz/engine.js';
import { captureVoice } from './voice/server.js';
import {
  printBanner, printQuickStats, printProgressDashboard, printDeckMastery,
} from './ui/display.js';
import { colors, sym, divider, heading, mutedText } from './ui/theme.js';

let currentModel = null;

/**
 * Main application entry point.
 */
export async function main() {
  printBanner();

  // Check Ollama connection
  const spinner = ora({
    text: colors.muted('Connecting to Ollama...'),
    spinner: 'dots',
    color: 'cyan',
  }).start();

  const status = await checkOllama();
  if (!status.ok) {
    spinner.fail(
      colors.error('Cannot reach Ollama at http://localhost:11434')
    );
    console.log('');
    console.log(colors.text('  To get started:'));
    console.log(colors.muted('  1. Install Ollama: ') + colors.secondary('https://ollama.ai'));
    console.log(colors.muted('  2. Start Ollama:   ') + colors.secondary('ollama serve'));
    console.log(colors.muted('  3. Pull a model:   ') + colors.secondary('ollama pull llama3.2'));
    console.log('');
    process.exit(1);
  }

  currentModel = await pickModel();
  if (!currentModel) {
    spinner.fail(colors.error('No models found in Ollama.'));
    console.log(colors.muted('  Pull a model first: ') + colors.secondary('ollama pull llama3.2'));
    process.exit(1);
  }

  spinner.succeed(
    colors.success(`Connected to Ollama`) +
    colors.dim(' \u2022 ') +
    colors.secondary(currentModel)
  );
  console.log('');

  printQuickStats();

  // Main menu loop
  await mainMenu();
}

/**
 * Main interactive menu.
 */
async function mainMenu() {
  while (true) {
    console.log(divider(50));

    const choice = await select({
      message: colors.primary('What would you like to do?'),
      choices: [
        { name: `${sym.book}  Create a new deck`,   value: 'create' },
        { name: `${sym.brain} Study a deck`,         value: 'study' },
        { name: `${sym.chart} View progress`,        value: 'progress' },
        { name: `${sym.folder} Manage decks`,        value: 'manage' },
        { name: `${sym.gear}  Settings`,             value: 'settings' },
        { name: `${sym.wave}  Exit`,                 value: 'exit' },
      ],
      theme: {
        prefix: `  ${sym.sparkle}`,
        style: { highlight: (text) => colors.secondary(text) },
      },
    });

    switch (choice) {
      case 'create':    await createDeckFlow(); break;
      case 'study':     await studyDeckFlow(); break;
      case 'progress':  printProgressDashboard(); break;
      case 'manage':    await manageDeckFlow(); break;
      case 'settings':  await settingsFlow(); break;
      case 'exit':
        console.log('');
        console.log(`  ${sym.wave} ${colors.highlight('Happy studying! See you soon.')} ${sym.sparkle}`);
        console.log('');
        process.exit(0);
    }
  }
}

// ─── Create Deck ────────────────────────────────────────────────

async function createDeckFlow() {
  console.log('');
  console.log(`  ${sym.sparkle} ${heading('Create a New Deck')}`);
  console.log('');

  const source = await select({
    message: colors.secondary('How do you want to add content?'),
    choices: [
      { name: `${sym.bullet} Paste or type notes`,         value: 'text' },
      { name: `${sym.folder} Import from a file (PDF/TXT)`, value: 'file' },
      { name: `${sym.mic}  Voice input`,                   value: 'voice' },
    ],
    theme: { prefix: `  ${sym.arrow}` },
  });

  const name = await input({
    message: colors.secondary('Deck name:'),
    validate: (v) => v.trim() ? true : 'Please enter a name',
    theme: { prefix: `  ${sym.arrow}` },
  });

  let text;

  if (source === 'text') {
    console.log(colors.muted('  Paste or type your study notes below. Press Enter twice when done.'));
    console.log('');

    // Collect multi-line input
    text = await collectMultilineInput();

  } else if (source === 'file') {
    const filePath = await input({
      message: colors.secondary('File path:'),
      validate: (v) => {
        if (!v.trim()) return 'Please enter a file path';
        if (!existsSync(v.trim())) return 'File not found';
        if (!isSupported(v.trim())) return `Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`;
        return true;
      },
      theme: { prefix: `  ${sym.arrow}` },
    });

    text = await extractText(filePath.trim());

  } else if (source === 'voice') {
    try {
      text = await captureVoice();
      console.log(`  ${colors.success(sym.check)} Received voice input (${text.split(' ').length} words)`);
    } catch (err) {
      console.log(colors.error(`  ${sym.cross} ${err.message}`));
      return;
    }
  }

  if (!text || !text.trim()) {
    console.log(colors.warning(`  ${sym.cross} No content provided.`));
    return;
  }

  // Truncate for display
  const preview = text.slice(0, 120).replace(/\n/g, ' ') + (text.length > 120 ? '...' : '');
  console.log(`  ${colors.muted('Content:')} ${colors.dim(preview)}`);
  console.log('');

  try {
    const { deck, cards } = await generateDeck(currentModel, name, text, source);
    console.log('');
    console.log(`  ${sym.book} ${colors.primary.bold(deck.name)}`);
    console.log(`  ${colors.muted(cards.length + ' flashcards created')}`);
    console.log('');

    // Preview a couple of cards
    const previewCount = Math.min(3, cards.length);
    for (let i = 0; i < previewCount; i++) {
      console.log(`  ${colors.dim(`[${i + 1}]`)} ${colors.text(cards[i].front)}`);
      console.log(`      ${colors.success(cards[i].back)}`);
      if (i < previewCount - 1) console.log('');
    }
    if (cards.length > previewCount) {
      console.log(colors.muted(`  ... and ${cards.length - previewCount} more`));
    }
    console.log('');

    // Offer to study now
    const studyNow = await confirm({
      message: colors.highlight('Start studying this deck now?'),
      default: true,
      theme: { prefix: `  ${sym.brain}` },
    });

    if (studyNow) {
      await runQuiz(deck.id, currentModel, { reviewAll: true });
    }
  } catch (err) {
    console.log(colors.error(`  ${sym.cross} ${err.message}`));
  }
}

// ─── Study Deck ─────────────────────────────────────────────────

async function studyDeckFlow() {
  const decks = listDecks();
  if (decks.length === 0) {
    console.log('');
    console.log(colors.muted(`  ${sym.cross} No decks yet. Create one first!`));
    console.log('');
    return;
  }

  console.log('');
  const deckId = await select({
    message: colors.secondary('Which deck to study?'),
    choices: decks.map((d) => ({
      name: `${colors.text(d.name)} ${colors.muted(`(${d.cardCount} cards)`)}`,
      value: d.id,
    })),
    theme: { prefix: `  ${sym.brain}` },
  });

  const mode = await select({
    message: colors.secondary('Study mode:'),
    choices: [
      { name: `${sym.target} Due cards only (spaced repetition)`, value: 'due' },
      { name: `${sym.book}  Review all cards`,                    value: 'all' },
    ],
    theme: { prefix: `  ${sym.arrow}` },
  });

  await runQuiz(deckId, currentModel, {
    reviewAll: mode === 'all',
  });
}

// ─── Manage Decks ───────────────────────────────────────────────

async function manageDeckFlow() {
  const decks = listDecks();
  if (decks.length === 0) {
    console.log('');
    console.log(colors.muted(`  ${sym.cross} No decks yet.`));
    console.log('');
    return;
  }

  console.log('');
  console.log(`  ${sym.folder} ${heading('Your Decks')}`);
  console.log('');

  for (const d of decks) {
    const age = timeSince(new Date(d.createdAt));
    console.log(
      `  ${colors.primary(d.name)}  ` +
      colors.muted(`${d.cardCount} cards \u2022 ${d.source} \u2022 ${age}`)
    );
  }
  console.log('');

  const action = await select({
    message: colors.secondary('What do you want to do?'),
    choices: [
      { name: `${sym.chart} View deck details / mastery`, value: 'details' },
      { name: `${sym.cross} Delete a deck`,               value: 'delete' },
      { name: `${sym.arrow} Back to menu`,                 value: 'back' },
    ],
    theme: { prefix: `  ${sym.arrow}` },
  });

  if (action === 'details') {
    const deckId = await select({
      message: colors.secondary('Which deck?'),
      choices: decks.map((d) => ({ name: d.name, value: d.id })),
      theme: { prefix: `  ${sym.arrow}` },
    });
    const deck = loadDeck(deckId);
    if (deck) {
      console.log('');
      console.log(`  ${sym.book} ${colors.primary.bold(deck.name)}`);
      console.log(`  ${colors.muted(deck.description || 'No description')}`);
      console.log(`  ${colors.muted(deck.cards.length + ' cards \u2022 ' + deck.source)}`);
      console.log('');
      printDeckMastery(deck.cards);
      console.log('');
    }
  } else if (action === 'delete') {
    const deckId = await select({
      message: colors.warning('Which deck to delete?'),
      choices: decks.map((d) => ({
        name: `${d.name} (${d.cardCount} cards)`,
        value: d.id,
      })),
      theme: { prefix: `  ${sym.cross}` },
    });

    const sure = await confirm({
      message: colors.error('Are you sure? This cannot be undone.'),
      default: false,
      theme: { prefix: `  ${sym.cross}` },
    });

    if (sure) {
      deleteDeck(deckId);
      console.log(colors.success(`  ${sym.check} Deck deleted.`));
    }
  }
}

// ─── Settings ───────────────────────────────────────────────────

async function settingsFlow() {
  console.log('');
  console.log(`  ${sym.gear} ${heading('Settings')}`);
  console.log('');
  console.log(`  ${colors.muted('Current model:')} ${colors.secondary(currentModel)}`);
  console.log(`  ${colors.muted('Data directory:')} ${colors.dim(getDataDir())}`);
  console.log('');

  const action = await select({
    message: colors.secondary('What to change?'),
    choices: [
      { name: 'Switch AI model',    value: 'model' },
      { name: 'Back to menu',       value: 'back' },
    ],
    theme: { prefix: `  ${sym.arrow}` },
  });

  if (action === 'model') {
    const { models } = await checkOllama();
    if (models.length === 0) {
      console.log(colors.warning('  No models installed in Ollama.'));
      return;
    }

    const model = await select({
      message: colors.secondary('Choose a model:'),
      choices: models.map((m) => ({
        name: m === currentModel ? `${m} ${colors.success('(current)')}` : m,
        value: m,
      })),
      theme: { prefix: `  ${sym.arrow}` },
    });

    currentModel = model;
    console.log(colors.success(`  ${sym.check} Switched to ${model}`));
  }
}

// ─── Helpers ────────────────────────────────────────────────────

async function collectMultilineInput() {
  const lines = [];
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    let emptyCount = 0;

    const promptLine = () => {
      rl.question(colors.dim('  > '), (line) => {
        if (line === '') {
          emptyCount++;
          if (emptyCount >= 2) {
            rl.close();
            resolve(lines.join('\n'));
            return;
          }
        } else {
          emptyCount = 0;
          lines.push(line);
        }
        promptLine();
      });
    };

    promptLine();
  });
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
