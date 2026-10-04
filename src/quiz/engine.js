import { input, confirm, select } from '@inquirer/prompts';
import { loadDeck, updateCardReview } from '../cards/manager.js';
import { calculateSM2, isDue, sortByDue, qualityFromResult } from '../quiz/sm2.js';
import { explainAnswer } from '../ai/ollama.js';
import { recordReview } from '../progress/tracker.js';
import {
  printCard, printReviewResult, printQuizSummary, printDeckMastery,
} from '../ui/display.js';
import { colors, sym, divider } from '../ui/theme.js';
import ora from 'ora';

/**
 * Run an interactive quiz session on a deck.
 *
 * @param {string} deckId - ID of the deck to study
 * @param {string} model  - Ollama model name (for explanations)
 * @param {object} opts   - { maxCards, reviewAll }
 */
export async function runQuiz(deckId, model, opts = {}) {
  const deck = loadDeck(deckId);
  if (!deck) {
    console.log(colors.error(`  ${sym.cross} Deck not found.`));
    return;
  }

  if (deck.cards.length === 0) {
    console.log(colors.warning(`  ${sym.cross} This deck has no cards yet.`));
    return;
  }

  // Determine which cards to study
  let studyCards;
  if (opts.reviewAll) {
    studyCards = [...deck.cards];
  } else {
    // Only due cards
    studyCards = deck.cards.filter((c) => isDue(c.sm2));
    if (studyCards.length === 0) {
      console.log('');
      console.log(colors.success(`  ${sym.check} All caught up! No cards are due for review.`));
      console.log(colors.muted('  Come back later or study all cards with "Review All".'));
      console.log('');

      // Show mastery breakdown
      printDeckMastery(deck.cards);
      console.log('');
      return;
    }
  }

  // Sort by due date (most overdue first)
  studyCards = sortByDue(studyCards);

  // Limit the number of cards if requested
  if (opts.maxCards && opts.maxCards < studyCards.length) {
    studyCards = studyCards.slice(0, opts.maxCards);
  }

  console.log('');
  console.log(
    `  ${sym.brain} ${colors.primary.bold('Quiz:')} ${colors.text(deck.name)}` +
    `  ${colors.dim('|')}  ${colors.muted(studyCards.length + ' card' + (studyCards.length !== 1 ? 's' : ''))}`
  );
  console.log(divider(50));

  const results = [];

  for (let i = 0; i < studyCards.length; i++) {
    const card = studyCards[i];

    // Show the question
    printCard(i, studyCards.length, card.front);

    // Get the user's answer
    const userAnswer = await input({
      message: colors.secondary('Your answer:'),
      theme: { prefix: `  ${sym.arrow}` },
    });

    // Show the correct answer
    printCard(i, studyCards.length, card.front, true, card.back);

    // Ask if they got it right
    const selfAssessment = await select({
      message: colors.secondary('How did you do?'),
      choices: [
        { name: `${sym.check} Got it right`, value: 'correct' },
        { name: `${sym.cross} Got it wrong`, value: 'incorrect' },
        { name: `${colors.muted('~')} Partially right`, value: 'partial' },
      ],
      theme: { prefix: `  ${sym.arrow}` },
    });

    const correct = selfAssessment === 'correct';
    const quality = selfAssessment === 'correct' ? 5
      : selfAssessment === 'partial' ? 3
      : 1;

    // Calculate new SM-2 state
    const newSM2 = calculateSM2(card.sm2, quality);

    // If wrong, offer an AI explanation
    let explanation = null;
    if (!correct && model) {
      const wantExplanation = await confirm({
        message: colors.highlight('Want an AI explanation?'),
        default: true,
        theme: { prefix: `  ${sym.light}` },
      });

      if (wantExplanation) {
        const spinner = ora({
          text: colors.muted('Thinking...'),
          spinner: 'dots',
          color: 'magenta',
        }).start();

        try {
          explanation = await explainAnswer(model, card.front, card.back, userAnswer);
          spinner.stop();
        } catch {
          spinner.fail(colors.dim('Could not generate explanation'));
        }
      }
    }

    printReviewResult(correct, explanation);

    // Persist the review
    updateCardReview(deck.id, card.id, newSM2, correct);
    recordReview(correct);

    results.push({ cardId: card.id, correct, quality });

    // Divider between cards
    if (i < studyCards.length - 1) {
      console.log(divider(50));
    }
  }

  // Print summary
  printQuizSummary(results);
}
