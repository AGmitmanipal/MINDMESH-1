import { useState } from "react";
import {
  Lock,
  Shield,
  Trash2,
  FileDown,
  ToggleRight,
  AlertCircle,
} from "lucide-react";
import Header from "@/components/Header";

interface PrivacyRule {
  id: string;
  type: "domain" | "date" | "keyword";
  value: string;
  status: "active" | "inactive";
  createdAt: string;
}

export default function Privacy() {
  const [rules, setRules] = useState<PrivacyRule[]>([
    {
      id: "1",
      type: "domain",
      value: "example.com",
      status: "active",
      createdAt: "2024-01-10",
    },
  ]);
  const [captureActive, setCaptureActive] = useState(true);
  const [newRule, setNewRule] = useState("");
  const [ruleType, setRuleType] = useState<"domain" | "date" | "keyword">(
    "domain"
  );

  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules([
        ...rules,
        {
          id: Date.now().toString(),
          type: ruleType,
          value: newRule,
          status: "active",
          createdAt: new Date().toISOString().split("T")[0],
        },
      ]);
      setNewRule("");
    }
  };

  const toggleRule = (id: string) => {
    setRules(
      rules.map((r) =>
        r.id === id
          ? {
              ...r,
              status: r.status === "active" ? "inactive" : "active",
            }
          : r
      )
    );
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            You have complete control over your data. Everything is processed
            locally on your device, and you decide what to remember or forget.
          </p>
        </div>

        {/* Privacy Alert */}
        <div className="p-6 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 mb-8">
          <div className="flex gap-4">
            <Shield className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                100% Local Processing
              </h3>
              <p className="text-sm text-green-700 dark:text-green-200">
                All AI processing, embeddings, and memory storage happen
                exclusively on your device. No data is sent to any server or
                cloud service.
              </p>
            </div>
          </div>
        </div>

        {/* Capture Control */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Capture Control</h2>
          <div className="p-8 rounded-lg border border-border bg-white dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Memory Recording</h3>
                <p className="text-muted-foreground">
                  When active, Cortex records pages you visit to your local
                  memory. Toggle off to pause data collection.
                </p>
              </div>
              <button
                onClick={() => setCaptureActive(!captureActive)}
                className={`relative w-16 h-8 rounded-full transition-colors ${
                  captureActive
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    captureActive ? "translate-x-9" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">
                  {captureActive ? "Active" : "Paused"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pages Today</p>
                <p className="font-semibold">18</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Memory</p>
                <p className="font-semibold">2.4 MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selective Forget */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Selective Forget</h2>
          <div className="p-8 rounded-lg border border-border bg-white dark:bg-slate-900/50">
            <p className="text-muted-foreground mb-6">
              Remove specific data from your memory. Choose what to forget by
              domain, date range, or keywords.
            </p>

            {/* Add Rule Form */}
            <div className="mb-8 p-6 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-4">Add Forget Rule</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) =>
                      setRuleType(e.target.value as "domain" | "date" | "keyword")
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="domain">Domain</option>
                    <option value="date">Date Range</option>
                    <option value="keyword">Keyword</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      ruleType === "domain"
                        ? "example.com"
                        : ruleType === "date"
                          ? "2024-01-01 to 2024-01-31"
                          : "keyword..."
                    }
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleAddRule();
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleAddRule}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>

            {/* Rules List */}
            <div>
              <h4 className="font-semibold mb-4">Active Rules</h4>
              {rules.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No forget rules set. All your memory is being kept.
                </p>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                            {rule.type.toUpperCase()}
                          </span>
                          <span className="font-medium">{rule.value}</span>
                          <span
                            className={`text-xs font-medium ${
                              rule.status === "active"
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {rule.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {rule.createdAt}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <ToggleRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
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

        {/* Data Export */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Data Export</h2>
          <div className="p-8 rounded-lg border border-border bg-white dark:bg-slate-900/50">
            <p className="text-muted-foreground mb-6">
              Export your complete memory graph as JSON. You can backup your
              data or import it elsewhere.
            </p>

            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
                <FileDown className="w-5 h-5" />
                Export All Data (JSON)
              </button>
              <button className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors">
                <FileDown className="w-5 h-5" />
                Export Memory Graph
              </button>
            </div>
          </div>
        </div>

        {/* Storage Info */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Local Storage</h2>
          <div className="p-8 rounded-lg border border-border bg-white dark:bg-slate-900/50">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">IndexedDB Usage</span>
                  <span className="text-primary font-bold">2.4 MB / 50 MB</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-secondary h-full w-[4.8%]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pages</p>
                  <p className="text-2xl font-bold">247</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Embeddings</p>
                  <p className="text-2xl font-bold">247</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clusters</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-700 dark:text-orange-200">
                  <p className="font-semibold mb-1">Storage Limit</p>
                  <p>
                    Browser storage limits vary by browser. Most allow 50+ MB
                    of local data. If you exceed your quota, older pages will
                    be archived locally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Security */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Data Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
              <Lock className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Zero Cloud Storage</h3>
              <p className="text-sm text-muted-foreground">
                Your data never leaves your device. All processing and storage
                is local.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
              <Shield className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Local Inference</h3>
              <p className="text-sm text-muted-foreground">
                All AI models run on your device via WASM. No external API calls.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
              <AlertCircle className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Full User Control</h3>
              <p className="text-sm text-muted-foreground">
                Pause capture, delete data, export anytime. You own your memory.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-white dark:bg-slate-900/50">
              <FileDown className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Data Portability</h3>
              <p className="text-sm text-muted-foreground">
                Export your memory graph as JSON for backup or analysis.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
