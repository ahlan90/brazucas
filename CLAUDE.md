# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Site estático da guilda Brazucas (jogo Eternal Hero): Home (pódio + campeões por modalidade; internamente a view ainda se chama `hall`), ranking semanal, perfil por membro e painel da guilda. Hospedado no GitHub Pages direto da raiz (`.nojekyll` presente). **Não há servidor nem banco: o repositório git é o banco de dados.** Cada semana é um JSON em `data/semanas/`, e a página Admin grava no repo pela API do GitHub a partir do navegador.

Todo o texto de UI, comentários e identificadores estão em pt-BR (chaves sem acento: `provacao`). Manter assim.

## Comandos

Sem build, sem dependências, sem lint, sem testes. Vanilla JS (ES2017+), CSS puro.

```bash
# rodar local (obrigatório: abrir index.html do disco falha, o site faz fetch de JSON)
python3 -m http.server 8000     # http://localhost:8000
```

Deploy = push na `main`; o Pages republica em ~1 min. Setup inicial do Pages está no README.

## Arquitetura

### Login e perfis (`assets/js/auth.js` → `window.BZAUTH`)

- `data/usuarios.json`: `{algoritmo, iteracoes, usuarios:[{usuario, nome, perfil, salt, hash}]}`. `usuario` = nick em minúsculas; `nome` = nick como aparece nas semanas; `perfil` = `jogador` | `administrador`. Hash = PBKDF2-SHA256 (WebCrypto no navegador, `node:crypto` para gerar). Comando de gerar hash está no README.
- `index.html` e `admin.html` carregam `auth.js` **no `<head>`** e chamam `BZAUTH.require()` / `BZAUTH.require('administrador')` antes de qualquer render: sem sessão → `login.html?next=…`; perfil insuficiente → `index.html`. Em segundo plano, `require` confere se o usuário ainda existe no JSON (removido = sessão encerrada).
- Sessão: `localStorage['bz.sess']` ("lembrar") ou `sessionStorage['bz.sess']`, `{usuario, nome, perfil, t}`. `BZAUTH.logout()` limpa e volta ao login.
- `login.html` tem CSS/JS próprios (`login.css`, `login.js`), não usa `core.js`. Os números do cabeçalho vêm de `data/guilda.json`.
- É um portão de conveniência: o site é estático e `usuarios.json` é público. Não tratar como segurança.

### Dois módulos globais (IIFE), carregados nesta ordem

- `assets/js/core.js` → `window.BZ`: carrega dados, deriva histórico/posições/movimentos, formata, renderiza Ranking/Perfil/Guilda, cuida de avatares e toasts.
- `assets/js/github.js` → `window.BZGH`: leitura/escrita no repo via GitHub Contents API. Token fine-grained fica só em `localStorage['bz.gh']`.
- Dependência cruzada: `core.js` checa `window.BZGH` em tempo de execução (botão de câmera só aparece se `BZGH.ready()`); `github.js` usa `BZ.slug`.
- `index.html` e `admin.html` carregam ambos e têm seu script inline. `renderHall` vive inline no `index.html` e é injetado via `BZ.app({ renderHall })`; os outros três renderers estão no `core.js`.

### Fluxo de dados (`core.js`)

`data/index.json` lista as datas → `load()` busca cada `data/semanas/<AAAA-MM-DD>.json` (`{data, membros:[...]}`) e `data/avatares.json` (nome → caminho da foto, possivelmente com `?v=` de cache-bust).

`load()` monta três estruturas derivadas:
- `HIST[nome][metrica]` = array indexado por semana (null quando o membro não estava).
- `POS[w][nome]` = posição na semana `w`. Vem do campo `posicao`; se **qualquer** membro da semana não tiver `posicao`, a semana inteira cai para ordenação por `poder`.
- `week(w)` devolve a lista normalizada com `pos`, `prev`, `delta` e `mv`. Métrica ausente fica `null` (= sem dado; semanas antigas só têm `poder` e `disputa`). Todo renderer precisa tolerar `null`: usar `has(list, k)` antes de somar/ordenar, `fmt`/`fmtVal` já devolvem `–`.

Regra do movimento (`mv`): só a **primeira** semana usa o campo `movimento` do arquivo. Da segunda em diante é calculado comparando `POS[w-1]`. `delta` é `null` sem semana anterior, por isso "Os que mais subiram" e gráficos ficam vazios na primeira semana.

### Fonte dos dados por semana

- A semana do jogo vira no **domingo**: a data do arquivo é o domingo de início.
- Semanas vindas de prints do perfil no jogo (ex.: 2026-10-11): `poder` = "Maior"/1000, `conquista` = selo dourado abaixo do nick, `fenda` = Fenda Heroica, `torre` = A Torre, `provacao` = Terras da Provação Heroicas. Classe pela arma do card central (pistolas cruzadas = `Pistolas`, tridente = `Staff`, espada/martelo = `2H`, arma longa = `Rifle`). Dungeon e posição da guilda não aparecem no perfil; `disputa` vem da guerra da guilda (dado separado, fornecido pelo usuário): omitir (null) e deixar o site ordenar por poder.
- Membro renomeado: trocar o nome em **todos** os JSONs de `data/semanas/`, em `avatares.json` (porque `HIST` é indexado por nome) e em `usuarios.json` (`usuario` e `nome`). Membro novo = linha nova em `usuarios.json`; membro que saiu = remover a linha.

### Modalidades: `M` é a fonte única

`M` em `core.js` define as 7 métricas (`conquista, poder, torre, provacao, disputa, fenda, dungeon`). Para adicionar/renomear uma métrica é preciso tocar em todos estes pontos:
1. `M` e `ICONS` em `core.js`; regras de unidade em `fmtVal`/`fmtDelta` (`poder` e `disputa` são em milhares, "K"; `dungeon` é nível; o resto é andar).
2. Variável `--m-<chave>` no `:root` de `arena.css` (cor da modalidade, aplicada via `--mc` inline).
3. `NUMK` e a ordem de colunas em `parsePaste` no `admin.html`. **A ordem ali é a da planilha, não a de `M`**: `[pos?] [seta?] nome poder classe conquista dungeon fenda torre provacao disputa`. O parser localiza a coluna de classe por alias (`CLASS_ALIASES`) e lê as demais por offset relativo.

Classes de personagem: `CLASSES` em `core.js` (`Rifle, Staff, Pistolas, DB, 2H, Arco, Orb`), ícones em `ICONS` com a mesma chave, aliases de parsing em `admin.html`.

### Heurística de valor suspeito

Valor com casas decimais numa métrica inteira = provável erro de digitação (ex.: `66,15`). `suspect()` marca com `.bz-sus` no ranking/perfil e gera alerta no painel Guilda. O Admin também avisa (e marca queda >30% vs semana anterior), mas não bloqueia a publicação; só erros (campo vazio, nome repetido) bloqueiam.

### Escrita no repo (`github.js`)

- `saveWeek` grava `data/semanas/<data>.json` **um membro por linha** (string montada à mão, não `JSON.stringify(…, null, 2)`) para diff legível no git, e adiciona a data em `index.json`. Manter esse formato se editar à mão.
- `saveAvatar`: `squareImage` recorta 360px → webp (fallback jpeg) → PUT em `assets/avatars/<slug>.<ext>` → atualiza `avatares.json` com `?v=<timestamp>`. Depois `setPending` guarda a data URL em `localStorage['bz.pending.<nome>']` por 15 min para quem enviou ver a foto antes do Pages republicar; `avatarURL` consulta esse cache primeiro. Evento `bz:avatar` dispara re-render.
- Cada PUT faz GET antes para pegar o `sha`; 409 = publicação concorrente.

### Renderização e eventos

HTML montado por concatenação de string + `innerHTML`. **Sempre passar dados de membro por `esc()`.** Delegação global de eventos:
- `[data-view]` → troca de aba; views são `section#view-<nome>` alternadas com `hidden`; hash da URL (`#hall|#ranking|#perfil|#guilda`) define a aba inicial.
- `[data-member]` → abre perfil (exceto dentro de `<table>`, que tem handler próprio por linha).
- Ranking: `rankState` guarda ordenação e filtros (`f` por coluna). Filtro não re-renderiza, só alterna `hidden` nas linhas (preserva foco); ordenar/limpar re-renderiza e reaplica `f`. Filtro numérico aceita `300`, `>300`, `<=100`, `100-200` (`numTest`).
- `[data-photo]` → troca de foto (listener em fase de captura, com `stopPropagation`).

### CSS

- `base.css`: estrutura dos componentes compartilhados, tudo com prefixo `.bz-*`, usa só tokens (`var(--…)`). Não define cores.
- `arena.css`: o tema ("Arena", visual do jogo). Define os tokens no `:root` e as classes de layout de página sem prefixo (`.hero`, `.gbtn`, `.card`, `.hcard`, `.podium`, `.adm`…). Comentário do `base.css` deixa explícito que o tema é trocável.
