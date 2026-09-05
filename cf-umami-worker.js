// ===== v5 · 修v4缓存串数据bug：缓存按查询串分键（第一行有这个标记才算粘贴对了）=====
// Umami 免费反代 Worker —— 用 Umami Cloud 的 Share 分享链接机制读取统计数据，
// 不需要 Pro 计划的 API Key。博客侧栏"本站访客数/访问量"通过它显示 Umami 真实数据。
//
// 使用步骤：
// 1. CF Dashboard → Workers & Pages → Create application → Create Worker
//    （名字随意，如 umami-proxy）→ Deploy → Edit code → 清空粘贴本文件全部内容 → Deploy
// 2. 该 Worker 的 Settings → Domains & Routes → Add Custom Domain
//    → 填 umami.jasmine-iris.top → 确认（DNS 自动创建）
// 3. 浏览器访问 https://umami.jasmine-iris.top/script.js 能看到一坨 JS 即成功，
//    回来告诉 Claude 收尾
//
// 免费额度每天 10 万次请求，博客用量绰绰有余。

const SHARE_SLUG = '2KkHZqs7wApqFxz6';
const WEBSITE_ID = 'ec777610-c4cf-493c-a333-c1dc46377957';
const GATEWAY = 'https://gateway-eu.umami.is/api';

const ALLOW_ORIGINS = [
  'https://jasmine-iris.top',
  'https://www.jasmine-iris.top',
  'http://localhost:4000',
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGINS.includes(origin) ? origin : '',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

async function getShareToken() {
  // token 缓存 10 分钟：省掉每次请求的第一个网关来回
  if (tokenCache.v && Date.now() - tokenCache.t < 600e3) return tokenCache.v;
  const res = await fetch(`${GATEWAY}/share/${SHARE_SLUG}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`share bootstrap failed: ${res.status}`);
  const json = await res.json();
  if (!json.token) throw new Error('no token in share response');
  tokenCache = { v: json.token, t: Date.now() };
  return json.token;
}

// 内存缓存（Worker 实例级）：同一查询 60 秒内直接秒回；上游抽风时回吐同查询旧值兜底，不让页面转圈
// v5 修复：缓存键 = 完整查询串。v4 不分键，侧栏(全站总数)和文章卡(单篇浏览)的查询会互相串数据
let tokenCache = { v: null, t: 0 };
let statsCache = { k: null, v: null, t: 0 };
const STATS_FRESH_MS = 60e3;
const UPSTREAM_TIMEOUT_MS = 4000;

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('upstream timeout')), UPSTREAM_TIMEOUT_MS)),
  ]);
}

async function fetchStatsCached(target) {
  const now = Date.now();
  if (statsCache.k === target && statsCache.v && now - statsCache.t < STATS_FRESH_MS) {
    return { body: statsCache.v, stale: false };
  }
  const token = await getShareToken();
  const resp = await withTimeout(fetch(target, {
    headers: {
      Accept: 'application/json',
      'x-umami-share-token': token,
      'x-umami-share-context': '1',
    },
  }));
  if (!resp.ok) throw new Error(`gateway ${resp.status}`);
  const body = await resp.text();
  statsCache = { k: target, v: body, t: now };
  return { body, stale: false };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      let resp;

      if (url.pathname === '/script.js') {
        // 统计脚本本体是公开静态资源，不校验来源（<script src> 本来就不带 Origin 头）
        if (request.method !== 'GET') return new Response('method not allowed', { status: 405 });
        resp = await fetch('https://cloud.umami.is/script.js');
        const out0 = new Response(resp.body, resp);
        out0.headers.set('Content-Type', resp.headers.get('Content-Type') || 'application/javascript');
        out0.headers.set('Cache-Control', 'public, max-age=3600');
        return out0;
      } else if (!ALLOW_ORIGINS.includes(origin)) {
        // 数据接口只允许自己博客的页面来调
        return new Response('forbidden', { status: 403 });
      } else if (url.pathname === '/api/send') {
        // 浏览行为的上报埋点（POST）——只收生产环境的，localhost 一律不记浏览量
        if (request.method !== 'POST' || origin.startsWith('http://localhost')) {
          return new Response('method not allowed', { status: 405 });
        }
        resp = await fetch('https://cloud.umami.is/api/send', {
          method: 'POST',
          headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/json' },
          body: request.body,
        });
      } else if (url.pathname.startsWith('/api/') && request.method === 'GET') {
        // 博客侧栏请求：/api/websites/{id}/stats?...
        // → 走缓存 + 分享 token 网关查询；上游抽风时回吐同查询旧值，页面不转圈
        const target = `${GATEWAY}/${url.pathname.slice(5)}${url.search}`;
        let result;
        try {
          result = await fetchStatsCached(target);
        } catch (e) {
          if (statsCache.k !== target || !statsCache.v) throw e;
          result = { body: statsCache.v, stale: true };
        }
        return new Response(result.body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
            ...corsHeaders(origin),
          },
        });
      } else {
        return new Response('not found', { status: 404 });
      }

      const out = new Response(resp.body, resp);
      out.headers.set('Content-Type', resp.headers.get('Content-Type') || 'text/plain');
      for (const [k, v] of Object.entries(corsHeaders(origin))) out.headers.set(k, v);
      if (url.pathname.startsWith('/api/')) out.headers.set('Cache-Control', 'public, max-age=300');

      return out;
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err && err.message ? err.message : err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};
