/**
 * Cortex IndexedDB Storage Layer
 * Production-ready storage with proper schema, migrations, and optimizations
 */

import type { MemoryNode, Embedding, MemoryCluster, SemanticMatch } from "@shared/extension-types";

const DB_NAME = "cortex-memory";
const DB_VERSION = 2; // Increment for schema changes

const STORES = {
  PAGES: "pages",
  EMBEDDINGS: "embeddings",
  CLUSTERS: "clusters",
  GRAPH_EDGES: "graph_edges",
  SESSIONS: "sessions",
  ACTIVITY: "activity",
  SETTINGS: "settings",
} as const;

export class CortexStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Pages store - main memory nodes
        if (!db.objectStoreNames.contains(STORES.PAGES)) {
          const pageStore = db.createObjectStore(STORES.PAGES, { keyPath: "id" });
          pageStore.createIndex("url", "url", { unique: false });
          pageStore.createIndex("domain", "metadata.domain", { unique: false });
          pageStore.createIndex("timestamp", "timestamp", { unique: false });
          pageStore.createIndex("sessionId", "metadata.sessionId", { unique: false });
        }

        // Embeddings store - vector embeddings for semantic search
        if (!db.objectStoreNames.contains(STORES.EMBEDDINGS)) {
          const embeddingStore = db.createObjectStore(STORES.EMBEDDINGS, { keyPath: "nodeId" });
          embeddingStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Clusters store - semantic clusters
        if (!db.objectStoreNames.contains(STORES.CLUSTERS)) {
          const clusterStore = db.createObjectStore(STORES.CLUSTERS, { keyPath: "id" });
          clusterStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Graph edges - relationships between pages
        if (!db.objectStoreNames.contains(STORES.GRAPH_EDGES)) {
          const edgeStore = db.createObjectStore(STORES.GRAPH_EDGES, { keyPath: "id" });
          edgeStore.createIndex("fromNode", "fromNode", { unique: false });
          edgeStore.createIndex("toNode", "toNode", { unique: false });
          edgeStore.createIndex("strength", "strength", { unique: false });
        }

        // Sessions - browsing sessions
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: "id" });
          sessionStore.createIndex("startTime", "startTime", { unique: false });
        }

        // Activity - user activity logs
        if (!db.objectStoreNames.contains(STORES.ACTIVITY)) {
          const activityStore = db.createObjectStore(STORES.ACTIVITY, { keyPath: "id" });
          activityStore.createIndex("timestamp", "timestamp", { unique: false });
          activityStore.createIndex("type", "type", { unique: false });
        }

        // Settings - user preferences
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  // Memory Node Operations
  async addMemoryNode(node: MemoryNode): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PAGES], "readwrite");
      const store = transaction.objectStore(STORES.PAGES);
      const request = store.put(node);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to add memory node"));
    });
  }

  async getMemoryNode(id: string): Promise<MemoryNode | null> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PAGES], "readonly");
      const store = transaction.objectStore(STORES.PAGES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error("Failed to get memory node"));
    });
  }

  async getAllMemoryNodes(limit?: number): Promise<MemoryNode[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PAGES], "readonly");
      const store = transaction.objectStore(STORES.PAGES);
      const index = store.index("timestamp");
      const request = index.getAll();

      request.onsuccess = () => {
        const results = request.result as MemoryNode[];
        const sorted = results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(limit ? sorted.slice(0, limit) : sorted);
      };
      request.onerror = () => reject(new Error("Failed to get memory nodes"));
    });
  }

  async searchMemoryNodes(query: string, limit: number = 10): Promise<MemoryNode[]> {
    // Simple text search - will be enhanced with vector search
    const allNodes = await this.getAllMemoryNodes();
    const queryTerms = query.toLowerCase().split(/\s+/);

    const scored = allNodes
      .map((node) => {
        const searchText = `${node.title} ${node.readableText} ${node.keywords.join(" ")}`.toLowerCase();
        let score = 0;
        queryTerms.forEach((term) => {
          if (searchText.includes(term)) {
            score += 1;
          }
        });
        return { node, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((r) => r.node);
  }

  async deleteMemoryNode(id: string): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PAGES, STORES.EMBEDDINGS], "readwrite");
      const pageStore = transaction.objectStore(STORES.PAGES);
      const embeddingStore = transaction.objectStore(STORES.EMBEDDINGS);

      pageStore.delete(id);
      embeddingStore.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Failed to delete memory node"));
    });
  }

  // Embedding Operations
  async storeEmbedding(nodeId: string, embedding: Embedding): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EMBEDDINGS], "readwrite");
      const store = transaction.objectStore(STORES.EMBEDDINGS);
      const request = store.put({ nodeId, ...embedding });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to store embedding"));
    });
  }

  async getEmbedding(nodeId: string): Promise<Embedding | null> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EMBEDDINGS], "readonly");
      const store = transaction.objectStore(STORES.EMBEDDINGS);
      const request = store.get(nodeId);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        resolve({
          vector: result.vector,
          model: result.model,
          timestamp: result.timestamp,
        });
      };
      request.onerror = () => reject(new Error("Failed to get embedding"));
    });
  }

  async getAllEmbeddings(): Promise<Array<{ nodeId: string; embedding: Embedding }>> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EMBEDDINGS], "readonly");
      const store = transaction.objectStore(STORES.EMBEDDINGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        resolve(
          results.map((r: any) => ({
            nodeId: r.nodeId,
            embedding: {
              vector: r.vector,
              model: r.model,
              timestamp: r.timestamp,
            },
          }))
        );
      };
      request.onerror = () => reject(new Error("Failed to get embeddings"));
    });
  }

  // Vector Search
  async vectorSearch(
    queryVector: number[],
    limit: number = 10,
    threshold: number = 0.5
  ): Promise<SemanticMatch[]> {
    const allEmbeddings = await this.getAllEmbeddings();
    const matches: SemanticMatch[] = [];

    for (const { nodeId, embedding } of allEmbeddings) {
      const similarity = cosineSimilarity(queryVector, embedding.vector);
      if (similarity >= threshold) {
        const node = await this.getMemoryNode(nodeId);
        if (node) {
          matches.push({
            nodeId,
            similarity,
            node,
            reason: {
              sharedKeywords: [],
              contextMatch: "",
              semanticSimilarity: similarity,
            },
          });
        }
      }
    }

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Cluster Operations
  async saveCluster(cluster: MemoryCluster): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CLUSTERS], "readwrite");
      const store = transaction.objectStore(STORES.CLUSTERS);
      const request = store.put(cluster);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save cluster"));
    });
  }

  async getAllClusters(): Promise<MemoryCluster[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CLUSTERS], "readonly");
      const store = transaction.objectStore(STORES.CLUSTERS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("Failed to get clusters"));
    });
  }

  // Graph Operations
  async addGraphEdge(fromNode: string, toNode: string, strength: number): Promise<void> {
    await this.ready();
    const edgeId = `${fromNode}:${toNode}`;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.GRAPH_EDGES], "readwrite");
      const store = transaction.objectStore(STORES.GRAPH_EDGES);
      const request = store.put({
        id: edgeId,
        fromNode,
        toNode,
        strength,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to add graph edge"));
    });
  }

  async getRelatedNodes(nodeId: string, limit: number = 5): Promise<MemoryNode[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.GRAPH_EDGES], "readonly");
      const store = transaction.objectStore(STORES.GRAPH_EDGES);
      const index = store.index("fromNode");
      const request = index.getAll(nodeId);

      request.onsuccess = async () => {
        const edges = request.result;
        const sorted = edges.sort((a: any, b: any) => b.strength - a.strength);
        const relatedIds = sorted.slice(0, limit).map((e: any) => e.toNode);
        const nodes = await Promise.all(
          relatedIds.map((id: string) => this.getMemoryNode(id))
        );
        resolve(nodes.filter((n): n is MemoryNode => n !== null));
      };
      request.onerror = () => reject(new Error("Failed to get related nodes"));
    });
  }

  // Statistics
  async getStats(): Promise<{
    pageCount: number;
    clusterCount: number;
    edgeCount: number;
    storageSize: number;
  }> {
    await this.ready();
    const [pageCount, clusterCount, edgeCount] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        const transaction = this.db!.transaction([STORES.PAGES], "readonly");
        const store = transaction.objectStore(STORES.PAGES);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("Failed to count pages"));
      }),
      new Promise<number>((resolve, reject) => {
        const transaction = this.db!.transaction([STORES.CLUSTERS], "readonly");
        const store = transaction.objectStore(STORES.CLUSTERS);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("Failed to count clusters"));
      }),
      new Promise<number>((resolve, reject) => {
        const transaction = this.db!.transaction([STORES.GRAPH_EDGES], "readonly");
        const store = transaction.objectStore(STORES.GRAPH_EDGES);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("Failed to count edges"));
      }),
    ]);

    let storageSize = 0;
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        storageSize = estimate.usage || 0;
      } catch {
        // Ignore
      }
    }

    return { pageCount, clusterCount, edgeCount, storageSize };
  }

  // Cleanup operations
  async deleteByDomain(domain: string): Promise<number> {
    await this.ready();
    const allNodes = await this.getAllMemoryNodes();
    const toDelete = allNodes.filter((n) => n.metadata.domain === domain);
    
    for (const node of toDelete) {
      await this.deleteMemoryNode(node.id);
    }
    
    return toDelete.length;
  }

  async deleteByDateRange(startDate: number, endDate: number): Promise<number> {
    await this.ready();
    const allNodes = await this.getAllMemoryNodes();
    const toDelete = allNodes.filter(
      (n) => n.timestamp >= startDate && n.timestamp <= endDate
    );
    
    for (const node of toDelete) {
      await this.deleteMemoryNode(node.id);
    }
    
    return toDelete.length;
  }
}

// Utility: Cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Singleton instance
export const cortexStorage = new CortexStorage();

