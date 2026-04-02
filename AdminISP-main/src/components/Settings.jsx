import React, { useState, useEffect } from "react";
import { 
  User, Settings, CreditCard, Users, List, Star, 
  ShoppingCart, BookOpen, MessageCircle, LogOut,
  Sun, Moon
} from "lucide-react";

export default function SettingsDropdown({ onLogout }) {
  // We start with a null or default state that doesn't trigger the Effect 
  // until a user actually interacts with the buttons.
  const [theme, setTheme] = useState(null); 

  const shopUrl = "https://zetahub.africa/page/zws";

  // This effect now only runs when 'theme' is explicitly set to 'light' or 'dark'
  useEffect(() => {
    if (theme) {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      // Persist only after the user has made a choice
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const handleThemeChange = (mode) => {
    setTheme(mode);
  };

  return (
    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#000a40] text-gray-800 dark:text-gray-300 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden transition-colors duration-300">
      
      <div className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#25262b] cursor-pointer flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 transition-colors">
        <User size={18} className="text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium">2FA Settings</span>
      </div>

      {/* THEME SWITCHER SECTION */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-transparent">
        <div className="flex bg-white dark:bg-[#000520] border border-gray-200 dark:border-gray-800 p-1 rounded-lg w-full">
          <ThemeButton 
            active={theme === "light"} 
            onClick={() => handleThemeChange("light")} 
            label="Light"
            icon={<Sun size={16} />} 
          />
          <ThemeButton 
            active={theme === "dark"} 
            onClick={() => handleThemeChange("dark")} 
            label="Dark"
            icon={<Moon size={16} />} 
          />
        </div>
      </div>

      <div className="py-2">
        <DropdownLink icon={<Settings size={18} />} label="Settings" />
        <DropdownLink icon={<CreditCard size={18} />} label="Billing & Subscription" />
        <DropdownLink icon={<Users size={18} />} label="System users"  />
        
        <div className="h-px bg-gray-100 dark:bg-gray-800 my-2 mx-4" />
        
        <DropdownLink icon={<List size={18} />} label="System logs" />
        <DropdownLink icon={<Star size={18} />} label="Refer a friend" />
        
        <DropdownLink 
          icon={<ShoppingCart size={18} />} 
          label="ZWS" 
          isExternal={true} 
          href={shopUrl} 
        />
        
        <div className="h-px bg-gray-100 dark:bg-gray-800 my-2 mx-4" />
        
        <DropdownLink icon={<BookOpen size={18} />} label="Documentation" />
        <DropdownLink icon={<MessageCircle size={18} />} label="Contact Support" />
        <DropdownLink 
          icon={<LogOut size={18} />} 
          label="Sign out" 
          danger={true}
          onClick={onLogout}
        />
      </div>
    </div>
  );
}

// Helper Components (ThemeButton & DropdownLink stay the same as your provided code)
function ThemeButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all text-xs font-bold ${
        active 
          ? "bg-[#009DFF] text-white shadow-md" 
          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DropdownLink({ icon, label, active, danger, isExternal, href, onClick }) {
  const content = (
    <>
      <span className={`${active ? "text-[#009DFF]" : "text-gray-500 dark:text-gray-400 group-hover:text-[#009DFF]"}`}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {isExternal && <span className="text-[10px] opacity-50 font-bold uppercase tracking-tighter ml-auto">Shop ↗</span>}
    </>
  );

  const className = `
    flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors group
    ${active ? "bg-gray-100 dark:bg-[#25262b] text-[#009DFF]" : "hover:bg-gray-100 dark:hover:bg-[#25262b] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
    ${danger ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" : ""}
  `;

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}