# Brazucas · site da guilda

Site estático da guilda Brazucas (Eternal Hero): home com pódio e campeões por modalidade, ranking semanal, perfil de cada membro com foto e painel da guilda. Roda de graça no GitHub Pages, sem servidor e sem banco: cada semana é um arquivo JSON no repositório, e o histórico do git guarda tudo.

## Publicar no GitHub Pages (uma vez)

1. Crie um repositório no GitHub, por exemplo `brazucas`. Pode ser público (o Pages gratuito exige repositório público em contas free).
2. Envie esta pasta para ele:
   ```bash
   cd brazucas-site
   git init -b main
   git add .
   git commit -m "Site da guilda Brazucas"
   git remote add origin https://github.com/SEU_USUARIO/brazucas.git
   git push -u origin main
   ```
3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`. Salve.
4. Em cerca de 1 minuto o site fica em `https://SEU_USUARIO.github.io/brazucas/`.

## Acesso dos membros

O site pede login (`login.html`). Os usuários ficam em `data/usuarios.json`: um por membro, usuário = nick em minúsculas, perfil `jogador` ou `administrador` (só o admin vê a página Admin). A senha é guardada como hash PBKDF2-SHA256 com salt por usuário; a senha em texto nunca entra no repositório.

- Senha inicial de todos: a combinada no grupo da guilda. Cada um deve trocar.
- Para criar, remover ou trocar senha: edite `data/usuarios.json`. Gerar hash novo:
  ```bash
  node -e 'const c=require("crypto");const s=c.randomBytes(16).toString("hex");console.log(JSON.stringify({salt:s,hash:c.pbkdf2Sync(process.argv[1],s,120000,32,"sha256").toString("hex")}))' 'SENHA'
  ```
- Membro renomeado: troque `usuario` e `nome` na mesma linha.

**Limite importante:** o site é estático, então o login é um portão de conveniência, não segurança. Quem souber a URL de `data/usuarios.json` consegue baixar os hashes, e uma senha compartilhada é fácil de adivinhar. Não guarde nada sensível no site. Repositório privado não muda isso: o GitHub Pages continua servindo os arquivos publicamente (e, em conta gratuita, Pages só funciona em repositório público).

## Atualizar toda semana

Tudo pela página **Admin** (`/admin.html`, link no canto do menu):

1. **Acesso ao GitHub** (só na primeira vez em cada navegador): crie um *fine-grained token* com acesso **só a este repositório** e permissão **Contents: Read and write**. Cole dono, repositório e token, e clique em *Salvar e testar*.
2. **Publicar semana**: escolha a data, copie as linhas da planilha (pode incluir o cabeçalho), cole e clique em *Conferir dados*. A página marca valores suspeitos (casas decimais, quedas grandes, campos vazios) e mostra quem entrou e quem saiu. Dá para corrigir direto na tabela. Depois, *Publicar semana*.
3. **Fotos**: clique no membro e escolha a imagem. Ela é cortada em quadrado e substitui a anterior. Com o navegador conectado, o ícone de câmera também aparece nos cards do site.

Cada publicação vira um commit. O site atualiza para todos em cerca de 1 minuto.

O token fica salvo só no navegador de quem configurou. Para dar acesso a outro admin, adicione a pessoa como colaboradora do repositório e ela gera o próprio token. Para revogar, apague o token em GitHub → Settings → Developer settings.

## Estrutura

```
login.html                 entrada (dados da guilda + formulário)
index.html                 site (Home, Ranking, Perfil, Guilda)
admin.html                 publicar semana e trocar fotos (só administrador)
data/usuarios.json         usuários, perfis e hashes de senha
data/guilda.json           nível, ranking, poder, raid e pesquisa da guilda (login e faixa acima do menu)
data/index.json            lista de semanas publicadas
data/semanas/AAAA-MM-DD.json   dados de cada semana (um membro por linha)
data/avatares.json         nome do membro → arquivo da foto
assets/avatars/            fotos dos personagens
assets/js/core.js          leitura dos dados, cálculos e componentes
assets/js/github.js        gravação no repositório pela API do GitHub
assets/js/auth.js          login, sessão e bloqueio por perfil
assets/js/login.js         tela de login
assets/js/guilda.js        cards da guilda (ranking, poder, raid, pesquisa)
assets/css/                estilos (base.css + arena.css; login.css só na entrada)
assets/game/               arte do jogo, logo e favicon
```

Formato de um membro na semana:

```json
{"posicao":1,"movimento":"=","nome":"Torr","classe":"Pistolas","poder":477,"conquista":10245,"dungeon":29,"fenda":1331,"torre":1181,"provacao":2810,"disputa":193}
```

- `classe`: `Rifle`, `Staff`, `Pistolas`, `DB`, `2H`, `Arco` ou `Orb`.
- Modalidade ausente no JSON = sem dado naquela semana: o site mostra `–` e não entra nos campeões, médias ou evolução.
- `poder` e `disputa` em milhares (K), como na planilha.
- `posicao` vem da planilha. `movimento` (`+2`, `-1`, `N`, `=`) só é usado na primeira semana; a partir da segunda, o site calcula sozinho comparando com a semana anterior, assim como "os que mais subiram" e os gráficos de evolução.

## Rodar no computador

O site lê arquivos JSON, então precisa de um servidor local (abrir o `index.html` direto do disco não funciona):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Observações

- As semanas de 26/05/2026 e 02/06/2026 vieram da aba *Clã* da planilha *Eternal Hero - Wiki* (só poder, disputa e arma; as datas foram estimadas pela última edição da planilha). Não há semanas entre 02/06 e 13/10, então o movimento e a evolução de 13/10 comparam com 02/06.
- A semana do jogo vira no domingo, então as datas das semanas são o domingo de início.
- A semana de 04/10/2026 foi transcrita da planilha (originalmente datada 13/10). Dois valores parecem digitados em outro formato e aparecem marcados no site: Disputa do Vaguinho (66,15) e Poder do CoyoTe (81,06).
- A semana de 11/10/2026 veio de prints do perfil de cada membro no jogo: poder = "Maior", conquista = selo dourado abaixo do nick, fenda = Fenda Heroica, torre = A Torre, provação = Terras da Provação Heroicas. Dungeon não aparece no perfil; disputa vem da guerra da guilda (dado separado). Ambos ficaram sem dado. Sem posição da guilda, o site ordena por poder. Renomeados no histórico: Snip → InvejaMATA, Crowkiller → CrowKiller.
- As fotos atuais foram recortadas dos prints do perfil no jogo (13/10/2026).
- Fan site sem vínculo com a Rivvy Games. A arte do jogo foi extraída do APK v3.3.0.
