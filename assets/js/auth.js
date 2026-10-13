/* Brazucas · autenticação no navegador.
   Usuários ficam em data/usuarios.json (senha = PBKDF2-SHA256 com salt por usuário).
   A sessão fica em localStorage['bz.sess'] (lembrar) ou sessionStorage['bz.sess'].
   Isso é um portão de conveniência, não segurança real: o site é estático e os
   arquivos de dados continuam públicos para quem souber a URL. */
(function () {
  'use strict';
  const KEY = 'bz.sess', LOGIN = 'login.html', HOME = 'index.html';
  const enc = new TextEncoder();

  async function hash(senha, salt, iteracoes) {
    const key = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: iteracoes }, key, 256);
    return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
  }

  let cache = null;
  async function users() {
    if (!cache) {
      const r = await fetch('data/usuarios.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('usuarios.json ' + r.status);
      cache = await r.json();
    }
    return cache;
  }

  function store() { try { return localStorage.getItem(KEY) ? localStorage : sessionStorage; } catch (e) { return sessionStorage; } }
  function session() {
    try { const s = JSON.parse(store().getItem(KEY) || 'null'); return s && s.usuario ? s : null; } catch (e) { return null; }
  }
  function setSession(s, lembrar) {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) { /* ok */ }
    (lembrar ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
  }
  function logout() {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) { /* ok */ }
    location.replace(LOGIN);
  }

  /* Devolve {usuario, nome, perfil} ou lança Error com mensagem para a tela. */
  async function login(usuario, senha, lembrar) {
    const db = await users();
    const u = db.usuarios.find(x => x.usuario === String(usuario || '').trim().toLowerCase());
    const h = await hash(senha, u ? u.salt : 'x', db.iteracoes);   // calcula sempre, para não revelar se o usuário existe pelo tempo
    if (!u || h !== u.hash) throw new Error('Usuário ou senha incorretos.');
    const s = { usuario: u.usuario, nome: u.nome, perfil: u.perfil, t: Date.now() };
    setSession(s, !!lembrar);
    return s;
  }

  /* Chamar no <head> das páginas protegidas. perfil opcional ('administrador').
     Sem sessão → login. Perfil insuficiente → home. Depois confere, em segundo
     plano, se o usuário ainda existe (removido do JSON = sessão encerrada). */
  function require(perfil) {
    const s = session();
    if (!s) { location.replace(LOGIN + '?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.hash)); return null; }
    if (perfil && s.perfil !== perfil) { location.replace(HOME); return null; }
    users().then(db => {
      const u = db.usuarios.find(x => x.usuario === s.usuario);
      if (!u) logout();
      else if (u.perfil !== s.perfil || u.nome !== s.nome) { s.perfil = u.perfil; s.nome = u.nome; setSession(s, store() === localStorage); if (perfil && s.perfil !== perfil) location.replace(HOME); }
    }).catch(() => { /* offline: mantém a sessão */ });
    return s;
  }

  window.BZAUTH = { hash, users, session, login, logout, require, isAdmin: () => { const s = session(); return !!s && s.perfil === 'administrador'; } };
})();
