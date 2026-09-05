'use strict'

const fs = require('fs')
const path = require('path')

const CACHE_FILE = path.join(__dirname, '..', '.gitee-cache.json')

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) }
  catch { return {} }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8')
}

async function fetchRepo(repoPath) {
  const cache = loadCache()
  const cached = cache[repoPath]
  // Cache for 1 hour
  if (cached && Date.now() - cached.time < 3600000) {
    return cached.data
  }

  try {
    const res = await fetch(`https://gitee.com/api/v5/repos/${repoPath}`, {
      headers: { 'User-Agent': 'Hexo-Blog/1.0' }
    })
    if (!res.ok) throw new Error(`Gitee API ${res.status}`)
    const data = await res.json()
    const info = {
      name: data.human_name || data.full_name,
      description: data.description || '',
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      language: data.language || '',
      url: data.html_url,
      avatar: data.owner?.avatar_url || '',
    }
    cache[repoPath] = { time: Date.now(), data: info }
    saveCache(cache)
    return info
  } catch (e) {
    // Return cached data even if expired on error
    if (cached) return cached.data
    throw e
  }
}

const cardCSS = `
.gitee-card{display:flex;align-items:center;gap:14px;padding:16px 18px;margin:16px 0;
  border:1px solid #e5e7eb;border-radius:12px;background:#fff;text-decoration:none!important;
  transition:box-shadow .25s,transform .25s;color:inherit}
.gitee-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.1);transform:translateY(-2px)}
.gitee-card img{width:44px;height:44px;border-radius:8px;flex-shrink:0}
.gitee-card .gc-body{flex:1;min-width:0}
.gitee-card .gc-name{font-weight:600;font-size:15px;color:#1f2937;line-height:1.3}
.gitee-card .gc-desc{font-size:13px;color:#6b7280;margin-top:3px;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.gitee-card .gc-meta{display:flex;gap:12px;margin-top:4px;font-size:12px;color:#9ca3af}
.gitee-card .gc-meta span{display:flex;align-items:center;gap:3px}
.gitee-card .gc-lang{display:inline-block;width:10px;height:10px;border-radius:50%;
  background:#f59e0b;flex-shrink:0}
[data-theme=dark] .gitee-card{background:#1e1e1e;border-color:#333}
[data-theme=dark] .gitee-card .gc-name{color:#e5e7eb}
[data-theme=dark] .gitee-card .gc-desc{color:#9ca3af}
[data-theme=dark] .gitee-card .gc-meta{color:#6b7280}
`.replace(/\n/g, '')

function renderCard(info) {
  return `
<style>${cardCSS}</style>
<a class="gitee-card" href="${info.url}" target="_blank" rel="noopener">
  <img src="${info.avatar}" alt="" onerror="this.style.display='none'">
  <div class="gc-body">
    <div class="gc-name">${info.name}</div>
    ${info.description ? `<div class="gc-desc">${info.description}</div>` : ''}
    <div class="gc-meta">
      <span>&#9733; ${info.stars}</span>
      <span>&#10749; ${info.forks}</span>
      ${info.language && info.language !== '其他' ? `<span><i class="gc-lang"></i>${info.language}</span>` : ''}
    </div>
  </div>
</a>`.trim()
}

hexo.extend.tag.register('gitee', async function (args) {
  const repoPath = args[0]
  if (!repoPath) return '<!-- gitee: missing repo path -->'

  try {
    const info = await fetchRepo(repoPath)
    return renderCard(info)
  } catch (e) {
    return `<!-- gitee: failed to fetch ${repoPath} — ${e.message} -->`
  }
}, { ends: false, async: true })

const fileCardCSS = `
.gitee-file{display:flex;align-items:center;gap:14px;padding:16px 18px;margin:16px 0;
  border:1px solid #e5e7eb;border-radius:12px;background:#fff;text-decoration:none!important;
  transition:box-shadow .25s,transform .25s;color:inherit}
.gitee-file:hover{box-shadow:0 6px 24px rgba(0,0,0,.1);transform:translateY(-2px)}
.gitee-file .gf-icon{width:44px;height:44px;border-radius:8px;background:#f0f7ff;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;color:#5b9bd5}
.gitee-file .gf-body{flex:1;min-width:0}
.gitee-file .gf-name{font-weight:600;font-size:15px;color:#1f2937;line-height:1.3}
.gitee-file .gf-sub{font-size:13px;color:#6b7280;margin-top:3px}
.gitee-file .gf-arrow{color:#9ca3af;flex-shrink:0}
[data-theme=dark] .gitee-file{background:#1e1e1e;border-color:#333}
[data-theme=dark] .gitee-file .gf-name{color:#e5e7eb}
[data-theme=dark] .gitee-file .gf-sub{color:#9ca3af}
[data-theme=dark] .gitee-file .gf-icon{background:#2a2a2a}
`.replace(/\n/g, '')

function renderFileCard(name, url) {
  return `
<style>${fileCardCSS}</style>
<a class="gitee-file" href="${url}" target="_blank" rel="noopener">
  <div class="gf-icon">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6"/></svg>
  </div>
  <div class="gf-body">
    <div class="gf-name">${name}</div>
    <div class="gf-sub">Gitee 文件 · 点击打开下载</div>
  </div>
  <span class="gf-arrow">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></svg>
  </span>
</a>`.trim()
}

hexo.extend.tag.register('gitee_file', function (args) {
  const name = args[0]
  const url = args[1]
  if (!name || !url) return '<!-- gitee_file: missing name or url -->'
  return renderFileCard(name, url)
}, { ends: false })
