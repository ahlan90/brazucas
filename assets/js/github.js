/* Brazucas · gravação no repositório via API do GitHub
   Usado pela página Admin e pelo botão de foto (só aparece para quem configurou o token).
   O token fica salvo apenas no navegador do admin (localStorage). */
(function () {
  'use strict';
  const KEY = 'bz.gh';
  const API = 'https://api.github.com';

  function cfg() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function setCfg(c) { localStorage.setItem(KEY, JSON.stringify(c)); }
  function clearCfg() { try { localStorage.removeItem(KEY); } catch (e) { /* ok */ } }
  function ready() { const c = cfg(); return !!(c && c.owner && c.repo && c.token); }

  // Tenta descobrir dono/repositório pelo endereço do GitHub Pages (dono.github.io/repo)
  function guessRepo() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!m) return {};
    const repo = location.pathname.split('/').filter(Boolean)[0];
    return { owner: m[1], repo: repo && !/\.html$/.test(repo) ? repo : m[1] + '.github.io' };
  }

  async function req(path, opts) {
    const c = cfg();
    if (!c) throw new Error('Configure o acesso ao GitHub primeiro.');
    opts = opts || {};
    const r = await fetch(API + '/repos/' + c.owner + '/' + c.repo + path, {
      method: opts.method || 'GET',
      headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store'
    });
    if (r.status === 404 && opts.allow404) return null;
    if (!r.ok) {
      let msg = '';
      try { msg = (await r.json()).message || ''; } catch (e) { /* ok */ }
      if (r.status === 401) throw new Error('Token inválido ou expirado. Gere um novo na página Admin.');
      if (r.status === 403) throw new Error('O token não tem permissão de escrita neste repositório (Contents: Read and write).');
      if (r.status === 404) throw new Error('Repositório não encontrado. Confira dono e nome na página Admin.');
      if (r.status === 409) throw new Error('Alguém publicou ao mesmo tempo. Tente de novo.');
      throw new Error('GitHub respondeu ' + r.status + (msg ? ': ' + msg : ''));
    }
    return r.status === 204 ? null : r.json();
  }

  const branch = () => (cfg() && cfg().branch) || 'main';
  const encPath = p => p.split('/').map(encodeURIComponent).join('/');

  function b64FromText(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function textFromB64(b64) {
    const bin = atob(b64.replace(/\n/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function getFile(path) {
    const r = await req('/contents/' + encPath(path) + '?ref=' + encodeURIComponent(branch()), { allow404: true });
    return r ? { sha: r.sha, text: r.content ? textFromB64(r.content) : '' } : null;
  }
  async function putFile(path, base64, message) {
    const cur = await getFile(path);
    return req('/contents/' + encPath(path), {
      method: 'PUT',
      body: { message, content: base64, branch: branch(), sha: cur ? cur.sha : undefined }
    });
  }
  async function getJSON(path, fallback) {
    const f = await getFile(path);
    if (!f) return fallback;
    try { return JSON.parse(f.text); } catch (e) { throw new Error(path + ' está com JSON inválido no repositório.'); }
  }
  const putJSON = (path, obj, message) => putFile(path, b64FromText(JSON.stringify(obj, null, 2) + '\n'), message);

  async function test() {
    const r = await req('');
    if (!r.permissions || !r.permissions.push) throw new Error('O token consegue ler, mas não escrever neste repositório.');
    return r;
  }

  // Foto: grava assets/avatars/<slug>.<ext> e atualiza data/avatares.json (com ?v= para furar o cache)
  async function saveAvatar(nome, dataURL) {
    const ext = dataURL.startsWith('data:image/webp') ? 'webp' : 'jpg';
    const path = 'assets/avatars/' + BZ.slug(nome) + '.' + ext;
    await putFile(path, dataURL.split(',')[1], 'Foto de ' + nome);
    const map = await getJSON('data/avatares.json', {});
    map[nome] = path + '?v=' + Date.now();
    await putJSON('data/avatares.json', map, 'Atualiza foto de ' + nome);
    return map[nome];
  }

  // Semana: grava data/semanas/<data>.json (um membro por linha) e inclui a data em data/index.json
  async function saveWeek(date, membros) {
    const body = '{\n  "data": "' + date + '",\n  "membros": [\n' +
      membros.map(m => '    ' + JSON.stringify(m)).join(',\n') + '\n  ]\n}\n';
    await putFile('data/semanas/' + date + '.json', b64FromText(body), 'Semana ' + date + ' (' + membros.length + ' membros)');
    const idx = await getJSON('data/index.json', { guilda: 'Brazucas', semanas: [] });
    if (idx.semanas.indexOf(date) < 0) {
      idx.semanas.push(date); idx.semanas.sort();
      await putJSON('data/index.json', idx, 'Adiciona semana ' + date);
    }
  }

  async function listWeeks() { const idx = await getJSON('data/index.json', { semanas: [] }); return idx.semanas; }

  window.BZGH = { cfg, setCfg, clearCfg, ready, guessRepo, test, saveAvatar, saveWeek, listWeeks, getJSON };
})();
