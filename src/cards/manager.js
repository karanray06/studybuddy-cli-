import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { createSM2State } from '../quiz/sm2.js';

// ─── Data directory ─────────────────────────────────────────────
const DATA_DIR = join(homedir(), '.studybuddy');
const DECKS_DIR = join(DATA_DIR, 'decks');

function ensureDirs() {
  mkdirSync(DECKS_DIR, { recursive: true });
}

// ─── Deck helpers ───────────────────────────────────────────────

function deckPath(id) {
  return join(DECKS_DIR, `${id}.json`);
}

/**
 * Create a new deck and persist it.
 */
export function createDeck(name, description = '', source = 'text') {
  ensureDirs();
  const deck = {
    id: randomUUID().slice(0, 8),
    name,
    description,
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cards: [],
  };
  saveDeck(deck);
  return deck;
}

/**
 * Save a deck object to disk.
 */
export function saveDeck(deck) {
  ensureDirs();
  deck.updatedAt = new Date().toISOString();
  writeFileSync(deckPath(deck.id), JSON.stringify(deck, null, 2), 'utf-8');
}

/**
 * Load a deck by its ID.
 */
export function loadDeck(id) {
  const p = deckPath(id);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/**
 * List all decks (metadata only, cards count).
 */
export function listDecks() {
  ensureDirs();
  const files = readdirSync(DECKS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const deck = JSON.parse(readFileSync(join(DECKS_DIR, f), 'utf-8'));
    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      source: deck.source,
      cardCount: deck.cards.length,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    };
  });
}

/**
 * Delete a deck by ID.
 */
export function deleteDeck(id) {
  const p = deckPath(id);
  if (existsSync(p)) unlinkSync(p);
}

// ─── Card helpers ───────────────────────────────────────────────

/**
 * Add cards (array of { front, back }) to a deck.
 * Assigns IDs and SM-2 initial state to each card.
 */
export function addCards(deckId, rawCards) {
  const deck = loadDeck(deckId);
  if (!deck) throw new Error(`Deck ${deckId} not found`);

  const cards = rawCards.map((c) => ({
    id: randomUUID().slice(0, 8),
    front: c.front,
    back: c.back,
    createdAt: new Date().toISOString(),
    sm2: createSM2State(),
    stats: { timesStudied: 0, timesCorrect: 0, timesIncorrect: 0 },
  }));

  deck.cards.push(...cards);
  saveDeck(deck);
  return cards;
}

/**
 * Update a single card's SM-2 state and stats after a review.
 */
export function updateCardReview(deckId, cardId, sm2State, correct) {
  const deck = loadDeck(deckId);
  if (!deck) return;

  const card = deck.cards.find((c) => c.id === cardId);
  if (!card) return;

  card.sm2 = sm2State;
  card.stats.timesStudied += 1;
  if (correct) {
    card.stats.timesCorrect += 1;
  } else {
    card.stats.timesIncorrect += 1;
  }

  saveDeck(deck);
  return card;
}

/**
 * Delete a single card from a deck.
 */
export function deleteCard(deckId, cardId) {
  const deck = loadDeck(deckId);
  if (!deck) return;
  deck.cards = deck.cards.filter((c) => c.id !== cardId);
  saveDeck(deck);
}

/**
 * Get all cards from a deck.
 */
export function getCards(deckId) {
  const deck = loadDeck(deckId);
  return deck ? deck.cards : [];
}

/**
 * Get the data directory path (for display purposes).
 */
export function getDataDir() {
  return DATA_DIR;
}
