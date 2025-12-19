/**
 * Embedding Utilities
 * Generates semantic embeddings for pages using deterministic text features
 * 
 * dimension: 384
 */

export interface EmbeddingResult {
  vector: number[];
  model: "fallback";
}

/**
 * Enhanced fallback embedding generator
 * Creates deterministic, meaningful vectors based on text features
 * Uses TF-IDF-inspired approach with word hashing for better semantic representation
 */
export function generateEmbedding(
  text: string,
  title: string = "",
  keywords: string[] = []
): EmbeddingResult {
  const DIM = 384; // Standard embedding dimension
  const vector: number[] = new Array(DIM).fill(0);

  // Combine and clean text sources
  const textSample = text.slice(0, 2000).toLowerCase();
  const titleLow = title.toLowerCase();
  const keywordsStr = keywords.join(" ").toLowerCase();
  
  // Extract words and compute frequencies
  const allText = `${titleLow} ${titleLow} ${titleLow} ${keywordsStr} ${keywordsStr} ${textSample}`;
  const words = allText.match(/\b\w{3,}\b/g) || [];
  const wordFreq = new Map<string, number>();
  
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // Hash function for consistent word->dimension mapping
  const hashWord = (word: string, dim: number): number => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % dim;
  };

  // Populate vector using word hashing (similar to feature hashing)
  // Each word contributes to multiple dimensions for robustness
  wordFreq.forEach((freq, word) => {
    const weight = Math.log(1 + freq); // TF-like weighting
    
    // Map each word to 3 dimensions using different seeds
    for (let seed = 0; seed < 3; seed++) {
      const idx = hashWord(word + seed.toString(), DIM);
      const sign = (hashWord(word, 2) === 0) ? 1 : -1;
      vector[idx] += weight * sign;
    }
  });

  // Add title and keyword boosting
  keywords.forEach(keyword => {
    const word = keyword.toLowerCase();
    const idx = hashWord(word, DIM);
    vector[idx] += 2.0; // Boost keywords
  });

  // Add character n-gram features for better matching
  const trigrams = [];
  for (let i = 0; i < titleLow.length - 2; i++) {
    trigrams.push(titleLow.substring(i, i + 3));
  }
  
  trigrams.slice(0, 20).forEach(trigram => {
    const idx = hashWord(trigram, DIM);
    vector[idx] += 0.5;
  });

  // Normalize vector to unit length
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < DIM; i++) {
      vector[i] /= norm;
    }
  }

  return {
    vector,
    model: "fallback"
  };
}

