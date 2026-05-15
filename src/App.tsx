import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, ComposedChart, Bar, Brush, ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Shield, Zap, Layout, 
  BarChart3, Globe, Settings, User, Search, Bell, X, Plus, PlusCircle,
  ArrowUpRight, ArrowDownRight, ArrowDownLeft, Activity, Cpu, Check, MessageSquare, Send, Bot, Loader2,
  Layers, Lock, Info, Mail, CreditCard, Moon, LogOut, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

import { GoogleGenAI, Type } from "@google/genai";

// --- Constants ---
const DEFAULT_TRENDING = [
  { ticker: 'NVDA', exchange: 'NASDAQ' },
  { ticker: 'AAPL', exchange: 'NASDAQ' },
  { ticker: 'AZN.L', exchange: 'LSE' },
  { ticker: 'RELIANCE.NS', exchange: 'NSE' },
  { ticker: 'TCS.NS', exchange: 'NSE' },
  { ticker: 'BP.L', exchange: 'LSE' }
];

const INDEX_SYMBOLS = {
  'Bank Nifty': '^NSEBANK',
  'Sensex': '^BSESN',
  'NYSE Index': '^NYA',
  'LSE (FTSE)': '^FTSE'
};

// --- Types ---
interface TickData {
  ticker: string;
  price: number;
  change: number;
  timestamp: string;
  marketOpen?: boolean;
}

interface Watchlist {
  id: string;
  name: string;
  tickers: string[];
}

interface NewsArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: any;
  type: string;
}

const formatNewsDate = (time: any) => {
  if (!time) return 'N/A';
  
  let date: Date;
  
  if (typeof time === 'number') {
    // Yahoo Finance timestamps are often in seconds. 
    // If it's less than 10,000,000,000, it's likely seconds.
    const isSeconds = time < 10000000000;
    date = new Date(isSeconds ? time * 1000 : time);
  } else {
    // It's likely an ISO string or other date string
    date = new Date(time);
  }

  if (isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const generateHistoricalData = (ticker: string, points = 100) => {
  const data = [];
  let basePrice = ticker.endsWith('.NS') ? 2500 : 180;
  if (ticker === 'NVDA') basePrice = 800;
  if (ticker === 'TSLA') basePrice = 170;
  
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Days ago
    const volatility = 0.02;
    const change = 1 + (Math.random() - 0.48) * volatility;
    
    const open = basePrice;
    basePrice *= change;
    const close = basePrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    data.push({
      date: time.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }),
      price: parseFloat(basePrice.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
  }
  return data;
};

interface Prediction {
  growth: string;
  riskFactor: string;
  timing: string;
  predictedGrowthDate: string;
  predictedGrowthReasoning: string;
  news: string[];
  confidence: number;
}

// --- Components ---

const ArchitectureDoc = () => (
  <div className="prose prose-invert max-w-none p-8 overflow-y-auto h-full custom-scrollbar">
    <Markdown>{`
# LithuBroker: Enterprise Technical Architecture

## 1. High-Frequency Trading (HFT) Infrastructure
*   **Edge Computing**: Deployment of API Gateways and Tick-Aggregators at edge locations (AWS Local Zones, Equinix) to minimize RTT for global markets (NYSE/NSE).
*   **Message Broker**: **Apache Kafka** with **Confluent** for event-driven order execution and tick data distribution.
*   **Database Layer**: 
    *   **TimescaleDB** (PostgreSQL extension) for high-ingest time-series data.
    *   **Redis** for sub-millisecond session management and real-time order book caching.
    *   **MongoDB** for flexible user profiles and social trading metadata.

## 2. Live Charting & Tick Streaming
*   **WebSocket Architecture**: Distributed WebSocket clusters using **Socket.io** or raw **uWebSockets.js** for horizontal scaling.
*   **Data Pipeline**: Raw UDP feeds from exchanges → Normalizer Microservice → Kafka Topic → WebSocket Broadcaster.
*   **Client-Side**: **TradingView Lightweight Charts** (Canvas-based) for Pro mode; **Recharts/D3** for Lite mode.

## 3. Quantitative Analysis Engine (Quant-ML)
*   **Models**: 
    *   **Temporal Fusion Transformers (TFT)** for multi-horizon time-series forecasting.
    *   **LSTMs** for short-term volatility prediction.
    *   **BERT/RoBERTa** for real-time sentiment analysis of news/social feeds.
*   **Pipeline**: Feature Store (Tecton/Feast) → Batch Training (SageMaker) → Real-time Inference (NVIDIA Triton Inference Server).

## 4. Security & Compliance
*   **Encryption**: AES-256 at rest, TLS 1.3 in transit.
*   **Auth**: OAuth2 + OIDC with Hardware Security Modules (HSM) for private key storage (Trading Bots).
*   **Regulatory**: Automated KYC/AML via Onfido; MiFID II / SEBI compliance logging.
    `}</Markdown>
  </div>
);

const LegalCompliance = () => (
  <div className="prose prose-invert max-w-4xl mx-auto p-8 overflow-y-auto h-full custom-scrollbar space-y-8">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
        <Shield className="w-7 h-7 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Legal Compliance & Risk Disclosure</h2>
        <p className="text-slate-400">Formal regulatory disclaimers and terms of service</p>
      </div>
    </div>

    <section className="glass-panel p-8 space-y-6 border-l-4 border-l-emerald-500">
      <h3 className="text-xl font-bold text-white">1. NO INVESTMENT ADVICE OR PROFESSIONAL RELATIONSHIP</h3>
      <div className="text-slate-300 text-sm leading-relaxed space-y-4">
        <p>The Platform, its content, and AI-driven growth predictions (collectively, the "Content") are provided for general informational purposes only. You acknowledge and agree that:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Non-Registration:</strong> The Platform and its operators are <strong>not</strong> registered as Investment Advisers (RIA) with the Securities and Exchange Commission (SEC), Research Analysts or Investment Advisers with the Securities and Exchange Board of India (SEBI), or authorized by the Financial Conduct Authority (FCA) to provide regulated financial services.</li>
          <li><strong>No Fiduciary Duty:</strong> No attorney-client, advisory, or fiduciary relationship is created between you and the Platform. The Content does not take into account your specific investment objectives, financial situation, or risk tolerance.</li>
          <li><strong>Independent Research:</strong> You must perform your own due diligence or consult a licensed financial professional before making any investment.</li>
        </ul>
      </div>
    </section>

    <section className="glass-panel p-8 space-y-6 border-l-4 border-l-amber-500">
      <h3 className="text-xl font-bold text-white">2. ARTIFICIAL INTELLIGENCE & DATA LIMITATIONS (AI FALLIBILITY)</h3>
      <div className="text-slate-300 text-sm leading-relaxed space-y-4">
        <p>The Platform utilizes proprietary machine learning models and Artificial Intelligence to generate market insights. You explicitly acknowledge the following inherent risks:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Algorithmic Inaccuracy:</strong> AI models are based on historical data and probabilistic outcomes. They are subject to "hallucinations," logic errors, and technical glitches.</li>
          <li><strong>No Guarantees:</strong> Past performance—whether simulated or real—is <strong>not</strong> indicative of future results. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown.</li>
          <li><strong>Data Latency:</strong> Live charting and signals may be subject to transmission delays, feed errors, or market volatility lags. The Platform assumes no responsibility for financial decisions made based on delayed or corrupted data.</li>
        </ul>
      </div>
    </section>

    <section className="glass-panel p-8 space-y-6 border-l-4 border-l-rose-500">
      <h3 className="text-xl font-bold text-white">3. LIMITATION OF LIABILITY & INDEMNIFICATION</h3>
      <div className="text-slate-300 text-sm leading-relaxed space-y-4">
        <p>To the maximum extent permitted by applicable law (including but not limited to the laws of the US, UK, and India):</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Total Indemnity:</strong> You agree to indemnify, defend, and hold harmless the Platform, its founders, affiliates, and employees from any and all claims, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform or any trading losses incurred.</li>
          <li><strong>"As-Is" Provision:</strong> The Platform is provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties, express or implied, including warranties of merchantability or fitness for a particular purpose.</li>
          <li><strong>Exclusion of Damages:</strong> In no event shall the Platform be liable for any direct, indirect, incidental, or consequential damages (including, without limitation, loss of capital, profits, or data) resulting from your reliance on AI predictions, even if advised of the possibility of such damages.</li>
        </ul>
      </div>
    </section>

    <section className="glass-panel p-8 space-y-6 border-l-4 border-l-slate-500">
      <h3 className="text-xl font-bold text-white">4. NO EXECUTION OR CUSTODY OF FUNDS</h3>
      <div className="text-slate-300 text-sm leading-relaxed space-y-4">
        <p>The Platform is a SaaS analytics tool only. We <strong>do not</strong> execute trades, provide brokerage services, or hold, manage, or have access to client funds. Any integration with third-party brokers is for convenience only, and the Platform is not responsible for the actions or omissions of such third parties.</p>
      </div>
    </section>
  </div>
);

const DisclaimerPopup = ({ onAccept, onCancel }: { onAccept: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass-panel max-w-lg w-full p-8 space-y-6 border-emerald-500/30 shadow-2xl shadow-emerald-500/10"
    >
      <div className="flex items-center gap-3 text-emerald-400">
        <Shield className="w-8 h-8" />
        <h3 className="text-xl font-bold uppercase tracking-tight">Mandatory Risk Disclosure</h3>
      </div>
      
      <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
        <p className="font-bold text-white">RISK WARNING: Trading involves significant risk of loss.</p>
        <p>All AI-generated predictions and charting data are provided strictly for <strong>educational and informational purposes</strong> and do not constitute financial, investment, or legal advice.</p>
        <p>We are not registered investment advisors or brokers; you are 100% responsible for your own trading decisions and financial outcomes.</p>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onCancel}
          className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-slate-400 hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
        <button 
          onClick={onAccept}
          className="flex-1 bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          I Understand & Accept
        </button>
      </div>
    </motion.div>
  </div>
);

interface AccountSettingsProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  notifications: any;
  setNotifications: React.Dispatch<React.SetStateAction<any>>;
  preferences: any;
  setPreferences: React.Dispatch<React.SetStateAction<any>>;
  securityData: any;
  setSecurityData: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  initialTab?: string;
}

const AccountSettings = ({
  profile, setProfile, 
  notifications, setNotifications, 
  preferences, setPreferences, 
  securityData, setSecurityData,
  showToast,
  initialTab
}: AccountSettingsProps) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('File size must be under 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev: any) => ({ ...prev, photo: reader.result as string }));
        showToast('Profile photo updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    showToast('Profile settings saved successfully!', 'success');
  };

  const handleSignOut = () => {
    showToast('Signing out and clearing local data...', 'info');
    localStorage.clear();
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 h-full overflow-y-auto custom-scrollbar relative">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
          <User className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Account Settings</h2>
          <p className="text-slate-400">Manage your profile, security, and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-2">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'preferences', label: 'Preferences', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-white/5">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="md:col-span-2 min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.section 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel p-8 space-y-6"
              >
                <h3 className="text-xl font-bold text-white">Public Profile</h3>
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl border-2 border-dashed border-emerald-500/30 flex items-center justify-center overflow-hidden">
                      {profile.photo ? (
                        <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-emerald-400/50" />
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl"
                    >
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Change</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handlePhotoChange} 
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-bold text-white">Profile Photo</p>
                    <p className="text-xs text-slate-500">JPG, GIF or PNG. Max size of 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={e => setProfile({...profile, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email}
                      onChange={e => setProfile({...profile, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bio</label>
                  <textarea 
                    rows={3}
                    value={profile.bio}
                    onChange={e => setProfile({...profile, bio: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={handleSaveProfile}
                    className="bg-emerald-500 text-black px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.section>
            )}

            {activeTab === 'security' && (
              <motion.section 
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel p-8 space-y-6"
              >
                <h3 className="text-xl font-bold text-white">Security Settings</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Two-Factor Authentication</p>
                        <p className="text-[10px] text-slate-500">{securityData.tfaEnabled ? 'Secured via Authenticator' : 'Secure your account with 2FA.'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSecurityData(prev => ({ ...prev, tfaEnabled: !prev.tfaEnabled }));
                        showToast(securityData.tfaEnabled ? '2FA disabled' : '2FA enabled successfully!', 'success');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        securityData.tfaEnabled ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black'
                      }`}
                    >
                      {securityData.tfaEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Password Management</p>
                        <p className="text-[10px] text-slate-500">Last changed 3 months ago.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => showToast('Password reset link sent to your email!', 'info')}
                      className="px-4 py-1.5 bg-white/5 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                    >
                      Update
                    </button>
                  </div>

                  <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                        <Activity className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-rose-400">Account Deletion</p>
                        <p className="text-[10px] text-slate-500">Permanently remove all data.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => showToast('Initiating account deletion... please check email.', 'error')}
                      className="px-4 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {activeTab === 'notifications' && (
              <motion.section 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel p-8 space-y-6"
              >
                <h3 className="text-xl font-bold text-white">Notification Controls</h3>
                <div className="space-y-4">
                  {[
                    { id: 'push' as const, label: 'Push Notifications', desc: 'Alerts directly to your device.', icon: Zap },
                    { id: 'marketing' as const, label: 'Marketing Emails', desc: 'New feature updates and offers.', icon: Mail },
                    { id: 'security' as const, label: 'Security Alerts', desc: 'Critical account activity reports.', icon: Shield },
                    { id: 'price' as const, label: 'Price Triggers', desc: 'Alerts when targets are hit.', icon: Bell },
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                          <notif.icon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{notif.label}</p>
                          <p className="text-[10px] text-slate-500">{notif.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setNotifications(prev => ({ ...prev, [notif.id]: !prev[notif.id] }))}
                        className={`w-10 h-5 rounded-full transition-all relative ${notifications[notif.id] ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifications[notif.id] ? 'right-1 shadow-md' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {activeTab === 'preferences' && (
              <motion.section 
                key="preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel p-8 space-y-6"
              >
                <h3 className="text-xl font-bold text-white">System Preferences</h3>
                <div className="space-y-4">
                  {[
                    { id: 'dark' as const, label: 'Dark Mode', desc: 'Use the high-contrast dark interface.', icon: Moon },
                    { id: 'fidelity' as const, label: 'High Fidelity Charts', desc: 'Superior rendering for complex data.', icon: Activity },
                    { id: 'compact' as const, label: 'Compact View', desc: 'Maximize screen real estate for data.', icon: Layout },
                    { id: 'professional' as const, label: 'Professional Mode', desc: 'Enable advanced technical indicators.', icon: Cpu },
                  ].map((pref) => (
                    <div key={pref.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                          <pref.icon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{pref.label}</p>
                          <p className="text-[10px] text-slate-500">{pref.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPreferences(prev => ({ ...prev, [pref.id]: !prev[pref.id] }))}
                        className={`w-10 h-5 rounded-full transition-all relative ${preferences[pref.id] ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${preferences[pref.id] ? 'right-1 shadow-md' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const getCurrencySymbol = (ticker: string, exchange?: string) => {
  if (ticker.endsWith('.NS') || ticker.endsWith('.BO') || exchange === 'NSE' || exchange === 'IN') return '₹';
  if (ticker.endsWith('.L') || ticker === '^FTSE' || exchange === 'LSE') return '£';
  return '$';
};

const MarketMoodGauge = ({ mood }: { mood: { score: number, label: string } | null }) => {
  if (!mood) return (
    <div className="glass-panel p-6 flex flex-col items-center justify-center space-y-3 min-h-[220px]">
      <Activity className="w-8 h-8 text-slate-500 animate-pulse" />
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Scanning Real-time<br/>Market Sentiment...</p>
    </div>
  );

  const getMoodColor = (score: number) => {
    if (score <= 25) return 'text-rose-600 bg-rose-600';
    if (score <= 45) return 'text-rose-400 bg-rose-400';
    if (score <= 54) return 'text-amber-400 bg-amber-500';
    if (score <= 75) return 'text-emerald-400 bg-emerald-500';
    return 'text-emerald-600 bg-emerald-600';
  };

  const score = mood.score;
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="glass-panel p-6 space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Globe className="w-24 h-24 rotate-12" />
      </div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Global Market Mood</h4>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-black ${getMoodColor(score).split(' ')[0]}`}>{mood.label}</span>
            <div className={`w-2 h-2 rounded-full animate-pulse ${getMoodColor(score).split(' ')[1]}`} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-mono font-bold text-white tracking-tighter">{score}</span>
          <span className="text-[10px] block font-bold text-slate-600 uppercase">Index</span>
        </div>
      </div>

      <div className="relative h-28 flex items-end justify-center overflow-hidden">
        {/* Semi-circle track */}
        <div className="absolute bottom-0 w-56 h-28 border-[14px] border-slate-800 rounded-t-full" />
        
        {/* Needle */}
        <motion.div 
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
          className="absolute bottom-0 w-1 h-24 bg-white origin-bottom rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20"
        >
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_white]" />
        </motion.div>
        
        {/* Color markers on track */}
        <div className="absolute bottom-1 right-1/2 translate-x-[90px] w-4 h-4 bg-emerald-500/20 rounded-full blur-sm" />
        <div className="absolute bottom-1 left-1/2 -translate-x-[90px] w-4 h-4 bg-rose-500/20 rounded-full blur-sm" />
        
        {/* Center hub */}
        <div className="absolute -bottom-3 w-8 h-8 bg-slate-900 border-4 border-slate-700 rounded-full z-30" />
      </div>

      <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-widest pt-2 border-t border-white/5">
        <span className="text-rose-500/60">Extreme Fear</span>
        <span>Neutral</span>
        <span className="text-emerald-500/60">Extreme Greed</span>
      </div>
      
      <p className="text-[9px] text-slate-500 leading-tight italic opacity-60">
        Aggregated from 20+ news sources and social volatility scanning engines. Refresh: 10m.
      </p>
    </div>
  );
};

const StockChart = ({ data, color = "#10b981" }: { data: any[], color?: string, isMarketOpen?: boolean }) => {
  const gradientId = useMemo(() => `gradient-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 9)}`, [color]);
  
  return (
    <div className="relative w-full h-full">
      {data.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-2">
          <Activity className="w-8 h-8 opacity-20" />
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 px-4 text-center">Initializing Market Stream...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e1e20', border: '1px solid #ffffff20', borderRadius: '8px', fontSize: '10px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#${gradientId})`} 
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const DetailedChartModal = ({ ticker, isOpen, onClose }: { ticker: string | null, isOpen: boolean, onClose: () => void }) => {
  const [timeframe, setTimeframe] = useState<'1Y' | '5Y'>('1Y');
  
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!ticker || !isOpen) return;
    
    const fetchDetailedHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/history/${ticker}?timeframe=${timeframe === '1Y' ? '1y' : '5y'}`);
        const data = await res.json();
        if (data.history) {
          setHistoricalData(data.history);
        }
      } catch (err) {
        console.error("Error fetching detailed history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDetailedHistory();
  }, [ticker, timeframe, isOpen]);

  if (!isOpen || !ticker) return null;

  const currentPrice = historicalData[historicalData.length - 1]?.price || 0;
  const startPrice = historicalData[0]?.price || 0;
  const isUp = currentPrice >= startPrice;
  const pctChange = (((currentPrice - startPrice) / startPrice) * 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel w-full max-w-6xl h-full max-h-[850px] flex flex-col overflow-hidden border-emerald-500/20"
      >
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between bg-white/2 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
              <TrendingUp className={`w-6 h-6 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight uppercase">{ticker}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-400">DETAIL VIEW</span>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{timeframe} Performance Analysis</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              {(['1Y', '5Y'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === t ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-hidden flex flex-col">
          <div className="flex items-end gap-6 mb-8">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Value</p>
              <p className="text-4xl font-mono font-bold text-white">
                {getCurrencySymbol(ticker)}{currentPrice.toLocaleString()}
              </p>
            </div>
            <div className="pb-1">
              <div className={`flex items-center gap-1 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                <span className="text-xl">{pctChange}%</span>
              </div>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Growth Index</p>
            </div>
          </div>

          <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-3xl p-4 flex flex-col relative">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-4">
                <Activity className="w-12 h-12 animate-pulse text-emerald-500/50" />
                <p className="text-sm font-bold uppercase tracking-[0.3em]">Decoding Market Data...</p>
              </div>
            ) : historicalData.length > 0 ? (
              <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10 }}
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10 }}
                      orientation="right"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid #ffffff10', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isUp ? "#10b981" : "#f43f5e"} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-10">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                  <Activity className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Market Analytics Loaded</h3>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  Real-time deep analysis for <span className="text-emerald-400 font-bold">{ticker}</span> is being processed. 
                  View current metrics and cross-exchange indicators below.
                </p>
              </div>
            )}
            
            <div className={`mt-6 grid grid-cols-2 gap-4 w-full max-w-lg mx-auto ${historicalData.length === 0 ? '' : 'absolute bottom-8 left-1/2 -translate-x-1/2 z-10'}`}>
              <div className="p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">High ({timeframe})</p>
                <p className="text-lg font-mono font-bold text-white underline decoration-emerald-500/50">
                  {getCurrencySymbol(ticker)}{Math.max(...historicalData.map(d => d.price)).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Low ({timeframe})</p>
                <p className="text-lg font-mono font-bold text-white underline decoration-rose-500/50">
                  {getCurrencySymbol(ticker)}{Math.min(...historicalData.map(d => d.price)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#0c0c0d] border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Shield className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Market Cap</p>
                <p className="text-sm font-bold text-slate-200">{(Math.random() * 3).toFixed(2)}T</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Vol (24h)</p>
                <p className="text-sm font-bold text-slate-200">{(Math.random() * 10).toFixed(2)}M</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Exch. Region</p>
                <p className="text-sm font-bold text-slate-200 uppercase">{ticker.endsWith('.NS') ? 'APAC' : 'Global'}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-400 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-emerald-500/50 transition-all shadow-xl"
          >
            Close Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PriceAlertModal = ({ ticker, isOpen, onClose, onSetAlert }: { ticker: string | null, isOpen: boolean, onClose: () => void, onSetAlert: (buy: string, sell: string) => void }) => {
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  if (!isOpen || !ticker) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel w-full max-w-md overflow-hidden border-emerald-500/30"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight uppercase">Set Price Alert</h2>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{ticker}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Target Bullish Technical Signal</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">{getCurrencySymbol(ticker)}</span>
                <input 
                  type="number"
                  value={buyPrice}
                  onChange={e => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <p className="text-[9px] text-slate-600 mt-1">We'll notify you when price drops below this level.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Target Bearish Technical Signal</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">{getCurrencySymbol(ticker)}</span>
                <input 
                  type="number"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <p className="text-[9px] text-slate-600 mt-1">We'll notify you when price rises above this level.</p>
            </div>
          </div>

          <button 
            onClick={() => {
              onSetAlert(buyPrice, sellPrice);
              onClose();
            }}
            className="w-full bg-emerald-500 text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" /> Secure Price Alert
          </button>
          
          <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest">
            Alerts are processed with 0.1ms latency on our cloud infrastructure
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'markets' | 'portfolio' | 'alerts' | 'predictor' | 'watchlist' | 'settings' | 'legal' | 'chat'>('home');
  const [settingsTab, setSettingsTab] = useState('profile');
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(() => {
    return localStorage.getItem('omni_disclaimer_accepted') === 'true';
  });
  const [showDisclaimerPopup, setShowDisclaimerPopup] = useState(false);
  const [ticks, setTicks] = useState<Record<string, TickData>>({});
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [watchlists, setWatchlists] = useState<Watchlist[]>(() => {
    const saved = localStorage.getItem('omni_watchlists');
    if (saved) return JSON.parse(saved);
    // Migration for old single watchlist users
    const oldSaved = localStorage.getItem('omni_watchlist');
    if (oldSaved) {
      return [{ id: 'default', name: 'Main Watchlist', tickers: JSON.parse(oldSaved) }];
    }
    return [{ id: 'default', name: 'Main Watchlist', tickers: [] }];
  });
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('default');

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];

  useEffect(() => {
    localStorage.setItem('omni_watchlists', JSON.stringify(watchlists));
    // Send subscription update to WebSocket for ALL tickers in ALL watchlists
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const allTickers = Array.from(new Set(watchlists.flatMap(w => w.tickers)));
      wsRef.current.send(JSON.stringify({ type: 'SUBSCRIBE', tickers: allTickers }));
    }
  }, [watchlists]);

  const toggleWatchlist = (ticker: string, listId: string = activeWatchlistId) => {
    setWatchlists(prev => prev.map(w => {
      if (w.id === listId) {
        return {
          ...w,
          tickers: w.tickers.includes(ticker)
            ? w.tickers.filter(t => t !== ticker)
            : [...w.tickers, ticker]
        };
      }
      return w;
    }));
  };

  const createWatchlist = (name: string) => {
    const newId = Date.now().toString();
    setWatchlists(prev => [...prev, { id: newId, name, tickers: [] }]);
    setActiveWatchlistId(newId);
  };

  const deleteWatchlist = (id: string) => {
    if (watchlists.length <= 1) return;
    setWatchlists(prev => prev.filter(w => w.id !== id));
    if (activeWatchlistId === id) {
      setActiveWatchlistId(watchlists.find(w => w.id !== id)?.id || 'default');
    }
  };
  const [portfolio, setPortfolio] = useState<Array<{ id: string, ticker: string, exchange: string, qty: number, avgPrice: number }>>([]);
  const [priceAlerts, setPriceAlerts] = useState<Array<{ id: string, ticker: string, condition: string, value: number, exchange: string, active: boolean }>>([]);
  
  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
      try {
        const [portRes, alertsRes] = await Promise.all([
          fetch('/api/portfolio'),
          fetch('/api/alerts')
        ]);
        
        const portData = await portRes.json();
        const alertsData = await alertsRes.json();
        
        if (portData.portfolio) setPortfolio(portData.portfolio);
        if (alertsData.alerts) setPriceAlerts(alertsData.alerts);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };

    fetchData();
  }, []);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [tickerNews, setTickerNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [isDetailedChartOpen, setIsDetailedChartOpen] = useState(false);
  const [detailedChartTicker, setDetailedChartTicker] = useState<string | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertTicker, setAlertTicker] = useState<string | null>(null);
  const [targetBuyPrice, setTargetBuyPrice] = useState('');
  const [targetSellPrice, setTargetSellPrice] = useState('');
  const [hasNewAlert, setHasNewAlert] = useState(true);
  const [marketMood, setMarketMood] = useState<{ score: number, label: string } | null>(null);

  const fetchMarketMood = async () => {
    if (document.visibilityState !== 'visible') return; 
    try {
      const res = await fetch('/api/market-mood');
      const data = await res.json();
      setMarketMood({ score: data.score, label: data.label });
    } catch (err) {
      console.error("Error fetching market mood:", err);
    }
  };

  useEffect(() => {
    fetchMarketMood();
    const interval = setInterval(fetchMarketMood, 60 * 1000); // 60 seconds (Backend throttles via cached mood TTL)
    return () => clearInterval(interval);
  }, []);
  const getPortfolioCurrencySymbol = () => {
    const hasNSE = portfolio.some(p => p.ticker.endsWith('.NS') || p.exchange === 'NSE');
    const hasLSE = portfolio.some(p => p.ticker.endsWith('.L') || p.exchange === 'LSE');
    const hasUSD = portfolio.some(p => !p.ticker.endsWith('.NS') && !p.ticker.endsWith('.L') && p.exchange !== 'NSE' && p.exchange !== 'LSE');
    
    const symbols = [];
    if (hasNSE) symbols.push('₹');
    if (hasLSE) symbols.push('£');
    if (hasUSD) symbols.push('$');
    
    if (symbols.length > 1) return symbols.join(' / ');
    return symbols[0] || '$';
  };
  const trendingAssetsRef = useRef<Array<{ ticker: string, exchange: string }>>(DEFAULT_TRENDING);
  const [trendingAssets, setTrendingAssets] = useState<Array<{ ticker: string, exchange: string }>>(DEFAULT_TRENDING);

  useEffect(() => {
    trendingAssetsRef.current = trendingAssets;
  }, [trendingAssets]);

  const [lastTrendingUpdate, setLastTrendingUpdate] = useState<string>(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const heatmapTickers = [
        'AZN.L', 'HSBA.L', 'BP.L', 'SHEL.L', 'ULVR.L',
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS',
        'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'
      ];
      const allTickers = Array.from(new Set([
        ...watchlists.flatMap(w => w.tickers),
        ...trendingAssets.map(t => t.ticker),
        ...portfolio.map(p => p.ticker),
        ...Object.values(INDEX_SYMBOLS),
        ...heatmapTickers
      ]));
      wsRef.current.send(JSON.stringify({ type: 'SUBSCRIBE', tickers: allTickers }));
    }
  }, [watchlists, trendingAssets, portfolio]);

  useEffect(() => {
    const fetchTrending = async (retries = 3) => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/trending');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.trending && data.trending.length > 0) {
          setTrendingAssets(data.trending);
          setLastTrendingUpdate(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
      } catch (err) {
        console.error("Error fetching trending assets:", err);
        if (retries > 0) {
          console.log(`Retrying trending fetch... (${retries} left)`);
          setTimeout(() => fetchTrending(retries - 1), 2000);
        }
      }
    };

    fetchTrending();
    const trendingInterval = setInterval(fetchTrending, 300000); // Every 5 minutes
    return () => clearInterval(trendingInterval);
  }, []);

  useEffect(() => {
    if (!selectedTicker) return;
    
    const fetchNews = async (retries = 2) => {
      if (document.visibilityState !== 'visible') return;
      setLoadingNews(true);
      try {
        const res = await fetch(`/api/news/${selectedTicker}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.news) {
          setTickerNews(data.news);
        }
      } catch (err) {
        console.error("Error fetching news:", err);
        if (retries > 0) {
          console.log(`Retrying news fetch for ${selectedTicker}... (${retries} left)`);
          setTimeout(() => fetchNews(retries - 1), 2000);
        } else {
          setTickerNews([]); // Clear news only after all retries fail
        }
      } finally {
        setLoadingNews(false);
      }
    };

    fetchNews();
    const newsInterval = setInterval(fetchNews, 60000); // Update news every minute
    return () => clearInterval(newsInterval);
  }, [selectedTicker]);

  // AI Predictor States
  const [predictorTicker, setPredictorTicker] = useState('');
  const [predictorExchange, setPredictorExchange] = useState('');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loadingPredict, setLoadingPredict] = useState(false);

  // --- Lifted Account Settings State ---
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('omni_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Lithu Raju',
      email: 'lithinhraju3@gmail.com',
      bio: 'Quantitative trader focusing on high-frequency equity markets.',
      location: 'Bangalore, India',
      photo: null as string | null
    };
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('omni_notifications');
    return saved ? JSON.parse(saved) : {
      push: true,
      marketing: false,
      security: true,
      price: true,
      techGoldenCross: true,
      techRSI: true
    };
  });

  const [activeTechAlerts, setActiveTechAlerts] = useState<Record<string, any>>({});

  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('omni_preferences');
    return saved ? JSON.parse(saved) : {
      dark: true,
      fidelity: true,
      compact: false,
      professional: true
    };
  });

  const [securityData, setSecurityData] = useState(() => {
    const saved = localStorage.getItem('omni_security_data');
    return saved ? JSON.parse(saved) : {
      tfaEnabled: false
    };
  });

  useEffect(() => {
    localStorage.setItem('omni_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('omni_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('omni_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem('omni_security_data', JSON.stringify(securityData));
  }, [securityData]);

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const runAIPrediction = async () => {
    if (!predictorTicker || !predictorExchange) return;
    
    if (!hasAcceptedDisclaimer) {
      setShowDisclaimerPopup(true);
      return;
    }

    setLoadingPredict(true);
    try {
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Predict the stock performance for ${predictorTicker} on the ${predictorExchange} exchange. 
        Today's date is ${today}.
        Include:
        1. Growth prediction (will it grow or not, why?)
        2. Risk factor (low, medium, high with explanation)
        3. Timing (when is it expected to grow/move, specific date/time context if possible)
        4. Predicted Growth Date (A specific FUTURE date or narrow range AFTER ${today} when significant growth is forecasted to begin/occur. Do NOT provide past dates.)
        5. Predicted Growth Reasoning (An explanation of HOW this specific date was predicted.)
        6. Related recent news summary (at least 3 points)
        
        Return the response in JSON format matching this schema:
        {
          "growth": "string",
          "riskFactor": "string",
          "timing": "string",
          "predictedGrowthDate": "string",
          "predictedGrowthReasoning": "string",
          "news": ["string"],
          "confidence": number (0-100)
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              growth: { type: Type.STRING },
              riskFactor: { type: Type.STRING },
              timing: { type: Type.STRING },
              predictedGrowthDate: { type: Type.STRING },
              predictedGrowthReasoning: { type: Type.STRING },
              news: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER }
            },
            required: ["growth", "riskFactor", "timing", "predictedGrowthDate", "predictedGrowthReasoning", "news", "confidence"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setPrediction(result);
    } catch (error) {
      console.error("AI Prediction failed:", error);
    } finally {
      setLoadingPredict(false);
    }
  };
  
  // Refs for WebSocket handler to avoid stale closures
  const historyRef = useRef<Record<string, any[]>>({});
  const watchlistRef = useRef<string[]>([]);
  const allTickersRef = useRef<string[]>([]);
  const portfolioRef = useRef<Array<{ ticker: string, exchange: string, qty: number, avgPrice: number }>>([]);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    watchlistRef.current = activeWatchlist.tickers;
    allTickersRef.current = Array.from(new Set([
      ...watchlists.flatMap(w => w.tickers),
      ...trendingAssets.map(t => t.ticker),
      ...Object.values(INDEX_SYMBOLS)
    ]));
  }, [activeWatchlist, watchlists, trendingAssets]);

  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  const fetchTickerHistory = async (ticker: string) => {
    // Only fetch if history is missing or very small (just bootstrapped)
    if (historyRef.current[ticker] && historyRef.current[ticker].length > 26) return; 
    
    try {
      const res = await fetch(`/api/history/${ticker}`);
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        setHistory(prev => ({ ...prev, [ticker]: data.history }));
      } else {
        throw new Error("No history in response");
      }
    } catch (err) {
      console.error(`Error fetching history for ${ticker}:`, err);
      // Bootstrap with flat line as fallback for visibility
      const now = new Date();
      const bootstrap = [];
      const basePrice = ticker.endsWith('.NS') ? 2500 : 180;
      for (let i = 25; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000);
        bootstrap.push({ time: time.toLocaleTimeString(), price: basePrice });
      }
      setHistory(prev => ({ ...prev, [ticker]: bootstrap }));
    }
  };

  useEffect(() => {
    // Fetch history for all active tickers
    const allCurrentTickers = new Set([
      ...activeWatchlist.tickers,
      ...trendingAssets.map(t => t.ticker),
      ...portfolio.map(p => p.ticker)
    ]);
    
    allCurrentTickers.forEach(ticker => {
      fetchTickerHistory(ticker);
    });
  }, [activeWatchlist.tickers, trendingAssets, portfolio]);

  const [customTicker, setCustomTicker] = useState('');
  const [customExchange, setCustomExchange] = useState('');
  
  // New Stock Addition States
  const [newWatchTicker, setNewWatchTicker] = useState('');
  const [newWatchExchange, setNewWatchExchange] = useState('');
  const [newPortTicker, setNewPortTicker] = useState('');
  const [newPortExchange, setNewPortExchange] = useState('');
  const [newPortQty, setNewPortQty] = useState('');
  const [newPortPrice, setNewPortPrice] = useState('');

  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = { role: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...chatMessages, userMessage].map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        config: {
          systemInstruction: `You are Leo, LithuBroker's strictly educational market analysis AI. Your purpose is to provide pedagogical insights into market dynamics, technical patterns, and sentiment. You MUST NOT provide financial advice. At the end of every analysis, you MUST append this disclaimer verbatim: "Disclaimer: I am an AI providing educational insights and not certified financial advice."
 
 TERMS TO USE:
 - Instead of "Buy", use "Bullish Technical Signal".
 - Instead of "Sell", use "Bearish Technical Signal".
 
 LIVE CONTEXT:
 - Global Market Mood Sentiment Score: ${marketMood ? marketMood.score : '50'} (0-100 scale)
 - Current Sentiment Label: ${marketMood ? marketMood.label : 'NEUTRAL'}
 
 GUIDELINES:
 1. Always incorporate the Live Market Mood into your analysis from an educational perspective.
 2. PROACTIVE ALERTS: You are aware of these real-time technical alerts: ${Object.values(activeTechAlerts).length > 0 ? Object.values(activeTechAlerts).map(a => `${a.ticker}: ${a.message}`).join(' | ') : 'None currently detected'}.
 3. Use professional financial terminology while explaining concepts clearly for students of the market.
 4. Keep responses information-dense and academic in tone.`,
          tools: [{ googleSearch: {} }],
        }
      });

      const modelResponse = { role: 'model' as const, text: response.text || "I'm sorry, I couldn't process that request." };
      setChatMessages(prev => [...prev, modelResponse]);
    } catch (error) {
      console.error("Chat Error:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting to my brain right now. Please try again later." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIST = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { 
      timeZone: 'Asia/Kolkata', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const [showArch, setShowArch] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [isWeekend, setIsWeekend] = useState(false);
  const [marketStates, setMarketStates] = useState({ nse: false, nyse: false, lse: false });
  const marketStatesRef = useRef({ nse: false, nyse: false, lse: false });

  const getExchangeForTicker = useCallback((ticker: string) => {
    if (ticker.endsWith('.NS') || ticker.endsWith('.BO') || ticker.startsWith('^NSE') || ticker.startsWith('^BSESN')) return 'nse';
    if (ticker.endsWith('.L') || ticker === '^FTSE') return 'lse';
    return 'nyse';
  }, []);

  const [alerts, setAlerts] = useState([
    { id: 1, type: 'price', ticker: 'AAPL', message: 'Price target of $190.00 reached.', time: '10m ago', severity: 'high' },
    { id: 2, type: 'volatility', ticker: 'TSLA', message: 'High volatility detected. Price swung 3% in 5 minutes.', time: '45m ago', severity: 'medium' },
    { id: 3, type: 'news', ticker: 'NVDA', message: 'Breaking: New high-performance chip architecture announced.', time: '2h ago', severity: 'low' },
    { id: 4, type: 'system', ticker: 'MARKET', message: 'NYSE opening bell in 15 minutes.', time: '3h ago', severity: 'low' },
    { id: 5, type: 'volatility', ticker: 'RELIANCE', message: 'Unusual options activity detected in RELIANCE.', time: '6h ago', severity: 'high' }
  ]);

  const addRandomAlert = () => {
    const tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'RELIANCE', 'TCS'];
    const types = ['price', 'volatility', 'news', 'system'];
    const severities = ['high', 'medium', 'low'] as const;
    const messages = [
      'Significant price breakout detected.',
      'Unusual trading volume observed.',
      'Quarterly earnings report released.',
      'New product launch announcement.',
      'Market sentiment shifting to bullish.',
      'Technical support level breached.'
    ];

    const newAlert = {
      id: Date.now(),
      ticker: tickers[Math.floor(Math.random() * tickers.length)],
      type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      time: 'Just now'
    };

    setAlerts(prev => [newAlert, ...prev]);
  };

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Subscribe to all tickers across all watchlists and trending assets
      const allTickers = Array.from(new Set([
        ...watchlists.flatMap(w => w.tickers),
        ...trendingAssets.map(t => t.ticker),
        ...Object.values(INDEX_SYMBOLS)
      ]));
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', tickers: allTickers }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'TICK') {
        setIsMarketOpen(msg.isMarketOpen);
        if (msg.isWeekend !== undefined) setIsWeekend(msg.isWeekend);
        if (msg.marketStates) {
          setMarketStates(msg.marketStates);
          marketStatesRef.current = msg.marketStates;
        }
        
        // If market is closed, we still update ticks (for the price display) 
        // but we might want to skip history updates to "stop" the chart movement
        setTicks(prev => {
          const newTicks = { ...prev };
          const newHistoryUpdates: Record<string, any[]> = {};

          // Helper to update history with bootstrap if needed
          const updateHistory = (ticker: string, price: number) => {
            const h = historyRef.current[ticker] || [];
            const now = new Date();
            
            if (h.length === 0) {
              // Bootstrap history with flat line if empty
              const bootstrap = [];
              for (let i = 25; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 60000);
                bootstrap.push({ time: time.toLocaleTimeString(), price: price });
              }
              newHistoryUpdates[ticker] = bootstrap;
            } else {
              // Always update even if market is closed, to ensure charts are "live" or at least visible
              // If market is closed, we just append the same price (flat line)
              const lastPoint = h[h.length - 1];
              const timeStr = now.toLocaleTimeString();
              
              // Only add if time is different or it's been a while, to prevent too many points
              if (lastPoint.time !== timeStr) {
                newHistoryUpdates[ticker] = [...h, { time: timeStr, price: price }].slice(-30);
              }
            }
          };

          // Process server ticks
          msg.data.forEach((t: TickData) => {
            const exchange = getExchangeForTicker(t.ticker);
            const isExchangeOpen = msg.marketStates ? msg.marketStates[exchange as keyof typeof msg.marketStates] : msg.isMarketOpen;
            
            newTicks[t.ticker] = t;
            
            // Only update historical data for graphs if the market is actually open
            if (isExchangeOpen) {
              updateHistory(t.ticker, t.price);
            }
          });

          // Simulate custom ticks for watchlist/portfolio items not in server stream
          const allTickers = Array.from(new Set([
            ...allTickersRef.current, 
            ...portfolioRef.current.map(p => p.ticker),
            ...trendingAssetsRef.current.map(t => t.ticker)
          ]));
          
          allTickers.forEach(ticker => {
            if (!newTicks[ticker]) {
              const current = prev[ticker] || { ticker, price: 100 + Math.random() * 50, change: 0, timestamp: new Date().toISOString() };
              
              const exchange = getExchangeForTicker(ticker);
              const isExchangeOpen = msg.marketStates ? msg.marketStates[exchange as keyof typeof msg.marketStates] : msg.isMarketOpen;
              
              // Only move price if its specific market is open
              const change = isExchangeOpen ? (Math.random() - 0.5) * 2 : 0;
              const newPrice = parseFloat((current.price + change).toFixed(2));
              
              newTicks[ticker] = {
                ticker,
                price: newPrice,
                change: parseFloat(change.toFixed(2)),
                timestamp: new Date().toISOString()
              };

              updateHistory(ticker, newPrice);
            }
          });

          if (Object.keys(newHistoryUpdates).length > 0) {
            setHistory(hPrev => ({ ...hPrev, ...newHistoryUpdates }));
          }

          return newTicks;
        });
      } else if (msg.type === 'TECH_ALERT') {
        const { alertType, message, ticker } = msg.data;
        const config = notificationsRef.current;
        
        const isEnabled = (alertType === 'GOLDEN_CROSS' && config.techGoldenCross) ||
                          (alertType === 'RSI_OVERSOLD' && config.techRSI);
        
        if (isEnabled) {
          showToast(message, 'info');
          setAlerts(prev => [{ ...msg.data, type: 'tech' }, ...prev].slice(0, 50));
          setActiveTechAlerts(prev => ({ ...prev, [ticker]: msg.data }));
          setHasNewAlert(true);
        }
      } else if (msg.type === 'PORTFOLIO_UPDATE') {
        setPortfolio(msg.portfolio);
        showToast('Portfolio updated by a collaborator', 'info');
      } else if (msg.type === 'PRICE_ALERT') {
        const alertData = { ...msg.data, type: 'price' };
        setAlerts(prev => [alertData, ...prev].slice(0, 50));
        showToast(`PRICE ALERT: ${msg.data.message}`, 'error');
        setHasNewAlert(true);
      }
    };

    return () => ws.close();
  }, []);

  // Client-side simulation of live price action for ultra-low latency feel across all tabs/views
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      // We only simulate if the tab is visible to save resources
      if (document.visibilityState !== 'visible' || !isMarketOpen) return;

      setTicks(prev => {
        const newTicks = { ...prev };
        const newHistoryUpdates: Record<string, any[]> = {};
        let hasChanges = false;

        Object.keys(prev).forEach(ticker => {
          const exchange = getExchangeForTicker(ticker);
          const isExchangeOpen = marketStatesRef.current[exchange as keyof typeof marketStatesRef.current];
          
          if (!isExchangeOpen) return;

          const current = prev[ticker];
          // Very small random nudge (approx 0.01%)
          const nudge = (Math.random() - 0.5) * (current.price * 0.0002);
          const newPrice = parseFloat((current.price + nudge).toFixed(2));
          
          if (newPrice !== current.price) {
            hasChanges = true;
            newTicks[ticker] = {
              ...current,
              price: newPrice,
              timestamp: new Date().toISOString()
            };

            // Update history for the live charts
            const h = historyRef.current[ticker] || [];
            if (h.length > 0) {
              const now = new Date();
              const timeStr = now.toLocaleTimeString();
              const lastPoint = h[h.length - 1];
              
              // Only push to history if it's a new second to avoid clogging the data
              if (lastPoint.time !== timeStr) {
                newHistoryUpdates[ticker] = [...h, { time: timeStr, price: newPrice }].slice(-40);
              }
            }
          }
        });

        if (Object.keys(newHistoryUpdates).length > 0) {
          setHistory(hPrev => ({ ...hPrev, ...newHistoryUpdates }));
        }

        return hasChanges ? newTicks : prev;
      });
    }, 1500); // Pulse every 1.5 seconds

    return () => clearInterval(simulationInterval);
  }, [isMarketOpen]);

  // Market Mood simulation for "live" feel
  useEffect(() => {
    const moodSimulation = setInterval(() => {
      if (!isMarketOpen || !marketMood) return;
      
      setMarketMood(prev => {
        if (!prev) return null;
        // Jiggle the mood score slightly (+/- 0.05) to show activity
        const drift = (Math.random() - 0.5) * 0.1;
        const newScore = Math.min(100, Math.max(0, parseFloat((prev.score + drift).toFixed(2))));
        
        // Update label if score crossing major thresholds
        let label = prev.label;
        if (newScore > 80) label = "EXTREME GREED";
        else if (newScore > 60) label = "GREED";
        else if (newScore > 40) label = "NEUTRAL";
        else if (newScore > 20) label = "FEAR";
        else label = "EXTREME FEAR";

        return {
          ...prev,
          score: newScore,
          label
        };
      });
    }, 5000); // Pulse every 5 seconds
    
    return () => clearInterval(moodSimulation);
  }, [isMarketOpen, !!marketMood]);

  const [newAlertTicker, setNewAlertTicker] = useState('');
  const [newAlertValue, setNewAlertValue] = useState('');
  const [newAlertCondition, setNewAlertCondition] = useState<'price_below' | 'price_above'>('price_below');
  const [newAlertExchange, setNewAlertExchange] = useState('NSE');

  const addPriceAlert = async () => {
    if (!newAlertTicker || !newAlertValue) return;
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: newAlertTicker,
          exchange: newAlertExchange,
          condition: newAlertCondition,
          value: parseFloat(newAlertValue),
          email: profile.email // Pass the email from public profile
        })
      });
      const data = await res.json();
      if (data.success) {
        setPriceAlerts(prev => [...prev, data.alert]);
        showToast(`Price alert set for ${newAlertTicker} (Email: ${profile.email})`, 'success');
        setNewAlertTicker(''); setNewAlertValue('');
      }
    } catch (err) {
      console.error("Error adding alert:", err);
      showToast('Failed to set alert', 'error');
    }
  };

  const removePriceAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPriceAlerts(prev => prev.filter(a => a.id !== id));
        showToast('Alert removed', 'info');
      }
    } catch (err) {
      console.error("Error removing alert:", err);
    }
  };
    
  const renderContent = (isPro: boolean = false) => {
    if (showArch) return <ArchitectureDoc key="arch-doc" />;

    switch (activeTab) {
      case 'markets':
        const trendingTickers = trendingAssets.slice(0, 3).map(t => t.ticker);
        return (
          <div key="markets-view" className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <MarketMoodGauge mood={marketMood} />
              </div>
              
              <div className="lg:col-span-3">
                <div className="glass-panel p-6 h-full flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold font-mono text-white tracking-tight uppercase">Live Market Feed</h3>
                    <div className="flex flex-col md:flex-row items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${marketStates.nse ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                        <span className={`text-[10px] font-bold ${marketStates.nse ? 'text-emerald-400' : 'text-slate-500'}`}>NSE</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${marketStates.nyse ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                        <span className={`text-[10px] font-bold ${marketStates.nyse ? 'text-emerald-400' : 'text-slate-500'}`}>NYSE</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${marketStates.lse ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                        <span className={`text-[10px] font-bold ${marketStates.lse ? 'text-emerald-400' : 'text-slate-500'}`}>LSE</span>
                      </div>
                      <div className={`flex items-center gap-2 text-[10px] font-bold ${isMarketOpen ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'} px-3 py-1.5 rounded-full border ml-2`}>
                        <div className={`w-1 h-1 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {isMarketOpen ? 'FEED ACTIVE' : 'MARKET CLOSED'}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                    Aggregated real-time data from global exchanges. Our sentiment engine scans thousands of headlines every 10 minutes to calculate the "Market Mood" — a key indicator for institutional-grade decision making.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(INDEX_SYMBOLS).map(([name, ticker]) => {
                const tick = ticks[ticker] || { price: name.includes('Nifty') ? 22453.20 : 5137.08, change: 0 };
                return (
                  <div key={`market-index-${name}`} className="glass-panel p-5 border-white/5 hover:border-white/10 transition-all">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{name}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-bold text-white tracking-tighter">
                        {tick.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs font-bold ${tick.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tick.change >= 0 ? '+' : ''}{tick.change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Regional Heatmap Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                Regional Performance (Top 5)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { region: 'India', tickers: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS'] },
                  { region: 'USA', tickers: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'] },
                  { region: 'UK', tickers: ['AZN.L', 'HSBA.L', 'BP.L', 'SHEL.L', 'ULVR.L'] }
                ].map(grp => (
                  <div key={grp.region} className="glass-panel p-6 bg-white/[0.02]">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 tracking-[0.2em]">{grp.region} Markets</h4>
                    <div className="space-y-2">
                      {grp.tickers.map(sym => {
                        const tick = ticks[sym] || { price: 0, change: 0 };
                        return (
                          <div key={`heatmap-${sym}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className={`w-1 h-8 rounded-full ${tick.change >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className="text-sm font-bold text-white uppercase">{sym.split('.')[0]}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-mono font-bold text-white">{getCurrencySymbol(sym)}{tick.price.toLocaleString()}</p>
                              <p className={`text-[10px] font-bold ${tick.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {tick.change >= 0 ? '+' : ''}{tick.change}%
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Companies Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Trending Companies
                </h3>
                <button className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">View All Trends →</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trendingTickers.map(ticker => {
                  const tick = ticks[ticker] || { price: 0, change: 0 };
                  const data = history[ticker] || [];
                  return (
                    <div key={`trending-chart-${ticker}`} className="glass-panel p-0 overflow-hidden flex flex-col h-64 group">
                      <div className="p-5 flex justify-between items-start shrink-0">
                        <div>
                          <h4 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{ticker}</h4>
                          <p className="text-xs text-slate-500 font-medium">Market Leader</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{getCurrencySymbol(ticker)}{tick.price.toFixed(2)}</p>
                          <p className={`text-xs font-bold ${tick.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tick.change >= 0 ? '+' : ''}{tick.change}%
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        <StockChart 
                          data={data} 
                          color={tick.change >= 0 ? '#10b981' : '#f43f5e'} 
                        />
                      </div>
                      <div className="p-3 bg-white/5 border-t border-white/5 flex justify-between items-center shrink-0">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Volatility: Low</span>
                        <button 
                          onClick={() => {
                            if (!activeWatchlist.tickers.includes(ticker)) {
                              toggleWatchlist(ticker);
                            }
                          }}
                          className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest"
                        >
                          + Add to {activeWatchlist.name}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Layout className="w-4 h-4 text-slate-400" />
                Market Heatmap
              </h3>
              <div className="grid grid-cols-5 gap-2 h-48">
                {Object.values(ticks).map((tick, i) => (
                  <button 
                    key={`heatmap-cell-${tick.ticker}`} 
                    onClick={() => {
                      if (!activeWatchlist.tickers.includes(tick.ticker)) {
                        toggleWatchlist(tick.ticker);
                      }
                    }}
                    className={`rounded flex items-center justify-center text-[10px] font-bold transition-all hover:scale-105 cursor-pointer ${tick.change >= 0 ? 'bg-emerald-500/40 text-emerald-400' : 'bg-rose-500/40 text-rose-400'}`}
                    title={`Click to add ${tick.ticker} to ${activeWatchlist.name}`}
                  >
                    {tick.ticker.split('.')[0]}
                  </button>
                ))}
                {Array.from({ length: Math.max(0, 15 - Object.keys(ticks).length) }).map((_, i) => (
                  <div key={`heatmap-empty-${i}`} className="rounded bg-white/5 border border-white/5" />
                ))}
              </div>
            </div>
          </div>
        );
      case 'watchlist':
        return (
          <div key="watchlist-view" className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{activeWatchlist.name}</h2>
                <p className="text-slate-400 text-sm">Monitor your selected assets in real-time</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-2 bg-white/5 rounded-lg border border-white/10">{activeWatchlist.tickers.length} Assets Monitored</span>
              </div>
            </div>

            {activeWatchlist.tickers.length === 0 ? (
              <div className="text-center py-24 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <h3 className="text-lg font-bold text-white mb-2">Your watchlist is empty</h3>
                <p className="max-w-xs mx-auto text-sm">Add assets from the Markets tab or use the Quick Add tool in the sidebar to start monitoring.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeWatchlist.tickers.map(ticker => {
                  const tick = ticks[ticker];
                  const data = history[ticker] || [];
                  return (
                    <div 
                      key={`watchlist-tab-${ticker}`}
                      className="glass-panel p-0 overflow-hidden group border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col h-72"
                    >
                      <div className="p-5 flex justify-between items-start shrink-0">
                        <div className="cursor-pointer" onClick={() => setSelectedTicker(ticker)}>
                          <h4 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{ticker}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live Feed</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">
                            {getCurrencySymbol(ticker)}{tick?.price?.toFixed(2) || '---'}
                          </p>
                          <p className={`text-xs font-bold ${tick?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tick?.change > 0 ? '+' : ''}{tick?.change?.toFixed(2) || '0.00'}%
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 px-2">
                        <StockChart 
                          data={data} 
                          color={tick?.change >= 0 ? '#10b981' : '#f43f5e'} 
                        />
                      </div>
                      <div className="p-4 bg-white/5 border-t border-white/5 flex justify-between items-center shrink-0">
                        <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Volatility</span>
                            <span className="text-[10px] text-white font-bold">Medium</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Signal</span>
                            <span className="text-[10px] text-emerald-400 font-bold">Strong Bullish Technical Signal</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleWatchlist(ticker)}
                          className="p-2 text-slate-500 hover:text-rose-400 transition-colors bg-white/5 rounded-lg border border-white/5"
                          title="Remove from Watchlist"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'portfolio':
        const totalBalance = portfolio.reduce((acc, p) => acc + (p.qty * (ticks[p.ticker]?.price || p.avgPrice)), 0);
        const totalCost = portfolio.reduce((acc, p) => acc + (p.qty * p.avgPrice), 0);
        const totalPnL = totalBalance - totalCost;
        const pnlPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

        return (
          <div key="portfolio-view" className="p-8 space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">Portfolio Analysis</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time valuation active</span>
              </div>
            </div>

            {/* Top-Level Portfolio Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 bg-white/[0.02] border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CreditCard className="w-12 h-12 text-white" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Total Invested Amount</p>
                <h3 className="text-3xl font-mono font-bold text-white tracking-tighter">
                  {getPortfolioCurrencySymbol()}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <div className="mt-4 h-1 w-12 bg-slate-500/20 rounded-full" />
              </div>

              <div className="glass-panel p-6 bg-white/[0.03] border-emerald-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Layers className="w-12 h-12 text-emerald-500" />
                </div>
                <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-2">Current Portfolio Value</p>
                <h3 className="text-3xl font-mono font-bold text-white tracking-tighter">
                  {getPortfolioCurrencySymbol()}{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Live Value Refresh: 0.1s</p>
              </div>

              <div className="glass-panel p-6 bg-white/[0.02] border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className={`w-12 h-12 ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Overall ROI (%)</p>
                <div className="flex items-baseline gap-2">
                  <h3 className={`text-4xl font-mono font-bold tracking-tighter ${pnlPercent > 0 ? 'text-green-400' : pnlPercent < 0 ? 'text-red-400' : 'text-white'}`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </h3>
                </div>
                <p className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${totalPnL >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                  {totalPnL >= 0 ? 'Profit' : 'Loss'}: {getPortfolioCurrencySymbol()}{Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Add Holding Form */}
            <div className="glass-panel p-6 bg-emerald-500/5 border-emerald-500/20">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Add New Holding</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <input 
                  type="text" placeholder="Ticker (e.g. SUZLON)" value={newPortTicker} onChange={e => setNewPortTicker(e.target.value.toUpperCase())}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                />
                <select 
                  value={newPortExchange} 
                  onChange={e => setNewPortExchange(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-slate-300"
                >
                  <option value="NYSE">NYSE</option>
                  <option value="NASDAQ">NASDAQ</option>
                  <option value="NSE">NSE (India)</option>
                  <option value="BSE">BSE (India)</option>
                </select>
                <input 
                  type="number" placeholder="Qty" value={newPortQty} onChange={e => setNewPortQty(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                />
                <div className="relative group/price">
                  <input 
                    type="number" placeholder="Avg Price" value={newPortPrice} onChange={e => setNewPortPrice(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                  />
                  {ticks[newPortTicker] && (
                    <button 
                      onClick={() => setNewPortPrice(ticks[newPortTicker].price.toString())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-all"
                    >
                      Use Live: {ticks[newPortTicker].price.toFixed(2)}
                    </button>
                  )}
                  {newPortExchange === 'NSE' && !newPortTicker.includes('.') && ticks[`${newPortTicker}.NS`] && (
                    <button 
                      onClick={() => {
                        setNewPortTicker(`${newPortTicker}.NS`);
                        setNewPortPrice(ticks[`${newPortTicker}.NS`].price.toString());
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/30 hover:bg-sky-500 hover:text-black transition-all"
                    >
                      Use .NS: {ticks[`${newPortTicker}.NS`].price.toFixed(2)}
                    </button>
                  )}
                </div>
                <button 
                  onClick={async () => {
                    if (!newPortTicker || !newPortQty || !newPortPrice) return;
                    
                    try {
                      const res = await fetch('/api/portfolio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ticker: newPortTicker,
                          exchange: newPortExchange || 'NYSE',
                          qty: parseFloat(newPortQty),
                          avgPrice: parseFloat(newPortPrice)
                        })
                      });
                      const data = await res.json();
                      if (data.success) {
                        showToast(`Successfully added ${newPortTicker} to portfolio`, 'success');
                        setNewPortTicker(''); setNewPortExchange(''); setNewPortQty(''); setNewPortPrice('');
                      } else {
                        showToast(data.error || 'Failed to add holding', 'error');
                      }
                    } catch (err) {
                      console.error("Add holding error:", err);
                      showToast('Network error while adding holding', 'error');
                    }
                  }}
                  className="bg-emerald-500 text-black rounded-lg font-bold text-xs hover:bg-emerald-400 transition-colors"
                >
                  Add Holding
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel p-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 text-center">A: Capital Allocation (Principal)</h3>
                <div className="h-[250px] w-full">
                  {portfolio.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolio.map(p => ({
                            name: p.ticker,
                            value: p.qty * p.avgPrice
                          }))}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          {portfolio.map((p, index) => (
                            <Cell key={`cell-a-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="glass-panel p-6 relative">
                <div className="absolute top-4 right-4 flex items-center gap-1 text-[8px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full" /> Live
                </div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 text-center">B: Market Exposure (Current)</h3>
                <div className="h-[250px] w-full">
                  {portfolio.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolio.map(p => ({
                            name: p.ticker,
                            value: p.qty * (ticks[p.ticker]?.price || p.avgPrice)
                          }))}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          {portfolio.map((p, index) => (
                            <Cell key={`cell-b-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div key="chat-view" className="flex flex-col h-full max-w-5xl mx-auto p-4 md:p-8 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Leo AI</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Master Market Analyst</p>
                </div>
              </div>
              
              <div className="flex-1 max-w-xs md:ml-auto">
                {marketMood && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Live Market Mood</p>
                      <p className={`text-xs font-black uppercase ${marketMood.score > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{marketMood.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-white leading-none">{marketMood.score}</p>
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-1 rounded-full ${i < (marketMood.score / 20) ? (marketMood.score > 50 ? 'bg-emerald-500' : (marketMood.score < 40 ? 'bg-rose-500' : 'bg-amber-500')) : 'bg-slate-800'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <Bot className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-2">How can I help you today?</h3>
                    <p className="text-sm text-slate-400">Ask me anything about stocks, analysis, or market trends. I'm here to provide professional insights.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md pt-8">
                    {[
                      "What is a P/E ratio?",
                      "Trend analysis for NVDA",
                      "How to read a candle chart?",
                      "What are dividends?"
                    ].map((suggestion, idx) => (
                      <button 
                        key={`chat-suggest-${idx}`}
                        onClick={() => setChatInput(suggestion)}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400 hover:text-white hover:border-emerald-500/30 transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`chat-msg-${i}`} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.role === 'user' 
                        ? 'bg-emerald-500 text-black font-medium' 
                        : 'bg-white/5 border border-white/10 text-slate-200'
                    }`}>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Analyzing market data...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 relative">
              <input 
                type="text" 
                placeholder="Ask about the market..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-16 text-white focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all shadow-2xl"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:bg-slate-700 text-black rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-5 h-5 font-bold" />
              </button>
            </div>
          </div>
        );
      case 'predictor':
        return (
          <div key="predictor-view" className="p-8 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">AI Stock Predictor</h2>
                </div>
                <p className="text-slate-400 max-w-md">Enter a company and exchange to generate a deep-learning based performance forecast.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                <div className="flex flex-col gap-1 px-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ticker Symbol</label>
                  <input 
                    type="text" 
                    placeholder="e.g. AAPL"
                    value={predictorTicker}
                    onChange={e => setPredictorTicker(e.target.value.toUpperCase())}
                    className="bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-700"
                  />
                </div>
                <div className="w-px bg-white/10 hidden sm:block" />
                <div className="flex flex-col gap-1 px-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exchange</label>
                  <input 
                    type="text" 
                    placeholder="e.g. NASDAQ"
                    value={predictorExchange}
                    onChange={e => setPredictorExchange(e.target.value.toUpperCase())}
                    className="bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-700"
                  />
                </div>
                <button 
                  onClick={runAIPrediction}
                  disabled={loadingPredict || !predictorTicker || !predictorExchange}
                  className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingPredict ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      Generate Forecast
                    </>
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {prediction ? (
                <motion.div 
                  key="prediction-result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confidence Score</span>
                          <span className="text-2xl font-bold text-emerald-400">{prediction.confidence}%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Growth Prediction
                          </h3>
                          <div className="text-lg text-white leading-relaxed">
                            <Markdown>{prediction.growth}</Markdown>
                          </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Activity className="w-4 h-4" /> Expected Timing
                            </h3>
                            <p className="text-white font-medium">{prediction.timing}</p>
                          </div>
                          
                          <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <TrendingUp className="w-3 h-3" /> Predicted Growth Date
                            </h3>
                            <p className="text-xl font-bold text-white">{prediction.predictedGrowthDate}</p>
                          </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-6">
                          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Info className="w-3 h-3" /> Prediction Basis (Reasoning)
                          </h3>
                          <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-emerald-500/30 pl-3">
                            {prediction.predictedGrowthReasoning}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel p-8">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Related Market Intelligence
                      </h3>
                      <div className="space-y-4">
                        {prediction.news.map((item, i) => (
                          <div key={`pred-news-${i}`} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-emerald-400 font-bold text-xs">{i + 1}</span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="glass-panel p-8 border-l-4 border-l-amber-500 bg-amber-500/5">
                      <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Risk Assessment
                      </h3>
                      <p className="text-white text-sm leading-relaxed">{prediction.riskFactor}</p>
                    </div>

                    <div className="glass-panel p-8 bg-emerald-500/5 border border-emerald-500/20">
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Quick Action</h3>
                      <p className="text-xs text-slate-400 mb-6">Based on this analysis, would you like to add {predictorTicker} to your {activeWatchlist.name}?</p>
                      <button 
                        onClick={() => {
                          if (!activeWatchlist.tickers.includes(predictorTicker)) {
                            toggleWatchlist(predictorTicker);
                          }
                          setActiveTab('home');
                        }}
                        className="w-full bg-emerald-500 text-black py-3 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add to {activeWatchlist.name}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty-predictor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center space-y-6"
                >
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <Cpu className="w-12 h-12 text-slate-700" />
                  </div>
                  <div className="max-w-sm">
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Predict</h3>
                    <p className="text-slate-500 text-sm">Enter a ticker and exchange above to generate an AI-powered market forecast.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'alerts':
        return (
          <div key="alerts-view" className="p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Market Alerts</h2>
                <p className="text-slate-400">Real-time volatility and price target notifications</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setAlerts([])}
                  className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  Clear History
                </button>
              </div>
            </div>

            {/* Custom Price Alert Creator */}
            <div className="glass-panel p-6 border-emerald-500/20 bg-emerald-500/[0.02]">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Create New Price Alert
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <input 
                  type="text" placeholder="Ticker (e.g. TATASTEEL)" value={newAlertTicker} onChange={e => setNewAlertTicker(e.target.value.toUpperCase())}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                />
                <select 
                  value={newAlertExchange} 
                  onChange={e => setNewAlertExchange(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-slate-300"
                >
                  <option value="NSE">NSE (India)</option>
                  <option value="BSE">BSE (India)</option>
                  <option value="NYSE">NYSE</option>
                  <option value="NASDAQ">NASDAQ</option>
                </select>
                <select 
                  value={newAlertCondition} 
                  onChange={e => setNewAlertCondition(e.target.value as any)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-slate-300"
                >
                  <option value="price_below">Price Falls Below</option>
                  <option value="price_above">Price Rises Above</option>
                </select>
                <input 
                  type="number" placeholder="Target Price" value={newAlertValue} onChange={e => setNewAlertValue(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                />
                <button 
                  onClick={addPriceAlert}
                  className="bg-emerald-500 text-black rounded-lg font-bold text-xs hover:bg-emerald-400 transition-colors"
                >
                  Set Alert
                </button>
              </div>
            </div>

            {/* Active Price Alerts Monitoring List */}
            {priceAlerts.length > 0 && (
              <div className="glass-panel p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Active Monitoring</h3>
                <div className="space-y-2">
                  {priceAlerts.map(alert => (
                    <div key={`active-alert-${alert.id}`} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${alert.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                        <div>
                          <span className="font-bold text-white tracking-wide">{alert.ticker}</span>
                          <span className="text-[10px] text-slate-500 ml-2 uppercase">{alert.exchange}</span>
                        </div>
                        <div className="text-xs text-slate-400 border-l border-white/10 pl-4 flex items-center gap-2">
                          {alert.condition === 'price_below' ? 'Falls below' : 'Rises above'} <span className="font-mono text-white ml-1">{getCurrencySymbol(alert.ticker, alert.exchange)}{alert.value.toFixed(2)}</span>
                          {(alert as any).email && (
                            <span title={`Email notifications active for ${(alert as any).email}`}>
                              <Mail className="w-3 h-3 text-emerald-400" />
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => removePriceAlert(alert.id)}
                        className="p-1 hover:text-rose-400 text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-panel p-4 flex flex-wrap items-center gap-8 border-white/5 bg-emerald-500/5 mt-8">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setNotifications(prev => ({ ...prev, techGoldenCross: !prev.techGoldenCross }))}
                  className={`w-10 h-5 rounded-full transition-all relative ${notifications.techGoldenCross ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifications.techGoldenCross ? 'right-1' : 'left-1'}`} />
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Golden Cross</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">SMA 50/200 Monitoring</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 border-l border-white/10 pl-8">
                <button 
                  onClick={() => setNotifications(prev => ({ ...prev, techRSI: !prev.techRSI }))}
                  className={`w-10 h-5 rounded-full transition-all relative ${notifications.techRSI ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifications.techRSI ? 'right-1' : 'left-1'}`} />
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Oversold RSI</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">Relative Strength &lt; 30</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-slate-500 text-sm">No active alerts. Click "New Alert" to simulate one.</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={`alert-${alert.id}`} className={`glass-panel p-5 flex items-start gap-4 border-l-4 ${alert.severity === 'high' ? 'border-l-rose-500 bg-rose-500/5' : alert.severity === 'medium' ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-emerald-500 bg-emerald-500/5'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === 'high' ? 'bg-rose-500/20 text-rose-400' : alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {alert.type === 'price' ? <TrendingUp className="w-5 h-5" /> : alert.type === 'volatility' ? <Activity className="w-5 h-5" /> : alert.type === 'news' ? <Globe className="w-5 h-5" /> : alert.type === 'tech' ? <Zap className="w-5 h-5 text-amber-400" /> : <Bell className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white flex items-center gap-2">
                          {alert.ticker} <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 uppercase">{alert.type}</span>
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium">{alert.time}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{alert.message}</p>
                    </div>
                    <button 
                      onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-12 p-8 border-2 border-dashed border-white/5 rounded-3xl text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-8 h-8 text-slate-600" />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="text-white font-bold">Smart Notifications</h3>
                <p className="text-xs text-slate-500 mt-2">Configure the engine to send you push notifications when specific market conditions are met.</p>
              </div>
              <button 
                onClick={() => {
                  setSettingsTab('notifications');
                  setActiveTab('settings');
                }}
                className="text-emerald-400 text-xs font-bold hover:underline"
              >
                Configure Alerts →
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <AccountSettings 
            key="settings-view"
            profile={profile}
            setProfile={setProfile}
            notifications={notifications}
            setNotifications={setNotifications}
            preferences={preferences}
            setPreferences={setPreferences}
            securityData={securityData}
            setSecurityData={setSecurityData}
            showToast={showToast}
            initialTab={settingsTab}
          />
        );
      case 'legal':
        return <LegalCompliance key="legal-view" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0A0A0B]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => { setActiveTab('home'); setShowArch(false); }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Zap className="text-black w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">LithuBroker</span>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-full ml-2">Paper Trading & Educational Sandbox</span>
          </button>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <button 
              onClick={() => { setActiveTab('markets'); setShowArch(false); }}
              className={`hover:text-white transition-colors ${activeTab === 'markets' ? 'text-white' : ''}`}
            >
              Markets
            </button>
            <button 
              onClick={() => { setActiveTab('watchlist'); setShowArch(false); }}
              className={`hover:text-white transition-colors ${activeTab === 'watchlist' ? 'text-white' : ''}`}
            >
              Watchlist
            </button>
            <button 
              onClick={() => { setActiveTab('portfolio'); setShowArch(false); }}
              className={`hover:text-white transition-colors ${activeTab === 'portfolio' ? 'text-white' : ''}`}
            >
              Portfolio
            </button>
            <button 
              onClick={() => { setActiveTab('predictor'); setShowArch(false); }}
              className={`flex items-center gap-1 hover:text-emerald-400 transition-colors ${activeTab === 'predictor' ? 'text-emerald-400' : ''}`}
            >
              <Cpu className="w-4 h-4" /> AI Predictor
            </button>
            <button 
              onClick={() => { setActiveTab('chat'); setShowArch(false); }}
              className={`flex items-center gap-1 hover:text-emerald-400 transition-colors ${activeTab === 'chat' ? 'text-emerald-400' : ''}`}
            >
              <MessageSquare className="w-4 h-4" /> Leo
            </button>
            <button 
              onClick={() => { setActiveTab('alerts'); setShowArch(false); }}
              className={`hover:text-white transition-colors flex items-center gap-2 ${activeTab === 'alerts' ? 'text-white' : ''}`}
            >
              Market Alerts
              {Object.keys(activeTechAlerts).length > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[8px] font-black rounded-lg animate-pulse">ACTIVE</span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('legal'); setShowArch(false); }}
              className={`flex items-center gap-1 hover:text-emerald-400 transition-colors ${activeTab === 'legal' ? 'text-emerald-400' : ''}`}
            >
              <Shield className="w-4 h-4" /> Legal
            </button>
            <button 
              onClick={() => setShowArch(!showArch)}
              className={`flex items-center gap-1 hover:text-emerald-400 transition-colors ${showArch ? 'text-emerald-400' : ''}`}
            >
              <Layers className="w-4 h-4" /> Architecture
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setActiveTab('alerts'); setHasNewAlert(false); }}
            className={`p-2 hover:bg-white/5 rounded-full transition-colors relative ${activeTab === 'alerts' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'}`}
          >
            <Bell className="w-5 h-5" />
            {hasNewAlert && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[8px] font-black text-white flex items-center justify-center rounded-full border border-[#0A0A0B] shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                {Object.keys(activeTechAlerts).length || '!'}
              </span>
            )}
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setShowArch(false); setSettingsTab('profile'); }}
            className={`flex items-center gap-2 border px-3 py-1.5 rounded-full transition-all ${activeTab === 'settings' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
          >
            <User className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">Account</span>
          </button>
        </div>
      </header>

      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {showDisclaimerPopup && (
            <DisclaimerPopup 
              onAccept={() => {
                setHasAcceptedDisclaimer(true);
                localStorage.setItem('omni_disclaimer_accepted', 'true');
                setShowDisclaimerPopup(false);
                runAIPrediction();
              }}
              onCancel={() => setShowDisclaimerPopup(false)}
            />
          )}
          {!isMarketOpen && (
            <motion.div 
              key="market-closed-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 right-0 z-50 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md px-6 py-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-widest">
                <Info className="w-4 h-4" /> Market Closed - {isWeekend ? 'Weekend Mode Active' : 'After-Hours Mode Active'}
              </div>
              <div className="text-[10px] text-amber-500/60 font-medium">
                Showing historical data and simulated after-hours ticks.
              </div>
            </motion.div>
          )}
          
          <motion.div 
            key="unified-terminal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 overflow-y-auto ${activeTab === 'home' && !showArch ? 'pro-grid' : 'flex flex-col'}`}
          >
            {/* Sidebar - Watchlist - Show on Home and Watchlist Tabs */}
            {(activeTab === 'home' || activeTab === 'watchlist') && !showArch && (
              <div className="hidden lg:flex border-r border-white/10 bg-[#0A0A0B] flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-white/10 flex flex-col gap-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Watchlists</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const name = prompt('Enter watchlist name:');
                          if (name) createWatchlist(name);
                        }}
                        className="p-1 hover:bg-white/5 rounded transition-colors text-emerald-400"
                        title="Create New Watchlist"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <BarChart3 className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {/* Watchlist Selector */}
                  <div className="flex flex-col gap-1.5">
                    {watchlists.map(w => (
                      <div key={w.id} className="group flex items-center gap-2 px-1">
                        <button
                          onClick={() => {
                            setActiveWatchlistId(w.id);
                            if (activeTab !== 'watchlist') setActiveTab('watchlist');
                          }}
                          className={`flex-1 text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all truncate ${activeWatchlistId === w.id ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{w.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${activeWatchlistId === w.id ? 'bg-black/20' : 'bg-white/5'}`}>{w.tickers.length}</span>
                          </div>
                        </button>
                        {watchlists.length > 1 && (
                          <button
                            onClick={() => deleteWatchlist(w.id)}
                            className="p-2 text-slate-600 hover:text-rose-400 transition-all shrink-0"
                            title="Delete Watchlist"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Add to Watchlist Form - High Visibility & No Overlap */}
                  <div className="flex flex-col gap-4 p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-emerald-400" />
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Quick Add</p>
                      </div>
                      <Zap className="w-3 h-3 text-emerald-400 animate-pulse fill-current" />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {activeTab === 'watchlist' && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider ml-1">Target Watchlist</label>
                          <select 
                            value={activeWatchlistId}
                            onChange={(e) => setActiveWatchlistId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-emerald-500 outline-none text-white appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                          >
                            {watchlists.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider ml-1">Symbol</label>
                        <input 
                          type="text" 
                          placeholder="e.g. AAPL" 
                          value={newWatchTicker} 
                          onChange={e => setNewWatchTicker(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newWatchTicker) {
                              const tickerToAdd = newWatchExchange === 'NSE' && !newWatchTicker.endsWith('.NS') 
                                ? `${newWatchTicker}.NS` 
                                : newWatchTicker;
                              // If on Home tab, always add to Main Watchlist ('default')
                              toggleWatchlist(tickerToAdd, activeTab === 'home' ? 'default' : activeWatchlistId);
                              setNewWatchTicker('');
                            }
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-emerald-500 outline-none text-white placeholder:text-slate-700 font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider ml-1">Exchange</label>
                        <input 
                          type="text" 
                          placeholder="e.g. NASDAQ" 
                          value={newWatchExchange} 
                          onChange={e => setNewWatchExchange(e.target.value.toUpperCase())}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-emerald-500 outline-none text-white placeholder:text-slate-700"
                        />
                      </div>

                      <button 
                        onClick={() => {
                          if (!newWatchTicker) return;
                          const tickerToAdd = newWatchExchange === 'NSE' && !newWatchTicker.endsWith('.NS') 
                            ? `${newWatchTicker}.NS` 
                            : newWatchTicker;
                          
                          // If on Home tab, always add to Main Watchlist ('default')
                          toggleWatchlist(tickerToAdd, activeTab === 'home' ? 'default' : activeWatchlistId);
                          setNewWatchTicker(''); setNewWatchExchange('');
                        }}
                        disabled={!newWatchTicker}
                        className="w-full bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-black py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add to {activeTab === 'home' ? 'Main Watchlist' : activeWatchlist.name}
                      </button>
                    </div>
                  </div>
                  {/* Quick Add Section */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">Quick Add</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['AAPL', 'TSLA', 'NVDA', 'BTC', 'MSFT'].map(symbol => (
                        <button 
                          key={`quick-${symbol}`}
                          onClick={() => {
                            if (!activeWatchlist.tickers.includes(symbol)) {
                              toggleWatchlist(symbol);
                            }
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 rounded-full text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition-all"
                        >
                          +{symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {activeWatchlist.tickers.length === 0 ? (
                    <div className="p-8 text-center text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                      {activeWatchlist.name} is empty.<br/>Add tickers above to track.
                    </div>
                  ) : (
                    activeWatchlist.tickers.map(ticker => {
                      const tick = ticks[ticker];
                      if (!tick) return null;
                      return (
                        <div 
                          key={`watch-${ticker}`}
                          className={`w-full flex items-center hover:bg-white/5 transition-colors border-b border-white/5 ${selectedTicker === ticker ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : ''}`}
                        >
                          <button 
                            onClick={() => {
                              setSelectedTicker(ticker);
                              setCustomTicker('');
                              setCustomExchange('');
                            }}
                            className="flex-1 p-4 flex items-center justify-between text-left"
                          >
                            <div>
                              <p className="text-sm font-bold text-white">{ticker}</p>
                              <p className="text-[10px] text-slate-500">Vol: 1.2M</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono text-white">
                                {getCurrencySymbol(ticker)}{tick.price}
                              </p>
                              <p className={`text-[10px] font-bold ${tick.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {tick.change > 0 ? '+' : ''}{tick.change}%
                              </p>
                            </div>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(ticker);
                            }}
                            className="p-4 text-slate-600 hover:text-rose-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Main Content - Dynamic based on Tab */}
            <div className="flex flex-col bg-[#050505] min-h-full overflow-y-auto flex-1 custom-scrollbar">
              {activeTab === 'home' && !showArch ? (
                <div className="flex flex-col min-h-full">
                  {/* Quick Add Section for Home (Always visible on mobile, maybe desktop too if preferred) */}
                  <div className="px-8 pt-8">
                    <div className="glass-panel p-6 flex flex-col md:flex-row items-center gap-6 border-emerald-500/20 bg-emerald-500/5">
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <PlusCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Quick Add</p>
                          <p className="text-[10px] text-slate-500">Add to your watchlist</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-1 gap-2 w-full">
                        <input 
                          type="text" 
                          placeholder="Ticker Symbol (e.g. AAPL)" 
                          value={newWatchTicker} 
                          onChange={e => setNewWatchTicker(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newWatchTicker) {
                              toggleWatchlist(newWatchTicker);
                              setNewWatchTicker('');
                            }
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none text-white font-mono"
                        />
                        <button 
                          onClick={() => {
                            if (!newWatchTicker) return;
                            toggleWatchlist(newWatchTicker);
                            setNewWatchTicker('');
                          }}
                          className="bg-emerald-500 text-black px-6 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 shrink-0 justify-center">
                        {['AAPL', 'TSLA', 'NVDA', 'BTC', 'MSFT'].map(symbol => (
                          <button 
                            key={`quick-home-${symbol}`}
                            onClick={() => toggleWatchlist(symbol)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 rounded-full text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> {symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Trending Assets Section */}
                  <div className="p-8 bg-black/40">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" /> Trending Assets
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Market Pulse as of {lastTrendingUpdate}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${marketStates.nse ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                          <span className={`text-[9px] font-bold ${marketStates.nse ? 'text-emerald-400' : 'text-slate-500'}`}>NSE</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${marketStates.nyse ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                          <span className={`text-[9px] font-bold ${marketStates.nyse ? 'text-emerald-400' : 'text-slate-500'}`}>NYSE</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${marketStates.lse ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                          <span className={`text-[9px] font-bold ${marketStates.lse ? 'text-emerald-400' : 'text-slate-500'}`}>LSE</span>
                        </div>
                        <div className={`flex items-center gap-2 text-[9px] font-bold ${isMarketOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                          <div className={`w-1 h-1 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          {isMarketOpen ? 'LIVE' : 'CLOSED'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {trendingAssets.map(item => {
                        const ticker = item.ticker;
                        const tick = ticks[ticker];
                        const data = history[ticker] || [];
                        return (
                          <div 
                            key={`trending-${ticker}`} 
                            className="glass-panel p-5 flex flex-col h-72 hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-emerald-500/30 shadow-lg hover:shadow-emerald-500/5" 
                            onClick={() => {
                              setSelectedTicker(ticker);
                              setDetailedChartTicker(ticker);
                              setIsDetailedChartOpen(true);
                            }}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">{ticker}</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.exchange}</p>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="text-right mb-2">
                                  <p className="text-sm font-mono text-white">
                                    {getCurrencySymbol(ticker)}{tick?.price || '0.00'}
                                  </p>
                                  <p className={`text-xs font-bold ${tick?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {tick?.change > 0 ? '+' : ''}{tick?.change || '0.00'}%
                                  </p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAlertTicker(ticker);
                                    setIsAlertModalOpen(true);
                                  }}
                                  className="p-1.5 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 rounded-lg transition-all text-slate-500 hover:text-emerald-400"
                                  title="Set Price Alert"
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 min-h-0 py-2">
                              {data.length > 0 ? (
                                <StockChart 
                                  data={data} 
                                  color={tick?.change >= 0 ? '#10b981' : '#f43f5e'} 
                                />
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-20">
                                  <Activity className="w-8 h-8" />
                                  <p className="text-[8px] font-bold uppercase tracking-widest">Awaiting Stream</p>
                                </div>
                              )}
                            </div>
                            <div className="mt-auto pt-4 flex justify-between items-center shrink-0">
                              <button 
                                className="px-5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/20 transition-all w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTicker(ticker);
                                  setDetailedChartTicker(ticker);
                                  setIsDetailedChartOpen(true);
                                }}
                              >
                                Deep Analysis →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Stock News Section */}
                  <div className="p-8 border-t border-white/10 bg-black/20">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-emerald-400" /> {selectedTicker} Live Intelligence
                      </h2>
                      <div className="flex items-center gap-3">
                        {loadingNews && (
                          <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        )}
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {loadingNews ? 'Updating Feed...' : 'Live Articles'}
                        </span>
                      </div>
                    </div>
                    
                    {tickerNews.length === 0 && !loadingNews ? (
                      <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <p className="text-slate-500 text-sm">No recent articles found for {selectedTicker}.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickerNews.map((article) => (
                          <a 
                            key={article.uuid} 
                            href={article.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="glass-panel p-5 hover:bg-white/10 transition-all group block border border-white/5 hover:border-emerald-500/30"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{article.publisher}</span>
                              <span className="text-[10px] text-slate-600">
                                {formatNewsDate(article.providerPublishTime)}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors mb-4 leading-snug line-clamp-2">
                              {article.title}
                            </h3>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{article.type}</span>
                              <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Market Activity Section */}
                  <div className="p-8 border-t border-white/10">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Activity className={`w-5 h-5 ${isMarketOpen ? 'text-emerald-400' : 'text-amber-400'}`} /> Recent Market Activity
                      {!isMarketOpen && <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest ml-2">(Market Closed)</span>}
                    </h2>
                    <div className="glass-panel overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Ticker</th>
                            <th className="px-6 py-4">Exchange</th>
                            <th className="px-6 py-4">Last Price</th>
                            <th className="px-6 py-4">24h Change</th>
                            <th className="px-6 py-4">Avg Bullish Signal Price</th>
                            <th className="px-6 py-4">Total ROI (%)</th>
                            <th className="px-6 py-4">Holdings Value</th>
                            <th className="px-6 py-4">Volume</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Watchlist</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {[
                            { ticker: 'AAPL', exchange: 'NASDAQ' },
                            { ticker: 'TSLA', exchange: 'NASDAQ' },
                            { ticker: 'NVDA', exchange: 'NASDAQ' },
                            { ticker: 'RELIANCE.NS', exchange: 'NSE' },
                            { ticker: 'INFY.NS', exchange: 'NSE' },
                            { ticker: 'TCS.NS', exchange: 'NSE' }
                          ].map((item, idx) => {
                            const tick = ticks[item.ticker];
                            const price = tick ? tick.price : (item.exchange === 'NSE' ? 2500 : 150).toFixed(2);
                            const change = isMarketOpen ? (tick ? tick.change : (idx % 2 === 0 ? 1.2 : -0.8)) : 0;
                            const volume = (1.2 + idx * 0.5).toFixed(1);
                            const formattedChange = change.toFixed(2);
                            const isWatched = activeWatchlist.tickers.includes(item.ticker);
                            
                            // Mock portfolio data
                            const mockQty = (idx + 1) * 10;
                            const avgBullishSignalPrice = (Number(price) * (1 - (idx % 2 === 0 ? 0.05 : -0.03))).toFixed(2);
                            const totalROI = (((Number(price) - Number(avgBullishSignalPrice)) / Number(avgBullishSignalPrice)) * 100).toFixed(2);
                            const holdingsValue = (Number(price) * mockQty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            
                            return (
                              <tr key={`activity-${item.ticker}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4 font-bold text-white group-hover:text-emerald-400 transition-colors">{item.ticker}</td>
                                <td className="px-6 py-4 text-slate-500 text-xs">{item.exchange}</td>
                                <td className="px-6 py-4 font-mono text-white">
                                  {getCurrencySymbol(item.ticker, item.exchange)}{price}
                                </td>
                                <td className={`px-6 py-4 font-bold ${parseFloat(formattedChange) > 0 ? 'text-green-400' : parseFloat(formattedChange) < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                  {parseFloat(formattedChange) > 0 ? '+' : ''}{formattedChange}%
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-300">
                                  {getCurrencySymbol(item.ticker, item.exchange)}{avgBullishSignalPrice}
                                </td>
                                <td className={`px-6 py-4 font-bold ${parseFloat(totalROI) > 0 ? 'text-green-400' : parseFloat(totalROI) < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                  {parseFloat(totalROI) > 0 ? '+' : ''}{totalROI}%
                                </td>
                                <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                                  {getCurrencySymbol(item.ticker, item.exchange)}{holdingsValue}
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-xs">{volume}M</td>
                                <td className="px-6 py-4">
                                  {(() => {
                                    const marketOpen = tick ? tick.marketOpen : (item.exchange === 'NSE' ? marketStates.nse : marketStates.nyse);
                                    return (
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${marketOpen && idx % 3 === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                                        {marketOpen ? (idx % 3 === 0 ? 'Active' : 'Stable') : 'Closed'}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        setAlertTicker(item.ticker);
                                        setIsAlertModalOpen(true);
                                      }}
                                      className="p-2 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/20 rounded-xl text-slate-500 hover:text-emerald-400 transition-all"
                                      title="Set Alert"
                                    >
                                      <Bell className="w-4 h-4" />
                                    </button>
                                    {activeWatchlistId !== 'default' && (
                                      <button 
                                        onClick={() => toggleWatchlist(item.ticker, 'default')}
                                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${watchlists.find(w => w.id === 'default')?.tickers.includes(item.ticker) ? 'text-rose-400 bg-rose-400/10 border border-rose-400/20' : 'text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10'}`}
                                        title={watchlists.find(w => w.id === 'default')?.tickers.includes(item.ticker) ? "Remove from Main Watchlist" : "Add to Main Watchlist"}
                                      >
                                        Main
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => toggleWatchlist(item.ticker)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${isWatched ? 'text-rose-400 bg-rose-400/10 border border-rose-400/20' : 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 hover:bg-emerald-400/20'}`}
                                    >
                                      {isWatched ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                      {isWatched ? 'Remove' : 'Add to Watchlist'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {renderContent(true)}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer / Status Bar */}
      <div className="bg-white/2 border-t border-white/10 px-6 py-4">
        <p className="text-[10px] text-slate-500 leading-relaxed text-center max-w-5xl mx-auto">
          <span className="font-black text-slate-400">RISK WARNING:</span> Trading involves significant risk of loss. All AI-generated predictions and charting data are provided strictly for educational and informational purposes and do not constitute financial, investment, or legal advice. We are not registered investment advisors or brokers; you are 100% responsible for your own trading decisions and financial outcomes.
        </p>
      </div>
      <footer className="h-8 border-t border-white/10 bg-[#0A0A0B] flex items-center justify-between px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>Server: Connected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>SSL: Active</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={marketStates.nse ? "text-emerald-400" : "text-rose-400"}>
            NSE: {marketStates.nse ? 'OPEN' : 'CLOSED'}
          </span>
          <span className={marketStates.lse ? "text-emerald-400" : "text-rose-400"}>
            LSE: {marketStates.lse ? 'OPEN' : 'CLOSED'}
          </span>
          <span className={marketStates.nyse ? "text-emerald-400" : "text-rose-400"}>
            NYSE: {marketStates.nyse ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-white">IST: {formatIST(currentTime)}</span>
        </div>
      </footer>

      {/* Copy Trades Modal removed */}
      {/* Success Toast removed */}

      <AnimatePresence>
        {isDetailedChartOpen && (
          <DetailedChartModal 
            ticker={detailedChartTicker} 
            isOpen={isDetailedChartOpen} 
            onClose={() => setIsDetailedChartOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAlertModalOpen && (
          <PriceAlertModal 
            ticker={alertTicker} 
            isOpen={isAlertModalOpen} 
            onClose={() => setIsAlertModalOpen(false)} 
            onSetAlert={(buy, sell) => {
              setTargetBuyPrice(buy);
              setTargetSellPrice(sell);
              setHasNewAlert(true);
              showToast(`Alert set for ${alertTicker}`, 'success');
            }}
          />
        )}
      </AnimatePresence>

      {/* Global Toast Notifications */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] pointer-events-none flex flex-col items-center gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, y: -40, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              className={`px-8 py-4 rounded-3xl border backdrop-blur-3xl shadow-2xl flex items-center gap-4 pointer-events-auto min-w-[320px] justify-center ${
                toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10' : 
                toast.type === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 shadow-rose-500/10' :
                'bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-blue-500/10'
              }`}
            >
              <div className={`p-2 rounded-xl scale-110 ${
                toast.type === 'success' ? 'bg-emerald-500 text-black' : 
                toast.type === 'error' ? 'bg-rose-500 text-white' :
                'bg-blue-500 text-white'
              }`}>
                {toast.type === 'success' && <Check className="w-4 h-4" />}
                {toast.type === 'error' && <X className="w-4 h-4" />}
                {toast.type === 'info' && <Info className="w-4 h-4" />}
              </div>
              <span className="text-sm font-black uppercase tracking-widest">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
