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
    threshold: number = 0.15
  ): Promise<RecallResult> {
    console.log(`RecallService: Searching for "${query}" with threshold ${threshold}`);
    
    // Extract keywords from query for better matching
    const queryWords = query.toLowerCase().match(/\b\w{3,}\b/g) || [];
    
    // Generate query embedding
    const queryEmbedding = generateEmbedding(query, query, queryWords);
    console.log(`RecallService: Generated query embedding with ${queryEmbedding.vector.length} dimensions`);
    
    // Perform vector search with lower threshold for better recall
    const matches = await cortexStorage.vectorSearch(queryEmbedding.vector, limit, threshold);
    
    console.log(`RecallService: Found ${matches.length} semantic matches (threshold: ${threshold})`);

    // If very few semantic matches, also try keyword search and merge results
    if (matches.length < 3) {
      console.log("RecallService: Augmenting with keyword search");
      const keywordNodes = await cortexStorage.searchMemoryNodes(query, limit);
      
      // Merge results, avoiding duplicates
      const existingIds = new Set(matches.map(m => m.nodeId));
      const additionalMatches = keywordNodes
        .filter(node => !existingIds.has(node.id))
        .map(node => createSemanticMatch(node, 0.2, query));
      
      const allMatches = [...matches, ...additionalMatches]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      console.log(`RecallService: Total matches after merge: ${allMatches.length}`);
      
      return {
        matches: allMatches,
        query,
        timestamp: Date.now(),
        totalResults: allMatches.length,
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
