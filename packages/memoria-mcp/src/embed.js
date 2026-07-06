import { pipeline } from '@xenova/transformers';
import { EMBED_DIM, embedModel, embeddingsEnabled, embeddingsMode } from './config.js';

let embedderPromise = null;

function mockEmbed(text, dim = EMBED_DIM) {
  const vec = new Float32Array(dim);
  const norm = text.toLowerCase();
  for (let i = 0; i < norm.length; i++) {
    vec[i % dim] += norm.charCodeAt(i) / (norm.length * 256);
  }
  let sumSq = 0;
  for (let i = 0; i < dim; i++) sumSq += vec[i] * vec[i];
  const scale = sumSq > 0 ? 1 / Math.sqrt(sumSq) : 1;
  for (let i = 0; i < dim; i++) vec[i] *= scale;
  return vec;
}

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', embedModel());
  }
  return embedderPromise;
}

export function vectorToBlob(vec) {
  return new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength);
}

/** Returns null when embeddings are disabled. */
export async function embedText(text) {
  if (!embeddingsEnabled()) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (embeddingsMode() === 'mock') return mockEmbed(trimmed);

  const embedder = await getEmbedder();
  const out = await embedder(trimmed, { pooling: 'mean', normalize: true });
  return out.data;
}
