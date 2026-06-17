 Understand the mental model shift

React → Vue isn't as dramatic as it sounds:

JSX → Single File Components (.vue files with <template>, <script setup>, <style>)
useState / useEffect → ref(), computed(), watch() (Vue Composition API)
React.Context / Redux → Pinia (Nuxt's recommended state management)
React Router → File-based routing in app/pages/ (automatic, zero config)
useEffect data fetching → useFetch() / useAsyncData() (SSR-aware!)
2. Choose your rendering mode

This is the big decision when connecting to an Express backend:

SPA mode (ssr: false) — Closest to your current React setup. Nuxt behaves like a pure client-side app, and all API calls go directly to Express. Easiest migration path.


// nuxt.config.ts
export default defineNuxtConfig({ ssr: false })
Universal (SSR) — Nuxt renders on the server first, then hydrates on the client. Great for SEO. API calls can happen server-side via useFetch. Your Express backend becomes a separate API server.
Hybrid — Mix both per-route! Some pages SSR'd, others client-only. Super flexible once you're comfortable.
3. Connecting to your Express backend

Since Express is staying, you have two clean approaches:

Direct API calls — Just point useFetch at your Express server:


const { data } = await useFetch('http://localhost:3001/api/users')
Proxy via Nuxt server — Use Nuxt's built-in server/api/ directory to proxy requests to Express. This keeps your frontend/backend decoupled and avoids CORS headaches:


// server/api/users.ts
export default defineEventHandler(async () => {
  return $fetch('http://localhost:3001/api/users')
})
Then in your component: useFetch('/api/users') — clean and SSR-safe.

4. Migration strategy (incremental is key)

Don't rewrite everything at once:

Scaffold a new Nuxt project — npx nuxi@latest init my-app
Start with ssr: false — makes it behave like your React SPA while you learn the ropes
Migrate page by page — convert React components to .vue files one route at a time
Swap state management — replace Redux/Context with Pinia
Enable SSR gradually — once comfortable, flip the switch and use useFetch for server-side data loading
Optionally phase out Express — Nuxt's server/api/ (powered by Nitro) can eventually replace your Express routes entirely, or you can keep Express forever — both are valid
5. Useful concepts to read up on

Rendering modes — SSR, CSR, hybrid
Data fetching — useFetch vs useAsyncData
Server routes — server/api/ for proxying Express
Auto-imports — no more import hell 🎉
TL;DR: Start with ssr: false (SPA mode) to keep parity with your React app, point useFetch at your Express API, and migrate components page by page. Once comfortable, enable SSR for the SEO/performance wins. Your Express backend doesn't need to change at all. 🚀