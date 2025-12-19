/**
 * Vector Search Engine
 * Deterministic, dimension-safe, cosine-correct
 */

import type { MemoryNode, SemanticMatch } from "@shared/extension-types";

/* =========================
   Vector Index Interface
========================= */

export interface VectorIndex {
  add(nodeId: string, vector: number[]): void;
  search(
    queryVector: number[],
    k?: number,
    threshold?: number
  ): Array<{ nodeId: string; similarity: number }>;
  remove(nodeId: string): void;
  clear(): void;
}

/* =========================
   Utilities
========================= */

export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  if (norm === 0) return vector.slice();
  return vector.map(v => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/* =========================
   Brute Force Index
========================= */

export class BruteForceIndex implements VectorIndex {
  private vectors = new Map<string, number[]>();

  add(nodeId: string, vector: number[]): void {
    this.vectors.set(nodeId, normalizeVector(vector));
  }

  search(
    queryVector: number[],
    k: number = 10,
    threshold: number = 0.5
  ) {
    const query = normalizeVector(queryVector);

    const results = [];
    for (const [id, vec] of this.vectors) {
      const sim = cosineSimilarity(query, vec);
      if (sim >= threshold) {
        results.push({ nodeId: id, similarity: sim });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  remove(nodeId: string): void {
    this.vectors.delete(nodeId);
  }

  clear(): void {
    this.vectors.clear();
  }
}

/* =========================
   ANN Index (Random Projection)
========================= */

export interface ANNIndexOptions {
  numHashes?: number;
}

export class ANNIndex implements VectorIndex {
  private vectors = new Map<string, number[]>();
  private hashes = new Map<string, number>();
  private buckets = new Map<number, Set<string>>();
  private projectionMatrix: number[][] = [];

  private dim: number | null = null;
  private numHashes: number;

  constructor(options: ANNIndexOptions = {}) {
    this.numHashes = options.numHashes ?? 16;
  }

  private initProjection(dim: number) {
    if (this.dim !== null) return;

    this.dim = dim;
    for (let i = 0; i < this.numHashes; i++) {
      const row = new Array(dim);
      for (let j = 0; j < dim; j++) {
        row[j] = Math.sin(i * 73856093 + j * 19349663);
      }
      this.projectionMatrix.push(row);
    }
  }

  private hash(vector: number[]): number {
    if (this.dim === null) this.initProjection(vector.length);
    if (vector.length !== this.dim) {
      throw new Error(`Vector dimension mismatch: expected ${this.dim}, got ${vector.length}`);
    }

    let hash = 0;
    for (let i = 0; i < this.numHashes; i++) {
      let dot = 0;
      for (let j = 0; j < this.dim; j++) {
        dot += vector[j] * this.projectionMatrix[i][j];
      }
      if (dot > 0) hash |= 1 << i;
    }
    return hash;
  }

  add(nodeId: string, vector: number[]): void {
    const v = normalizeVector(vector);
    const h = this.hash(v);

    this.vectors.set(nodeId, v);
    this.hashes.set(nodeId, h);

    if (!this.buckets.has(h)) this.buckets.set(h, new Set());
    this.buckets.get(h)!.add(nodeId);
  }

  search(
    queryVector: number[],
    k: number = 10,
    threshold: number = 0.4
  ) {
    const query = normalizeVector(queryVector);
    const qh = this.hash(query);

    const candidates = new Set<string>();

    // Same bucket + 1-bit flips
    for (let i = -1; i < this.numHashes; i++) {
      const h = i === -1 ? qh : qh ^ (1 << i);
      this.buckets.get(h)?.forEach(id => candidates.add(id));
    }

    // Full fallback if recall is low
    if (candidates.size < k) {
      this.vectors.forEach((_, id) => candidates.add(id));
    }

    const results = [];
    for (const id of candidates) {
      const sim = cosineSimilarity(query, this.vectors.get(id)!);
      if (sim >= threshold) {
        results.push({ nodeId: id, similarity: sim });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  remove(nodeId: string): void {
    const h = this.hashes.get(nodeId);
    if (h !== undefined) this.buckets.get(h)?.delete(nodeId);

    this.hashes.delete(nodeId);
    this.vectors.delete(nodeId);
  }

  clear(): void {
    this.vectors.clear();
    this.hashes.clear();
    this.buckets.clear();
    this.projectionMatrix = [];
    this.dim = null;
  }
}

/* =========================
   Semantic Matching Helpers
========================= */

export function findSharedKeywords(
  queryText: string,
  node: MemoryNode
): string[] {
  const queryWords = new Set(
    queryText
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
  );

  return node.keywords.filter(kw =>
    queryWords.has(kw.toLowerCase())
  );
}

function generateContextMatch(
  queryText: string,
  node: MemoryNode
): string {
  const q = queryText.toLowerCase();
  if (node.title.toLowerCase().includes(q)) return "Title match";
  if (node.readableText.toLowerCase().includes(q)) return "Content match";
  if (node.keywords.some(k => q.includes(k.toLowerCase()))) return "Keyword match";
  return "Semantic similarity";
}

export function createSemanticMatch(
  node: MemoryNode,
  similarity: number,
  queryText: string
): SemanticMatch {
  return {
    nodeId: node.id,
    similarity,
    node,
    reason: {
      semanticSimilarity: similarity,
      sharedKeywords: findSharedKeywords(queryText, node),
      contextMatch: generateContextMatch(queryText, node),
    },
  };
}
