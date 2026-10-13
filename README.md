# Brazucas · site da guilda

Site estático da guilda Brazucas (Eternal Hero): Hall da Fama por modalidade, ranking semanal, perfil de cada membro com foto e painel da guilda. Roda de graça no GitHub Pages, sem servidor e sem banco: cada semana é um arquivo JSON no repositório, e o histórico do git guarda tudo.

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

## Atualizar toda semana

Tudo pela página **Admin** (`/admin.html`, link no canto do menu):

1. **Acesso ao GitHub** (só na primeira vez em cada navegador): crie um *fine-grained token* com acesso **só a este repositório** e permissão **Contents: Read and write**. Cole dono, repositório e token, e clique em *Salvar e testar*.
2. **Publicar semana**: escolha a data, copie as linhas da planilha (pode incluir o cabeçalho), cole e clique em *Conferir dados*. A página marca valores suspeitos (casas decimais, quedas grandes, campos vazios) e mostra quem entrou e quem saiu. Dá para corrigir direto na tabela. Depois, *Publicar semana*.
3. **Fotos**: clique no membro e escolha a imagem. Ela é cortada em quadrado e substitui a anterior. Com o navegador conectado, o ícone de câmera também aparece nos cards do site.

Cada publicação vira um commit. O site atualiza para todos em cerca de 1 minuto.

O token fica salvo só no navegador de quem configurou. Para dar acesso a outro admin, adicione a pessoa como colaboradora do repositório e ela gera o próprio token. Para revogar, apague o token em GitHub → Settings → Developer settings.

## Estrutura

```
index.html                 site (Hall da Fama, Ranking, Perfil, Guilda)
admin.html                 publicar semana e trocar fotos
data/index.json            lista de semanas publicadas
data/semanas/AAAA-MM-DD.json   dados de cada semana (um membro por linha)
data/avatares.json         nome do membro → arquivo da foto
assets/avatars/            fotos dos personagens
assets/js/core.js          leitura dos dados, cálculos e componentes
assets/js/github.js        gravação no repositório pela API do GitHub
assets/css/                estilos (base.css + arena.css)
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
- A semana de 13/10/2026 foi transcrita da planilha. Dois valores parecem digitados em outro formato e aparecem marcados no site: Disputa do Vaguinho (66,15) e Poder do CoyoTe (81,06).
- As 8 fotos iniciais foram recortadas da imagem de destaques da planilha. Os demais membros aparecem com o ícone da classe até alguém enviar a foto.
- Fan site sem vínculo com a Rivvy Games. A arte do jogo foi extraída do APK v3.3.0.
