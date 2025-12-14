import { useState } from "react";
import { Search, Sidebar, Settings, HelpCircle } from "lucide-react";
import Header from "@/components/Header";

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

  // Mock data - in production this would come from IndexedDB
  const mockMemories: PageMemory[] = [
    {
      id: "1",
      url: "https://react.dev/learn",
      title: "React Documentation - Learning",
      snippet:
        "React is a library for building user interfaces with reusable components...",
      timestamp: "2024-01-15 10:30 AM",
      similarity: 0.95,
      keywords: ["React", "components", "hooks", "JSX"],
    },
    {
      id: "2",
      url: "https://nextjs.org/docs",
      title: "Next.js Documentation",
      snippet:
        "Next.js is a React framework for production with built-in optimization...",
      timestamp: "2024-01-15 9:15 AM",
      similarity: 0.87,
      keywords: ["Next.js", "framework", "SSR", "optimization"],
    },
    {
      id: "3",
      url: "https://tailwindcss.com",
      title: "Tailwind CSS - Rapidly Build Modern Designs",
      snippet:
        "Utility-first CSS framework for building custom designs without leaving HTML...",
      timestamp: "2024-01-14 2:45 PM",
      similarity: 0.76,
      keywords: ["Tailwind", "CSS", "utility-first", "design"],
    },
  ];

  const mockClusters: Cluster[] = [
    {
      id: "c1",
      name: "Frontend Development",
      color: "from-blue-500 to-blue-600",
      itemCount: 12,
      pages: mockMemories.slice(0, 2),
    },
    {
      id: "c2",
      name: "Design & Styling",
      color: "from-purple-500 to-purple-600",
      itemCount: 8,
      pages: [mockMemories[2]],
    },
  ];

  const filteredMemories = searchQuery
    ? mockMemories.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.keywords.some((k) =>
            k.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : mockMemories;

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
                <p className="text-2xl font-bold text-primary">2.4 MB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  PAGES INDEXED
                </p>
                <p className="text-2xl font-bold text-primary">247</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  ACTIVE CLUSTERS
                </p>
                <p className="text-2xl font-bold text-primary">12</p>
              </div>
            </div>

            {/* Help */}
            <div className="mt-auto p-6">
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
            {activeTab === "search" && (
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
                    <p className="text-muted-foreground">
                      No results found. Try a different search.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "clusters" && (
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  Tab Clustering
                </h1>
                <p className="text-muted-foreground mb-8">
                  Your browsing organized by topic. AI-powered clustering
                  eliminates tab chaos.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mockClusters.map((cluster) => (
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
              </div>
            )}

            {activeTab === "settings" && (
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
                        <span className="font-semibold">2.4 MB / 50 MB</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full w-[4.8%]" />
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
                  about web development concepts and shared keywords.
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
