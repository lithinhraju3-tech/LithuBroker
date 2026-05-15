import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import YahooFinance from 'yahoo-finance2';
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

import fs from "fs";

dotenv.config();

const DATA_DIR = path.join(process.cwd(), "data");
const PORTFOLIO_FILE = path.join(DATA_DIR, "portfolio.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Helper to load/save portfolio
function loadPortfolio() {
  try {
    if (fs.existsSync(PORTFOLIO_FILE)) {
      const data = fs.readFileSync(PORTFOLIO_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading portfolio:", err);
  }
  return [];
}

function savePortfolio(portfolio: any) {
  try {
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));
  } catch (err) {
    console.error("Error saving portfolio:", err);
  }
}

// Helper to load/save alerts
function loadAlerts() {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      const data = fs.readFileSync(ALERTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading alerts:", err);
  }
  return [];
}

function saveAlerts(alerts: any) {
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
  } catch (err) {
    console.error("Error saving alerts:", err);
  }
}

// --- Email Transporter Configuration ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendAlertEmail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[MAILER] SMTP credentials missing. Alert logged to console instead of email.");
    console.log(`[DUMMY EMAIL] To: ${to}\nSubject: ${subject}\nBody: ${text}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"LithuBroker Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`[MAILER] Alert email sent successfully to ${to}`);
  } catch (error) {
    console.error("[MAILER ERROR] Failed to send alert email:", error);
  }
}

// Audit: Check for required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set. AI features will fail.");
}

// Example of other potential keys from the audit request
const MARKET_API_KEY = process.env.MARKET_API_KEY; 

// Fix for Yahoo Finance v2 vs v3 and ESM/CJS compatibility
let yahooFinanceInstance: any = YahooFinance;
if (typeof YahooFinance === 'function') {
  yahooFinanceInstance = new (YahooFinance as any)();
} else if ((YahooFinance as any).default && typeof (YahooFinance as any).default === 'function') {
  yahooFinanceInstance = new (YahooFinance as any).default();
}
const yahooFinance = yahooFinanceInstance;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Global state for tracked tickers and their latest data
  const trackedTickers = new Set([
    "^NSEBANK", "^BSESN", "^NYA", "^FTSE", 
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "AAPL", "NVDA", "TSLA", "AZN.L", "BP.L", "HSBA.L"
  ]);
  const latestData: Record<string, any> = {};

  // --- Rate Limiting & Optimization Context ---
  const apiCache = new Map<string, { data: any, timestamp: number }>();
  const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes default cache for general data
  
  let circuitBreakerTripped = false;
  let circuitBreakerResetTime = 0;

  /**
   * Universal Fetch Wrapper with Cache & Circuit Breaker Logic
   */
  async function fetchWithOptimizedCache(
    key: string, 
    fetchFn: () => Promise<any>, 
    ttl = DEFAULT_TTL
  ) {
    const now = Date.now();
    
    // 1. Return cached data if still fresh
    const cached = apiCache.get(key);
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }

    // 2. Prevent API calls if circuit breaker is tripped
    if (circuitBreakerTripped) {
      if (now < circuitBreakerResetTime) {
        if (cached) {
          console.warn(`[CIRCUIT BREAKER] Active. Serving stale data for: ${key}`);
          return cached.data;
        }
        return null;
      } else {
        circuitBreakerTripped = false;
        console.log("[CIRCUIT BREAKER] Auto-Reset. Resuming API attempts.");
      }
    }

    // 3. Execute real fetch
    try {
      const data = await fetchFn();
      apiCache.set(key, { data, timestamp: now });
      return data;
    } catch (error: any) {
      const isRateLimit = error.status === 429 || 
                          (error.message && error.message.toLowerCase().includes('429')) ||
                          (error.message && error.message.toLowerCase().includes('too many requests'));
      
      if (isRateLimit) {
        console.error(`[CRITICAL] 429 Rate Limit hit for ${key}. Tripping breaker for 10 min.`);
        circuitBreakerTripped = true;
        circuitBreakerResetTime = now + 10 * 60 * 1000; 
      }
      
      console.error(`[FETCH ERROR] ${key}:`, error.message);
      return cached ? cached.data : null; // Fallback to last known good data
    }
  }

  // --- Portfolio Persistence (Shared for Demo) ---
  let globalPortfolio: Array<{ id: string, ticker: string, exchange: string, qty: number, avgPrice: number }> = loadPortfolio();
  
  // Add saved tickers to tracked tickers immediately
  globalPortfolio.forEach(p => trackedTickers.add(p.ticker));

  // --- Price Alerts Persistence ---
  interface PriceAlert {
    id: string;
    ticker: string;
    condition: 'price_above' | 'price_below';
    value: number;
    exchange: string;
    active: boolean;
    email?: string;
  }
  let globalAlerts: PriceAlert[] = loadAlerts();
  const triggeredAlerts = new Set<string>(); // IDs of alerts already triggered in this session

  // Add alert tickers to tracked tickers
  globalAlerts.forEach(a => trackedTickers.add(a.ticker));

  const checkPriceAlerts = (latestPrices: Record<string, any>) => {
    globalAlerts.forEach(alert => {
      if (!alert.active) return;
      
      const currentTick = latestPrices[alert.ticker];
      if (!currentTick) return;

      const currentPrice = currentTick.price;
      let triggered = false;
      let message = "";

      if (alert.condition === 'price_below' && currentPrice <= alert.value) {
        triggered = true;
        message = `${alert.ticker} has dropped below ${alert.value}. Currently at ${currentPrice.toFixed(2)}.`;
      } else if (alert.condition === 'price_above' && currentPrice >= alert.value) {
        triggered = true;
        message = `${alert.ticker} has crossed above ${alert.value}. Currently at ${currentPrice.toFixed(2)}.`;
      }

      if (triggered && !triggeredAlerts.has(alert.id)) {
        triggeredAlerts.add(alert.id);
        
        // Broadcast custom alert
        const alertMsg = JSON.stringify({
          type: "PRICE_ALERT",
          data: {
            id: alert.id,
            ticker: alert.ticker,
            message: message,
            time: "Just now",
            severity: 'high'
          }
        });

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(alertMsg);
          }
        });

        // Send Email Notification if email is provided
        if (alert.email) {
          sendAlertEmail(
            alert.email,
            `PRICE ALERT: ${alert.ticker} Triggered`,
            `Your price alert for ${alert.ticker} was triggered!\n\n${message}\n\nView details on your dashboard: ${process.env.APP_URL || 'http://localhost:3000'}`
          );
        }

        // Optional: mark alert as inactive after trigger to prevent immediate refire
        // alert.active = false;
        // saveAlerts(globalAlerts);
      } else if (!triggered && triggeredAlerts.has(alert.id)) {
        // Reset trigger if price moves back (so it can fire again if it crosses back)
        // Only if we want repeated alerts. For now, let's keep it simple.
        triggeredAlerts.delete(alert.id);
      }
    });
  };

  app.get("/api/alerts", (req, res) => {
    res.json({ alerts: globalAlerts });
  });

  app.post("/api/alerts", (req, res) => {
    let { ticker, exchange, condition, value, email } = req.body;
    if (!ticker || !condition || value === undefined) return res.status(400).json({ error: "Missing alert fields" });

    ticker = ticker.toUpperCase();
    exchange = (exchange || 'NSE').toUpperCase();
    
    // Suffixed mapping
    if (exchange === 'NSE' && !ticker.includes('.')) ticker = `${ticker}.NS`;
    else if (exchange === 'BSE' && !ticker.includes('.')) ticker = `${ticker}.BO`;

    const newAlert: PriceAlert = {
      id: Math.random().toString(36).substr(2, 9),
      ticker,
      exchange,
      condition,
      value: parseFloat(value),
      email: email || null,
      active: true
    };

    globalAlerts.push(newAlert);
    saveAlerts(globalAlerts);
    trackedTickers.add(ticker);

    res.json({ success: true, alert: newAlert });
  });

  app.delete("/api/alerts/:id", (req, res) => {
    const { id } = req.params;
    globalAlerts = globalAlerts.filter(a => a.id !== id);
    saveAlerts(globalAlerts);
    triggeredAlerts.delete(id);
    res.json({ success: true });
  });

  app.get("/api/portfolio", (req, res) => {
    res.json({ portfolio: globalPortfolio });
  });

  app.post("/api/portfolio", (req, res) => {
    let { ticker, exchange, qty, avgPrice } = req.body;
    if (!ticker || !qty || !avgPrice) return res.status(400).json({ error: "Missing required fields" });
    
    ticker = ticker.toUpperCase();
    exchange = (exchange || 'NYSE').toUpperCase();

    // Auto-suffix for Indian markets if missing
    if (exchange === 'NSE' && !ticker.includes('.')) {
      ticker = `${ticker}.NS`;
    } else if (exchange === 'BSE' && !ticker.includes('.')) {
      ticker = `${ticker}.BO`;
    }
    
    const newHolding = {
      id: Math.random().toString(36).substr(2, 9),
      ticker: ticker,
      exchange: exchange,
      qty: parseFloat(qty),
      avgPrice: parseFloat(avgPrice)
    };
    
    globalPortfolio.push(newHolding);
    savePortfolio(globalPortfolio);
    
    // Add to tracked tickers for live updates
    trackedTickers.add(newHolding.ticker);
    
    // Broadcast update to all clients
    const updateMsg = JSON.stringify({ type: "PORTFOLIO_UPDATE", portfolio: globalPortfolio });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(updateMsg);
    });
    
    res.json({ success: true, holding: newHolding });
  });

  app.delete("/api/portfolio/:id", (req, res) => {
    const { id } = req.params;
    globalPortfolio = globalPortfolio.filter(p => p.id !== id);
    savePortfolio(globalPortfolio);
    
    // Broadcast update to all clients
    const updateMsg = JSON.stringify({ type: "PORTFOLIO_UPDATE", portfolio: globalPortfolio });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(updateMsg);
    });
    
    res.json({ success: true });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), circuitBreaker: circuitBreakerTripped });
  });
  
  // API Route for News
  app.get("/api/news/:ticker", async (req, res) => {
    const { ticker } = req.params;
    if (!ticker) return res.status(400).json({ error: "Ticker is required" });
    
    const results = await fetchWithOptimizedCache(`news-${ticker}`, async () => {
      console.log(`Fetching news for ${ticker}...`);
      return await yahooFinance.search(ticker, { newsCount: 5 }, { validateResult: false });
    }, 15 * 60 * 1000); // 15 min TTL for news

    if (results && results.news) {
      res.json({ news: results.news });
    } else {
      res.json({ news: [
        { title: `Market Update: ${ticker}`, publisher: "Financial News", link: "#", providerPublishTime: new Date() },
        { title: `${ticker} Analysis: Key Indicators to Watch`, publisher: "StockInsights", link: "#", providerPublishTime: new Date() }
      ] });
    }
  });

  // Dummy route to handle stale client requests to removed traders API
  app.get("/api/traders", (req, res) => {
    res.json({ traders: [] });
  });

  // API Route for Historical Data
  app.get("/api/history/:ticker", async (req, res) => {
    let { ticker } = req.params;
    const { timeframe } = req.query;
    
    if (!ticker) return res.status(400).json({ error: "Ticker is required" });
    
    // Ticker Sanitization / Mapping
    const mapping: Record<string, string> = {
      'ADANIENSOL': 'ADANIENSOL.NS',
      'IRFC': 'IRFC.NS',
      'APOLLO': 'APOLLOTYRE.NS', 
      'TATAGOLD': 'TATACONSUM.NS'
    };
    
    if (mapping[ticker]) {
      ticker = mapping[ticker];
    }
    
    const fetchHistory = async (symbol: string) => {
      const cacheKey = `history-${symbol}-${timeframe}`;
      return await fetchWithOptimizedCache(cacheKey, async () => {
        const period1 = new Date();
        if (timeframe === '1y') {
          period1.setFullYear(period1.getFullYear() - 1);
        } else {
          period1.setDate(period1.getDate() - 7);
        }
        
        const queryOptions = {
          period1,
          interval: timeframe === '1y' ? '1wk' : '1h'
        };
        
        const results: any = await (yahooFinance as any).chart(symbol, queryOptions, { validateResult: false });
        if (results && results.quotes) {
          return results.quotes.map((q: any) => ({
            time: new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(q.date).toLocaleDateString(),
            price: q.close || q.adjclose
          })).filter((q: any) => q.price !== null);
        }
        throw new Error("No data found");
      }, 30 * 60 * 1000); // 30 min history cache
    };

    const formattedData = await fetchHistory(ticker);
    if (!formattedData || formattedData.length === 0) {
      // Retry with .NS if it doesn't have a suffix and failed 
      if (!ticker.includes('.')) {
        console.log(`Retrying fetch for ${ticker}.NS...`);
        const retryData = await fetchHistory(`${ticker}.NS`);
        if (retryData) {
          return res.json({ history: retryData });
        }
      }
      return res.status(500).json({ error: "Failed to fetch historical data" });
    }
    
    res.json({ history: formattedData });
  });

  // API Route for Trending Assets (Indian Market Focus)
  app.get("/api/trending", async (req, res) => {
    const results = await fetchWithOptimizedCache('trending-symbols-india', async () => {
      console.log("Fetching high-volume Indian trending symbols...");
      // Focused list of heavyweights and high-vol Indian stocks
      const indianCandidates = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", 
        "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS", "ADANIENT.NS"
      ];
      
      const quotes = await Promise.allSettled(
        indianCandidates.map(t => yahooFinance.quote(t, {}, { validateResult: false }))
      );

      const trendingList = quotes
        .map((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            const q = r.value as any;
            return {
              ticker: indianCandidates[i],
              exchange: 'NSE',
              change: q.regularMarketChangePercent || 0,
              volume: q.regularMarketVolume || 0
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.volume - a.volume); // Prioritize high volume

      return trendingList;
    }, 30 * 60 * 1000);

    if (results && results.length > 0) {
      res.json({ trending: results.slice(0, 6) });
    } else {
      res.json({ trending: [] });
    }
  });
  
  const wss = new WebSocketServer({ server });

  let currentMarketOpenStatus = true;

  // Market Mood Cache & Dynamic Polling State
  let cachedMood: { score: number, label: string, timestamp: number } | null = null;
  let lastMoodScore = 50;
  let moodFailureCount = 0;
  let isMoodScraping = false;
  
  const STANDARD_TTL = 10 * 60 * 1000; // 10 minutes
  const AGGRESSIVE_TTL = 1 * 60 * 1000; // 1 minute (Aggressive Mode)

  const updateMarketMood = async () => {
    if (isMoodScraping) return;
    
    // Skip if no clients are connected to save resources, 
    // unless we have no data at all yet.
    if (wss.clients.size === 0 && cachedMood) return;

    isMoodScraping = true;
    const now = Date.now();

    try {
      console.log(`[MOOD ENGINE] Scanning sentiment [Attempt: ${moodFailureCount + 1}]...`);
      const searchTickers = ["AAPL", "NVDA", "TSLA", "MSFT", "RELIANCE.NS", "^GSPC", "^IXIC"];
      const allHeadlines: string[] = [];

      const newsResults = await Promise.allSettled(
        searchTickers.map(t => yahooFinance.search(t, { newsCount: 3 }, { validateResult: false }))
      );

      newsResults.forEach(result => {
        if (result.status === 'fulfilled' && (result.value as any).news) {
          (result.value as any).news.forEach((n: any) => allHeadlines.push(n.title.toLowerCase()));
        }
      });

      if (allHeadlines.length === 0) throw new Error("No headlines found");

      const bullishKeywords = ["growth", "surge", "rally", "profit", "bullish", "jump", "higher", "record", "optimism", "gain", "upgrade", "beat", "positive", "strong", "recovery", "expansion", "breakthrough", "launch"];
      const bearishKeywords = ["plunge", "drop", "fear", "bearish", "recession", "inflation", "cut", "loss", "lower", "negative", "weak", "uncertainty", "correction", "crash", "slump", "concern", "miss", "war", "crisis"];

      let bullishCount = 0;
      let bearishCount = 0;

      allHeadlines.forEach(title => {
        bullishKeywords.forEach(word => { if (title.includes(word)) bullishCount++; });
        bearishKeywords.forEach(word => { if (title.includes(word)) bearishCount++; });
      });

      const total = bullishCount + bearishCount;
      let score = total === 0 ? 50 : Math.round((bullishCount / total) * 100);
      if (total < 5) score = Math.round((score + 50) / 2);

      lastMoodScore = score;
      let label = "NEUTRAL";
      if (score <= 25) label = "EXTREME FEAR";
      else if (score <= 45) label = "FEAR";
      else if (score <= 54) label = "NEUTRAL";
      else if (score <= 75) label = "GREED";
      else label = "EXTREME GREED";

      cachedMood = { score, label, timestamp: now };
      moodFailureCount = 0; // Reset backoff on success
      console.log(`[MOOD ENGINE] Success: ${label} (${score})`);
    } catch (error: any) {
      moodFailureCount++;
      console.error(`[MOOD ENGINE ERROR] Attempt ${moodFailureCount} failed:`, error.message);
    } finally {
      isMoodScraping = false;
      
      // Schedule next run with exponential backoff if failed, or dynamic TTL if success
      const nextInterval = moodFailureCount > 0 
        ? Math.min(Math.pow(2, moodFailureCount) * 5000, 30 * 60 * 1000) // Backoff starts at 10s, max 30min
        : (lastMoodScore >= 65 ? AGGRESSIVE_TTL : STANDARD_TTL);
      
      setTimeout(updateMarketMood, nextInterval);
    }
  };

  // API Route for Market Mood
  app.get("/api/market-mood", (req, res) => {
    res.json(cachedMood || { score: 50, label: "NEUTRAL", timestamp: Date.now() });
  });

  // Background task to fetch real data
  const fetchRealData = async () => {
    if (trackedTickers.size === 0) return;
    
    // Throttling: If no clients are connected, we fetch much less frequently or skip
    // to save API tokens and CPU.
    if (wss.clients.size === 0) {
      // We still might want to fetch occasionally to keep latestData from being ancient
      // but 10s is too fast for 0 clients. Let's effectively skip if no one is watching.
      return; 
    }
    
    // Optimization: Skip if circuit breaker is active
    if (circuitBreakerTripped && Date.now() < circuitBreakerResetTime) {
      console.warn("[REAL-TIME FEED] Breaker active. Skipping poll.");
      return;
    }

    try {
      const tickersArray = Array.from(trackedTickers);
      const chunkSize = 15; // Slightly smaller chunks to be safer
      for (let i = 0; i < tickersArray.length; i += chunkSize) {
        const chunk = tickersArray.slice(i, i + chunkSize);
        
        // Wrap the core quote fetch in the optimizer
        const chunkResults = await fetchWithOptimizedCache(`ticks-chunk-${i}`, async () => {
          return await Promise.allSettled(
            chunk.map(ticker => yahooFinance.quote(ticker, {}, { validateResult: false }))
          );
        }, 8000); // 8s cache TTL to match 10s poll

        if (chunkResults) {
          chunkResults.forEach((result: any, index: number) => {
            const ticker = chunk[index];
            if (result.status === 'fulfilled' && result.value) {
              const quote = result.value as any;
              latestData[ticker] = {
                ticker,
                price: quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice || quote.regularMarketPreviousClose || 0,
                change: parseFloat((quote.regularMarketChangePercent || quote.postMarketChangePercent || 0).toFixed(2)),
                timestamp: new Date().toISOString(),
                displayName: quote.shortName || quote.longName || ticker,
                currency: quote.currency,
                marketOpen: quote.marketState === 'REGULAR' || quote.marketState === 'POST' || quote.marketState === 'PRE'
              };
            }
          });
        }
      }
    } catch (error) {
      console.error("Error fetching real stock data:", error);
    } finally {
      // Broadcast even if error occurred, to keep UI moving/alive
      const now = new Date();
      const istMin = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      const day = now.getDay();
      const isWeekend = day === 0 || day === 6;
      const isWeekday = !isWeekend;
      
      // NSE: 9:15 AM - 3:30 PM IST (555 - 930 mins)
      const nseStatus = isWeekday && istMin >= 555 && istMin <= 930;
      
      // NYSE: 7:00 PM - 1:30 AM IST (1140 - 01:30 mins)
      // Note: NYSE ends Saturday morning 1:30 AM IST for Friday session
      // Sessions (IST): Mon 7pm-Tue 1:30am, Tue 7pm-Wed 1:30am, Wed 7pm-Thu 1:30am, Thu 7pm-Fri 1:30am, Fri 7pm-Sat 1:30am
      const nyseStatus = (istMin >= 1140 && isWeekday) || (istMin <= 90 && (day >= 2 && day <= 6));
      
      // LSE: 1:30 PM - 10:00 PM IST (810 - 1320 mins)
      const lseStatus = isWeekday && istMin >= 810 && istMin <= 1320;

      currentMarketOpenStatus = nseStatus || nyseStatus || lseStatus;
      
      // Check custom price alerts
      checkPriceAlerts(latestData);

      const message = JSON.stringify({ 
        type: "TICK", 
        data: Object.values(latestData),
        isMarketOpen: currentMarketOpenStatus,
        isWeekend: day === 0 || (day === 6 && istMin > 90), // Weekend starts after NYSE close
        marketStates: {
          nse: nseStatus,
          nyse: nyseStatus,
          lse: lseStatus
        }
      });

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };

  // Technical Indicators Watchdog
  const sentTechAlerts = new Map<string, number>(); // ticker-type -> timestamp

  const calculateSMA = (prices: number[], period: number) => {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  const calculateRSI = (prices: number[], period: number = 14) => {
    if (prices.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const broadcastTechAlert = (ticker: string, alertType: 'PRICE_ALERT', messageText: string) => {
    const key = `${ticker}-${alertType}`;
    const lastSent = sentTechAlerts.get(key);
    const now = Date.now();
    
    // Cool down: 4 hours
    if (lastSent && (now - lastSent) < 4 * 60 * 60 * 1000) return;

    sentTechAlerts.set(key, now);
    const alertMsg = JSON.stringify({
      type: "TECH_ALERT",
      data: {
        id: Math.random().toString(36).substr(2, 9),
        ticker,
        alertType,
        message: messageText,
        time: "Just now",
        severity: 'high'
      }
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(alertMsg);
      }
    });
  };

  const checkTechnicalIndicators = async () => {
    // Optimization: Skip if circuit breaker is active or no clients connected
    if (wss.clients.size === 0) return;
    
    if (circuitBreakerTripped && Date.now() < circuitBreakerResetTime) {
      return;
    }

    const tickers = Array.from(trackedTickers);
    
    for (const ticker of tickers) {
      if (wss.clients.size === 0) break;

      // Filter: Only NSE, BSE, NYSE, LSE stocks to trigger alerts
      const isIndian = ticker.endsWith('.NS') || ticker.endsWith('.BO') || ticker.startsWith('^NSE') || ticker.startsWith('^BSE');
      const isUS = !ticker.includes('.') || ticker.endsWith('.N'); // NYSE focus
      const isUK = ticker.endsWith('.L');

      if (!isIndian && !isUS && !isUK) continue;

      try {
        // Technical watchdog now only monitors significant price changes since Golden Cross/RSI removed
        const results = await fetchWithOptimizedCache(`tech-scan-${ticker}`, async () => {
          return await yahooFinance.quote(ticker, {}, { validateResult: false });
        }, 5 * 60 * 1000);
        
        if (results && results.regularMarketChangePercent > 5) {
          broadcastTechAlert(ticker, 'PRICE_ALERT', `${ticker} is surging! Up ${results.regularMarketChangePercent.toFixed(2)}% today.`);
        } else if (results && results.regularMarketChangePercent < -5) {
          broadcastTechAlert(ticker, 'PRICE_ALERT', `${ticker} is plunging! Down ${results.regularMarketChangePercent.toFixed(2)}% today.`);
        }
      } catch (err) {}
    }
  };

  // Initial tech check and then every 10 minutes
  checkTechnicalIndicators();
  setInterval(checkTechnicalIndicators, 10 * 60 * 1000);

  // Initial fetch and then every 10 seconds
  fetchRealData();
  const fetchInterval = setInterval(fetchRealData, 10000);
  
  // Start Market Mood Engine
  updateMarketMood();

  // Heartbeat mechanism to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("connection", (ws) => {
    console.log("Client connected to Real-Time Feed");
    (ws as any).isAlive = true;
    ws.on('pong', () => { (ws as any).isAlive = true; });
    
    // Send immediate latest data on connection
    if (Object.keys(latestData).length > 0) {
      const now = new Date();
      const istMin = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      const day = now.getDay();
      const isWeekend = day === 0 || day === 6;
      const isWeekday = !isWeekend;
      
      const nseStatus = isWeekday && istMin >= 555 && istMin <= 930;
      const nyseStatus = (istMin >= 1140 && isWeekday) || (istMin <= 90 && (day >= 2 && day <= 6));
      const lseStatus = isWeekday && istMin >= 810 && istMin <= 1320;

      ws.send(JSON.stringify({ 
        type: "TICK", 
        data: Object.values(latestData),
        isMarketOpen: nseStatus || nyseStatus || lseStatus,
        isWeekend: day === 0 || (day === 6 && istMin > 90),
        marketStates: {
          nse: nseStatus,
          nyse: nyseStatus,
          lse: lseStatus
        }
      }));
    }

    ws.on("message", (message) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === "SUBSCRIBE") {
          const tickers = msg.tickers;
          if (Array.isArray(tickers)) {
            // Mapping for common problematic tickers
            const mapping: Record<string, string> = {
              'ADANIENSOL': 'ADANIENSOL.NS',
              'IRFC': 'IRFC.NS',
              'APOLLO': 'APOLLOTYRE.NS',
              'TATAGOLD': 'TATACONSUM.NS'
            };

            tickers.forEach(t => {
              let sanitized = t;
              if (mapping[t]) {
                sanitized = mapping[t];
              } else if (!t.includes('.') && t.length > 5 && !['NASDAQ', 'NYSE', 'AMEX'].includes(t)) {
                // Heuristic: If it's long and no dot, might be NSE
                // But it's risky. Let's just use the mapping for now or ensure it's uppercase
              }
              trackedTickers.add(sanitized);
            });
            // Trigger an immediate fetch for new tickers if needed
            fetchRealData();
          }
        }
      } catch (e) {
        console.error("Error processing client message:", e);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`LithuBroker Real-Time Server running on http://localhost:${PORT}`);
  });
}

startServer();
