import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { authAPI } from '../services/api';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email'); return; }
    if (!password.trim()) { setError('Please enter your password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify({ name: data.name, email: data.email, role: data.role }));
      onLogin(data.email);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans">
      
      {/* Left Section: Hero/Brand Area */}
      <div className="hidden lg:flex w-7/12 bg-[#0a192f] text-white p-16 flex-col justify-center relative overflow-hidden">
        {/* Abstract Background Elements (Optional) */}
        <div className="absolute top-20 -left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-xl">
          <div className="mb-12">
            <h2 className="text-xl font-bold tracking-tight text-cyan-400">ZISP</h2>
            <p className="text-sm text-gray-400 uppercase tracking-widest mt-1">Connectivity Reimagined</p>
          </div>

          <h1 className="text-6xl font-light leading-tight mb-8">
            Manage Your <br />
            <span className="font-semibold text-white">Digital World</span>
          </h1>

          <p className="text-lg text-gray-300 leading-relaxed max-w-md">
            Access your ISP dashboard to manage devices, monitor real-time analytics, 
            and handle billing with ease.
          </p>
        </div>

        {/* Decorative Graphic (Simulating the Cisco wavy lines) */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 opacity-20 pointer-events-none">
            <svg viewBox="0 0 500 200" className="w-full h-full">
                <path 
                    d="M0,100 C150,200 350,0 500,100" 
                    stroke="cyan" 
                    strokeWidth="2" 
                    fill="transparent" 
                />
            </svg>
        </div>
      </div>

      {/* Right Section: Login Form */}
      <div className="w-full lg:w-5/12 bg-white dark:bg-zeta-dark p-8 md:p-16 flex flex-col transition-colors duration-300">
        
        {/* Top Navigation */}
        <div className="flex justify-end items-center mb-16">
            <button className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-4 py-1.5 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                <Globe size={16} />
                English (English)
            </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <h2 className="text-4xl font-bold text-[#000a40] dark:text-white mb-2">Welcome!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-10">Please login to your account.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 outline-none transition-all"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="text-right">
                <button type="button" className="text-sm font-semibold text-[#3273a0] dark:text-blue-400 hover:underline">
                    Forgot Password?
                </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#3273a0] hover:bg-[#285d82] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold py-3.5 rounded-full transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;