import React, { useState, useEffect, useCallback } from "react";
import { Users, Wifi, Monitor, Clock, Search, Activity } from "lucide-react";
import { activeSessionsAPI } from "../services/api";

const tabDefinitions = [
  { key: "all", label: "All", icon: <Users size={18} /> },
  { key: "hotspot", label: "Hotspot", icon: <Wifi size={18} /> },
  { key: "pppoe", label: "PPPoE", icon: <Monitor size={18} /> },
  { key: "expiry", label: "Without Expiry", icon: <Clock size={18} /> },
];

export default function ActiveUsers() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState([]);
  const [counts, setCounts] = useState({ all: 0, hotspot: 0, pppoe: 0, expiry: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await activeSessionsAPI.list({
        type: activeTab !== "all" ? activeTab : undefined,
        search: searchQuery || undefined,
      });
      setSessions(data.data || []);
      setCounts(data.counts || { all: 0, hotspot: 0, pppoe: 0, expiry: 0 });
    } catch (err) {
      console.error("Failed to fetch active sessions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchSessions, 300);
    return () => clearTimeout(timer);
  }, [fetchSessions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return (
    <div className="p-4 md:p-6 text-[#000a40] dark:text-gray-300 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold mb-6">Active Users</h1>

      <div className="flex items-center gap-4 md:gap-8 border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        {tabDefinitions.map((tab) => (
          <TabItem
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            icon={tab.icon}
            label={tab.label}
            count={counts[tab.key] ?? 0}
          />
        ))}
      </div>

      <div className="bg-[#FFFFFF] dark:bg-[#000a00] border border-[#009DFF] rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 border-b border-gray-200 dark:border-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing {sessions.length} active users.
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search username, IP/MAC, router"
              className="w-full bg-gray-50 dark:bg-[#16171d] border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Search active users"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="hidden md:grid grid-cols-5 px-6 py-4 bg-[#f8fafc] dark:bg-[#000a00] text-sm font-semibold text-[#000a40] dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-1">Username <span>↓</span></div>
              <div>IP/MAC</div>
              <div>Router</div>
              <div>Session Start</div>
              <div>Session End</div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-gray-400">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 opacity-70">
                <div className="bg-gray-100 dark:bg-gray-800/30 p-4 rounded-full mb-4 text-gray-400 dark:text-gray-500">
                  <Activity size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#000a40] dark:text-gray-300">No Active Users</h3>
                <p className="text-gray-500 text-sm text-center px-4">No users match your filters right now.</p>
              </div>
            ) : (
              sessions.map((user) => {
                const ipMac = [user.ip_address, user.mac_address].filter(Boolean).join(' / ') || '—';
                const sessionEnd = user.session_end ? new Date(user.session_end).toLocaleString() : '—';
                return (
                  <div
                    key={user.id}
                    className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="grid md:grid-cols-5 gap-3 md:gap-0 px-6 py-4 text-sm items-center">
                      <div className="font-medium text-[#000a40] dark:text-gray-100">{user.username}</div>
                      <div className="text-gray-600 dark:text-gray-400">{ipMac}</div>
                      <div className="text-gray-600 dark:text-gray-400">{user.router || '—'}</div>
                      <div className="text-gray-600 dark:text-gray-400">{new Date(user.session_start).toLocaleString()}</div>
                      <div className="text-gray-600 dark:text-gray-400">{sessionEnd}</div>
                    </div>
                    <div className="md:hidden px-6 pb-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>Type: <span className="font-semibold text-gray-700 dark:text-gray-200">{user.session_type}</span></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabItem({ icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 transition-all relative whitespace-nowrap px-1 ${
        active ? "text-blue-500 font-semibold" : "text-gray-500 hover:text-blue-400 dark:hover:text-gray-300"
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          active
            ? "bg-blue-500/10 border-blue-500/50 text-blue-500"
            : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
        }`}
      >
        {count}
      </span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-500 rounded-t-full" />}
    </button>
  );
}

