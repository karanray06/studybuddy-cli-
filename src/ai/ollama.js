import { colors } from '../ui/theme.js';

const OLLAMA_BASE = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

/**
 * Check whether Ollama is reachable and return the list of local models.
 */
export async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, models: (data.models || []).map((m) => m.name) };
  } catch {
    return { ok: false, models: [] };
  }
}

/**
 * Pick the best available model, preferring the user's choice,
 * then common small models, then whatever is installed.
 */
export async function pickModel(preferred) {
  const { ok, models } = await checkOllama();
  if (!ok) return null;

  if (preferred && models.some((m) => m.startsWith(preferred))) {
    return models.find((m) => m.startsWith(preferred));
  }

  const preference = [
    'llama3.2', 'llama3.1', 'llama3', 'mistral',
    'phi3', 'phi', 'gemma2', 'gemma', 'qwen2',
  ];
  for (const name of preference) {
    const match = models.find((m) => m.startsWith(name));
    if (match) return match;
  }

  return models[0] || null;
}

/**
 * Send a chat completion request to Ollama.
 * Returns the assistant's text content.
 */
export async function chat(model, messages, options = {}) {
  const body = {
    model: model || DEFAULT_MODEL,
    messages,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 2048,
    },
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.message?.content || '';
}

/**
 * Generate flashcards from text using the LLM.
 * Returns a parsed JSON array of { front, back } objects.
 */
export async function generateCards(model, text, count = null) {
  const countHint = count
    ? `Generate exactly ${count} flashcards.`
    : 'Generate between 5 and 15 flashcards, depending on the amount of content.';

  const messages = [
    {
      role: 'system',
      content: `You are an expert study assistant that creates high-quality flashcards.
Given study notes or text, produce flashcards that cover the most important concepts, definitions, relationships, and facts.
Each flashcard must have a "front" (a clear, concise question) and a "back" (a precise, complete answer).
${countHint}

IMPORTANT: Return ONLY a valid JSON array. No markdown fences, no explanation, no preamble.
Example: [{"front":"What is X?","back":"X is..."},{"front":"Explain Y","back":"Y means..."}]`,
    },
    {
      role: 'user',
      content: text,
    },
  ];

  const raw = await chat(model, messages, { temperature: 0.4 });
  return parseJSONArray(raw);
}

/**
 * Generate an explanation for why the correct answer is right,
 * given the student's incorrect response.
 */
export async function explainAnswer(model, question, correctAnswer, userAnswer) {
  const messages = [
    {
      role: 'system',
      content: `You are a patient, encouraging tutor. A student got a flashcard question wrong.
Explain why the correct answer is right in 2-4 sentences. Be warm and helpful.
If the student's answer was partially correct, acknowledge what they got right.
Do NOT repeat the question or correct answer verbatim — focus on the *why*.`,
    },
    {
      role: 'user',
      content: `Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer}

Please explain.`,
    },
  ];

  return chat(model, messages, { temperature: 0.6, maxTokens: 512 });
}

/**
 * Try hard to extract a JSON array from LLM output
 * which may contain markdown fences or leading prose.
 */
function parseJSONArray(raw) {
  // Try direct parse first
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  // Strip markdown code fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      const parsed = JSON.parse(fenced[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  // Find the first [ ... ] block
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  throw new Error('Could not parse flashcards from AI response. Try again or use a different model.');
}
