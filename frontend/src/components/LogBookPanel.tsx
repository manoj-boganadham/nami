import React, { useState, useEffect } from "react";
import { Search, RefreshCw, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface RawMessage {
  id: number;
  message: string;
  received_at: string;
  processed: boolean;
  parse_failed: boolean;
}

interface LogBookPanelProps {
  onMessageProcessed: () => void; // Callback to trigger global stats/ledger reload
}

type StatusFilter = "all" | "pending" | "processed" | "failed";

export const LogBookPanel: React.FC<LogBookPanelProps> = ({ onMessageProcessed }) => {
  const [messages, setMessages] = useState<RawMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering states
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reprocessingIds, setReprocessingIds] = useState<Set<number>>(new Set());
  
  // Local refresh trigger for messages list
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch raw messages when search, filter, or refresh trigger changes
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (statusFilter !== "all") queryParams.append("status", statusFilter);
        if (search) queryParams.append("search", search);

        const res = await fetch(`/api/raw_messages?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to load raw messages");
        const data = await res.json();
        setMessages(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while fetching log logs.");
      } finally {
        setLoading(false);
      }
    };

    // Debounce search inputs to avoid spamming requests
    const delayDebounce = setTimeout(
      () => {
        fetchMessages();
      },
      search ? 300 : 0
    );

    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, refreshTrigger]);

  const handleReprocess = async (id: number) => {
    // Add to loading state
    setReprocessingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const res = await fetch(`/api/raw_messages/${id}/reprocess`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Reprocess request failed");
      
      // Notify parent to refresh stats/transactions
      onMessageProcessed();
      
      // Refresh local logs list
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Failed to reprocess message.");
    } finally {
      // Remove from loading state
      setReprocessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStatusBadge = (msg: RawMessage) => {
    if (!msg.processed) {
      return (
        <span className="flex items-center inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-accent-primary/10 text-accent-primary border-accent-primary/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      );
    } else if (msg.parse_failed) {
      return (
        <span className="flex items-center inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-accent-danger/10 text-accent-danger border-accent-danger/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </span>
      );
    } else {
      return (
        <span className="flex items-center inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-accent-positive/10 text-accent-positive border-accent-positive/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Parsed
        </span>
      );
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-bg-surface border border-border-default h-full transition-all duration-300 hover:shadow-md flex flex-col">
      <div className="mb-6">
        <h3 className="text-xs uppercase tracking-widest text-text-tertiary font-sans mb-1">
          The Log Book
        </h3>
        <h2 className="text-sm font-bold font-cinzel text-text-primary">
          Raw Message Ingest Logs
        </h2>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 font-sans text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search logs by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-default bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary transition-all placeholder-text-tertiary"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-text-secondary font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-bg-primary border border-border-default rounded-xl px-3 py-2 text-text-primary font-bold focus:outline-none focus:border-accent-primary"
          >
            <option value="all">All Logs</option>
            <option value="pending">Pending</option>
            <option value="processed">Parsed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger rounded-xl text-[11px] font-sans">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="flex-1 overflow-x-auto border border-border-default/50 rounded-2xl overflow-hidden bg-bg-primary min-h-[300px]">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-bg-elevated/45 text-text-secondary border-b border-border-default uppercase text-[9px] tracking-wider font-bold">
              <th className="py-3 px-4 w-12 text-center">ID</th>
              <th className="py-3 px-4">Message Details</th>
              <th className="py-3 px-4 w-28">Received At</th>
              <th className="py-3 px-4 w-24">Status</th>
              <th className="py-3 px-4 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/20 text-text-primary">
            {loading && messages.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-tertiary italic">
                  Reading the scroll maps...
                </td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-tertiary italic">
                  No plundered entries matched these filters.
                </td>
              </tr>
            ) : (
              messages.map((msg) => {
                const isReprocessing = reprocessingIds.has(msg.id);
                return (
                  <tr
                    key={msg.id}
                    className="hover:bg-bg-elevated/20 transition-colors group"
                  >
                    <td className="py-3.5 px-4 text-center text-text-tertiary font-bold">
                      {msg.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium break-all max-w-[200px] sm:max-w-xs md:max-w-md">
                      {msg.message}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {new Date(msg.received_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(msg.received_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(msg)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleReprocess(msg.id)}
                        disabled={isReprocessing}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all duration-200 ${
                          isReprocessing
                            ? "bg-bg-elevated text-text-tertiary border-transparent cursor-not-allowed"
                            : "bg-bg-surface text-text-secondary border-border-default hover:bg-accent-primary hover:text-bg-primary hover:border-transparent"
                        }`}
                        title="Reprocess this message"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isReprocessing ? "animate-spin" : ""}`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default LogBookPanel;
