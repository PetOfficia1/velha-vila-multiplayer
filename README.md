# Velha Vila — Servidor multiplayer (protótipo 0.1)

Servidor Node.js + WebSocket para colocar jogadores em **um mesmo mundo compartilhado** em uma única instância do Render. A página oficial do Velha Vila permanece no Vercel.

**Importante:** este pacote é um backend inicial, não é ainda o multiplayer integrado ao jogo oficial. O front-end do Vercel precisa ser adaptado para enviar as posições e desenhar jogadores remotos. O servidor ainda não valida paredes, movimento, inventário, combate ou contas; isso requer integrar as regras reais do jogo. Os estados ficam em memória e são perdidos quando o Render reinicia. Não use ainda para produção com jogadores reais ou dados valiosos.

## Como subir pelo celular

1. Extraia o ZIP no celular.
2. No navegador, acesse https://github.com/PetOfficia1/velha-vila-multiplayer e clique em **uploading an existing file**. Se o link não aparecer, abra a opção **Add file > Upload files**.
3. Envie os arquivos `server.js`, `package.json`, `render.yaml`, `README.md` e, se possível, `.gitignore` para a raiz do repositório. O `.html` também pode ser enviado, mas não é necessário para hospedar o servidor.
4. Toque em **Commit changes**.
5. No Render, crie **New > Web Service**, escolha o repositório e configure: **Language Node**, **Build Command: `npm install`**, **Start Command: `npm start`**, **Instance Type Free**, **Auto-Deploy On**. Deixe **Root Directory** em branco. Se já existir um serviço Render, revise antes de criar outro.
6. A URL de saúde será `https://NOME-DO-SERVICO.onrender.com/health`, e a WebSocket será `wss://NOME-DO-SERVICO.onrender.com/ws` (substitua pelo endereço real fornecido pelo Render).
7. Abra `teste-multiplayer.html` no navegador e digite a URL WebSocket real. Faça o mesmo em dois aparelhos e teste a movimentação.

## Protocolo WebSocket

Conexão: `wss://SEU-SERVICO.onrender.com/ws`

Cliente envia:

```json
{"type":"join","name":"Jogador1","x":10,"y":10}
{"type":"move","x":11,"y":10}
{"type":"say","text":"Oi!"}
```

Servidor envia: `connected`, `snapshot` (contém `you` e `players`), `player_joined`, `player_moved`, `player_left`, `chat`, `error`.

Exemplo `snapshot`:

```json
{"type":"snapshot","you":"ID","world":"velha-vila-principal","players":[{"id":"ID","name":"Jogador1","x":10,"y":10,"world":"velha-vila-principal"}]}
```

## Limitações atuais

- Mantém um único mundo **por processo**. Use **uma instância**; vários serviços ou réplicas não compartilham o estado sem banco/pubsub.
- Render Free pode suspender por inatividade; quando voltar, conexões são reiniciadas.
- Render não oferece região Santa Catarina nesta configuração. A localização do datacenter deve ser escolhida dentre as regiões disponíveis no painel; a internet brasileira pode acessar o serviço.
- O movimento ainda é informado pelo cliente; implementar validação de velocidade, obstáculos e ataques antes de colocar no jogo oficial.
- Sem login real, persistência, anti-cheat, proteção contra flood mais avançada ou compartilhamento entre instâncias.

Próxima fase: acessar o código-fonte do cliente da versão oficial ou da versão de desenvolvimento aprovada, integrar WebSocket com o motor de movimentação e testar em duas redes distintas antes de publicar qualquer alteração no Vercel.
