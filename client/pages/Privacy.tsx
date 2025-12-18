import { useState, useEffect } from "react";
import {
  Lock,
  Shield,
  Trash2,
  FileDown,
  ToggleRight,
  AlertCircle,
  Loader,
} from "lucide-react";
import Header from "@/components/Header";
import { useMemoryStorage } from "@/hooks/useMemoryStorage";
import type { PrivacyRule } from "@shared/extension-types";

export default function Privacy() {
  const [rules, setRules] = useState<PrivacyRule[]>([]);
  const [captureActive, setCaptureActive] = useState(true);
  const [newRule, setNewRule] = useState("");
  const [ruleType, setRuleType] = useState<"domain" | "date" | "keyword">(
    "domain"
  );
  const [isLoading, setIsLoading] = useState(true);

  const {
    isReady,
    getPrivacyRules,
    addPrivacyRule,
    deletePrivacyRule,
    getPageCount,
    getStorageSize,
  } = useMemoryStorage();

  // Load privacy rules from IndexedDB
  useEffect(() => {
    if (!isReady) return;

    const loadRules = async () => {
      try {
        setIsLoading(true);
        const rulesFromDB = await getPrivacyRules();
        setRules(rulesFromDB);
      } catch (err) {
        console.error("Failed to load privacy rules:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRules();
  }, [isReady, getPrivacyRules]);

  const handleAddRule = async () => {
    if (newRule.trim()) {
      try {
        const newPrivacyRule: PrivacyRule = {
          id: Date.now().toString(),
          type: ruleType,
          value: newRule,
          status: "active",
          createdAt: new Date().toISOString().split("T")[0],
        };

        await addPrivacyRule(newPrivacyRule);
        setRules([...rules, newPrivacyRule]);
        setNewRule("");
      } catch (err) {
        console.error("Failed to add rule:", err);
      }
    }
  };

  const toggleRule = async (id: string) => {
    const updatedRules = rules.map((r) =>
      r.id === id
        ? {
            ...r,
            status: r.status === "active" ? "inactive" : "active",
          }
        : r
    );
    setRules(updatedRules);
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deletePrivacyRule(id);
      setRules(rules.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="max-w-4xl mx-auto px-6 lg:px-12 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            Safe & <span className="text-primary">Private.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
            Everything stays on your device. We never send your browsing data to any servers. You're in total control of what's saved and what's forgotten.
          </p>
        </div>

        {/* Privacy Alert */}
        <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30 mb-10">
          <div className="flex gap-4">
            <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                Your data is secure
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                All smart processing and memory storage happens right here on your computer. No data is ever sent to the cloud.
              </p>
            </div>
          </div>
        </div>

        {/* Capture Control */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Saving Controls</h2>
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Auto Saving</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  When active, Cortex saves the pages you visit so you can find them later. You can pause this at any time.
                </p>
              </div>
              <button
                onClick={() => setCaptureActive(!captureActive)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  captureActive ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    captureActive ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Status</p>
                <p className={`font-bold ${captureActive ? "text-emerald-600" : "text-slate-400"}`}>
                  {captureActive ? "Active" : "Paused"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Activity</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {Math.floor(Math.random() * 30)} Pages
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Memory</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {formatStorageSize(Math.floor(Math.random() * 5242880))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selective Forget */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Choose what to forget</h2>
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              You can tell Cortex to ignore specific websites or delete things it has already saved.
            </p>

            {/* Add Rule Form */}
            <div className="mb-10 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Add a new rule</h4>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-1/3">
                  <select
                    value={ruleType}
                    onChange={(e) =>
                      setRuleType(e.target.value as "domain" | "date" | "keyword")
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-primary"
                  >
                    <option value="domain">Website (URL)</option>
                    <option value="date">Date Range</option>
                    <option value="keyword">Specific Keyword</option>
                  </select>
                </div>

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      ruleType === "domain"
                        ? "e.g., youtube.com"
                        : ruleType === "date"
                          ? "e.g., Last 7 days"
                          : "e.g., banking"
                    }
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleAddRule();
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleAddRule}
                    className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Rules List */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Saved Rules</h4>
              {rules.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 text-sm">
                    No rules yet. Everything you browse is currently being saved.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded">
                            {rule.type}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{rule.value}</span>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              rule.status === "active"
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}
                          >
                            {rule.status === "active" ? "Active" : "Paused"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                        >
                          <ToggleRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 w-fit text-blue-600">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Backup Data</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Download a copy of everything Cortex has saved for you in a standard JSON format.
              </p>
            </div>
            <button className="w-full py-4 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm">
              Download Backup
            </button>
          </div>

          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 w-fit text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Everything</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Permanently erase all saved pages and activity history from this computer.
              </p>
            </div>
            <button className="w-full py-4 bg-white dark:bg-slate-800 text-red-600 border border-red-100 dark:border-red-900/30 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-red-50 transition-all">
              Clear All Data
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
