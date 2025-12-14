/**
 * Hook for communicating with Cortex browser extension
 */

import { useCallback, useState, useEffect } from "react";
import type { ExtensionMessage, SemanticMatch, MemoryNode } from "@shared/extension-types";

interface ExtensionResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export function useExtension() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [extensionId, setExtensionId] = useState<string | null>(null);

  // Check if extension is available
  useEffect(() => {
    // Try to detect extension
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
      setIsAvailable(true);
      setExtensionId(chrome.runtime.id);
    } else {
      // Check if we can connect to extension
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ type: "PING" }, (response) => {
          if (!chrome.runtime.lastError) {
            setIsAvailable(true);
          }
        });
      }
    }
  }, []);

  /**
   * Send message to extension
   */
  const sendMessage = useCallback(
    async <T = unknown>(message: ExtensionMessage): Promise<ExtensionResponse<T>> => {
      if (!isAvailable || !chrome.runtime) {
        return { success: false, error: "Extension not available" };
      }

      return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response: ExtensionResponse<T>) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: "No response" });
          }
        });
      });
    },
    [isAvailable]
  );

  /**
   * Search memory via extension
   */
  const searchMemory = useCallback(
    async (query: string, limit: number = 10): Promise<SemanticMatch[]> => {
      const response = await sendMessage<{ matches: SemanticMatch[] }>({
        type: "SEARCH_MEMORY",
        payload: { query, limit },
      });

      if (response.success && response.data) {
        return response.data.matches;
      }
      return [];
    },
    [sendMessage]
  );

  /**
   * Get proactive suggestions
   */
  const getSuggestions = useCallback(
    async (currentUrl: string, limit: number = 5): Promise<MemoryNode[]> => {
      const response = await sendMessage<{ suggestions: MemoryNode[] }>({
        type: "GET_SUGGESTIONS",
        payload: { currentUrl, limit },
      });

      if (response.success && response.data) {
        return response.data.suggestions;
      }
      return [];
    },
    [sendMessage]
  );

  /**
   * Export memory
   */
  const exportMemory = useCallback(async (): Promise<MemoryNode[]> => {
    const response = await sendMessage<{ data: MemoryNode[] }>({
      type: "EXPORT_MEMORY",
      payload: {},
    });

    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }, [sendMessage]);

  /**
   * Get activity insights
   */
  const getActivityInsights = useCallback(async () => {
    const response = await sendMessage({
      type: "GET_ACTIVITY_INSIGHTS",
      payload: {},
    });

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }, [sendMessage]);

  /**
   * Get shortcuts
   */
  const getShortcuts = useCallback(async () => {
    const response = await sendMessage({
      type: "GET_SHORTCUTS",
      payload: {},
    });

    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }, [sendMessage]);

  /**
   * Update capture settings
   */
  const updateCaptureSettings = useCallback(
    async (settings: Partial<{ enabled: boolean; excludeDomains: string[]; excludeKeywords: string[] }>) => {
      const response = await sendMessage({
        type: "UPDATE_CAPTURE_SETTINGS",
        payload: settings,
      });

      return response.success;
    },
    [sendMessage]
  );

  return {
    isAvailable,
    extensionId,
    sendMessage,
    searchMemory,
    getSuggestions,
    exportMemory,
    getActivityInsights,
    getShortcuts,
    updateCaptureSettings,
  };
}

