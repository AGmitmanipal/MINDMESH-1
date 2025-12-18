// Cortex Extension Popup Script

// Open dashboard button
document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:8080/dashboard' });
});

// Open privacy settings button
document.getElementById('openSettings').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:8080/privacy' });
});

// Load statistics from IndexedDB
async function loadStats() {
  try {
    const dbRequest = indexedDB.open('cortex-memory', 2);

    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      
      // Get page count
      const countTx = db.transaction(['pages'], 'readonly');
      const countStore = countTx.objectStore('pages');
      const countReq = countStore.count();
      
      countReq.onsuccess = () => {
        document.getElementById('pageCount').textContent = countReq.result;
      };

      // Get storage size estimate
      if (navigator.storage?.estimate) {
        navigator.storage.estimate().then(estimate => {
          const sizeMB = (estimate.usage / (1024 * 1024)).toFixed(1);
          document.getElementById('storageSize').textContent = sizeMB + ' MB';
        });
      }
    };
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load stats on popup open
loadStats();
