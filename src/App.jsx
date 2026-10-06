import { useEffect, useRef, useState } from 'react'

const THEMES = [
  ['dark', 'Pro Koyu'],
  ['light', 'Pro Açık'],
  ['cam', 'Aurora Cam'],
  ['gun', 'Gün Batımı'],
  ['gece', 'Gece Derin'],
]
const PLANTS = ['🌱', '🌿', '🌷', '🌻', '🍅']
const MODES = { '30': ['30 dk', 1800e3], '60': ['1 saat', 3600e3], free: ['Sınırsız', null], break: ['Mola', 600e3] }
const COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b']
const MONTHS_DAYS = 'Pzt Sal Çar Per Cum Cmt Paz'.split(' ')

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const key = (d) => d.toLocaleDateString('sv')
const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
const clockFree = (ms) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600); return `${h ? h + ':' : ''}${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
const human = (s) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h} sa ${m} dk` : `${m} dk` }

function beep() {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain()
    o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.2, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2); o.frequency.value = 660; o.start(); o.stop(c.currentTime + 1.2)
  } catch {}
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    let t = load('td_theme', 'dark')
    if (t === 'sade') t = 'dark'
    if (t === 'bahce') t = 'light'
    return THEMES.some(([id]) => id === t) ? t : 'dark'
  })
  const [cats, setCats] = useState(() => load('td_cats', ['Genel']))
  const [sel, setSel] = useState(() => load('td_sel', 'Genel'))
  const [log, setLog] = useState(() => load('td_log', []))
  const [newCat, setNewCat] = useState('')
  const [mode, setMode] = useState('30')
  const [acc, setAcc] = useState(0)
  const [startTs, setStartTs] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [range, setRange] = useState('gun')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
    save('td_theme', theme)
  }, [theme])

  useEffect(() => save('td_cats', cats), [cats])
  useEffect(() => save('td_sel', sel), [sel])
  useEffect(() => save('td_log', log), [log])

  const target = MODES[mode][1]
  const elapsed = acc + (startTs ? now - startTs : 0)
  const running = startTs !== null

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (target && elapsed >= target) finish(true)
  })

  function addLog(ms) {
    const s = Math.round(ms / 1000)
    if (mode !== 'break' && s >= 5) setLog((l) => [...l, { d: key(new Date()), c: sel, s }])
  }
  function finish(done) {
    addLog(done ? target : elapsed)
    setStartTs(null); setAcc(0); if (done) beep()
    if (mode === 'break') setMode('30')
  }
  const start = () => { setNow(Date.now()); setStartTs(Date.now()) }
  const pause = () => { setAcc(elapsed); setStartTs(null) }
  const startBreak = () => { if (elapsed > 0) finish(false); setMode('break'); setAcc(0); start() }
  const addCat = () => { const n = newCat.trim(); if (n && !cats.includes(n)) { setCats([...cats, n]); setSel(n) } setNewCat('') }
  const idle = !running && acc === 0

  // istatistik
  const today = new Date()
  const prog = target ? Math.min(1, elapsed / target) : (elapsed % 3600e3) / 3600e3
  const doneToday = log.filter((x) => x.d === key(today)).length
  const days = []
  if (range === 'hafta') {
    const s = new Date(today)
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
    for (let i = 0; i < 7; i++) {
      const d = new Date(s)
      d.setDate(s.getDate() + i)
      days.push(d)
    }
  }
  if (range === 'ay') {
    const n = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    for (let i = 1; i <= n; i++) days.push(new Date(today.getFullYear(), today.getMonth(), i))
  }
  if (range === 'gun') days.push(today)
  const keys = days.map(key)
  const inRange = log.filter((x) => keys.includes(x.d))
  const byCat = {}; inRange.forEach((x) => (byCat[x.c] = (byCat[x.c] || 0) + x.s))
  const total = Object.values(byCat).reduce((a, b) => a + b, 0)
  const maxCat = Math.max(1, ...Object.values(byCat))
  const color = (c) => COLORS[Math.max(0, cats.indexOf(c)) % COLORS.length]
  const perDay = keys.map((k) => {
    const items = inRange.filter((x) => x.d === k)
    return { k, sum: items.reduce((a, b) => a + b.s, 0), items }
  })
  const maxDay = Math.max(1, ...perDay.map((p) => p.sum))

  // Dark/Light toggle
  const toggleThemeMode = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <div className="app-container" style={{ '--p': prog }}>
      {/* Aurora Ambient Background Effect (from uupm.cc) */}
      <div className="aurora-wrapper" aria-hidden="true">
        <div className="aurora-mesh" />
        <div className="aurora-orb orb-primary" />
        <div className="aurora-orb orb-accent" />
        <div className="bg-decor"><i className="a" /><i className="b" /><i className="c" /></div>
      </div>

      {/* Floating Pill Navbar (from uupm.cc) */}
      <header className="navbar-pill">
        <div className="navbar-brand">
          <svg viewBox="0 0 48 48" fill="none" className="brand-logo" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
              <linearGradient id="innerGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="22" stroke="url(#logoGradient)" strokeWidth="3" fill="none" />
            <rect x="14" y="14" width="12" height="12" rx="3" fill="url(#logoGradient)" opacity="0.9" />
            <rect x="18" y="18" width="12" height="12" rx="3" fill="url(#innerGradient)" opacity="0.8" />
            <rect x="22" y="22" width="12" height="12" rx="3" fill="url(#logoGradient)" opacity="0.9" />
            <circle cx="36" cy="12" r="2" fill="#F97316" />
            <circle cx="12" cy="36" r="1.5" fill="#3B82F6" />
          </svg>
          <div className="brand-title">
            <span className="brand-name">Tobi<span className="gradient-text">Doro</span></span>
            <span className="badge-pro">PRO MAX</span>
          </div>
        </div>

        <div className="navbar-actions">
          {/* Quick Stats Pill */}
          <div className="nav-stat-chip">
            <span className="stat-dot" />
            <span className="stat-text">Bugün: <strong>{doneToday} seans</strong></span>
          </div>

          {/* Theme Palette Swatches */}
          <div className="nav-themes" role="group" aria-label="Tema Seçimi">
            {THEMES.map(([id, name]) => (
              <button
                key={id}
                className={'swatch-btn ' + (theme === id ? 'active' : '')}
                data-t={id}
                onClick={() => setTheme(id)}
                title={name}
                aria-label={name}
              >
                <i />
              </button>
            ))}
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            className="theme-mode-btn"
            onClick={toggleThemeMode}
            aria-label="Açık/Koyu Tema Geçişi"
            title="Açık / Koyu Tema"
          >
            {theme === 'light' ? (
              <svg className="icon-sun-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg className="icon-sun-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="main-content">
        {/* TIMER HERO CARD */}
        <section className="glass-card timer-card">
          <div className="seg">
            {Object.entries(MODES).filter(([k]) => k !== 'break').map(([k, [name]]) => (
              <button key={k} className={mode === k ? 'on' : ''} disabled={!idle} onClick={() => setMode(k)}>{name}</button>
            ))}
          </div>

          <div className="dial">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="60%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#F97316" />
                </linearGradient>
                <filter id="dialGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#3B82F6" floodOpacity="0.45" />
                </filter>
              </defs>
              <circle className="trk" cx="50" cy="50" r="46" />
              <circle
                className="prg"
                cx="50"
                cy="50"
                r="46"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - prog}
                filter="url(#dialGlow)"
              />
            </svg>
            <div className="mid">
              <div className={'clock ' + (mode === 'break' ? 'brk' : '')}>
                {target ? clock(target - elapsed) : clockFree(elapsed)}
              </div>
              <div className="sub-badge">
                <span className="sub-indicator" />
                <span>{mode === 'break' ? '☕ Mola Zamanı' : sel}</span>
              </div>
            </div>
          </div>

          <div className="row controls-row">
            {running ? (
              <button className="btn-primary" onClick={pause}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                Duraklat
              </button>
            ) : (
              <button className="btn-primary" onClick={start}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                {acc ? 'Devam Et' : 'Başlat'}
              </button>
            )}
            {!idle && (
              <button className="btn-secondary" onClick={() => finish(false)}>
                Bitir{mode !== 'break' ? ' ve Kaydet' : ''}
              </button>
            )}
            {mode !== 'break' && (
              <button className="btn-secondary btn-break" onClick={startBreak}>
                10 dk Mola
              </button>
            )}
          </div>

          {/* Plant Garden */}
          <div className="garden-box" aria-label="Bugünkü bahçe">
            <span className="garden-label">Bugünkü Bahçe:</span>
            <div className="garden-plants">
              {doneToday === 0 && idle && <span className="garden-empty">İlk seansını tamamla ve tohum ek!</span>}
              {Array.from({ length: Math.min(doneToday, 30) }, (_, i) => (
                <span key={i} className="plant-item">{PLANTS[i % PLANTS.length]}</span>
              ))}
              {!idle && mode !== 'break' && <span className="plant-item now">🌱</span>}
            </div>
          </div>
        </section>

        {/* CATEGORY SECTION */}
        <section className="glass-card">
          <div className="card-head">
            <div className="head-title">
              <svg viewBox="0 0 24 24" className="head-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7" /></svg>
              <h2>Kategori</h2>
            </div>
            <span className="badge-count">{cats.length} aktif</span>
          </div>

          <div className="chips">
            {cats.map((c) => (
              <button
                key={c}
                className={'chip ' + (sel === c ? 'on' : '')}
                style={{ '--c': color(c) }}
                disabled={!idle && mode !== 'break'}
                onClick={() => setSel(c)}
              >
                <span className="chip-dot" />
                {c}
              </button>
            ))}
          </div>

          <div className="row add">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCat()}
              placeholder="Yeni kategori adı (ör. Kodlama, İngilizce)"
            />
            <button className="btn-secondary" onClick={addCat}>Kategori Ekle</button>
          </div>
        </section>

        {/* STATISTICS / CHARTS SECTION */}
        <section className="glass-card stats-card">
          <div className="card-head">
            <div className="head-title">
              <svg viewBox="0 0 24 24" className="head-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
              <h2>Çalışma İstatistikleri</h2>
            </div>
            <div className="seg small">
              {[['gun', 'Bugün'], ['hafta', 'Hafta'], ['ay', 'Ay']].map(([k, n]) => (
                <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{n}</button>
              ))}
            </div>
          </div>

          {total === 0 ? (
            <div className="empty-box">
              <p className="empty">Bu aralıkta henüz kayıt yok. Bir sayaç başlat, bitince buraya otomatik yansıyacaktır.</p>
            </div>
          ) : (
            <>
              {/* Metric stats showcase inspired by uupm.cc */}
              <div className="metrics-grid">
                <div className="metric-box">
                  <div className="metric-num gradient-text">{human(total)}</div>
                  <div className="metric-desc">Toplam Odak Süresi</div>
                </div>
                <div className="metric-box">
                  <div className="metric-num gradient-text">{inRange.length}</div>
                  <div className="metric-desc">Tamamlanan Seans</div>
                </div>
                <div className="metric-box">
                  <div className="metric-num gradient-text">{Object.keys(byCat).length}</div>
                  <div className="metric-desc">Kategori Çeşidi</div>
                </div>
              </div>

              {/* Progress bars by category */}
              <div className="bars-container">
                {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, s]) => (
                  <div className="bar-row" key={c}>
                    <span className="bar-label">{c}</span>
                    <div className="bar-track">
                      <b style={{ width: (s / maxCat) * 100 + '%', background: color(c) }} />
                    </div>
                    <em className="bar-val">{human(s)}</em>
                  </div>
                ))}
              </div>

              {/* Week/Month columns chart */}
              {range !== 'gun' && (
                <div className={'cols-chart ' + range}>
                  {perDay.map((p, i) => (
                    <div className="col-item" key={p.k} title={`${p.k}: ${human(p.sum)}`}>
                      <div className="stack-bar" style={{ height: (p.sum / maxDay) * 100 + '%' }}>
                        {p.items.reduce((m, x) => { m[x.c] = (m[x.c] || 0) + x.s; return m }, {}) &&
                          Object.entries(p.items.reduce((m, x) => { m[x.c] = (m[x.c] || 0) + x.s; return m }, {})).map(([c, s]) => (
                            <i key={c} style={{ flex: s, background: color(c) }} />
                          ))}
                      </div>
                      <small>{range === 'hafta' ? MONTHS_DAYS[i] : i + 1}</small>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* MUSIC SECTION */}
        <Music />
      </main>
    </div>
  )
}

function Music() {
  const [tab, setTab] = useState('yt')
  const [link, setLink] = useState(() => load('td_yt', ''))
  const [sp, setSp] = useState(() => load('td_sp', ''))
  const player = useRef(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (window.YT || document.getElementById('yt-api')) return
    const s = document.createElement('script')
    s.id = 'yt-api'
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  }, [])

  function loadYt() {
    setErr('')
    let id = ''
    try { id = new URL(link).searchParams.get('list') } catch {}
    if (!id) return setErr('Geçerli bir YouTube oynatma listesi linki yapıştır (içinde list= parametresi olmalı).')
    save('td_yt', link)
    if (player.current) return player.current.loadPlaylist({ list: id, listType: 'playlist' })
    if (!window.YT?.Player) return setErr('YouTube oynatıcı API yükleniyor, birkaç saniye sonra tekrar deneyin.')
    player.current = new window.YT.Player('ytp', {
      height: '180',
      width: '100%',
      playerVars: { listType: 'playlist', list: id, autoplay: 1 }
    })
  }
  const spSrc = (() => {
    const m = sp.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track)\/([A-Za-z0-9]+)/)
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : ''
  })()
  const p = (fn) => () => player.current?.[fn]?.()

  return (
    <section className="glass-card music-card">
      <div className="card-head">
        <div className="head-title">
          <svg viewBox="0 0 24 24" className="head-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          <h2>Odaklanma Müziği</h2>
        </div>
        <div className="seg small">
          <button className={tab === 'yt' ? 'on' : ''} onClick={() => setTab('yt')}>YouTube</button>
          <button className={tab === 'sp' ? 'on' : ''} onClick={() => setTab('sp')}>Spotify</button>
        </div>
      </div>

      <div style={{ display: tab === 'yt' ? 'block' : 'none' }}>
        <div className="row add">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Herkese açık YouTube oynatma listesi linki"
          />
          <button className="btn-secondary" onClick={loadYt}>Yükle</button>
        </div>
        {err && <p className="err">{err}</p>}
        <div id="ytp" className="ytbox" />
        <div className="row player-controls">
          <button className="btn-secondary btn-sm" onClick={p('previousVideo')}>◀ Önceki</button>
          <button className="btn-primary btn-sm" onClick={p('playVideo')}>▶ Oynat</button>
          <button className="btn-secondary btn-sm" onClick={p('pauseVideo')}>⏸ Durdur</button>
          <button className="btn-secondary btn-sm" onClick={p('nextVideo')}>Sonraki ▶</button>
        </div>
      </div>

      <div style={{ display: tab === 'sp' ? 'block' : 'none' }}>
        <div className="row add">
          <input
            value={sp}
            onChange={(e) => { setSp(e.target.value); save('td_sp', e.target.value) }}
            placeholder="Spotify playlist veya albüm linki (open.spotify.com/...)"
          />
        </div>
        {spSrc ? (
          <div className="spotify-embed-container">
            <iframe
              title="Spotify"
              src={spSrc}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media"
              loading="lazy"
              style={{ border: 0, borderRadius: 14 }}
            />
          </div>
        ) : (
          <div className="empty-box">
            <p className="empty">Spotify linkini yapıştırın, oynatıcı burada otomatik açılacaktır.</p>
          </div>
        )}
      </div>
    </section>
  )
}
