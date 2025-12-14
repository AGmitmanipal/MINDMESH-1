/**
 * Cortex Background Service Worker
 * 
 * Production-ready service worker that coordinates all Cortex services:
 * - Memory capture and storage
 * - Embedding generation
 * - Semantic search
 * - Proactive suggestions
 * - Action execution
 */

import type { ExtensionMessage, PageContext, MemoryNode, Embedding } from "@shared/extension-types";
import { generateMemoryId, extractKeywords } from "@client/lib/text-utils";
import { cortexStorage } from "../utils/storage";
import { semanticGraphBuilder } from "../utils/semantic-graph";
import { recallService } from "../services/recall-service";
import { proactivityEngine } from "../services/proactivity-engine";
import { sessionService } from "../services/session-service";
import { actionExecutor } from "../services/action-executor";

interface MessageHandler {
  [key: string]: (message: ExtensionMessage) => Promise<unknown>;
}

// Initialize storage
cortexStorage.ready().catch((err) => {
  console.error("Cortex: Failed to initialize storage", err);
});

/**
 * Initialize message handler
 */
function initializeMessageHandler() {
  const handlers: MessageHandler = {
    async PAGE_CAPTURED(message: ExtensionMessage) {
      if (message.type !== "PAGE_CAPTURED") return;

      const pageContext = message.payload as PageContext;

      // Check if capture is enabled
      const settings = await chrome.storage.local.get("captureSettings");
      if (!settings.captureSettings?.enabled) {
        return { success: false, reason: "Capture disabled" };
      }

      // Check exclusion rules
      if (await isPageExcluded(pageContext)) {
        return { success: false, reason: "Page excluded by privacy rules" };
      }

      // Get or create session ID
      const sessionId = sessionService.getCurrentSessionId();

      // Extract keywords
      const keywords = extractKeywords(
        pageContext.readableText,
        pageContext.title,
        10
      );

      // Create memory node
      const memoryNode: MemoryNode = {
        id: generateMemoryId(pageContext.url, pageContext.timestamp),
        url: pageContext.url,
        title: pageContext.title,
        readableText: pageContext.readableText.slice(0, 10000), // Limit text size
        timestamp: pageContext.timestamp,
        keywords,
        metadata: {
          domain: getDomainFromUrl(pageContext.url),
          favicon: pageContext.favicon,
          tabId: pageContext.tabId,
          sessionId,
        },
      };

      // Store in IndexedDB
      await cortexStorage.addMemoryNode(memoryNode);

      // Generate embedding asynchronously
      generateEmbeddingAsync(memoryNode).catch((err) => {
        console.error("Cortex: Failed to generate embedding", err);
      });

      return { success: true, memoryId: memoryNode.id };
    },

    async SEARCH_MEMORY(message: ExtensionMessage) {
      if (message.type !== "SEARCH_MEMORY") return;

      const { query, limit = 10 } = message.payload;
      const result = await recallService.search(query, limit);

      return { success: true, ...result };
    },

    async GET_SUGGESTIONS(message: ExtensionMessage) {
      if (message.type !== "GET_SUGGESTIONS") return;

      const { currentUrl, limit = 5 } = message.payload;
      const suggestions = await proactivityEngine.generateSuggestions(currentUrl, limit);

      return { success: true, suggestions };
    },

    async FORGET_DATA(message: ExtensionMessage) {
      if (message.type !== "FORGET_DATA") return;

      const { ruleId, domain, startDate, endDate } = message.payload as any;
      let deleted = 0;

      if (domain) {
        deleted = await cortexStorage.deleteByDomain(domain);
      } else if (startDate && endDate) {
        deleted = await cortexStorage.deleteByDateRange(startDate, endDate);
      }

      return { success: true, deleted };
    },

    async EXPORT_MEMORY() {
      const allMemory = await cortexStorage.getAllMemoryNodes();
      return {
        success: true,
        data: allMemory,
        exportedAt: new Date().toISOString(),
      };
    },

    async UPDATE_CAPTURE_SETTINGS(message: ExtensionMessage) {
      if (message.type !== "UPDATE_CAPTURE_SETTINGS") return;

      const newSettings = message.payload;
      const current = await chrome.storage.local.get("captureSettings");

      await chrome.storage.local.set({
        captureSettings: {
          ...current.captureSettings,
          ...newSettings,
        },
      });

      return { success: true };
    },

    async GET_ACTIVITY_INSIGHTS() {
      const { activityInsightsService } = await import("../services/activity-insights");
      const insights = await activityInsightsService.generateInsights(7);
      return { success: true, insights };
    },

    async GET_SHORTCUTS() {
      const { shortcutGenerator } = await import("../services/shortcut-generator");
      const shortcuts = await shortcutGenerator.generateShortcuts(10);
      return { success: true, shortcuts };
    },

    async EXECUTE_ACTION(message: ExtensionMessage) {
      if (message.type !== "EXECUTE_ACTION") return;
      const action = (message.payload as any).action;
      const result = await actionExecutor.execute(action);
      return { success: result.success, ...result };
    },
  };

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    const handler = handlers[message.type];
    if (handler) {
      handler(message)
        .then((response) => {
          sendResponse(response);
        })
        .catch((error) => {
          console.error("Cortex: Message handler error", error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Keep channel open for async response
    }
  });
}

/**
 * Check if page should be excluded from capture
 */
async function isPageExcluded(pageContext: PageContext): Promise<boolean> {
  const settings = await chrome.storage.local.get("captureSettings");
  const captureSettings = settings.captureSettings || {};

  const domain = getDomainFromUrl(pageContext.url);

  // Check excluded domains
  if (captureSettings.excludeDomains?.includes(domain)) {
    return true;
  }

  // Check excluded keywords
  if (captureSettings.excludeKeywords) {
    const excludedKeywords = captureSettings.excludeKeywords as string[];
    const textLower = pageContext.readableText.toLowerCase();
    for (const keyword of excludedKeywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate embedding asynchronously using web worker
 */
async function generateEmbeddingAsync(node: MemoryNode): Promise<void> {
  try {
    // Create embedding worker
    const worker = new Worker(
      chrome.runtime.getURL("dist/extension/web-workers/embedding.worker.js"),
      { type: "module" }
    );

    // Send embedding request
    const embeddingPromise = new Promise<number[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("Embedding generation timeout"));
      }, 30000); // 30 second timeout

      worker.onmessage = (event) => {
        clearTimeout(timeout);
        worker.terminate();

        if (event.data.success) {
          resolve(event.data.embedding);
        } else {
          reject(new Error("Embedding generation failed"));
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };
    });

    worker.postMessage({
      id: node.id,
      text: node.readableText.slice(0, 5000), // Limit for performance
      title: node.title,
      keywords: node.keywords,
    });

    const embeddingVector = await embeddingPromise;

    // Store embedding
    const embedding: Embedding = {
      vector: embeddingVector,
      model: "fallback", // Will be "wasm" when WASM model is loaded
      timestamp: Date.now(),
    };

    await cortexStorage.storeEmbedding(node.id, embedding);

    // Update semantic graph
    await semanticGraphBuilder.addNode(node, embedding).catch((err) => {
      console.error("Cortex: Failed to update semantic graph", err);
    });
  } catch (error) {
    console.error("Cortex: Embedding generation error", error);
    // Continue without embedding - page is still stored
  }
}

/**
 * Extract domain from URL
 */
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url.split("/")[2] || "";
  }
}

// Initialize on extension load
initializeMessageHandler();

// Initialize default settings if not present
chrome.storage.local.get("captureSettings").then((result) => {
  if (!result.captureSettings) {
    chrome.storage.local.set({
      captureSettings: {
        enabled: true,
        excludeDomains: [],
        excludeKeywords: [],
        maxStorageSize: 50 * 1024 * 1024, // 50 MB
      },
    });
  }
});

console.log("Cortex: Service worker initialized");
