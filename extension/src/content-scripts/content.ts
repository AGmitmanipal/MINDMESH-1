/**
 * Cortex Content Script
 * 
 * Injected into every page the user visits.
 * Captures page content and sends it to the background service worker.
 * Minimal performance impact - runs asynchronously.
 */

import type { PageContext } from "@shared/extension-types";
import { extractReadableText, extractKeywords, getFaviconUrl, getDomain } from "@/lib/text-utils";

/**
 * Extract relevant page information
 */
function capturePageContext(): PageContext {
  const htmlContent = document.documentElement.outerHTML;
  const readableText = extractReadableText(htmlContent);
  const keywords = extractKeywords(readableText, document.title);

  return {
    url: window.location.href,
    title: document.title,
    readableText: readableText,
    timestamp: Date.now(),
    favicon: getFaviconUrl(window.location.href),
    metadata: {
      domain: getDomain(window.location.href),
    },
  };
}

/**
 * Send page capture to background worker
 */
function sendPageCapture(pageContext: PageContext) {
  chrome.runtime.sendMessage(
    {
      type: "PAGE_CAPTURED",
      payload: pageContext,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Cortex: Failed to send page capture", chrome.runtime.lastError);
      } else {
        console.debug("Cortex: Page captured successfully", response);
      }
    }
  );
}

/**
 * Handle page visibility changes
 * Only capture when page becomes visible and stays visible for a moment
 */
let captureTimeout: NodeJS.Timeout | null = null;

function handleVisibilityChange() {
  if (document.hidden) {
    // Page is hidden, cancel pending capture
    if (captureTimeout) {
      clearTimeout(captureTimeout);
      captureTimeout = null;
    }
  } else {
    // Page is visible, schedule capture
    if (captureTimeout) {
      clearTimeout(captureTimeout);
    }
    captureTimeout = setTimeout(() => {
      const pageContext = capturePageContext();
      sendPageCapture(pageContext);
      captureTimeout = null;
    }, 1000); // Wait 1 second to ensure page has loaded
  }
}

/**
 * Initialize content script
 */
function init() {
  // Capture on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        const pageContext = capturePageContext();
        sendPageCapture(pageContext);
      }, 500);
    });
  } else {
    setTimeout(() => {
      const pageContext = capturePageContext();
      sendPageCapture(pageContext);
    }, 500);
  }

  // Listen for visibility changes
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Cleanup
  window.addEventListener("beforeunload", () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (captureTimeout) {
      clearTimeout(captureTimeout);
    }
  });
}

// Start initialization
init();
