/* Brazucas · cards da guilda (data/guilda.json): ícones + markup, usados no login e no site. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const IC = {
    raid: '<svg class="ic" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" fill="#2a1a2e" stroke="#0b111b" stroke-width="3"/><path d="M14 36 L36 14" stroke="#e9eef5" stroke-width="5" stroke-linecap="round"/><path d="M36 36 L14 14" stroke="#e9eef5" stroke-width="5" stroke-linecap="round"/><path d="M14 36 L36 14 M36 36 L14 14" stroke="#ff5d6c" stroke-width="2" stroke-linecap="round"/><circle cx="25" cy="25" r="5" fill="#ff5d6c" stroke="#0b111b" stroke-width="2"/></svg>',
    flame: '<svg class="ic" viewBox="0 0 50 50" aria-hidden="true"><path d="M25 6 C27 15 36 17 36 29 A11 11 0 0 1 14 29 C14 22 19 19 20 13 C22 17 25 18 26 15 Z" fill="#ff6a2b" stroke="#0b111b" stroke-width="3" stroke-linejoin="round"/><path d="M25 22 C26 27 31 28 31 33 A6 6 0 0 1 19 33 C19 29 22 28 23 25 Z" fill="#ffd23a"/></svg>',
    potion: '<svg class="ic" viewBox="0 0 50 50" aria-hidden="true"><rect x="19" y="4" width="12" height="8" rx="2" fill="#c9a24a" stroke="#0b111b" stroke-width="3"/><path d="M20 12 H30 V20 C36 23 40 28 40 34 A15 15 0 0 1 10 34 C10 28 14 23 20 20 Z" fill="#163a26" stroke="#0b111b" stroke-width="3" stroke-linejoin="round"/><path d="M12 33 C14 29 20 27 25 28 C30 29 36 29 38 33 A13 13 0 0 1 12 33 Z" fill="#5ad65a"/><circle cx="18" cy="38" r="2" fill="#b6f59a"/><circle cx="30" cy="40" r="1.5" fill="#b6f59a"/></svg>',
    trophy: '<svg class="ic" viewBox="0 0 50 50" aria-hidden="true"><g fill="#4fbf2e" stroke="#0b111b" stroke-width="1.5" stroke-linejoin="round"><path d="M10 6 C3 10 1 19 4 27 C8 24 10 15 10 6 Z M4 21 C-1 28 1 37 6 42 C9 38 8 29 4 21 Z M7 33 C5 41 10 48 17 49 C17 44 13 37 7 33 Z"/><path d="M40 6 C47 10 49 19 46 27 C42 24 40 15 40 6 Z M46 21 C51 28 49 37 44 42 C41 38 42 29 46 21 Z M43 33 C45 41 40 48 33 49 C33 44 37 37 43 33 Z"/></g><path d="M13 3 H37 V17 A12 12 0 0 1 13 17 Z" fill="#ffc928" stroke="#0b111b" stroke-width="2.5" stroke-linejoin="round"/><path d="M13 7 H8 A6 6 0 0 0 14 19 M37 7 H42 A6 6 0 0 1 36 19" fill="none" stroke="#0b111b" stroke-width="2.5"/><path d="M13 7 H8 A6 6 0 0 0 14 19 M37 7 H42 A6 6 0 0 1 36 19" fill="none" stroke="#ffc928" stroke-width="1.5"/><path d="M17 6 H21 V16 A4 4 0 0 1 17 17 Z" fill="#fff0b3"/><path d="M22 29 H28 V34 H22 Z" fill="#e58a00" stroke="#0b111b" stroke-width="2"/><path d="M16 34 H34 L36 42 H14 Z" fill="#ffc928" stroke="#0b111b" stroke-width="2.5" stroke-linejoin="round"/><path d="M25 7 L26.8 10.6 L30.8 11.1 L27.9 13.9 L28.6 17.9 L25 16 L21.4 17.9 L22.1 13.9 L19.2 11.1 L23.2 10.6 Z" fill="#b36b00"/></svg>',
    crest: '<svg class="crest" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3 L58 12 V32 C58 46 47 56 32 61 C17 56 6 46 6 32 V12 Z" fill="#8a3cff" stroke="#0b111b" stroke-width="3" stroke-linejoin="round"/><path d="M32 8 L53 15.5 V32 C53 43 44 51 32 55.5 C20 51 11 43 11 32 V15.5 Z" fill="#a556ff"/><path d="M18 40 L21 24 L28 31 L32 20 L36 31 L43 24 L46 40 Z" fill="#fff" stroke="#0b111b" stroke-width="2" stroke-linejoin="round"/><rect x="18" y="40" width="28" height="5" rx="1.5" fill="#ffc928" stroke="#0b111b" stroke-width="2"/></svg>',
    medal: '<svg class="med" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1 L18 4 V10 C18 14 14 17.5 10 19 C6 17.5 2 14 2 10 V4 Z" fill="#ffc928" stroke="#5a3a00" stroke-width="1.5"/><path d="M10 5 L11.8 8.6 L15.7 9.1 L12.8 11.8 L13.6 15.6 L10 13.7 L6.4 15.6 L7.2 11.8 L4.3 9.1 L8.2 8.6 Z" fill="#7a4a00"/></svg>'
  };

  const FALLBACK = { nome: 'Brazucas', tag: 'BRz', nivel: null, ranking: null, poder: null, raid: null, pesquisa: [null, null, null] };
  /* opts.animate: números sobem contando (data-count), senão valor direto */
  const num = (v, anim) => v == null ? '–' : anim ? '<span data-count="' + (+v) + '">0</span>' : (+v).toLocaleString('pt-BR');
  const txt = v => v == null ? '–' : esc(v);

  function minis(G, opts) {
    const a = !!(opts && opts.animate), p = G.pesquisa || [];
    return '<div class="minis">' +
      '<div class="mini" data-k="rank">' + IC.trophy + '<div><div class="k">Ranking</div><div class="v nogap">#' + num(G.ranking, a) + '</div></div></div>' +
      '<div class="mini" data-k="poder">' + IC.flame + '<div><div class="k">Poder do Clã</div><div class="v">' + IC.medal + txt(G.poder) + '</div></div></div>' +
      '<div class="mini" data-k="raid">' + IC.raid + '<div><div class="k">Raid</div><div class="v">' + num(G.raid, a) + '</div></div></div>' +
      '<div class="mini" data-k="pesq">' + IC.potion + '<div><div class="k">Pesquisa</div><div class="v pesq"><b class="r">' + txt(p[0]) + '</b><span class="s">/</span><b class="g">' + txt(p[1]) + '</b><span class="s">/</span><b class="p">' + txt(p[2]) + '</b></div></div></div>' +
      '</div>';
  }

  function animateCounts(root) {
    (root || document).querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, t0 = performance.now(), dur = 1200;
      (function step(t) { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e).toLocaleString('pt-BR'); if (p < 1) requestAnimationFrame(step); })(t0);
    });
  }

  let cache = null;
  function load() {
    if (!cache) cache = fetch('data/guilda.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(g => Object.assign({}, FALLBACK, g));
    return cache;
  }

  window.BZGUILD = { IC, esc, num, txt, minis, animateCounts, load };
})();
