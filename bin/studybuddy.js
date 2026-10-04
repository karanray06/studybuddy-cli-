#!/usr/bin/env node

import { Command } from 'commander';
import { main } from '../src/index.js';

const program = new Command();

program
  .name('studybuddy')
  .description('AI-powered study buddy CLI with spaced repetition — powered by Ollama')
  .version('1.0.0')
  .action(async () => {
    try {
      await main();
    } catch (err) {
      if (err.name === 'ExitPromptError') {
        // User pressed Ctrl+C in a prompt — exit gracefully
        console.log('\n  Bye! 👋\n');
        process.exit(0);
      }
      console.error('\nUnexpected error:', err.message);
      process.exit(1);
    }
  });

program.parse();
