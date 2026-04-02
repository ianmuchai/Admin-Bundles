import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Activity, Users, Ticket, UserPlus, 
  Package, Coins, CreditCard, Banknote, 
  MessageSquare, Mail, Megaphone, 
  Server, HardDrive, ShoppingCart // Added ShoppingCart icon
} from "lucide-react";

export default function Sidebar({ isCollapsed }) {
  const shopUrl = "https://zetahub.africa/page/zws";

  const sidebarWidth = isCollapsed ? "w-20" : "w-64";

  return (
    <div
      className={`h-full border-r transition-all duration-300 ease-in-out flex flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#000520] border-gray-300 dark:border-gray-800 ${sidebarWidth}`}
    >
      {/* 1. DASHBOARD TAB */}
      <div className="p-4">
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => `
            flex items-center rounded-lg cursor-pointer shadow-sm transition-all duration-200
            ${isActive 
              ? "bg-white dark:bg-[#000a40] text-blue-600 dark:text-[#FFFFFF] ring-1 ring-black/5" 
              : "text-[#000a40] dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5"}
            ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}
          `}
        >
          <LayoutDashboard size={22} strokeWidth={2} />
          {!isCollapsed && <span className="font-semibold text-sm">Dashboard</span>}
        </NavLink>
      </div>

      {/* 2. SCROLLABLE NAVIGATION AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 space-y-6 pb-10 custom-scrollbar">
        
        <SidebarSection label="Users" isCollapsed={isCollapsed}>
          <NavItem to="/active-users" icon={<Activity size={20} />} label="Active Users" badge="0" isCollapsed={isCollapsed} />
          <NavItem to="/clients" icon={<Users size={20} />} label="Clients" badge="0" isCollapsed={isCollapsed} />
          <NavItem to="/tickets" icon={<Ticket size={20} />} label="Tickets" isCollapsed={isCollapsed} />
          <NavItem to="/leads" icon={<UserPlus size={20} />} label="Leads" isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection label="Finance" isCollapsed={isCollapsed}>
          <NavItem to="/packages" icon={<Package size={20} />} label="Packages" badge="0" isCollapsed={isCollapsed} />
          <NavItem to="/payments" icon={<Coins size={20} />} label="Payments" isCollapsed={isCollapsed} />
          <NavItem to="/vouchers" icon={<CreditCard size={20} />} label="Vouchers" badge="0" isCollapsed={isCollapsed} />
          <NavItem to="/expenses" icon={<Banknote size={20} />} label="Expenses" isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection label="Communication" isCollapsed={isCollapsed}>
          <NavItem to="/messages" icon={<MessageSquare size={20} />} label="Messages" isCollapsed={isCollapsed} />
          <NavItem to="/emails" icon={<Mail size={20} />} label="Emails" isCollapsed={isCollapsed} />
          <NavItem to="/campaigns" icon={<Megaphone size={20} />} label="Campaigns" isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection label="Devices" isCollapsed={isCollapsed}>
          <NavItem to="/sites" icon={<Server size={20} />} label="Sites" badge="0" isCollapsed={isCollapsed} />
        </SidebarSection>

        {/* --- NEW SHOP SECTION --- */}
        <SidebarSection label="Store" isCollapsed={isCollapsed}>
          <ExternalNavItem 
            href={shopUrl} 
            icon={<ShoppingCart size={20} />} 
            label="ZWS" 
            isCollapsed={isCollapsed}
          />
        </SidebarSection>

      </div>
    </div>
  );
}

// --- NEW COMPONENT FOR EXTERNAL LINKS ---
function ExternalNavItem({ href, icon, label, isCollapsed }) {
  return (
    <a 
      href={href}
      target="_blank" 
      rel="noopener noreferrer"
      className={`
        flex items-center group cursor-pointer transition-all duration-200 rounded-lg
        text-[#000a40]/70 dark:text-gray-400 hover:bg-[#009DFF]/10 dark:hover:bg-blue-900/20 hover:text-[#009DFF]
        ${isCollapsed ? "justify-center py-3" : "px-3 py-2 gap-3"}
      `}
    >
      <span className="group-hover:text-[#009DFF] transition-colors">
        {icon}
      </span>
      {!isCollapsed && (
        <span className="text-sm font-medium">
          {label}
        </span>
      )}
    </a>
  );
}

// --- REUSABLE SUB-COMPONENTS ---

function SidebarSection({ label, children, isCollapsed }) {
  return (
    <div className="flex flex-col">
      {!isCollapsed ? (
        <h3 className="text-[#000a40]/50 dark:text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-3 px-2">
          {label}
        </h3>
      ) : (
        <div className="h-px bg-gray-300 dark:bg-gray-800 w-full mb-4 opacity-50" />
      )}
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function NavItem({ to, icon, label, badge, isCollapsed }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex items-center group cursor-pointer transition-all duration-200 rounded-lg
        ${isActive 
          ? "bg-white dark:bg-[#000a40] text-blue-600 shadow-sm" 
          : "text-[#000a40]/70 dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/5"}
        ${isCollapsed ? "justify-center py-3" : "justify-between px-3 py-2"}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="group-hover:text-blue-500 transition-colors">
          {icon}
        </span>
        {!isCollapsed && (
          <span className="text-sm font-medium">
            {label}
          </span>
        )}
      </div>

      {!isCollapsed && badge && badge !== "0" && (
        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
          {badge}
        </span>
      )}
    </NavLink>
  );
}