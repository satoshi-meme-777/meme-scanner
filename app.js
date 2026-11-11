const DONATION = "6SS8S2TppvDM85sb46yhfS7XCNq1UWwwKwjoWpSs58xn";
const MAX_MC = 5000;
const API = "https://api.dexscreener.com";

function copyDonation() {
  navigator.clipboard.writeText(DONATION).then(() => {
    const btn = event.target;
    const old = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = old), 1500);
  });
}

function formatUsd(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

function formatAge(ms) {
  if (!ms) return "—";
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 60) return mins + "m";
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return hrs + "h";
  return Math.floor(hrs / 24) + "d";
}

function scorePair(p) {
  // Simple heuristic for "best" micro-cap meme
  let s = 0;
  const liq = p.liquidity?.usd || 0;
  const vol = p.volume?.h24 || 0;
  const buys = p.txns?.h24?.buys || 0;
  const sells = p.txns?.h24?.sells || 0;
  const change = p.priceChange?.h24 || 0;
  const ageH = p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3600000 : 999;

  if (liq > 500) s += 25;
  else if (liq > 200) s += 15;
  else if (liq > 100) s += 8;

  if (vol > 0 && liq > 0) {
    const ratio = vol / liq;
    if (ratio > 5) s += 30;
    else if (ratio > 2) s += 20;
    else if (ratio > 0.5) s += 10;
  }

  if (buys > sells * 1.2) s += 15;
  else if (buys > sells) s += 8;

  if (change > 50) s += 15;
  else if (change > 20) s += 10;
  else if (change > 0) s += 5;

  // Prefer fresher coins for micro-caps
  if (ageH < 6) s += 15;
  else if (ageH < 24) s += 10;
  else if (ageH < 72) s += 5;

  return Math.min(100, Math.round(s));
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function getLatestProfiles() {
  try {
    const data = await fetchJson(`${API}/token-profiles/latest/v1`);
    return Array.isArray(data) ? data : data ? [data] : [];
  } catch {
    return [];
  }
}

async function getBoosts() {
  try {
    const data = await fetchJson(`${API}/token-boosts/latest/v1`);
    return Array.isArray(data) ? data : data ? [data] : [];
  } catch {
    return [];
  }
}

async function getPairsForTokens(chain, addresses) {
  if (!addresses.length) return [];
  // Max ~30 per call
  const chunks = [];
  for (let i = 0; i < addresses.length; i += 25) {
    chunks.push(addresses.slice(i, i + 25));
  }
  const results = [];
  for (const chunk of chunks) {
    try {
      const data = await fetchJson(`${API}/tokens/v1/${chain}/${chunk.join(",")}`);
      if (data?.pairs) results.push(...data.pairs);
    } catch (e) {
      console.warn("token batch failed", e);
    }
  }
  return results;
}

async function searchLowCapHints() {
  // Extra discovery via search for common new-launch patterns
  const queries = ["pump", "meme", "sol", "pepe", "doge"];
  const pairs = [];
  for (const q of queries.slice(0, 2)) {
    try {
      const data = await fetchJson(`${API}/latest/dex/search?q=${encodeURIComponent(q)}`);
      if (data?.pairs) pairs.push(...data.pairs);
    } catch {}
  }
  return pairs;
}

function filterAndRank(pairs, minLiq, chainFilter) {
  const seen = new Set();
  const filtered = [];

  for (const p of pairs) {
    if (!p || !p.baseToken) continue;
    const key = (p.chainId + ":" + p.baseToken.address).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (chainFilter !== "all" && p.chainId !== chainFilter) continue;

    const mc = p.marketCap ?? p.fdv ?? 0;
    if (mc <= 0 || mc > MAX_MC) continue;

    const liq = p.liquidity?.usd || 0;
    if (liq < minLiq) continue;

    // Prefer pairs with some activity
    const vol = p.volume?.h24 || 0;
    if (vol < 10 && liq < 500) continue;

    filtered.push({
      ...p,
      _score: scorePair(p),
      _mc: mc,
      _liq: liq,
    });
  }

  return filtered.sort((a, b) => b._score - a._score).slice(0, 36);
}

function renderCard(p) {
  const name = p.baseToken?.name || "Unknown";
  const symbol = p.baseToken?.symbol || "???";
  const addr = p.baseToken?.address || "";
  const chain = p.chainId || "";
  const url = p.url || `https://dexscreener.com/${chain}/${p.pairAddress}`;
  const img = p.info?.imageUrl || p.baseToken?.imageUrl || "";
  const change = p.priceChange?.h24;
  const changeCls = change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400";
  const changeStr = change != null ? (change > 0 ? "+" : "") + change.toFixed(1) + "%" : "—";

  return `
    <article class="card rounded-2xl bg-black/50 border border-meme-800/60 p-4 flex flex-col gap-3">
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 rounded-xl bg-meme-900 overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold">
          ${img ? `<img src="${img}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'" />` : symbol.slice(0, 2)}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold truncate">${symbol}</h3>
            <span class="score-badge text-[10px] font-bold px-1.5 py-0.5 rounded-full">${p._score}</span>
          </div>
          <p class="text-xs text-meme-400 truncate">${name}</p>
          <p class="text-[10px] text-meme-500 uppercase mt-0.5">${chain}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p class="text-meme-500 text-xs">Market Cap</p>
          <p class="font-medium">${formatUsd(p._mc)}</p>
        </div>
        <div>
          <p class="text-meme-500 text-xs">Liquidity</p>
          <p class="font-medium">${formatUsd(p._liq)}</p>
        </div>
        <div>
          <p class="text-meme-500 text-xs">24h Volume</p>
          <p class="font-medium">${formatUsd(p.volume?.h24)}</p>
        </div>
        <div>
          <p class="text-meme-500 text-xs">24h Change</p>
          <p class="font-medium ${changeCls}">${changeStr}</p>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs text-meme-400">
        <span>Age ${formatAge(p.pairCreatedAt)}</span>
        <span>${(p.txns?.h24?.buys || 0)} buys / ${(p.txns?.h24?.sells || 0)} sells</span>
      </div>

      <div class="flex gap-2 mt-auto pt-1">
        <a href="${url}" target="_blank" rel="noopener" class="flex-1 text-center py-2 rounded-lg bg-meme-700/80 hover:bg-meme-600 text-sm font-medium transition">Chart</a>
        <a href="https://jup.ag/swap/SOL-${addr}" target="_blank" rel="noopener" class="flex-1 text-center py-2 rounded-lg bg-purple-700/80 hover:bg-purple-600 text-sm font-medium transition ${chain !== "solana" ? "opacity-40 pointer-events-none" : ""}">Buy</a>
      </div>
    </article>
  `;
}

async function scan() {
  const btn = document.getElementById("refreshBtn");
  const icon = document.getElementById("refreshIcon");
  const status = document.getElementById("status");
  const results = document.getElementById("results");
  const empty = document.getElementById("empty");
  const loading = document.getElementById("loading");
  const minLiq = Number(document.getElementById("minLiq").value) || 0;
  const chainFilter = document.getElementById("chainSelect").value;

  btn.disabled = true;
  icon.classList.add("animate-spin");
  status.innerHTML = `<span class="w-2 h-2 rounded-full bg-meme-400 pulse"></span> Scanning…`;
  results.innerHTML = "";
  empty.classList.add("hidden");
  loading.classList.remove("hidden");

  try {
    // 1. Discovery sources
    const [profiles, boosts, searchPairs] = await Promise.all([
      getLatestProfiles(),
      getBoosts(),
      searchLowCapHints(),
    ]);

    // Collect candidate token addresses by chain
    const byChain = {};
    const add = (chain, addr) => {
      if (!chain || !addr) return;
      if (!byChain[chain]) byChain[chain] = new Set();
      byChain[chain].add(addr);
    };

    for (const p of profiles) add(p.chainId, p.tokenAddress);
    for (const b of boosts) add(b.chainId, b.tokenAddress);

    // Prefer Solana for memes
    const chainsToFetch = chainFilter === "all"
      ? Object.keys(byChain)
      : [chainFilter];

    let allPairs = [...searchPairs];

    for (const chain of chainsToFetch) {
      const addrs = [...(byChain[chain] || [])].slice(0, 40);
      if (addrs.length) {
        const pairs = await getPairsForTokens(chain, addrs);
        allPairs.push(...pairs);
      }
    }

    // Also try a couple of direct Solana new-ish searches if needed
    if (allPairs.length < 10 && (chainFilter === "solana" || chainFilter === "all")) {
      try {
        const extra = await fetchJson(`${API}/latest/dex/search?q=solana`);
        if (extra?.pairs) allPairs.push(...extra.pairs);
      } catch {}
    }

    const ranked = filterAndRank(allPairs, minLiq, chainFilter);

    loading.classList.add("hidden");

    if (ranked.length === 0) {
      empty.classList.remove("hidden");
      status.innerHTML = `<span class="w-2 h-2 rounded-full bg-yellow-400"></span> No matches under $${MAX_MC.toLocaleString()} MC`;
    } else {
      results.innerHTML = ranked.map(renderCard).join("");
      status.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-400"></span> Found ${ranked.length} micro-caps`;
    }
  } catch (err) {
    console.error(err);
    loading.classList.add("hidden");
    empty.classList.remove("hidden");
    status.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-400"></span> Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    icon.classList.remove("animate-spin");
  }
}

document.getElementById("refreshBtn").addEventListener("click", scan);
// Auto-scan on load
scan();
