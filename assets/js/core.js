/* Brazucas · núcleo do site
   Carrega as semanas em data/, monta histórico, posições e movimentos,
   e desenha os componentes (ranking, perfil, guilda). */
(function () {
  'use strict';

  /* ---------- Modalidades e classes ---------- */
  const M = [
    { k: 'conquista', l: 'Conquista', icon: 'conquista' },
    { k: 'poder', l: 'Poder', short: 'PR', icon: 'poder' },
    { k: 'torre', l: 'Torre', icon: 'torre' },
    { k: 'provacao', l: 'Provação', icon: 'provacao' },
    { k: 'disputa', l: 'Disputa', icon: 'disputa' },
    { k: 'fenda', l: 'Fenda', icon: 'fenda' },
    { k: 'dungeon', l: 'Dungeon', icon: 'dungeon' }
  ];
  M.forEach(m => { m.short = m.short || m.l; });
  const KEYS = M.map(m => m.k);
  const CLASSES = { Rifle: 'Rifle', Staff: 'Cajado', Pistolas: 'Pistolas', DB: 'Lâmina Dupla', '2H': 'Duas Mãos', Arco: 'Arco', Orb: 'Orbe' };

  /* ---------- Estado carregado ---------- */
  let DATES = [], WEEKS = [], HIST = {}, POS = [], AVATARS = {}, CUR = 0;
  const isDec = v => v != null && !Number.isInteger(v);

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' (' + r.status + ')');
    return r.json();
  }

  async function load() {
    const idx = await getJSON('data/index.json');
    DATES = [...idx.semanas].sort();
    WEEKS = await Promise.all(DATES.map(d => getJSON('data/semanas/' + d + '.json')));
    try { AVATARS = await getJSON('data/avatares.json'); } catch (e) { AVATARS = {}; }
    CUR = DATES.length - 1;
    HIST = {};
    WEEKS.forEach((wk, w) => {
      wk.membros.forEach(m => {
        if (!HIST[m.nome]) {
          HIST[m.nome] = { classe: m.classe };
          KEYS.forEach(k => { HIST[m.nome][k] = new Array(DATES.length).fill(null); });
        }
        HIST[m.nome].classe = m.classe;
        // null = sem dado nessa semana (semanas antigas só têm poder e disputa)
        KEYS.forEach(k => { HIST[m.nome][k][w] = m[k] == null ? null : m[k]; });
      });
    });
    // posição: a do arquivo (planilha); se faltar, ordena por poder
    POS = WEEKS.map(wk => {
      const map = {};
      const hasPos = wk.membros.every(m => m.posicao != null);
      const list = hasPos ? wk.membros : [...wk.membros].sort((a, b) => b.poder - a.poder);
      list.forEach((m, i) => { map[m.nome] = hasPos ? m.posicao : i + 1; });
      return map;
    });
  }

  function week(w) {
    if (w == null) w = CUR;
    const wk = WEEKS[w];
    return wk.membros.map(src => {
      const o = { nome: src.nome, classe: src.classe, pos: POS[w][src.nome], prev: {}, delta: {} };
      KEYS.forEach(k => {
        o[k] = src[k] == null ? null : src[k];
        const p = w > 0 ? HIST[src.nome][k][w - 1] : null;
        o.prev[k] = p;
        o.delta[k] = (p == null || o[k] == null) ? null : +(o[k] - p).toFixed(2);
      });
      const pp = w > 0 ? POS[w - 1][src.nome] : undefined;
      if (w > 0) o.mv = pp == null ? 'N' : pp === o.pos ? '=' : (pp > o.pos ? '+' : '-') + Math.abs(pp - o.pos);
      else o.mv = src.movimento || '=';
      return o;
    }).sort((a, b) => a.pos - b.pos);
  }

  const has = (list, k) => list.filter(p => p[k] != null);
  const val = (p, k) => p[k] == null ? -Infinity : p[k];
  const by = (list, k) => [...list].sort((a, b) => val(b, k) === val(a, k) ? 0 : val(b, k) > val(a, k) ? 1 : -1);
  const leaders = (list, k, n) => by(has(list, k), k).slice(0, n || 3);
  const climbers = (list, k) => list.filter(p => p.delta[k] != null).sort((a, b) => b.delta[k] - a.delta[k]);
  // valor com casas decimais numa coluna inteira = provável erro de digitação (ex.: 66,15)
  const suspect = (p, k) => isDec(p[k]);

  /* ---------- Formatação ---------- */
  const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const fmt = v => v == null ? '–' : nf.format(v);
  function fmtVal(k, v) {
    if (v == null) return '–';
    if (k === 'poder' || k === 'disputa') return fmt(v) + 'K';
    if (k === 'dungeon') return 'Nv. ' + fmt(v);
    if (k === 'conquista') return fmt(v);
    return 'Andar ' + fmt(v);
  }
  function fmtDelta(k, d) {
    if (d == null) return '';
    const s = d > 0 ? '+' : d < 0 ? '−' : '±';
    const a = Math.abs(d);
    if (k === 'poder' || k === 'disputa') return s + fmt(a) + 'K';
    if (k === 'fenda' || k === 'torre' || k === 'provacao') return s + fmt(a) + (a === 1 ? ' andar' : ' andares');
    if (k === 'dungeon') return s + fmt(a) + (a === 1 ? ' nível' : ' níveis');
    return s + fmt(a) + ' pts';
  }
  function fmtDate(iso) { const [y, m, d] = iso.split('-'); return d + '/' + m + '/' + y; }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'membro';

  /* ---------- Ícones ---------- */
  const ICONS = {
    conquista: 'M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13v4M8.5 21h7M9.5 17h5v4h-5z',
    poder: 'M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z',
    torre: 'M6 21V9L4.5 7.5V3h3v2h2V3h5v2h2V3h3v4.5L18 9v12zM10 21v-4a2 2 0 0 1 4 0v4M4 21h16',
    provacao: 'M12 2.5 4.5 5.5v6c0 4.6 3.2 8.4 7.5 10 4.3-1.6 7.5-5.4 7.5-10v-6L12 2.5zM8.8 12l2.3 2.3 4.3-4.5',
    disputa: 'M4 4l10 10M20 4 10 14M6.5 15.5 3.5 18.5l2 2 3-3M17.5 15.5l3 3-2 2-3-3M4 4h3v3M20 4h-3v3',
    fenda: 'M12 3c4.6 0 8 4 8 9s-3.4 9-8 9-8-4-8-9 3.4-9 8-9zM12 7.5c2.3 0 3.8 2 3.8 4.5S14.3 16.5 12 16.5 8.2 14.5 8.2 12 9.7 7.5 12 7.5zM12 11.2v1.6',
    dungeon: 'M5 21V10a7 7 0 0 1 14 0v11M3 21h18M9 21v-6h6v6M12 3v3M7.5 7.5l1.5 1.2M16.5 7.5 15 8.7',
    Rifle: 'M2 13h13l2.5-2H22v2.5l-3 1.5H10l-2.2 4.5H4.5l1.3-4.5H2zM9 11V9.5h4',
    Staff: 'M12 22V9M12 9a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 9zM8 4.5 5.5 2.5M16 4.5l2.5-2M9.5 22h5',
    Pistolas: 'M3 8h12.5v4H11l-1.2 5H6l1-5H3zM15.5 9.5H19M6 8V6.5',
    DB: 'M4 3l10 10M20 3 10 13M12.5 14.5l-3 3M11.5 14.5l3 3M8 18l-3 3.5M16 18l3 3.5',
    '2H': 'M12 2l1.6 3V15h-3.2V5L12 2zM7.5 15h9M12 15v5.5M10.3 21.5h3.4',
    Arco: 'M7 3c7 2.5 7 15.5 0 18M7 3v18M4 12h15M16 9l3 3-3 3',
    Orb: 'M12 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM9.2 8a3 3 0 0 1 2.3-1.8M9.5 14.5 8 21M14.5 14.5 16 21M7 21h10',
    camera: 'M4 8h3l1.5-2.5h7L17 8h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    up: 'M12 19V5M6 11l6-6 6 6',
    alert: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    upload: 'M12 16V4M7 9l5-5 5 5M4 20h16'
  };
  function icon(name, size, extra) {
    size = size || 20;
    return '<svg class="bz-ic ' + (extra || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.user) + '"/></svg>';
  }

  /* ---------- Fotos ----------
     Oficial: data/avatares.json aponta para assets/avatars/<nome>.webp no repositório.
     Logo após um upload, a foto nova fica em cache local até o GitHub Pages republicar. */
  const PENDKEY = n => 'bz.pending.' + n;
  function avatarURL(nome) {
    try {
      const raw = localStorage.getItem(PENDKEY(nome));
      if (raw) {
        const p = JSON.parse(raw);
        if (Date.now() - p.t < 15 * 60 * 1000) return p.data;
        localStorage.removeItem(PENDKEY(nome));
      }
    } catch (e) { /* sem storage */ }
    return AVATARS[nome] || null;
  }
  function setPending(nome, data) {
    try { localStorage.setItem(PENDKEY(nome), JSON.stringify({ t: Date.now(), data })); } catch (e) { /* ok */ }
  }
  function avatar(p, cls) {
    const u = avatarURL(p.nome);
    if (u) return '<span class="bz-av ' + (cls || '') + '"><img src="' + esc(u) + '" alt="Personagem de ' + esc(p.nome) + '" loading="lazy"></span>';
    return '<span class="bz-av bz-av-empty ' + (cls || '') + '" title="Sem foto">' + icon(p.classe, 40) + '<b>' + esc(p.nome.slice(0, 2).toUpperCase()) + '</b></span>';
  }
  // Recorta em quadrado 360px e devolve data URL webp (ou jpeg)
  function squareImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const S = 360, c = document.createElement('canvas'); c.width = c.height = S;
        const g = c.getContext('2d'), s = Math.max(S / img.width, S / img.height);
        g.drawImage(img, (S - img.width * s) / 2, (S - img.height * s) / 2, img.width * s, img.height * s);
        URL.revokeObjectURL(url);
        let data = c.toDataURL('image/webp', 0.86);
        if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/jpeg', 0.86);
        resolve(data);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Esse arquivo não é uma imagem válida.')); };
      img.src = url;
    });
  }
  function chooseFile() {
    return new Promise(resolve => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true;
      inp.onchange = () => { resolve(inp.files && inp.files[0]); inp.remove(); };
      document.body.appendChild(inp); inp.click();
    });
  }
  // Troca de foto: só funciona no navegador de um admin (token do GitHub salvo na página Admin)
  async function changePhoto(nome) {
    if (!window.BZGH || !BZGH.ready()) { toast('Só admins trocam fotos. Configure o acesso na página Admin.'); return; }
    const f = await chooseFile(); if (!f) return;
    try {
      const data = await squareImage(f);
      toast('Enviando foto de ' + nome + '…');
      await BZGH.saveAvatar(nome, data);
      setPending(nome, data);
      toast('Foto de ' + nome + ' publicada. O site atualiza para todos em cerca de 1 minuto.');
      window.dispatchEvent(new CustomEvent('bz:avatar', { detail: nome }));
    } catch (e) { toast(e.message || 'Não foi possível enviar a foto.'); }
  }
  const canEdit = () => !!(window.BZGH && BZGH.ready());
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-photo]');
    if (b) { e.preventDefault(); e.stopPropagation(); changePhoto(b.dataset.photo); }
  }, true);

  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'bz-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3800);
  }

  /* ---------- Logo: letreiro "BRAZUCAS / GUILDA" ---------- */
  let uid = 0;
  function logoSVG(width) {
    const u = 'lg' + (++uid), W = width || 260;
    const T = 'font-family="\'Londrina Solid\',\'Arial Black\',Impact,sans-serif"';
    return '<svg class="bz-logo" viewBox="0 0 360 190" width="' + W + '" height="' + Math.round(W * 190 / 360) + '" role="img" aria-label="Brazucas">' +
      '<defs><linearGradient id="' + u + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".55" stop-color="#f5b400"/><stop offset="1" stop-color="#c47a00"/></linearGradient>' +
      '<linearGradient id="' + u + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#d9e1ea"/><stop offset=".5" stop-color="#9aa7b5"/><stop offset="1" stop-color="#eef2f6"/></linearGradient>' +
      '<linearGradient id="' + u + 'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23a"/><stop offset="1" stop-color="#ff6a00"/></linearGradient></defs>' +
      '<g transform="translate(180 26)"><path d="M-5 20 L0 170 L5 20 Z" fill="url(#' + u + 's)" stroke="#2a3140" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M-22 14 Q-12 22 0 18 Q12 22 22 14 L20 22 Q10 26 0 24 Q-10 26 -20 22 Z" fill="url(#' + u + 'g)" stroke="#5a3a00" stroke-width="2"/>' +
      '<rect x="-4.5" y="-14" width="9" height="30" rx="3" fill="#b3122e" stroke="#4a0410" stroke-width="2"/>' +
      '<path d="M0 -26 L8 -17 L0 -8 L-8 -17 Z" fill="#e8273f" stroke="#5a3a00" stroke-width="2.5"/></g>' +
      '<path d="M22 58 H338 L330 128 H30 Z" fill="#20262f" stroke="#0b0e13" stroke-width="6" stroke-linejoin="round"/>' +
      '<text x="180" y="117" text-anchor="middle" ' + T + ' font-size="66" textLength="292" lengthAdjust="spacingAndGlyphs" fill="url(#' + u + 's)" stroke="#1a1f27" stroke-width="7" paint-order="stroke">BRAZUCAS</text>' +
      '<path d="M98 128 H262 L254 168 H106 Z" fill="#20262f" stroke="#0b0e13" stroke-width="5" stroke-linejoin="round"/>' +
      '<text x="180" y="160" text-anchor="middle" ' + T + ' font-size="34" textLength="124" lengthAdjust="spacingAndGlyphs" fill="url(#' + u + 'f)" stroke="#3a1600" stroke-width="5" paint-order="stroke">GUILDA</text></svg>';
  }

  /* ---------- Gráfico de linha pequeno ---------- */
  function spark(vals, avg, opts) {
    opts = opts || {};
    const w = opts.w || 300, h = opts.h || 84, pl = 4, pr = 8, pt = 8, pb = 8;
    const pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
    if (pts.length < 2) return '<div class="bz-spark-empty">O gráfico aparece a partir da segunda semana publicada</div>';
    const all = pts.map(p => p[1]).concat(avg != null ? [avg] : []);
    let mx = Math.max.apply(null, all), mn = Math.min.apply(null, all);
    const pad = (mx - mn) * 0.12 || 1; mx += pad; mn -= pad;
    const n = vals.length - 1;
    const x = i => pl + i * (w - pl - pr) / n, y = v => pt + (1 - (v - mn) / (mx - mn)) * (h - pt - pb);
    const line = pts.map(p => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ');
    const first = pts[0], last = pts[pts.length - 1];
    let s = '<svg class="bz-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">';
    [0.25, 0.5, 0.75].forEach(f => { s += '<line class="bz-spark-grid" x1="0" x2="' + w + '" y1="' + (pt + f * (h - pt - pb)) + '" y2="' + (pt + f * (h - pt - pb)) + '"/>'; });
    if (avg != null) s += '<line class="bz-spark-avg" x1="0" x2="' + w + '" y1="' + y(avg).toFixed(1) + '" y2="' + y(avg).toFixed(1) + '"/>';
    s += '<polygon class="bz-spark-area" points="' + x(first[0]).toFixed(1) + ',' + h + ' ' + line + ' ' + x(last[0]).toFixed(1) + ',' + h + '"/>';
    s += '<polyline class="bz-spark-line" points="' + line + '" vector-effect="non-scaling-stroke"/>';
    s += '<circle class="bz-spark-dot" cx="' + x(last[0]).toFixed(1) + '" cy="' + y(last[1]).toFixed(1) + '" r="4"/></svg>';
    return s;
  }

  /* ---------- Componentes ---------- */
  function mvHTML(mv) {
    if (mv === 'N') return '<span class="bz-mv bz-mv-new" title="Novo na guilda">NOVO</span>';
    if (mv === '=' || mv == null) return '<span class="bz-mv bz-mv-eq" title="Manteve a posição">–</span>';
    const up = mv[0] === '+';
    return '<span class="bz-mv ' + (up ? 'bz-mv-up' : 'bz-mv-down') + '" title="' + (up ? 'Subiu ' : 'Caiu ') + mv.slice(1) + '">' + (up ? '▲' : '▼') + mv.slice(1) + '</span>';
  }

  const rankState = { k: 'pos', asc: true };
  function renderRanking(el, list, opts) {
    opts = opts || {};
    const ext = {};
    M.forEach(m => { const v = list.map(p => p[m.k]).filter(x => x != null); ext[m.k] = [Math.min.apply(null, v), Math.max.apply(null, v)]; });
    const rows = [...list].sort((a, b) => {
      const dir = rankState.asc ? 1 : -1;
      const x = a[rankState.k], y = b[rankState.k];
      if (typeof x === 'string') return x.localeCompare(y) * dir;
      const vx = x == null ? -Infinity : x, vy = y == null ? -Infinity : y;
      return (vx === vy ? 0 : vx > vy ? 1 : -1) * dir;
    });
    const th = (k, label, cls) => '<th scope="col" class="' + (cls || '') + '"><button type="button" data-sort="' + k + '" aria-label="Ordenar por ' + label + '">' + label + (rankState.k === k ? (rankState.asc ? ' ▲' : ' ▼') : '') + '</button></th>';
    let h = '<div class="bz-table-wrap"><table class="bz-table"><thead><tr>' + th('pos', '#', 'bz-c-pos') + '<th class="bz-c-mv"><span class="bz-sr">Movimento</span></th>' + th('nome', 'Membro', 'bz-c-name') + th('classe', 'Classe', 'bz-c-cls');
    M.forEach(m => { h += th(m.k, m.short, 'bz-c-num'); });
    h += '</tr></thead><tbody>';
    rows.forEach(p => {
      h += '<tr data-member="' + esc(p.nome) + '" tabindex="0"><td class="bz-c-pos">' + p.pos + '</td><td class="bz-c-mv">' + mvHTML(p.mv) + '</td>' +
        '<td class="bz-c-name"><span class="bz-who">' + avatar(p, 'bz-av-xs') + '<span>' + esc(p.nome) + '</span></span></td>' +
        '<td class="bz-c-cls"><span class="bz-cls" title="' + (CLASSES[p.classe] || p.classe) + '">' + icon(p.classe, 16) + esc(p.classe) + '</span></td>';
      M.forEach(m => {
        if (p[m.k] == null) { h += '<td class="bz-c-num"><span class="bz-heat bz-nodata" title="Sem dado nesta semana">–</span></td>'; return; }
        const [a, b] = ext[m.k], t = (p[m.k] - a) / ((b - a) || 1);
        const top = p[m.k] === b, sus = suspect(p, m.k);
        h += '<td class="bz-c-num"><span class="bz-heat' + (top ? ' bz-top' : '') + (sus ? ' bz-sus' : '') + '" style="--mc:var(--m-' + m.k + ');--t:' + t.toFixed(2) + '"' + (sus ? ' title="Valor com casas decimais: confira se foi digitado no formato certo"' : top ? ' title="Melhor da guilda"' : '') + '>' + fmt(p[m.k]) + '</span></td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => {
      const k = b.dataset.sort;
      rankState.asc = rankState.k === k ? !rankState.asc : (k === 'pos' || k === 'nome' || k === 'classe');
      rankState.k = k; renderRanking(el, list, opts);
    });
    el.querySelectorAll('tr[data-member]').forEach(tr => {
      const go = () => opts.onPick && opts.onPick(tr.dataset.member);
      tr.onclick = go; tr.onkeydown = e => { if (e.key === 'Enter') go(); };
    });
  }

  function renderProfile(el, list, w, nome, opts) {
    opts = opts || {};
    const p = list.find(x => x.nome === nome) || list[0];
    const hist = HIST[p.nome];
    const posHist = POS.slice(0, w + 1).map(map => map[p.nome]).filter(v => v != null);
    const best = Math.min.apply(null, posHist);
    const weeksIn = posHist.length;
    let h = '<div class="bz-prof-head">' +
      '<div class="bz-prof-photo">' + avatar(p, 'bz-av-xl') +
      (canEdit() ? '<div class="bz-photo-actions"><button type="button" class="bz-btn bz-btn-photo" data-photo="' + esc(p.nome) + '">' + icon('camera', 16) + 'Trocar foto</button></div>' : '') + '</div>' +
      '<div class="bz-prof-info"><div class="bz-eyebrow">' + icon(p.classe, 16) + (CLASSES[p.classe] || p.classe) + '</div><h2 class="bz-prof-name">' + esc(p.nome) + '</h2>' +
      '<div class="bz-chips"><span class="bz-chip">Posição <b>' + p.pos + 'º</b> ' + mvHTML(p.mv) + '</span><span class="bz-chip">Poder <b>' + fmtVal('poder', p.poder) + '</b></span><span class="bz-chip">Melhor posição <b>' + best + 'º</b></span><span class="bz-chip">Semanas registradas <b>' + weeksIn + '</b></span></div></div>' +
      '<label class="bz-prof-pick" for="bz-member">Membro<select id="bz-member">' + [...list].sort((a, b) => a.nome.localeCompare(b.nome)).map(x => '<option' + (x.nome === p.nome ? ' selected' : '') + '>' + esc(x.nome) + '</option>').join('') + '</select></label></div>';
    h += '<div class="bz-mgrid">';
    M.forEach(m => {
      const have = has(list, m.k);
      const avg = have.length ? have.reduce((a, x) => a + x[m.k], 0) / have.length : null;
      const rk = p[m.k] == null ? null : by(have, m.k).findIndex(x => x.nome === p.nome) + 1;
      const d = p.delta[m.k];
      const vals = hist[m.k].slice(0, w + 1);
      h += '<article class="bz-mcard" style="--mc:var(--m-' + m.k + ')"><header><span class="bz-mlabel">' + icon(m.icon, 18) + m.l + '</span>' +
        (d != null ? '<span class="bz-delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'eq') + '">' + fmtDelta(m.k, d) + '</span>' : '') + '</header>' +
        '<div class="bz-mval' + (suspect(p, m.k) ? ' bz-sus' : '') + '">' + fmtVal(m.k, p[m.k]) + '</div>' + spark(vals, avg) +
        '<footer><span>' + (rk ? rk + 'º de ' + have.length + ' na guilda' : 'sem dado nesta semana') + '</span><span>' + (avg == null ? '' : 'média ' + fmtVal(m.k, Math.round(avg))) + '</span></footer>' +
        '<div class="bz-rankbar" aria-hidden="true"><i style="width:' + (rk ? ((1 - (rk - 1) / have.length) * 100).toFixed(0) : 0) + '%"></i></div></article>';
    });
    h += '</div><p class="bz-footnote">Linha tracejada: média da guilda na semana.</p>';
    el.innerHTML = h;
    el.querySelector('#bz-member').onchange = e => opts.onPick && opts.onPick(e.target.value);
  }

  function alerts(list) {
    const out = [];
    list.forEach(p => {
      if (p.mv === 'N') out.push({ t: 'new', ic: 'star', html: '<b>' + esc(p.nome) + '</b> entrou na guilda esta semana' });
      KEYS.forEach(k => { if (suspect(p, k)) out.push({ t: 'warn', ic: 'alert', html: '<b>' + esc(p.nome) + '</b>: ' + M.find(m => m.k === k).l + ' = ' + fmt(p[k]) + ' parece estar em outro formato. Confira na planilha.' }); });
      if (p.disputa === 0) out.push({ t: 'bad', ic: 'disputa', html: '<b>' + esc(p.nome) + '</b> não pontuou na Disputa' });
      if (p.mv && p.mv[0] === '-') out.push({ t: 'bad', ic: 'up', html: '<b>' + esc(p.nome) + '</b> caiu ' + p.mv.slice(1) + (p.mv.slice(1) === '1' ? ' posição' : ' posições') });
    });
    const order = { warn: 0, bad: 1, new: 2 };
    return out.sort((a, b) => order[a.t] - order[b.t]);
  }

  const guildState = { top: 'conquista' };
  function renderGuild(el, list, w) {
    const prev = w > 0 ? week(w - 1) : null;
    const sum = (l, k) => l.reduce((a, p) => a + (p[k] || 0), 0);
    const tp = sum(list, 'poder'), tpp = prev ? sum(prev, 'poder') : null;
    const tprov = has(list, 'provacao').length ? sum(list, 'provacao') : null, tprovp = prev ? sum(prev, 'provacao') : null;
    const novos = list.filter(p => p.mv === 'N').length;
    const dg = has(list, 'dungeon');
    const maxD = dg.length ? Math.max.apply(null, dg.map(p => p.dungeon)) : null;
    const pct = (a, b) => { const v = (a - b) / b * 100; return (v >= 0 ? '▲ ' : '▼ ') + Math.abs(v).toFixed(1).replace('.', ',') + '%'; };
    const dsum = (a, b) => (a - b >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(a - b)) + ' andares';
    const kpis = [
      { l: 'Poder total', v: fmt(Math.round(tp)) + 'K', d: tpp ? pct(tp, tpp) + ' na semana' : 'primeira semana' },
      { l: 'Poder médio', v: fmt(Math.round(tp / list.length)) + 'K', d: 'por membro' },
      { l: 'Membros', v: list.length, d: novos ? novos + (novos > 1 ? ' novatos' : ' novato') : 'sem novatos' },
      maxD == null ? { l: 'Dungeon', v: '–', d: 'sem dado nesta semana' } : { l: 'Dungeon ' + maxD, v: dg.filter(p => p.dungeon === maxD).length, d: 'membros no nível máximo' },
      tprov == null ? { l: 'Provação somada', v: '–', d: 'sem dado nesta semana' } : { l: 'Provação somada', v: fmt(tprov), d: tprovp ? dsum(tprov, tprovp) : 'andares somados' }
    ];
    let h = '<div class="bz-kpis">' + kpis.map(k => '<div class="bz-kpi"><div class="bz-kpi-l">' + k.l + '</div><div class="bz-kpi-v">' + k.v + '</div><div class="bz-kpi-d">' + k.d + '</div></div>').join('') + '</div>';
    const totals = DATES.slice(0, w + 1).map((_, i) => sum(week(i), 'poder'));
    const step = Math.max(1, Math.ceil(totals.length / 8));
    h += '<div class="bz-dgrid"><section class="bz-box bz-box-wide" style="--mc:var(--m-poder)"><h3>Poder total da guilda</h3>' + spark(totals, null, { w: 600, h: 120 }) +
      (totals.length > 1 ? '<div class="bz-axis">' + DATES.slice(0, w + 1).map((d, i) => '<span>' + ((w - i) % step === 0 ? fmtDate(d).slice(0, 5) : '') + '</span>').join('') + '</div>' : '') + '</section>';
    const cc = {}; list.forEach(p => { cc[p.classe] = (cc[p.classe] || 0) + 1; });
    const mx = Math.max.apply(null, Object.values(cc));
    h += '<section class="bz-box"><h3>Classes</h3>' + Object.entries(cc).sort((a, b) => b[1] - a[1]).map(([c, n]) =>
      '<div class="bz-hbar"><span class="bz-cls">' + icon(c, 16) + (CLASSES[c] || esc(c)) + '</span><span class="bz-hbar-t"><i style="width:' + (n / mx * 100) + '%"></i></span><b>' + n + '</b></div>').join('') + '</section>';
    const m = M.find(x => x.k === guildState.top);
    h += '<section class="bz-box"><h3>Top 5</h3><div class="bz-seg" role="tablist">' + M.map(x => '<button type="button" role="tab" aria-selected="' + (x.k === m.k) + '" data-top="' + x.k + '" style="--mc:var(--m-' + x.k + ')">' + x.short + '</button>').join('') + '</div><ol class="bz-top5" style="--mc:var(--m-' + m.k + ')">' +
      leaders(list, m.k, 5).map(p => '<li data-member="' + esc(p.nome) + '">' + avatar(p, 'bz-av-xs') + '<span>' + esc(p.nome) + '</span><b>' + fmtVal(m.k, p[m.k]) + '</b></li>').join('') + '</ol></section>';
    const al = alerts(list);
    h += '<section class="bz-box"><h3>Alertas da semana</h3>' + (al.length ? '<ul class="bz-alerts">' + al.map(a => '<li class="bz-al-' + a.t + '">' + icon(a.ic, 16) + '<span>' + a.html + '</span></li>').join('') + '</ul>' : '<p class="bz-footnote">Nada fora do normal nesta semana.</p>') + '</section></div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { guildState.top = b.dataset.top; renderGuild(el, list, w); });
  }

  /* ---------- Controlador de página ---------- */
  async function app(cfg) {
    const views = ['hall', 'ranking', 'perfil', 'guilda'];
    const st = { view: 'hall', w: 0, member: null };
    const hsh = (location.hash || '').slice(1);
    if (views.indexOf(hsh) >= 0) st.view = hsh;
    try { await load(); }
    catch (e) {
      const el = document.getElementById(cfg.errorTarget || 'hall');
      if (el) el.innerHTML = '<p class="bz-error">Não consegui carregar os dados (' + esc(e.message) + '). Se você abriu o arquivo direto do disco, rode um servidor local: <code>python3 -m http.server</code></p>';
      return;
    }
    st.w = CUR;
    const api = {
      go(view, member) { if (member) st.member = member; st.view = view; try { history.replaceState(null, '', '#' + view); } catch (e) { /* ok */ } render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      state: st
    };
    const sel = document.getElementById('bz-week');
    if (sel) {
      sel.innerHTML = DATES.map((d, i) => '<option value="' + i + '"' + (i === CUR ? ' selected' : '') + '>Semana ' + fmtDate(d) + '</option>').join('');
      sel.onchange = () => { st.w = +sel.value; render(); };
    }
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); api.go(b.dataset.view); }));
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-member]');
      if (t && !t.closest('table') && !e.target.closest('[data-photo]')) api.go('perfil', t.dataset.member);
    });
    function render() {
      const list = week(st.w);
      if (!st.member || !list.find(p => p.nome === st.member)) st.member = list[0].nome;
      document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-current', b.dataset.view === st.view ? 'page' : 'false'));
      views.forEach(v => { const el = document.getElementById('view-' + v); if (el) el.hidden = v !== st.view; });
      const sub = document.getElementById('bz-weeklabel');
      if (sub) sub.textContent = 'Semana de ' + fmtDate(DATES[st.w]) + ' · ' + list.length + ' membros';
      const pick = n => api.go('perfil', n);
      if (st.view === 'hall') cfg.renderHall(document.getElementById('hall'), list, st.w, api);
      if (st.view === 'ranking') renderRanking(document.getElementById('ranking'), list, { onPick: pick });
      if (st.view === 'perfil') renderProfile(document.getElementById('perfil'), list, st.w, st.member, { onPick: pick });
      if (st.view === 'guilda') renderGuild(document.getElementById('guilda'), list, st.w);
    }
    window.addEventListener('bz:avatar', render);
    render();
    return api;
  }

  window.BZ = {
    app, load, week, M, KEYS, CLASSES, has, by, leaders, climbers, suspect, alerts,
    fmt, fmtVal, fmtDelta, fmtDate, esc, slug, icon, avatar, avatarURL, setPending, squareImage, chooseFile, canEdit, toast,
    logoSVG, spark, mvHTML, renderRanking, renderProfile, renderGuild,
    get DATES() { return DATES; }, get WEEKS() { return WEEKS; }, get AVATARS() { return AVATARS; }, get CUR() { return CUR; }
  };
})();
