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

  // Load data from IndexedDB - real-time polling
  useEffect(() => {
    if (!isReady) return;

    let interval: NodeJS.Timeout;

    const loadData = async () => {
      try {
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
      }
    };

    // Initial load
    setIsLoading(true);
    loadData().then(() => setIsLoading(false));

    // Poll for new data every 2 seconds (from extension capturing pages)
    interval = setInterval(loadData, 2000);

    return () => clearInterval(interval);
  }, [isReady, getAllPages, getPageCount, getStorageSize]);


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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground relative overflow-hidden">
      <div className="main-bg" />
      <Header />

      <div className="flex relative z-10">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="hidden lg:flex w-72 h-[calc(100vh-64px)] flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="p-8 space-y-8 flex-1 overflow-y-auto">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-400 mb-6 uppercase">Menu</h2>
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("search")}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === "search"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Search className="w-4 h-4 mr-3" />
                    Smart Search
                  </button>
                  <button
                    onClick={() => setActiveTab("clusters")}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === "clusters"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Sidebar className="w-4 h-4 mr-3" />
                    Auto Groups
                  </button>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === "settings"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Safe & Private
                  </button>
                </nav>
              </div>

              {/* Statistics */}
              <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Your Stats</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Storage Used</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatStorageSize(storageSize)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Saved Pages</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{pageCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Help & Branding */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 mb-6 border border-blue-100 dark:border-blue-800">
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  <span className="font-bold">Did you know?</span> Cortex organizes your web life automatically so you never lose a link again.
                </p>
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-bold text-slate-600 dark:text-slate-400">
                <HelpCircle className="w-3.5 h-3.5" />
                How it works
              </button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8 lg:p-12">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-slate-500">Loading your memories...</p>
              </div>
            ) : activeTab === "search" ? (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Find <span className="text-primary text-secondary">Anything.</span>
                  </h1>
                  <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                    Search your browsing history by meaning. Type what you're looking for, and we'll find the most relevant pages.
                  </p>
                </div>

                {/* Search Box */}
                <div className="relative group">
                  <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus-within:border-primary transition-all shadow-sm">
                    <Search className="ml-6 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g., 'that travel blog I saw last week' or 'React tips'"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-6 py-5 bg-transparent focus:outline-none text-lg font-medium"
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="grid grid-cols-1 gap-4 pb-20">
                  {filteredMemories.map((memory) => (
                    <div
                      key={memory.id}
                      onClick={() => setSelectedMemory(memory)}
                      className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all flex flex-col md:flex-row gap-6"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1 text-slate-900 dark:text-white">
                            {memory.title}
                          </h3>
                          <p className="text-xs text-slate-400 truncate font-medium">
                            {memory.url}
                          </p>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 text-sm">
                          {memory.snippet}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {memory.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-md"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex md:flex-col justify-between items-end md:w-24">
                        <div className="text-right">
                          <p className="text-2xl font-black text-primary leading-none">
                            {Math.round(memory.similarity * 100)}%
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Match</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(memory.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "clusters" ? (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Auto <span className="text-primary text-secondary">Groups.</span>
                  </h1>
                  <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                    We've organized your recently visited pages into groups so you can easily find related content.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                  {clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className={`h-3 bg-gradient-to-r ${cluster.color}`} />
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{cluster.name}</h3>
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold uppercase text-slate-500">
                            {cluster.itemCount} Pages
                          </span>
                        </div>
                        <div className="space-y-3">
                          {cluster.pages.map((page) => (
                            <a
                              key={page.id}
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center group/link"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/link:bg-primary mr-3 transition-all" />
                              <span className="text-sm text-slate-500 group-hover/link:text-primary transition-colors truncate">
                                {page.title}
                              </span>
                            </a>
                          ))}
                        </div>
                        <button className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          View All Pages
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Safe & <span className="text-primary text-secondary">Private.</span>
                  </h1>
                  <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                    Everything stays on your device. We never send your browsing data to any servers. You're in total control.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                   {/* Capture Control */}
                   <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <Loader className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">System Active</span>
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Auto Saving</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Cortex is currently saving the pages you visit so you can find them later.
                      </p>
                    </div>
                    <button className="w-full py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider hover:bg-red-50 hover:text-red-600 transition-all">
                      Pause Saving
                    </button>
                  </div>

                  {/* Export */}
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 w-fit">
                      <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Backup Data</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Download a copy of everything Cortex has saved for you.
                      </p>
                    </div>
                    <button className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-sm">
                      Download Backup
                    </button>
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedMemory(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-10 space-y-8 relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Why this result?</h2>
              <p className="text-slate-500 text-sm font-medium">We found this page because it matches your search intent.</p>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page Title</p>
                <p className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{selectedMemory.title}</p>
                <p className="text-xs text-slate-400 truncate">{selectedMemory.url}</p>
              </div>

              <div className="space-y-2">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match Strength</p>
                 <div className="flex items-center gap-4">
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-primary"
                        style={{ width: `${selectedMemory.similarity * 100}%` }}
                       />
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {Math.round(selectedMemory.similarity * 100)}%
                    </span>
                 </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Topics</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                  This page was suggested because it contains specific information about your search query and shares several key topics.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedMemory(null)}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
