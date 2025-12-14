/**
 * Recall Service
 * Semantic search and memory retrieval
 */

import type { MemoryNode, SemanticMatch } from "@shared/extension-types";
import { cortexStorage } from "../utils/storage";
import { createSemanticMatch } from "../utils/vector-search";

export interface RecallResult {
  matches: SemanticMatch[];
  query: string;
  timestamp: number;
  totalResults: number;
}

export class RecallService {
  /**
   * Search memory by semantic similarity
   */
  async search(
    query: string,
    limit: number = 10,
    threshold: number = 0.5
  ): Promise<RecallResult> {
    // For now, use text-based search
    // In production, generate query embedding and use vector search
    const nodes = await cortexStorage.searchMemoryNodes(query, limit * 2);

    // Create semantic matches with explainability
    const matches: SemanticMatch[] = nodes
      .map((node) => {
        // Calculate similarity score
        const similarity = this.calculateTextSimilarity(query, node);
        return createSemanticMatch(node, similarity, query);
      })
      .filter((match) => match.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      matches,
      query,
      timestamp: Date.now(),
      totalResults: matches.length,
    };
  }

  /**
   * Get related pages for a given URL
   */
  async getRelatedPages(url: string, limit: number = 5): Promise<MemoryNode[]> {
    const allNodes = await cortexStorage.getAllMemoryNodes();
    const targetNode = allNodes.find((n) => n.url === url);

    if (!targetNode) {
      return [];
    }

    // Use semantic graph to find related pages
    return cortexStorage.getRelatedNodes(targetNode.id, limit);
  }

  /**
   * Get recent pages in a time window
   */
  async getRecentPages(
    hours: number = 24,
    limit: number = 20
  ): Promise<MemoryNode[]> {
    const allNodes = await cortexStorage.getAllMemoryNodes();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    return allNodes
      .filter((node) => node.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get pages by domain
   */
  async getPagesByDomain(domain: string): Promise<MemoryNode[]> {
    const allNodes = await cortexStorage.getAllMemoryNodes();
    return allNodes.filter((node) => node.metadata.domain === domain);
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateTextSimilarity(query: string, node: MemoryNode): number {
    const queryLower = query.toLowerCase();
    const searchText = `${node.title} ${node.readableText.slice(0, 500)} ${node.keywords.join(" ")}`.toLowerCase();

    const queryWords = new Set(queryLower.split(/\s+/).filter((w) => w.length > 2));
    const textWords = new Set(searchText.split(/\s+/).filter((w) => w.length > 2));

    const intersection = Array.from(queryWords).filter((w) => textWords.has(w));
    const union = new Set([...queryWords, ...textWords]);

    // Jaccard similarity
    return union.size > 0 ? intersection.length / union.size : 0;
  }
}

export const recallService = new RecallService();

