/* Brazucas · tela de login: placa da guilda + cards (BZGUILD) + formulário (BZAUTH). */
(function () {
  'use strict';
  const { IC, esc, num, minis, animateCounts, load } = BZGUILD;

  function parts(G) {
    return {
      plaque: '<header class="plaque">' + IC.crest + '<h1 class="nm">' + esc(G.nome) + ' <small>[' + esc(G.tag) + ']</small></h1><p class="ds">Guilda · Eternal Hero</p><div class="lv">Nível ' + num(G.nivel, true) + '</div></header>',
      mini: minis(G, { animate: true }),
      form: '<form class="form" novalidate>' +
        '<label class="field">Usuário<span class="inp"><input name="usuario" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="seu nick, em minúsculas" required><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></span></label>' +
        '<label class="field">Senha<span class="inp"><input name="senha" type="password" autocomplete="current-password" placeholder="••••••••" required><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
        '<button type="button" class="eye" aria-label="Mostrar senha" data-eye><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></span></label>' +
        '<div class="err" aria-live="polite"></div>' +
        '<div class="opts"><label><input type="checkbox" name="lembrar" checked> Lembrar neste aparelho</label><span>Esqueceu a senha? Fale com o admin.</span></div>' +
        '<button class="gbtn" type="submit"><span class="spin"></span><span>Entrar</span></button>' +
        '</form>'
    };
  }

  load().then(G => {
    const P = parts(G);
    document.querySelectorAll('[data-part]').forEach(el => { el.outerHTML = P[el.dataset.part] || ''; });
    requestAnimationFrame(() => requestAnimationFrame(() => animateCounts()));
    const u = document.querySelector('input[name=usuario]'); if (u) u.focus();
  });

  /* pétalas */
  const pet = document.querySelector('.petals');
  if (pet) { let h = ''; for (let i = 0; i < 26; i++) h += '<i style="left:' + (Math.random() * 100) + '%;animation-duration:' + (9 + Math.random() * 9) + 's;animation-delay:-' + (Math.random() * 18) + 's;transform:scale(' + (.6 + Math.random()) + ')"></i>'; pet.innerHTML = h; }

  /* interação */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-eye]'); if (!b) return;
    const inp = b.parentElement.querySelector('input'); const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password'; b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); inp.focus();
  });
  document.addEventListener('input', e => { const w = e.target.closest('.inp'); if (w) { w.classList.remove('bad'); const er = e.target.closest('form').querySelector('.err'); if (er) er.textContent = ''; } });
  document.addEventListener('submit', async e => {
    const f = e.target; if (!f.classList.contains('form')) return; e.preventDefault();
    const usuario = f.usuario.value.trim().toLowerCase(), senha = f.senha.value, er = f.querySelector('.err');
    const fail = (inp, msg) => { inp.closest('.inp').classList.add('bad'); er.textContent = msg; inp.focus(); };
    if (!usuario) return fail(f.usuario, 'Informe seu usuário.');
    if (!senha) return fail(f.senha, 'Informe sua senha.');
    const btn = f.querySelector('.gbtn'); btn.classList.add('busy'); btn.lastElementChild.textContent = 'Entrando…';
    try {
      await BZAUTH.login(usuario, senha, f.lembrar.checked);
      const next = new URLSearchParams(location.search).get('next') || '';
      location.replace(/^[\w.-]+\.html(#\w*)?$/.test(next) ? next : 'index.html');
    } catch (err) {
      btn.classList.remove('busy'); btn.lastElementChild.textContent = 'Entrar';
      f.senha.value = '';
      fail(f.senha, err.message === 'Usuário ou senha incorretos.' ? err.message : 'Não consegui validar agora (' + err.message + ').');
    }
  });
})();
