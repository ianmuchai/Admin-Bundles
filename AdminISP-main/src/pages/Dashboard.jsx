import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, AreaChart, Area, CartesianGrid
} from "recharts";
import { dashboardAPI } from "../services/dashboardAPI";

/*
BACKEND API ENDPOINTS TO IMPLEMENT:

1. GET /api/dashboard/stats
   Response: {
     totalUsers: number,
     activeUsers: number,
     monthlyRevenue: number,
     expiryDate: string
   }

2. GET /api/dashboard/charts?category={category}&timeframe={timeframe}
   Categories: "Payments", "Registrations", "Sent SMS", "Revenue", "Expenses", "Active Users", "Retention", "Forecast", "Network Usage"
   Timeframes: "Today", "This Week", "Last Week", "This Month", "Last Month", "This Year"
   Response: Array of chart data points
*/

// Updated ChartCard: Header is now a split grid with two dropdowns
function ChartCard({ leftDropdown, rightDropdown, children, className = "", isLoading = false, error = null, hasDropdown = false }) {
  return (
    <div className={`
      bg-white dark:bg-[#0a113d] 
      p-4 sm:p-5 rounded-xl 
      shadow-[#009DFF] hover:shadow-[#009DFF]/50 shadow-lg 
      transition-all duration-300 hover:-translate-y-1
      w-full overflow-hidden 
      ${className}
    `}>
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 ${
        hasDropdown ? "pb-4 border-b border-gray-200 dark:border-gray-700" : ""
      }`}>
        {/* LEFT DROPDOWN (Category Selector) */}
        <div className="flex-1 min-w-0">
          {leftDropdown}
        </div>

        {/* RIGHT DROPDOWN (Timeframe Selector) */}
        <div className="flex-shrink-0">
          {rightDropdown}
        </div>
      </div>
      <div className="h-[200px] sm:h-[250px]">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-gray-400">
            Loading...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">
            Error loading chart
          </div>
        )}
        {!isLoading && !error && children}
      </div>
    </div>
  );
}

export default function Dashboard() {
  // --- STATES FOR DASHBOARD DATA ---
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [expiryDate, setExpiryDate] = useState("20 Apr 2026");
  const [isLoadingTotalUsers, setIsLoadingTotalUsers] = useState(true);
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(true);
  const [isLoadingMonthlyRevenue, setIsLoadingMonthlyRevenue] = useState(true);

  // --- STATES FOR DROPDOWNS ---
  const [barCategory, setBarCategory] = useState("Payments");
  const [lineCategory, setLineCategory] = useState("Active Users");
  const [barTimeframe, setBarTimeframe] = useState("This Month");
  const [lineTimeframe, setLineTimeframe] = useState("This Week");
  
  // --- STATES FOR CHART DATA ---
  const [barChartData, setBarChartData] = useState([]);
  const [lineChartData, setLineChartData] = useState([]);
  const [isLoadingBarChart, setIsLoadingBarChart] = useState(false);
  const [isLoadingLineChart, setIsLoadingLineChart] = useState(false);
  const [barChartError, setBarChartError] = useState(false);
  const [lineChartError, setLineChartError] = useState(false);

  // --- FETCH DASHBOARD DATA ---
  const fetchTotalUsers = async () => {
    try {
      setIsLoadingTotalUsers(true);
      const { data } = await dashboardAPI.getTotalUsers();
      setTotalUsers(data.totalUsers ?? 0);
    } catch (error) {
      console.error('Error fetching total users:', error);
      // Keep default value on error
    } finally {
      setIsLoadingTotalUsers(false);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      setIsLoadingActiveUsers(true);
      const { data } = await dashboardAPI.getActiveUsers();
      setActiveUsers(data.activeUsers ?? 0);
    } catch (error) {
      console.error('Error fetching active users:', error);
      // Keep default value on error
    } finally {
      setIsLoadingActiveUsers(false);
    }
  };

  const fetchMonthlyRevenue = async () => {
    try {
      setIsLoadingMonthlyRevenue(true);
      const { data } = await dashboardAPI.getMonthlyRevenue();
      setMonthlyRevenue(data.monthlyRevenue ?? 0);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      // Keep default value on error
    } finally {
      setIsLoadingMonthlyRevenue(false);
    }
  };

  // --- FETCH CHART DATA BASED ON SELECTIONS ---
  const fetchChartData = async (category, timeframe) => {
    try {
      return await dashboardAPI.getChartData(category, timeframe);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return null;
    }
  };

  // --- LOAD DATA ON COMPONENT MOUNT ---
  useEffect(() => {
    fetchTotalUsers();
    fetchActiveUsers();
    fetchMonthlyRevenue();
  }, []);

  // --- REFETCH BAR CHART DATA WHEN DROPDOWNS CHANGE ---
  useEffect(() => {
    setIsLoadingBarChart(true);
    setBarChartError(false);
    try {
      const data = getBarChartData(barCategory);
      setBarChartData(data);
      setIsLoadingBarChart(false);
    } catch (error) {
      console.error('Error loading bar chart:', error);
      setBarChartError(true);
      setIsLoadingBarChart(false);
    }
  }, [barCategory, barTimeframe]);

  // --- REFETCH LINE CHART DATA WHEN DROPDOWNS CHANGE ---
  useEffect(() => {
    setIsLoadingLineChart(true);
    setLineChartError(false);
    try {
      const data = getLineChartData(lineCategory);
      setLineChartData(data);
      setIsLoadingLineChart(false);
    } catch (error) {
      console.error('Error loading line chart:', error);
      setLineChartError(true);
      setIsLoadingLineChart(false);
    }
  }, [lineCategory, lineTimeframe]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5 md:space-y-6 bg-[#F9FAFB] dark:bg-zeta-dark min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-3">
        <button className="bg-white dark:bg-zeta-dark dark:text-[#FFFFFF] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 w-fit">
          Expiry: {expiryDate}
        </button>
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-300">
          {getGreeting()}, Zeta 👋
        </h2>
      </div>

      {/* STAT CARDS (Restored) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        <div className="bg-white dark:bg-[#0a113d] p-4 sm:p-5 rounded-xl shadow-[#009DFF] hover:shadow-[#009DFF] shadow-lg border dark:border-white/5 transition-transform hover:-translate-y-1">
          <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">Total Users</h3>
          <p className="text-xl sm:text-2xl text-gray-800 dark:text-[#FFFFFF] font-bold mt-2">
            {isLoadingTotalUsers ? "..." : totalUsers.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0a113d] p-4 sm:p-5 rounded-xl shadow-[#009DFF] hover:shadow-[#009DFF] shadow-lg border dark:border-white/5 transition-transform hover:-translate-y-1">
          <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">Active Users</h3>
          <p className="text-xl sm:text-2xl text-gray-800 dark:text-[#FFFFFF] font-bold mt-2">
            {isLoadingActiveUsers ? "..." : activeUsers.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0a113d] p-4 sm:p-5 rounded-xl shadow-[#009DFF] hover:shadow-[#009DFF] shadow-lg border dark:border-white/5 transition-transform hover:-translate-y-1">
          <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">Monthly Revenue</h3>
          <p className="text-xl sm:text-2xl text-blue-600 font-bold mt-2">
            {isLoadingMonthlyRevenue ? "..." : `KES ${monthlyRevenue.toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* 4 CONSOLIDATED CHART CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mt-5 md:mt-6">
        
        {/* CARD 1: TX/RX (Fixed Title) */}
        <ChartCard 
          leftDropdown={<div className="text-gray-800 dark:text-white font-bold text-sm sm:text-base md:text-lg">Network Traffic (TX/RX)</div>}
          rightDropdown={<TimeframeDropdown value="Today" onChange={() => {}} />}
          hasDropdown={true}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={networkTraffic}>
              <defs>
                <linearGradient id="cRx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                <linearGradient id="cTx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="time" fontSize={12} tick={{fill: '#9ca3af'}} />
              <YAxis fontSize={12} tick={{fill: '#9ca3af'}} unit="M" />
              <Tooltip />
              <Area type="monotone" dataKey="rx" stroke="#3b82f6" fill="url(#cRx)" name="Download" />
              <Area type="monotone" dataKey="tx" stroke="#10b981" fill="url(#cTx)" name="Upload" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CARD 2: BAR ANALYTICS (Dropdown Header) */}
        <ChartCard 
          leftDropdown={
            <select className={LeftSelectStyle} value={barCategory} onChange={(e) => setBarCategory(e.target.value)}>
              <option value="Payments">Payments</option>
              <option value="Registrations">User Registration</option>
              <option value="Sent SMS">Sent SMS</option>
              <option value="Revenue">Revenue</option>
              <option value="Expenses">Expenses</option>
            </select>
          }
          rightDropdown={<TimeframeDropdown value={barTimeframe} onChange={setBarTimeframe} />}
          isLoading={isLoadingBarChart}
          error={barChartError}
          hasDropdown={true}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="name" fontSize={12} tick={{fill: '#9ca3af'}} />
              <YAxis fontSize={12} tick={{fill: '#9ca3af'}} />
              <Tooltip cursor={{fill: '#f3f4f6'}} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CARD 3: LINE ANALYTICS (Dropdown Header) */}
        <ChartCard 
          leftDropdown={
            <select className={LeftSelectStyle} value={lineCategory} onChange={(e) => setLineCategory(e.target.value)}>
              <option value="Active Users">Active Users</option>
              <option value="Retention">Customer Retention</option>
              <option value="Forecast">Revenue Forecast</option>
              <option value="Expenses">Expenses</option>
              <option value="Network Usage">Network Usage</option>
            </select>
          }
          rightDropdown={<TimeframeDropdown value={lineTimeframe} onChange={setLineTimeframe} />}
          isLoading={isLoadingLineChart}
          error={lineChartError}
          hasDropdown={true}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey={getLineChartKeys(lineCategory).xKey} fontSize={12} tick={{fill: '#9ca3af'}} />
              <YAxis fontSize={12} tick={{fill: '#9ca3af'}} />
              <Tooltip />
              {getLineChartKeys(lineCategory).keys.map((key, idx) => {
                const colors = ["#10b981", "#3b82f6", "#f59e0b"];
                return <Line key={key} type="monotone" dataKey={key} stroke={colors[idx % colors.length]} strokeWidth={2} />;
              })}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CARD 4: PACKAGE UTILIZATION */}
        <ChartCard 
          leftDropdown={<div className="text-gray-800 dark:text-white font-bold text-sm sm:text-base md:text-lg">Package Utilization</div>}
          rightDropdown={<TimeframeDropdown value="This Month" onChange={() => {}} />}
          hasDropdown={true}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={packages} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} fill="#3b82f6" label={{fontSize: 12}} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}

// ── Module-scope static data & helpers (stable across re-renders) ───────────

const mockDataByCategory = {
  Payments: [
    { name: "Jan", value: 30000 }, { name: "Feb", value: 42000 }, { name: "Mar", value: 35000 },
    { name: "Apr", value: 40000 }, { name: "May", value: 45000 }, { name: "Jun", value: 50000 },
    { name: "Jul", value: 55000 }, { name: "Aug", value: 60000 }, { name: "Sep", value: 65000 },
    { name: "Oct", value: 70000 }, { name: "Nov", value: 75000 }, { name: "Dec", value: 80000 },
  ],
  Registrations: [
    { name: "Jan", value: 120 }, { name: "Feb", value: 150 }, { name: "Mar", value: 130 },
    { name: "Apr", value: 160 }, { name: "May", value: 180 }, { name: "Jun", value: 200 },
    { name: "Jul", value: 220 }, { name: "Aug", value: 240 }, { name: "Sep", value: 260 },
    { name: "Oct", value: 280 }, { name: "Nov", value: 300 }, { name: "Dec", value: 320 },
  ],
  "Sent SMS": [
    { name: "Jan", value: 5000 },  { name: "Feb", value: 6200 },  { name: "Mar", value: 5800 },
    { name: "Apr", value: 7000 },  { name: "May", value: 7500 },  { name: "Jun", value: 8000 },
    { name: "Jul", value: 8500 },  { name: "Aug", value: 9000 },  { name: "Sep", value: 9500 },
    { name: "Oct", value: 10000 }, { name: "Nov", value: 10500 }, { name: "Dec", value: 11000 },
  ],
  Revenue: [
    { name: "Jan", value: 45000 },  { name: "Feb", value: 52000 },  { name: "Mar", value: 48000 },
    { name: "Apr", value: 55000 },  { name: "May", value: 62000 },  { name: "Jun", value: 70000 },
    { name: "Jul", value: 75000 },  { name: "Aug", value: 85000 },  { name: "Sep", value: 90000 },
    { name: "Oct", value: 100000 }, { name: "Nov", value: 110000 }, { name: "Dec", value: 120000 },
  ],
  Expenses: [
    { name: "Jan", value: 15000 }, { name: "Feb", value: 16000 }, { name: "Mar", value: 15500 },
    { name: "Apr", value: 17000 }, { name: "May", value: 18000 }, { name: "Jun", value: 19000 },
    { name: "Jul", value: 20000 }, { name: "Aug", value: 21000 }, { name: "Sep", value: 22000 },
    { name: "Oct", value: 23000 }, { name: "Nov", value: 24000 }, { name: "Dec", value: 25000 },
  ],
  "Active Users": [
    { day: "Mon", hotspot: 20, pppoe: 15 }, { day: "Tue", hotspot: 35, pppoe: 25 },
    { day: "Wed", hotspot: 25, pppoe: 20 }, { day: "Thu", hotspot: 50, pppoe: 30 },
    { day: "Fri", hotspot: 45, pppoe: 28 }, { day: "Sat", hotspot: 60, pppoe: 35 },
    { day: "Sun", hotspot: 55, pppoe: 32 },
  ],
  Retention: [
    { day: "Mon", new: 45, returning: 120, churned: 15 }, { day: "Tue", new: 52, returning: 135, churned: 18 },
    { day: "Wed", new: 48, returning: 128, churned: 16 }, { day: "Thu", new: 60, returning: 150, churned: 20 },
    { day: "Fri", new: 55, returning: 142, churned: 19 }, { day: "Sat", new: 70, returning: 165, churned: 25 },
    { day: "Sun", new: 65, returning: 158, churned: 22 },
  ],
  Forecast: [
    { day: "Mon", forecast: 32000 }, { day: "Tue", forecast: 38000 }, { day: "Wed", forecast: 35000 },
    { day: "Thu", forecast: 42000 }, { day: "Fri", forecast: 45000 }, { day: "Sat", forecast: 50000 },
    { day: "Sun", forecast: 48000 },
  ],
  "Network Usage": [
    { day: "Mon", hotspot: 40, pppoe: 25 }, { day: "Tue", hotspot: 55, pppoe: 35 },
    { day: "Wed", hotspot: 50, pppoe: 30 }, { day: "Thu", hotspot: 65, pppoe: 45 },
    { day: "Fri", hotspot: 60, pppoe: 40 }, { day: "Sat", hotspot: 75, pppoe: 50 },
    { day: "Sun", hotspot: 70, pppoe: 48 },
  ],
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getLineChartKeys = (category) => {
  const keyMap = {
    "Active Users":  { keys: ["hotspot", "pppoe"],              xKey: "day" },
    Retention:       { keys: ["new", "returning", "churned"],   xKey: "day" },
    Forecast:        { keys: ["forecast"],                      xKey: "day" },
    Expenses:        { keys: ["value"],                         xKey: "name" },
    "Network Usage": { keys: ["hotspot", "pppoe"],              xKey: "day" },
  };
  return keyMap[category] || { keys: ["hotspot", "pppoe"], xKey: "day" };
};

const getBarChartData  = (category) => mockDataByCategory[category] || mockDataByCategory.Payments;
const getLineChartData = (category) => mockDataByCategory[category] || mockDataByCategory["Active Users"];

const LeftSelectStyle = "bg-transparent border-none text-gray-800 dark:text-white font-bold text-sm sm:text-base md:text-lg focus:ring-0 cursor-pointer outline-none appearance-none hover:text-blue-500 transition-colors w-full";
const RightSelectStyle = "bg-gray-100 dark:bg-[#161d4a] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-[10px] sm:text-[11px] rounded-lg px-2 py-1 cursor-pointer outline-none font-medium";

const networkTraffic = [
  { time: "08:00", rx: 45, tx: 10 },
  { time: "12:00", rx: 180, tx: 40 },
  { time: "16:00", rx: 220, tx: 55 },
  { time: "20:00", rx: 310, tx: 80 },
  { time: "23:59", rx: 190, tx: 45 },
];

const packages = [
  { name: "3Mbps", value: 50 },
  { name: "5Mbps", value: 100 },
  { name: "10Mbps", value: 150 },
  { name: "20Mbps", value: 200 },
];

const TimeframeDropdown = ({ value, onChange }) => (
  <select
    className={RightSelectStyle}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    <option>Today</option>
    <option>This Week</option>
    <option>Last Week</option>
    <option>This Month</option>
    <option>Last Month</option>
    <option>This Year</option>
  </select>
);