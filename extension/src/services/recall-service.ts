/**
 * Recall Service
 * Semantic search and memory retrieval
 */

import type { MemoryNode, SemanticMatch } from "@shared/extension-types";
import { cortexStorage } from "../utils/storage";
import { createSemanticMatch } from "../utils/vector-search";
import { generateEmbedding } from "../utils/embedding";

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
    threshold: number = 0.4
  ): Promise<RecallResult> {
    console.log(`RecallService: Searching for "${query}"`);
    
    // Generate query embedding
    const queryEmbedding = generateEmbedding(query, query, []);
    
    // Perform vector search
    const matches = await cortexStorage.vectorSearch(queryEmbedding.vector, limit, threshold);
    
    console.log(`RecallService: Found ${matches.length} semantic matches`);

    // If no semantic matches, fall back to keyword search
    if (matches.length === 0) {
      console.log("RecallService: Falling back to keyword search");
      const nodes = await cortexStorage.searchMemoryNodes(query, limit);
      const fallbackMatches = nodes.map(node => createSemanticMatch(node, 0.3, query));
      return {
        matches: fallbackMatches,
        query,
        timestamp: Date.now(),
        totalResults: fallbackMatches.length,
      };
    }

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
    const nodes = await cortexStorage.getAllMemoryNodes(1000); // Reasonable scan limit
    const targetNode = nodes.find((n) => n.url === url);

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
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    // We can use the existing getAllMemoryNodes but we need a date range version
    const allNodes = await cortexStorage.getAllMemoryNodes(limit * 5);
    
    return allNodes
      .filter((node) => node.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get pages by domain
   */
  async getPagesByDomain(domain: string): Promise<MemoryNode[]> {
    const nodes = await cortexStorage.getAllMemoryNodes(500);
    return nodes.filter((node) => node.metadata.domain === domain);
  }
}

export const recallService = new RecallService();
