# MemeScan – Best Micro-Cap Meme Coins (< $5k Market Cap)

Open-source scanner that finds promising meme coins with **market cap under $5,000**.

- Uses the free public **DexScreener API** (no API key required)
- Ranks coins with a simple score (liquidity, volume/liq ratio, buy pressure, age, price action)
- Web version (static, deploy anywhere free)
- Android version (Kotlin + Jetpack Compose)
- Donation wallet included

**Donation (Solana):**  
`6SS8S2TppvDM85sb46yhfS7XCNq1UWwwKwjoWpSs58xn`

> Not financial advice. Extremely high risk. Most micro-caps go to zero. DYOR.

---

## Web App

Location: `web/`

### Run locally
```bash
cd web
# any static server, e.g.
python -m http.server 8080
# or npx serve .
```
Open http://localhost:8080

### Deploy for free

| Platform | How |
|----------|-----|
| **GitHub Pages** | Push repo → Settings → Pages → Deploy from `/web` or root with `index.html` |
| **Vercel** | Import repo, set root to `web`, deploy |
| **Netlify** | Drag `web` folder to Netlify Drop or connect Git |
| **Cloudflare Pages** | Connect Git, build output = `web` |

All of the above give you HTTPS + free custom domain support.

---

## Android App

Location: `android/`

Native Kotlin + Jetpack Compose app that talks to the same DexScreener API.

### Requirements
- Android Studio Hedgehog or newer
- JDK 17+
- Min SDK 24

### Build & Run
1. Open the `android` folder in Android Studio
2. Let Gradle sync
3. Run on emulator or device

### Generate APK
```
./gradlew assembleRelease
```
(or Build → Generate Signed Bundle / APK in Android Studio)

The app shows the same micro-cap list, score, charts links, and donation address.

---

## How scoring works

Rough heuristic (0–100):

- Liquidity strength
- 24h volume / liquidity ratio (activity)
- Buy vs sell pressure
- Recent price change
- Token age (fresher preferred for micro-caps)

Only pairs with market cap ≤ $5,000 and above the min-liquidity filter are shown.

---

## Data source

[DexScreener public API](https://docs.dexscreener.com/api/reference)  
No key, generous rate limits for this use case.

---

## License

MIT – free to fork, modify, and deploy.

---

## Contributing

PRs welcome: better scoring, more chains, holder checks, Telegram alerts, etc.
