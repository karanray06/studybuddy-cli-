import { readFileSync } from 'fs';
import { extname } from 'path';
import ora from 'ora';
import { colors } from '../ui/theme.js';

/**
 * Extract text from a file (PDF or plain text).
 * Returns the raw text content.
 */
export async function extractText(filePath) {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return extractPDF(filePath);
  }

  // Treat everything else as plain text (.txt, .md, .rst, .org, etc.)
  return readFileSync(filePath, 'utf-8');
}

/**
 * Extract text from a PDF file.
 */
async function extractPDF(filePath) {
  const spinner = ora({
    text: colors.secondary('Extracting text from PDF...'),
    spinner: 'dots12',
    color: 'cyan',
  }).start();

  try {
    // Dynamic import so the app doesn't crash if pdf-parse has issues
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = readFileSync(filePath);
    const data = await pdfParse(buffer);

    spinner.succeed(
      colors.success(`Extracted ${data.numpages} page(s) from PDF`)
    );
    return data.text;
  } catch (err) {
    spinner.fail(colors.error('Failed to extract PDF text'));
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
}

/**
 * Supported file extensions.
 */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.rst', '.org', '.text'];

/**
 * Check if a file path has a supported extension.
 */
export function isSupported(filePath) {
  return SUPPORTED_EXTENSIONS.includes(extname(filePath).toLowerCase());
}
