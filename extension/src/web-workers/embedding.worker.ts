/**
 * Embedding Web Worker
 * Generates semantic embeddings for pages (placeholder for WASM model)
 */

interface EmbeddingRequest {
  id: string;
  text: string;
}

interface EmbeddingResponse {
  id: string;
  embedding: number[];
  success: boolean;
}

// Simple placeholder embedding (in production, use WASM model)
function generatePlaceholderEmbedding(text: string): number[] {
  // This is a placeholder - in production use onnxruntime-web or ggml-wasm
  // For now, generate a deterministic vector based on text hash
  const hash = text.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const vector: number[] = [];
  for (let i = 0; i < 384; i++) {
    vector.push(
      Math.sin((hash + i) / 100) * Math.cos((hash - i) / 100)
    );
  }
  return vector;
}

self.onmessage = (event: MessageEvent<EmbeddingRequest>) => {
  try {
    const { id, text } = event.data;
    const embedding = generatePlaceholderEmbedding(text);

    const response: EmbeddingResponse = {
      id,
      embedding,
      success: true,
    };

    self.postMessage(response);
  } catch (error) {
    const response: EmbeddingResponse = {
      id: event.data.id,
      embedding: [],
      success: false,
    };

    self.postMessage(response);
  }
};

export {}; // Mark as module
