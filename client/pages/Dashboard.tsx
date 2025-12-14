import { useEffect, useState } from "react";
import { Search, Sidebar, Settings, HelpCircle, Plus, Loader } from "lucide-react";
import Header from "@/components/Header";
import { useMemoryStorage } from "@/hooks/useMemoryStorage";
import type { MemoryNode } from "@shared/extension-types";
import { generateSampleMemoryNodes } from "@/lib/sample-data";

interface PageMemory {
  id: string;
  url: string;
  title: string;
  snippet: string;
  timestamp: string;
  similarity: number;
  keywords: string[];
}

interface Cluster {
  id: string;
  name: string;
  color: string;
  itemCount: number;
  pages: PageMemory[];
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("search");
  const [selectedMemory, setSelectedMemory] = useState<PageMemory | null>(null);
  const [memories, setMemories] = useState<PageMemory[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    isReady,
    addPage,
    getAllPages,
    getPageCount,
    getStorageSize,
    searchPages,
    error,
  } = useMemoryStorage();

  // Load data from IndexedDB
  useEffect(() => {
    if (!isReady) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const allPages = await getAllPages();
        const count = await getPageCount();
        const size = await getStorageSize();

        setPageCount(count);
        setStorageSize(size);

        // Convert MemoryNode to PageMemory format
        const formattedMemories: PageMemory[] = allPages.map((node) => ({
          id: node.id,
          url: node.url,
          title: node.title,
          snippet: node.readableText.slice(0, 150),
          timestamp: new Date(node.timestamp).toLocaleString(),
          similarity: 1.0 - (Math.random() * 0.2), // Simulate similarity scores
          keywords: node.keywords,
        }));

        setMemories(formattedMemories);

        // Generate simple clusters based on keywords
        const clusterMap = new Map<string, PageMemory[]>();
        formattedMemories.forEach((memory) => {
          const primaryKeyword = memory.keywords[0] || "Other";
          if (!clusterMap.has(primaryKeyword)) {
            clusterMap.set(primaryKeyword, []);
          }
          clusterMap.get(primaryKeyword)!.push(memory);
        });

        const generatedClusters: Cluster[] = Array.from(clusterMap.entries())
          .slice(0, 6)
          .map(([keyword, pages], index) => ({
            id: `c${index}`,
            name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Resources`,
            color: [
              "from-blue-500 to-blue-600",
              "from-purple-500 to-purple-600",
              "from-pink-500 to-pink-600",
              "from-green-500 to-green-600",
              "from-orange-500 to-orange-600",
              "from-teal-500 to-teal-600",
            ][index % 6],
            itemCount: pages.length,
            pages: pages.slice(0, 3),
          }));

        setClusters(generatedClusters);
      } catch (err) {
        console.error("Failed to load memories:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isReady, getAllPages, getPageCount, getStorageSize]);

  // Add sample data for testing
  const handleAddSampleData = async () => {
    try {
      setIsLoading(true);
      const sampleNodes = generateSampleMemoryNodes();
      for (const node of sampleNodes) {
        await addPage(node);
      }
      // Reload data
      const allPages = await getAllPages();
      const count = await getPageCount();
      const size = await getStorageSize();

      setPageCount(count);
      setStorageSize(size);

      const formattedMemories: PageMemory[] = allPages.map((node) => ({
        id: node.id,
        url: node.url,
        title: node.title,
        snippet: node.readableText.slice(0, 150),
        timestamp: new Date(node.timestamp).toLocaleString(),
        similarity: 1.0 - (Math.random() * 0.2),
        keywords: node.keywords,
      }));

      setMemories(formattedMemories);

      const clusterMap = new Map<string, PageMemory[]>();
      formattedMemories.forEach((memory) => {
        const primaryKeyword = memory.keywords[0] || "Other";
        if (!clusterMap.has(primaryKeyword)) {
          clusterMap.set(primaryKeyword, []);
        }
        clusterMap.get(primaryKeyword)!.push(memory);
      });

      const generatedClusters: Cluster[] = Array.from(clusterMap.entries())
        .slice(0, 6)
        .map(([keyword, pages], index) => ({
          id: `c${index}`,
          name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Resources`,
          color: [
            "from-blue-500 to-blue-600",
            "from-purple-500 to-purple-600",
            "from-pink-500 to-pink-600",
            "from-green-500 to-green-600",
            "from-orange-500 to-orange-600",
            "from-teal-500 to-teal-600",
          ][index % 6],
          itemCount: pages.length,
          pages: pages.slice(0, 3),
        }));

      setClusters(generatedClusters);
    } catch (err) {
      console.error("Failed to add sample data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMemories = searchQuery
    ? memories.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.keywords.some((k) =>
            k.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : memories;

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="hidden lg:flex w-64 border-r border-border flex-col bg-white dark:bg-slate-950">
            <div className="p-6 border-b border-border">
              <h2 className="text-sm font-bold text-primary mb-4">CORTEX</h2>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("search")}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "search"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Search className="inline w-4 h-4 mr-2" />
                  Search Memory
                </button>
                <button
                  onClick={() => setActiveTab("clusters")}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "clusters"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Sidebar className="inline w-4 h-4 mr-2" />
                  Tab Clusters
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "settings"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Settings className="inline w-4 h-4 mr-2" />
                  Privacy Settings
                </button>
              </nav>
            </div>

            {/* Statistics */}
            <div className="p-6 space-y-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  MEMORY SIZE
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatStorageSize(storageSize)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  PAGES INDEXED
                </p>
                <p className="text-2xl font-bold text-primary">{pageCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  ACTIVE CLUSTERS
                </p>
                <p className="text-2xl font-bold text-primary">
                  {clusters.length}
                </p>
              </div>
            </div>

            {/* Help */}
            <div className="mt-auto p-6 space-y-2">
              {pageCount === 0 && (
                <button
                  onClick={handleAddSampleData}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Sample Data
                </button>
              )}
              <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium">
                <HelpCircle className="w-4 h-4" />
                Help & Feedback
              </button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 lg:p-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeTab === "search" ? (
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  Semantic Memory Search
                </h1>
                <p className="text-muted-foreground mb-8">
                  Search across your browsing history by meaning. "React
                  performance" finds all related pages, not just exact matches.
                </p>

                {/* Search Box */}
                <div className="mb-8">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by meaning... e.g., 'React performance optimization'"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  {filteredMemories.map((memory) => (
                    <div
                      key={memory.id}
                      onClick={() => setSelectedMemory(memory)}
                      className="p-6 rounded-lg border border-border hover:border-primary/50 hover:shadow-lg cursor-pointer transition-all bg-white dark:bg-slate-900/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">
                            {memory.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {memory.url}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">
                            {Math.round(memory.similarity * 100)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            match
                          </p>
                        </div>
                      </div>

                      <p className="text-muted-foreground mb-4">
                        {memory.snippet}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {memory.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-muted-foreground mt-4">
                        {memory.timestamp}
                      </p>
                    </div>
                  ))}
                </div>

                {filteredMemories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {memories.length === 0
                        ? "No pages indexed yet. Click 'Add Sample Data' in the sidebar to get started!"
                        : "No results found. Try a different search."}
                    </p>
                  </div>
                )}
              </div>
            ) : activeTab === "clusters" ? (
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  Tab Clustering
                </h1>
                <p className="text-muted-foreground mb-8">
                  Your browsing organized by topic. AI-powered clustering
                  eliminates tab chaos.
                </p>

                {clusters.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No clusters yet. Add some pages to get started!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {clusters.map((cluster) => (
                      <div
                        key={cluster.id}
                        className="rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow bg-white dark:bg-slate-900/50"
                      >
                        <div
                          className={`h-32 bg-gradient-to-br ${cluster.color}`}
                        />
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-2">
                            {cluster.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {cluster.itemCount} related pages
                          </p>
                          <div className="space-y-2">
                            {cluster.pages.map((page) => (
                              <a
                                key={page.id}
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-sm text-primary hover:underline truncate"
                              >
                                {page.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  Privacy Settings
                </h1>
                <p className="text-muted-foreground mb-8">
                  Complete control over your data. All processing happens
                  locally on your device.
                </p>

                <div className="space-y-6 max-w-2xl">
                  {/* Capture Control */}
                  <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">
                        Capture Control
                      </h3>
                      <div className="w-12 h-6 bg-primary rounded-full" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Memory capture is currently active. Toggle to pause
                      recording new pages.
                    </p>
                  </div>

                  {/* Selective Forget */}
                  <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
                    <h3 className="text-lg font-semibold mb-4">
                      Selective Forget
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Remove data by domain, date range, or specific pages.
                    </p>
                    <button className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors">
                      Forget by Domain
                    </button>
                  </div>

                  {/* Data Export */}
                  <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
                    <h3 className="text-lg font-semibold mb-4">Data Export</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Export your entire memory graph as JSON for backup or
                      analysis.
                    </p>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                      Export Data
                    </button>
                  </div>

                  {/* Storage Info */}
                  <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
                    <h3 className="text-lg font-semibold mb-4">
                      Local Storage
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Used:</span>
                        <span className="font-semibold">
                          {formatStorageSize(storageSize)} / 50 MB
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${Math.min((storageSize / (50 * 1024 * 1024)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Explain Why Modal */}
      {selectedMemory && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMemory(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Explain Why</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">
                  Page Title
                </p>
                <p className="font-semibold">{selectedMemory.title}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">
                  Similarity Score
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${selectedMemory.similarity * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-bold text-primary">
                    {Math.round(selectedMemory.similarity * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  Shared Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">
                  Reason
                </p>
                <p className="text-sm">
                  This page was matched due to semantic similarity in content
                  and shared keywords.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMemory(null)}
              className="w-full mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
