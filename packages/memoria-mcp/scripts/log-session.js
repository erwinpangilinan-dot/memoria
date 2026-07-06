#!/usr/bin/env node
/** Append a session summary line to today's daily note (used by Cursor hooks). */
import { readFileSync } from 'node:fs';
import { appendSessionLog } from '../src/vault.js';
import { vaultPath } from '../src/config.js';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  let summary = process.argv[2] || '';
  if (!summary && input) {
    try {
      const payload = JSON.parse(input);
      summary =
        payload.summary ||
        payload.message ||
        payload.user_message ||
        payload.conversation_id ||
        'Agent session ended';
    } catch {
      summary = input.trim().slice(0, 200);
    }
  }
  const rel = appendSessionLog(vaultPath(), summary);
  if (rel) process.stdout.write(JSON.stringify({ logged: true, path: rel }) + '\n');
});
