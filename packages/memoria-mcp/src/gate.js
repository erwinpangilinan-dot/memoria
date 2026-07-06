import { extractEntities, hasSalienceSignals } from './entities.js';

const THRESHOLD = 0.45;

export function evaluateSalience(content, { importance = 'medium', memoryType = 'semantic', force = false }) {
  if (force || importance === 'high') {
    return { store: true, score: 1, reason: 'explicit', entities: extractEntities(content) };
  }

  const entities = extractEntities(content);
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  let score = 0;

  if (importance === 'medium') score += 0.25;
  if (importance === 'low') score += 0.05;
  if (words >= 6) score += 0.15;
  if (entities.length > 0) score += 0.25;
  if (memoryType === 'semantic') score += 0.1;
  if (hasSalienceSignals(content)) score += 0.35;

  return {
    store: score >= THRESHOLD,
    score: Math.round(score * 1000) / 1000,
    reason: score >= THRESHOLD ? 'salience' : 'below_threshold',
    entities,
  };
}
