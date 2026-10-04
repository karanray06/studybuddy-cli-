import ora from 'ora';
import { generateCards as aiGenerate } from '../ai/ollama.js';
import { createDeck, addCards } from './manager.js';
import { recordDeckCreated } from '../progress/tracker.js';
import { colors, sym } from '../ui/theme.js';

/**
 * Generate flashcards from text input and create a new deck.
 *
 * @param {string} model   - Ollama model name
 * @param {string} name    - Deck name
 * @param {string} text    - Source text / notes
 * @param {string} source  - Source type (text, pdf, voice)
 * @returns {object}       - { deck, cards }
 */
export async function generateDeck(model, name, text, source = 'text') {
  const spinner = ora({
    text: colors.secondary('Generating flashcards with AI...'),
    spinner: 'dots12',
    color: 'cyan',
  }).start();

  try {
    // Ask the LLM to produce cards
    const rawCards = await aiGenerate(model, text);
    spinner.succeed(
      colors.success(`Generated ${rawCards.length} flashcards!`)
    );

    // Create the deck and persist cards
    const deck = createDeck(name, `Generated from ${source} input`, source);
    const cards = addCards(deck.id, rawCards);
    recordDeckCreated();

    return { deck: { ...deck, cards }, cards };
  } catch (err) {
    spinner.fail(colors.error('Failed to generate flashcards'));
    throw err;
  }
}
