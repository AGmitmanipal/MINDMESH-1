/**
 * Cortex Background Worker
 * 
 * Handles message routing, storage coordination, and background services.
 * Orchestrates embedding generation and semantic graph updates.
 */

import { cortexStorage } from "../utils/storage";
import { recallService } from "../services/recall-service";
import { proactivityEngine } from "../services/proactivity-engine";
import { activityInsightsService } from "../services/activity-insights";
import { shortcutGenerator } from "../services/shortcut-generator";
import { actionExecutor } from "../services/action-executor";
import { semanticGraphBuilder } from "../utils/semantic-graph";
import { generateMemoryId, extractKeywords } from "@/lib/text-utils";
import type { ExtensionMessage, MemoryNode } from "@shared/extension-types";

/**
 * Handle messages from content scripts and dashboard
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const handleMessage = async () => {
    switch (message.type) {
      case "PAGE_CAPTURED": {
        const { payload } = message;
        const nodeId = generateMemoryId(payload.url, payload.timestamp);
        
        const node: MemoryNode = {
          id: nodeId,
          url: payload.url,
          title: payload.title,
          readableText: payload.readableText,
          timestamp: payload.timestamp,
          keywords: extractKeywords(payload.readableText, payload.title),
          metadata: {
            domain: new URL(payload.url).hostname,
            favicon: payload.favicon,
            tabId: sender.tab?.id,
            sessionId: payload.sessionId,
          },
        };

        await cortexStorage.addMemoryNode(node);
        
        // Trigger background processing (async)
        Promise.resolve().then(async () => {
          // If we had an embedding, we would update the graph
          // For now, use basic updates if possible
          console.log(`Cortex: Processed node ${nodeId}`);
        });

        return { success: true, nodeId };
      }

      case "SEARCH_MEMORY": {
        const results = await recallService.search(message.payload.query, message.payload.limit);
        return results;
      }

      case "GET_SUGGESTIONS": {
        const suggestions = await proactivityEngine.generateSuggestions(message.payload.currentUrl, message.payload.limit);
        return suggestions;
      }

      case "FORGET_DATA": {
        const { domain, startDate, endDate } = message.payload;
        let count = 0;
        if (domain) {
          count = await cortexStorage.deleteByDomain(domain);
        } else if (startDate && endDate) {
          count = await cortexStorage.deleteByDateRange(startDate, endDate);
        }
        return { success: true, count };
      }

      case "GET_ACTIVITY_INSIGHTS": {
        return await activityInsightsService.getActivityStats();
      }

      case "GET_SHORTCUTS": {
        return await shortcutGenerator.generateShortcuts();
      }

      case "EXECUTE_ACTION": {
        return await actionExecutor.execute(message.payload.action);
      }

      default:
        // @ts-ignore - Handle other message types if needed
        return { error: "Unknown message type" };
    }
  };

  handleMessage().then(sendResponse);
  return true; // Keep channel open for async response
});

console.log("Cortex background worker initialized");
