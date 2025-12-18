import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Sidebar,
  Settings,
  HelpCircle,
  Loader,
  X,
  Download,
  Pause,
  Play,
  ExternalLink,
  TrendingUp,
  Clock,
  Trash2,
  Globe
} from "lucide-react";
import Header from "@/components/Header";
import { useExtension } from "@/hooks/useExtension";
import type { MemoryNode } from "@shared/extension-types";

interface PageMemory {
  id: string;
  url: string;
  title: string;
  snippet: string;
  timestamp: string;
  similarity: number;
  keywords: string[];
  domain: string;
  category?: string;
}

interface Cluster {
  id: string;
  name: string;
  color: string;
  itemCount: number;
  pages: PageMemory[];
  description: string;
}

// Category definitions with domain patterns
const CATEGORY_DEFINITIONS = {
  shopping: {
    name: "Shopping (Ecommerce)",
    description: "Platforms for buying products or services",
    domains: ["amazon", "ebay", "walmart", "etsy", "alibaba", "flipkart", "shopify", "bigcommerce", "target", "bestbuy"],
    color: "from-purple-500 to-purple-600"
  },
  travel: {
    name: "Traveling & Tourism",
    description: "Resources for planning and booking trips",
    domains: ["booking", "airbnb", "expedia", "tripadvisor", "kayak", "hotels", "skyscanner", "makemytrip", "goibibo", "agoda"],
    color: "from-blue-500 to-blue-600"
  },
  health: {
    name: "Health & Wellness",
    description: "Provides medical information, fitness routines, and mental health resources",
    domains: ["webmd", "healthline", "mayoclinic", "headspace", "calm", "myfitnesspal", "fitbit", "nhs.uk", "practo"],
    color: "from-green-500 to-green-600"
  },
  food: {
    name: "Food & Recipes",
    description: "Dedicated to cooking tips, dietary-specific recipes, and restaurant reviews",
    domains: ["allrecipes", "foodnetwork", "tasty", "minimalistbaker", "seriouseats", "yelp", "zomato", "swiggy", "ubereats"],
    color: "from-orange-500 to-orange-600"
  },
  entertainment: {
    name: "Entertainment",
    description: "Visual and media-heavy sites for streaming videos, music, or gaming",
    domains: ["netflix", "youtube", "spotify", "twitch", "hulu", "disneyplus", "primevideo", "hotstar", "apple.com/tv", "steam"],
    color: "from-pink-500 to-pink-600"
  },
  jobs: {
    name: "Job Search Websites",
    description: "Platforms like LinkedIn, Indeed, Naukri.com, Internshaala, etc.",
    domains: ["linkedin", "indeed", "glassdoor", "naukri", "monster", "internshala", "angellist", "stackoverflow.com/jobs"],
    color: "from-indigo-500 to-indigo-600"
  },
  social: {
    name: "Social Media",
    description: "Real-time networking and content-sharing platforms",
    domains: ["facebook", "instagram", "twitter", "reddit", "tiktok", "pinterest", "snapchat", "telegram", "whatsapp", "discord"],
    color: "from-cyan-500 to-cyan-600"
  },
  education: {
    name: "Educational (E-Learning)",
    description: "Platforms for structured courses and educational resources",
    domains: ["coursera", "udemy", "edx", "khanacademy", "skillshare", "linkedin.com/learning", "pluralsight", "udacity", "byju"],
    color: "from-yellow-500 to-yellow-600"
  },
  news: {
    name: "News & Magazines",
    description: "Portals for current events and editorial articles",
    domains: ["bbc", "cnn", "nytimes", "theguardian", "reuters", "hindustantimes", "timesofindia", "medium", "substack"],
    color: "from-red-500 to-red-600"
  },
  nonprofit: {
    name: "Nonprofit & NGO",
    description: "Sites dedicated to social causes, fundraising, and mission-driven advocacy",
    domains: ["wikipedia", "wikimedia", "redcross", "unicef", "wwf", "greenpeace", "amnesty", "doctorswithoutborders"],
    color: "from-teal-500 to-teal-600"
  },
  corporate: {
    name: "Corporate",
    description: "The official \"front door\" for companies, describing their mission, team, and services",
    domains: ["about", "careers", "company", "corporate", "investor"],
    color: "from-slate-500 to-slate-600"
  },
  professional: {
    name: "Professional Services",
    description: "Niche sites for legal, financial, or consulting firms",
    domains: ["bloomberg", "forbes", "wsj", "morningstar", "marketwatch", "investing", "tradingview"],
    color: "from-emerald-500 to-emerald-600"
  },
  portfolio: {
    name: "Portfolios",
    description: "Digital resumes for creative professionals like photographers and designers to showcase work",
    domains: ["behance", "dribbble", "deviantart", "artstation", "github.io", "portfolio", "wix.com/website"],
    color: "from-violet-500 to-violet-600"
  },
  government: {
    name: "Government",
    description: "Official portals providing public services and regulatory information",
    domains: [".gov", "irs.gov", "usa.gov", "nic.in", "india.gov", "mygov"],
    color: "from-blue-600 to-blue-700"
  }
};

// Categorize a domain
function categorizeUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    for (const [key, category] of Object.entries(CATEGORY_DEFINITIONS)) {
      for (const domain of category.domains) {
        if (hostname.includes(domain.toLowerCase())) {
          return key;
        }
      }
    }
  } catch (e) {
    console.error("Failed to categorize URL:", e);
  }
  
  return "miscellaneous";
}

export default function Dashboard() {
  console.log("Dashboard rendering, Globe is:", Globe);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("search");
  const [selectedMemory, setSelectedMemory] = useState<PageMemory | null>(null);
  const [memories, setMemories] = useState<PageMemory[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [captureEnabled, setCaptureEnabled] = useState(true);

  const {
    isAvailable,
    isChecking,
    getAllPages,
    getStats,
    searchMemory,
    getCaptureSettings,
    updateCaptureSettings,
    sendMessage,
  } = useExtension();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data from Extension
  const loadData = useCallback(async () => {
    if (!isAvailable) return;
    
    try {
      // Parallelize all initial requests for maximum speed
      const [stats, settings, nodes] = await Promise.all([
        getStats().catch(err => { console.error("Stats fail:", err); return null; }),
        getCaptureSettings().catch(err => { console.error("Settings fail:", err); return null; }),
        debouncedQuery.trim() 
          ? searchMemory(debouncedQuery).catch(err => { console.error("Search fail:", err); return []; })
          : getAllPages().catch(err => { console.error("Pages fail:", err); return []; })
      ]);

      if (stats) {
        setPageCount(stats.pageCount);
        setStorageSize(stats.storageSize);
      }

      if (settings) {
        setCaptureEnabled(settings.enabled);
      }

      if (nodes && Array.isArray(nodes)) {
        const formattedMemories: PageMemory[] = nodes.map((node: any) => ({
          id: node.id,
          url: node.url,
          title: node.title,
          // Use snippet if available (from GET_ALL_PAGES), fallback to readableText (from SEARCH_MEMORY)
          snippet: node.snippet || (node.readableText ? node.readableText.slice(0, 200) : ""),
          timestamp: new Date(node.timestamp).toLocaleString(),
          similarity: node.similarity || 1.0,
          keywords: node.keywords || [],
          domain: node.metadata?.domain || "",
          category: categorizeUrl(node.url)
        }));

        setMemories(formattedMemories);
      } else {
        setMemories([]);
      }
    } catch (err) {
      console.error("Dashboard: Critical failure loading data:", err);
    }
  }, [getAllPages, getStats, searchMemory, getCaptureSettings, debouncedQuery, isAvailable]);

  useEffect(() => {
    if (!isAvailable) {
      setIsLoading(false);
      return;
    }

    const refreshData = async () => {
      setIsLoading(true);
      try {
        await loadData();
      } catch (err) {
        console.error("Dashboard: Error refreshing data", err);
      } finally {
        setIsLoading(false);
      }
    };

    refreshData();

    // Reduced polling interval from 3s to 5s for better performance
    const interval = setInterval(() => {
      loadData().catch(err => {
        console.error("Dashboard: Error in polling", err);
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loadData, isAvailable]);

  // Generate clusters by category
  const clusters = useMemo<Cluster[]>(() => {
    const categoryMap = new Map<string, PageMemory[]>();
    
    memories.forEach((memory) => {
      const category = memory.category || "miscellaneous";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(memory);
    });

    const generatedClusters: Cluster[] = [];
    
    for (const [key, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
      const pages = categoryMap.get(key) || [];
      if (pages.length > 0) {
        generatedClusters.push({
          id: key,
          name: definition.name,
          color: definition.color,
          itemCount: pages.length,
          pages: pages.slice(0, 5),
          description: definition.description
        });
      }
    }

    const miscPages = categoryMap.get("miscellaneous") || [];
    if (miscPages.length > 0) {
      generatedClusters.push({
        id: "miscellaneous",
        name: "Miscellaneous",
        color: "from-gray-500 to-gray-600",
        itemCount: miscPages.length,
        pages: miscPages.slice(0, 5),
        description: "Websites not in the above categories"
      });
    }

    return generatedClusters.sort((a, b) => b.itemCount - a.itemCount);
  }, [memories]);

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return "0.0 MB";
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + " MB";
  };

  const handleExport = () => {
    const data = JSON.stringify(memories, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cortex-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleCapture = async () => {
    const newState = !captureEnabled;
    setCaptureEnabled(newState);
    await updateCaptureSettings({ enabled: newState });
  };

  const filteredMemories = useMemo(() => {
    // If we have a query, memories are already fetched from the searchMemory service
    // which handles semantic search. We don't want to filter them further with
    // a simple string match as it might break semantic search results.
    return memories;
  }, [memories]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground relative overflow-hidden">
      <div className="main-bg" />
      <Header />

      {!isAvailable && !isChecking && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-4 text-amber-800 dark:text-amber-200 shadow-xl">
            <HelpCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold mb-2">Cortex Extension Not Connected</div>
              <div className="text-xs leading-relaxed space-y-2">
                <p>Make sure the Cortex extension is installed and enabled in your browser.</p>
                <div className="flex gap-2">
                  <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors">
                    Refresh Page
                  </button>
                  <a href="chrome://extensions" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg text-xs font-medium transition-colors">
                    Manage Extensions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isChecking && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-4 text-blue-800 dark:text-blue-200 shadow-xl">
            <Loader className="w-5 h-5 animate-spin shrink-0" />
            <div className="text-sm font-medium">Connecting to Cortex extension...</div>
          </div>
        </div>
      )}

      <div className="flex relative z-10">
        {sidebarOpen && (
          <aside className="hidden lg:flex w-72 h-[calc(100vh-64px)] flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="p-8 space-y-8 flex-1 overflow-y-auto">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-400 mb-6 uppercase">Menu</h2>
                <nav className="space-y-1">
                  <button onClick={() => setActiveTab("search")} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "search" ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                    <Search className="w-4 h-4 mr-3" />
                    Smart Search
                  </button>
                  <button onClick={() => setActiveTab("clusters")} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "clusters" ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                    <Sidebar className="w-4 h-4 mr-3" />
                    Auto Groups ({clusters.length})
                  </button>
                  <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "settings" ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                    <Settings className="w-4 h-4 mr-3" />
                    Safe & Private
                  </button>
                </nav>
              </div>

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
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Categories</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{clusters.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 mb-6 border border-blue-100 dark:border-blue-800">
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  <span className="font-bold">Did you know?</span> Cortex organizes your web life automatically so you never lose a link again.
                </p>
              </div>
              <button 
                onClick={() => alert("Cortex uses local semantic search to help you find your browsing history by meaning. Your data never leaves your device.")}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                How it works
              </button>
            </div>
          </aside>
        )}

        <main className="flex-1 min-w-0">
          <div className="flex-1 p-8 lg:p-12 overflow-y-auto h-[calc(100vh-64px)]">
            {activeTab === "search" ? (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Your <span className="text-primary">Memories.</span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                      Search through everything you've seen online. Cortex remembers the details so you don't have to.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-slate-500 shadow-sm">
                      <Loader className={`w-5 h-5 ${isLoading ? "animate-spin text-primary" : ""}`} />
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                      <Download className="w-4 h-4" />
                      Backup
                    </button>
                  </div>
                </div>

                <div className="relative group max-w-3xl">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by keyword, topic, or semantic meaning..."
                    className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-medium shadow-sm focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {debouncedQuery && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      Semantic Search Active
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                  {isLoading && memories.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                      <Loader className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-slate-500 font-medium">Loading memories...</p>
                    </div>
                  ) : filteredMemories.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-medium">No memories found. Try a different search or browse some pages.</p>
                    </div>
                  ) : (
                    filteredMemories.map((memory) => (
                      <div
                        key={memory.id}
                        onClick={() => setSelectedMemory(memory)}
                        className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${CATEGORY_DEFINITIONS[memory.category as keyof typeof CATEGORY_DEFINITIONS]?.color || "from-slate-400 to-slate-500"} flex items-center justify-center text-white shadow-sm`}>
                            <Globe className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                              {memory.title}
                            </h3>
                            <p className="text-xs text-slate-400 truncate font-medium">
                              {memory.domain}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed">
                          {memory.snippet}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                          <div className="flex gap-1.5">
                            {memory.keywords.slice(0, 2).map((kw) => (
                              <span key={kw} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                {kw}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {new Date(memory.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === "clusters" ? (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Auto <span className="text-primary">Groups.</span>
                  </h1>
                  <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                    Your browsing organized into {clusters.length} smart categories based on website types and content.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                  {isLoading && clusters.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                      <Loader className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-slate-500 font-medium">Categorizing your web life...</p>
                    </div>
                  ) : clusters.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Sidebar className="w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-medium">Auto Groups appear once you start browsing and saving pages.</p>
                    </div>
                  ) : (
                    clusters.map((cluster) => (
                      <div key={cluster.id} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
                        <div className={`h-3 bg-gradient-to-r ${cluster.color}`} />
                        <div className="p-8 space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{cluster.name}</h3>
                              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold uppercase text-slate-500">
                                {cluster.itemCount} Page{cluster.itemCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500">{cluster.description}</p>
                          </div>
                          <div className="space-y-3">
                            {cluster.pages.map((page) => (
                              <a key={page.id} href={page.url} target="_blank" rel="noopener noreferrer" className="flex items-center group/link" title={page.title}>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/link:bg-primary mr-3 transition-all" />
                                <span className="text-sm text-slate-500 group-hover/link:text-primary transition-colors truncate">{page.title}</span>
                              </a>
                            ))}
                            {cluster.itemCount > 5 && (
                              <p className="text-xs text-slate-400 mt-1">+ {cluster.itemCount - 5} more pages</p>
                            )}
                          </div>
                          <button onClick={() => { setSearchQuery(""); setActiveTab("search"); }} className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            View All Pages
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Safe & <span className="text-primary">Private.</span>
                  </h1>
                  <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                    Everything stays on your device. We never send your browsing data to any servers. You're in total control.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Pause className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pause Collection</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Temporarily stop Cortex from saving new pages. Your existing memories will remain safe and accessible.
                      </p>
                    </div>
                    <button 
                      onClick={handleToggleCapture}
                      className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        captureEnabled 
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" 
                          : "bg-primary text-primary-foreground shadow-lg hover:opacity-90"
                      }`}
                    >
                      {captureEnabled ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause Capturing
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Resume Capturing
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Download className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Export My Data</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Download your entire browsing history and semantic graph in a portable JSON format for backup.
                      </p>
                    </div>
                    <button 
                      onClick={handleExport}
                      className="w-full py-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Backup (.json)
                    </button>
                  </div>

                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Clear All Data</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Permanently delete all your saved pages and indexing data. This action cannot be undone.
                      </p>
                    </div>
                    <button 
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear all your data? This cannot be undone.")) {
                          const response = await sendMessage({ type: "FORGET_DATA", payload: {} });
                          if (response.success) {
                            alert("All data has been cleared.");
                            window.location.reload();
                          } else {
                            alert("Failed to clear data: " + response.error);
                          }
                        }
                      }}
                      className="w-full py-4 rounded-xl border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Wipe Everything
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>{/* End main container */}

      {selectedMemory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${CATEGORY_DEFINITIONS[selectedMemory.category as keyof typeof CATEGORY_DEFINITIONS]?.color || "from-slate-400 to-slate-500"} flex items-center justify-center text-white`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[300px]">{selectedMemory.title}</h3>
                  <p className="text-xs text-slate-400">{selectedMemory.domain}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMemory(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-8">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">About this page</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-4 border-primary/20 pl-4 py-1">
                  "{selectedMemory.snippet}..."
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saved On</h4>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedMemory.timestamp}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Search Match</h4>
                  <p className="text-sm font-black text-primary">{Math.round(selectedMemory.similarity * 100)}% Match Score</p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.keywords.map(kw => (
                    <span key={kw} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button 
                onClick={() => window.open(selectedMemory.url, '_blank')}
                className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </button>
              <button 
                onClick={async () => {
                  if (confirm("Remove this memory forever?")) {
                    const response = await sendMessage({ type: "FORGET_DATA", payload: { domain: selectedMemory.domain } });
                    if (response.success) {
                      setMemories(prev => prev.filter(m => m.id !== selectedMemory.id));
                      setSelectedMemory(null);
                    }
                  }
                }}
                className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-red-500 rounded-xl font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}