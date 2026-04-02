import React, { useState } from "react";
import { Menu, Search, Settings } from "lucide-react";
import SettingsDropdown from "./Settings"; // Ensure the filename matches exactly

export default function Navbar({ onToggle, onLogout }) {
  const [showSettings, setShowSettings] = useState(false);
  const userEmail = localStorage.getItem("userEmail") || "User";

  return (
    <nav className="h-16 bg-white dark:bg-zeta-dark border-b border-gray-300 dark:border-gray-800 px-4 flex items-center justify-between z-50 sticky top-0">
      <div className="flex items-center gap-4">
        {/* Menu button - works on all screen sizes */}
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-transform duration-300"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>

        <span className="text-lg font-bold tracking-tight text-cyan-500">ZISP</span>
      </div>

      {/* RIGHT SECTION: Search & Settings */}
      <div className="flex items-center dark:bg-zeta-dark gap-4">
        {/* Search Bar */}
        <div className="relative group hidden sm:block">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600" 
            size={18} 
          />
          <input
            type="text"
            placeholder="Search"
            className="bg-white dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-16 py-1.5 text-sm w-64 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 dark:text-gray-600 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 bg-white dark:bg-zeta-dark">
            CTRL+F
          </div>
        </div>

        {/* Settings Dropdown Container */}
        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`transition-colors p-2 rounded-lg ${
              showSettings ? "bg-gray-100 dark:bg-white/10 text-blue-600" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
            }`}
          >
            <Settings size={22} strokeWidth={1.5} />
          </button>

          {/* This is the dropdown from the previous step */}
          {showSettings && (
            <>
              {/* Overlay to close when clicking outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowSettings(false)} 
              />
              <div className="absolute right-0 mt-2 z-50">
                <SettingsDropdown 
                  onLogout={() => {
                    setShowSettings(false);
                    onLogout();
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}