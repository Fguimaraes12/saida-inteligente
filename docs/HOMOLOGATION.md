# Homologação sintética no Windows

Este ambiente temporário executa o mesmo monólito React/Express/PostgreSQL/Prisma/Socket.io. O servidor definitivo será o da escola; este guia não implanta produção. Use exclusivamente alunos fictícios, e-mails dos testadores autorizados e contas de teste. Não importe bancos, senhas, arquivos ou dados reais da escola.

## Requisitos

- Windows 11 atualizado, virtualização habilitada, WSL 2 e Docker Desktop configurado para **Linux containers**, usando o engine WSL 2. Siga os requisitos oficiais do Docker para sua edição do Windows; reserve inicialmente 4 GB de RAM para o Docker e pelo menos 20 GB livres para imagens, cache e volume. O Cloud com disco de 8 GB/VFS encontrou falta de espaço durante a validação.
- Git, PowerShell **7.2 ou superior** (`pwsh`) e navegador atual. Não é necessário instalar Node, npm, PostgreSQL ou Nginx no Windows.
- `cloudflared` atual pelo [download oficial](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/), com suporte a `--allowed-mail` (disponível a partir de 2026.9.2). Por exemplo, `winget install --id Cloudflare.cloudflared --exact`; se já instalado, `winget upgrade --id Cloudflare.cloudflared --exact`. Reabra o terminal e confira `cloudflared --version` e `cloudflared tunnel --help`.
- Rede com acesso aos registros das imagens oficiais, npm e `binaries.prisma.sh` durante o build; conectividade de saída exigida pela Cloudflare durante o túnel. Não é necessário abrir portas no roteador. Políticas corporativas/proxy podem exigir configuração aprovada de CA/rede; nunca use `--no-tls-verify` ou desative TLS/checksum.

Use um checkout privado local, fora de OneDrive/pastas compartilhadas, e abra o PowerShell 7 na raiz dele. Confira:

```powershell
git branch --show-current
git status --short
docker version
docker compose version
```

Use os arquivos desta entrega em `feature/SI-030`. O checkpoint da validação anterior é `b5d2639` (somente documentação); ele sozinho ainda não contém a configuração descrita neste guia. Nenhum push desta entrega foi realizado automaticamente.

## Estrutura e segurança

```text
Navegador HTTPS → Cloudflare (PIN por e-mail) → cloudflared no Windows
    → 127.0.0.1:8080 → Nginx → frontend estático / API / Socket.io
                                  backend → PostgreSQL em rede interna
```

`compose.homolog.yaml` é independente do `compose.yaml` de desenvolvimento. Não combine os dois. Há um volume exclusivo, redes internas de banco/aplicação e uma rede de entrada usada somente pelo proxy. A única porta publicada é **127.0.0.1:8080** do proxy. PostgreSQL e backend não publicam portas. Não crie redirecionamentos no roteador nem altere o bind para `0.0.0.0`.

O job `prepare` executa `npm run prisma:migrate:deploy`, usa o seed oficial somente em um subprocesso de teste e troca imediatamente a senha transitória por **22 senhas individuais aleatórias**, com Argon2id, antes de liberar a API. O backend usa `NODE_ENV=production` para manter as guardas HTTPS e o cookie Secure; não recebe senha de seed nem credencial administrativa do banco. O papel de runtime tem grants limitados e não acessa `_prisma_migrations`. Não há novas rotas ou funcionalidades de negócio.

O bootstrap recusa banco/arquivo de credenciais incompatíveis. Reiniciar preserva as senhas; não as redefine. Este provisionamento atende somente à fixture sintética, não é o procedimento de criação de contas de produção da escola.

## Inicializar a máquina, uma vez

```powershell
pwsh -File .\scripts\Initialize-Homolog.ps1
docker compose --env-file .env.homolog -f compose.homolog.yaml config --quiet
docker compose --env-file .env.homolog -f compose.homolog.yaml build
docker compose --env-file .env.homolog -f compose.homolog.yaml up -d --wait
docker compose --env-file .env.homolog -f compose.homolog.yaml ps -a
```

O inicializador cria `.env.homolog` com senhas de banco e JWT novos, além de `deploy/homolog/private/`. Ambos são ignorados pelo Git e pelo contexto Docker. No Windows, aplica ACL ao usuário atual; mantenha essa proteção. Se a execução de scripts for recusada por política corporativa, solicite a liberação aprovada; o guia não requer desativar a política de execução.

O build usa `npm ci`, geração/validação oficial do Prisma e builds TypeScript/Vite. `prepare` deve terminar com código 0; PostgreSQL, backend e proxy devem ficar saudáveis. Na primeira inicialização são criados 4 segmentos, 16 salas e 22 contas, **sem alunos**. Os nomes das contas são os documentados no README; as senhas não são as de desenvolvimento.

| Variável em `.env.homolog` | Uso |
| --- | --- |
| POSTGRES_PASSWORD | Credencial administrativa exclusiva do cluster sintético; 64 caracteres hexadecimais |
| POSTGRES_RUNTIME_PASSWORD | Senha distinta do papel restrito da API; mesmo formato |
| JWT_SECRET | Segredo aleatório exclusivo, gerado pelo inicializador |
| HOMOLOG_HTTP_PORT | Porta local do Nginx, padrão 8080 |
| FRONTEND_ORIGIN | Origem HTTPS exata do Quick Tunnel; inicialmente `https://pending.invalid` |
| PUBLIC_HOST | Host correspondente autorizado pelo Nginx |
| PUBLIC_WS_ORIGIN | Origem `wss://` correspondente para a política de segurança do frontend |

Não publique `docker compose config` completo ou `docker inspect`: eles podem mostrar segredos. Use `config --quiet`. Não copie `.env` ou `backend/.env` do desenvolvimento. Não altere a senha administrativa com volume existente; o PostgreSQL não reaplica automaticamente as variáveis de inicialização.

As senhas das 22 contas ficam **somente** em `deploy/homolog/private/credentials.json`. Consulte esse arquivo localmente, sem colar o conteúdo em chat, issue, logs ou captura de tela. Entregue a cada testador somente as contas de teste necessárias, por canal privado. Não compartilhe a senha administrativa do banco ou JWT. A URL não é um segredo nem substitui o PIN/login.

## Abrir uma sessão de homologação

No terminal A, inicie explicitamente o túnel protegido, substituindo pelos e-mails individuais autorizados:

```powershell
.\scripts\Start-HomologTunnel.ps1 -AllowedEmail @('testador1@example.com', 'testador2@example.com')
```

O script verifica a existência de `--allowed-mail` e recusa execução sem lista explícita ou com curingas. Se a versão instalada não suportar a opção, atualize pela fonte oficial; **não remova a opção para continuar**. Ele também recusa configuração `config.yml/config.yaml` pré-existente no diretório cloudflared do usuário: preserve essa configuração e trate o conflito antes de usar Quick Tunnel.

Mantenha esse terminal aberto. Copie a URL **HTTPS** `https://nome-aleatorio.trycloudflare.com` impressa pelo cloudflared. Neste momento, o Nginx ainda rejeita o novo host: o ambiente começa fechado com `pending.invalid`.

No terminal B, atualize a origem usando a URL real, sem barra final:

```powershell
pwsh -File .\scripts\Set-HomologOrigin.ps1 -Origin https://nome-aleatorio.trycloudflare.com
docker compose --env-file .env.homolog -f compose.homolog.yaml up -d --no-deps --force-recreate --wait backend proxy
```

O script atualiza as três variáveis de origem juntas; a recriação aplica a nova configuração. Não é necessário reconstruir imagens: o frontend usa URLs relativas. Se alterar a porta local, mantenha `HOMOLOG_HTTP_PORT` e `Start-HomologTunnel.ps1 -Port` iguais.

Abra a URL no navegador. Primeiro autentique o **e-mail autorizado por PIN da Cloudflare**; depois entre com a **conta sintética do sistema**. Nenhum domínio próprio ou conta Cloudflare é necessário para o Quick Tunnel. Para mudar a lista de e-mails, encerre o processo e inicie outro túnel; repita a atualização de origem, pois a URL muda. Não reutilize a origem anterior, não use CORS `*` e não desative o `originGuard`.

O TLS público é verificado normalmente no navegador e o cloudflared mantém seu transporte seguro. O salto HTTP intencional é somente do processo local cloudflared ao Nginx em loopback/Docker; não há flag para ignorar certificado. Frontend, API `/api` e `/socket.io` compartilham a mesma origem pública. O cookie de sessão permanece HttpOnly/Secure/SameSite=Lax. O Nginx encaminha o upgrade WebSocket e o backend mantém autenticação/escopo dos canais.

## Alternativa: Tailscale Funnel (URL fixa)

O Quick Tunnel protegido é temporário: a URL muda a cada sessão e, na validação de 10/11/2026 em Windows, o login do app falhou por trás da proteção por PIN. As chamadas `fetch` receberam um redirecionamento para `login.trycloudflare.com`, bloqueado pela CSP da aplicação (`connect-src 'self'`), e a resposta `Unauthorized` do cloudflared chegou ao frontend como texto, não JSON (`Unexpected token ... is not valid JSON`). Para uma demonstração com URL estável, o Tailscale Funnel publica o mesmo Nginx em `127.0.0.1:8080` com HTTPS válido e sem esse intermediário. O guia do Quick Tunnel acima continua válido; escolha um dos dois, nunca os dois ao mesmo tempo.

**Requisitos:** conta Tailscale gratuita, app Tailscale instalado e conectado (`tailscale up`), **MagicDNS** e **HTTPS Certificates** habilitados em https://login.tailscale.com/admin/dns e o Funnel liberado para o computador. Na primeira execução, `tailscale funnel` imprime o link de aprovação se o Funnel ainda não estiver habilitado.

```powershell
tailscale funnel --bg 8080
```

O comando imprime `https://<computador>.<tailnet>.ts.net/`; esse nome é estável. Para desligar o acesso público: `tailscale funnel --https=443 off`. Confira com `tailscale funnel status`.

`Set-HomologOrigin.ps1` aceita somente `*.trycloudflare.com`. Para o Funnel, defina as três variáveis de origem de uma vez (substitua o host, sem `https://` nem barra final) e recrie backend e proxy:

```powershell
$h = '<computador>.<tailnet>.ts.net'
$f = '.\.env.homolog'
$l = Get-Content $f
$l = $l -replace '^FRONTEND_ORIGIN=.*', "FRONTEND_ORIGIN=https://$h"
$l = $l -replace '^PUBLIC_HOST=.*', "PUBLIC_HOST=$h"
$l = $l -replace '^PUBLIC_WS_ORIGIN=.*', "PUBLIC_WS_ORIGIN=wss://$h"
Set-Content $f $l -Encoding utf8NoBOM
docker compose --env-file .env.homolog -f compose.homolog.yaml up -d --no-deps --force-recreate --wait backend proxy
```

Como o host é fixo, essa configuração é feita uma única vez. Teste localmente com `curl.exe -s -o NUL -w "%{http_code}`n" -H "Host: $h" http://127.0.0.1:8080/api/health` (esperado `200`) e depois abra a URL pública: a tela de login do sistema aparece direto.

**Cuidados.** O Funnel é público e **não** tem o filtro por e-mail do Quick Tunnel protegido: a proteção é o login do sistema, com o limite de tentativas do Nginx (5/min por IP). Use somente dados sintéticos, mantenha-o ligado só durante a demonstração e desligue depois. O Tailscale aplica limites de banda não publicados no Funnel. O nome da sua rede `.ts.net` pode aparecer em registros públicos de certificados. O computador, o Docker Desktop e os containers precisam estar ativos. Isto continua sendo homologação sintética, não uma aprovação de infraestrutura para produção.

## Conferir antes de convidar os testadores

```powershell
docker compose --env-file .env.homolog -f compose.homolog.yaml ps -a
docker compose --env-file .env.homolog -f compose.homolog.yaml logs --tail 80 prepare backend proxy
docker compose --env-file .env.homolog -f compose.homolog.yaml exec proxy nginx -t
```

No navegador, após o PIN, confira `/api/health`, login/logout e os três perfis. Faça cadastro/edição/inativação/importação somente de alunos fictícios; chame um aluno na Portaria e confirme Sala/Sala Geral, isolamento de outra sala, duplicidade e recuperação após offline. Confira o cookie Secure/HttpOnly e o status Conectado. O handshake WebSocket deve usar `wss://` e responder 101; o polling inicial também é parte normal do Socket.io.

Em janela anônima/segundo navegador, confirme que um e-mail não autorizado **não chega à aplicação**. Esse teste negativo, o PIN e o WebSocket atravessando a Cloudflare devem ser comprovados na máquina Windows antes de distribuir o link. Um `curl` remoto sem sessão interativa pode receber a tela de autenticação em vez da API; isso é esperado para o túnel protegido.

Registre o aceite em `MVP_PROGRESS.md`, com data, navegador/dispositivo, rede e resultados reais. Não exponha credenciais ou traces com cookies. Não marque issues concluídas só porque os containers estão saudáveis.

## Encerrar e retomar

Primeiro use **Ctrl+C no terminal do cloudflared** para remover o acesso remoto. Depois:

```powershell
docker compose --env-file .env.homolog -f compose.homolog.yaml down
```

Esse comando preserva o volume e as senhas individuais. Para retomar, execute `up -d --wait`, inicie um novo túnel protegido e atualize a nova origem como acima. O bootstrap confere e preserva as contas existentes.

## Limpar somente os dados sintéticos

Encerre primeiro o túnel. **Os comandos abaixo apagam todo o banco deste projeto de homologação.** Confira `docker compose ... ps -a` e use exatamente o arquivo/projeto deste guia, sem combinar com o Compose de desenvolvimento.

```powershell
docker compose --env-file .env.homolog -f compose.homolog.yaml down --volumes
Remove-Item .\deploy\homolog\private\credentials.json -ErrorAction SilentlyContinue
Remove-Item .\deploy\homolog\private\credentials.json.new -ErrorAction SilentlyContinue
```

Não remova um arquivo de credenciais se pretende preservar seu banco. Para também renovar todos os segredos após apagar o volume, remova `.env.homolog` e repita o inicializador. O próximo `up -d --wait` reaplica migrations e gera contas novas. Nunca execute essa limpeza em projeto/volume de produção ou desenvolvimento.

## Limitações e solução de problemas

- **Quick Tunnel:** temporário, sem garantia de disponibilidade, URL muda, limite de 200 requisições simultâneas e sem SSE. Socket.io usa WebSocket/polling; não depende de SSE. A autenticação por e-mail exige navegador interativo. [Referência oficial](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) e [anúncio da proteção por e-mail](https://developers.cloudflare.com/changelog/post/2026-10-02-protected-quick-tunnels/), consultados em 05/11/2026.
- **522 no retorno do PIN ou `Unauthorized` no login:** em uma rede Windows, o transporte QUIC padrão do cloudflared ficou instável (522 em `/.cloudflared/qt-auth/callback`). Antes de iniciar o túnel, execute `$env:TUNNEL_TRANSPORT_PROTOCOL = 'http2'` na mesma janela do PowerShell, e se ainda falhar `$env:TUNNEL_EDGE_IP_VERSION = '4'`. A URL muda a cada túnel; repita `Set-HomologOrigin.ps1` e a recriação de backend/proxy. Se o login do app continuar falhando atrás da proteção por PIN, use a alternativa Tailscale Funnel acima. Não remova `--allowed-mail` para contornar.
- **Proxy reiniciando com `could not build server_names_hash`:** o host do Quick Tunnel (por exemplo, quatro palavras) excede o bucket padrão do Nginx. `deploy/homolog/nginx.conf` define `server_names_hash_bucket_size 128`; reconstrua o proxy com `docker compose --env-file .env.homolog -f compose.homolog.yaml build proxy` se usar uma imagem antiga.
- **444 / conexão fechada:** o Host ainda não corresponde a `PUBLIC_HOST`. Atualize a URL e recrie backend/proxy. Acesso direto por `http://localhost:8080` não é o fluxo de login: Secure exige HTTPS.
- **403 / cookie não persiste:** use exatamente a URL HTTPS atual, sem misturar hosts; confira a recriação e `FRONTEND_ORIGIN`. Não relaxe CORS, origem ou cookie. Novo host exige novo PIN/login.
- **prepare falhou:** a API não inicia. Confira logs e se volume e arquivo privado pertencem à mesma inicialização. Se um bootstrap foi interrompido, use a limpeza sintética; não tente adaptar um banco real ou inventar histórico de migrations.
- **Mount/ACL no Windows:** Docker Desktop precisa acessar o checkout e a pasta privada do usuário atual. Confira integração WSL/compartilhamento e permissões. Não abra as permissões para Everyone nem exponha a pasta pelo Nginx. ACL/WSL/bind mounts dependem da validação no Windows.
- **429 no login:** há rate limit no Nginx. Os testadores podem compartilhar o IP do túnel; aguarde/reduza a frequência antes de ajustar limites conscientemente.
- **HTTP 403 ou erro de CA no build:** registre o domínio/etapa e ajuste a política ou CA aprovada. Os Dockerfiles aceitam secret BuildKit opcional `proxy_ca` para ambientes com proxy; o build normal no Windows usa a confiança padrão. Não altere dependências ou verificações para contornar a rede.
- **Segurança da máquina:** esta configuração restringe entrada remota, mas o administrador local/Docker pode ler os segredos. Mantenha computador atualizado, disco protegido e sem compartilhamento público. Não configure cloudflared como serviço permanente.
- **Produção:** imagens de homologação mantêm CLI Prisma/tsx para o job prepare. Não são uma aprovação da infraestrutura definitiva. Persistem limites do MVP, como ausência de refresh/revogação central e histórico ligado ao cadastro atual.

Os testes Linux/Docker executados nesta tarefa e seus limites estão em `MVP_PROGRESS.md`. Docker Desktop/WSL 2, ACLs NTFS, e-mail/PIN real e acesso remoto público não são considerados executados por esta preparação.
