# Progresso do MVP — Saída Inteligente

## Validação técnica do MVP — 05/11/2026 (America/Sao_Paulo)

**Classificação: APTO PARA HOMOLOGAÇÃO com dados sintéticos.** O bloqueio de rede do Prisma foi resolvido no novo ambiente. Geração limpa do Client 7.10.1, validação do schema, aplicação convencional das migrations em banco vazio, instalações pelos lockfiles, builds, testes backend e E2E com Chromium passaram nesta execução. Isso não declara o MVP pronto para produção nem autoriza uso de dados reais.

Esta seção registra a execução atual e supera, para esta instância, os bloqueios de rede e testes relatados na revisão de 04/11 abaixo. Os gates operacionais e de credenciais de `PRODUCTION.md` e `RELEASE_MVP.md` continuam pendentes. Não foram alterados estados ou checklists de issues, nem realizadas operações remotas.

### Repositório e ambiente confirmados

- Estado inicial limpo em `feature/SI-030`; HEAD `5fe20eae9406d555a4e2859acbe0f00af84b00f3` (`5fe20ea`). O commit informado está presente e é o próprio HEAD. Branch e HEAD foram preservados.
- Lidos `AGENTS.md`, este arquivo, `PRODUCTION.md`, `RELEASE_MVP.md` e `README.md`; consultados os scripts, testes, migrations e os critérios registrados em `BACKLOG_REFERENCE.md`.
- Node.js `24.22.1`, npm `11.9.0`, Docker `29.9.2`, Compose `2.40.3`, PostgreSQL `17.11` da imagem oficial `postgres:17.11`, Chromium `155.0.8059.79` em `/usr/bin/chromium` e Playwright `1.64.1` do lockfile. O daemon Docker local estava disponível. O host não possui `psql`; a versão foi conferida pelo `psql` da imagem oficial, e as consultas usaram a dependência `pg` do backend.
- `prisma`, `@prisma/client` e `@prisma/adapter-pg` declarados, travados e reinstalados em `7.10.1`. Ambos os lockfiles são versão 3. Nenhum manifesto, lockfile, schema ou SQL de migration foi alterado.
- Política observada com `observations_current: true`, ambiente `running`/`connected`, rede restrita `enforced` e `binaries.prisma.sh` efetivamente permitido. O snapshot `/etc/codex/network-policy.json` também contém o domínio.

### Isolamento e reprodução

Foi usado o `compose.yaml` oficial sem alteração, com projeto separado `si-mvp-20261105`, volume novo `si-mvp-20261105_postgres_data`, banco inicialmente vazio `si_mvp_validation` e porta exclusivamente `127.0.0.1:55433`. Não se reutilizou o schema da fixture anterior nem se acessaram os bancos de desenvolvimento/produção.

Credenciais aleatórias e logs privados ficaram em `/workspace/work/si-validation-20261105` (diretório 0700; ambiente 0600), fora do checkout e dos artefatos públicos. `DATABASE_URL` e demais variáveis sintéticas foram exportadas a partir desse arquivo privado, sem imprimir os valores. A conta administrativa com CREATEDB foi usada exclusivamente no cluster de testes.

O Client anterior foi movido para esse diretório privado antes da primeira geração. Depois de `npm ci`, o Client recém-gerado também foi retirado e regenerado novamente. Os `dist` anteriores foram retirados antes dos builds. Os resultados atuais não dependem do Client 7.10.0 ou dos builds da revisão anterior. Foi uma reprodução com dependências, Client, builds e banco renovados no checkout existente; não se afirma provisionamento de um host de produção do zero.

### Comandos executados e resultados reais

Comandos npm abaixo executados em `backend`, salvo indicação de frontend. Instalações, builds, scripts Prisma e suítes de testes terminaram com exit 0. O serviço iniciado por `npm start` foi encerrado intencionalmente com SIGINT ao concluir a fixture; o npm retornou 1 nessa interrupção, sem falha de inicialização ou de teste.

| Comando / verificação | Resultado atual |
| --- | --- |
| `git status --short --branch`, `git branch --show-current`, `git log -5 --oneline`, `git cat-file -t 5fe20ea`, `git merge-base --is-ancestor 5fe20ea HEAD` | PASS; branch esperada, commit presente, checkout inicialmente limpo |
| `node --version`, `npm --version`, `docker --version`, `docker compose version`, saúde do daemon local e `docker exec ... psql --version` | PASS; versões acima; ausência de psql no host não impediu a validação |
| `docker --host=unix:///var/run/docker.sock compose --env-file /workspace/work/si-validation-20261105/validation.env --project-name si-mvp-20261105 -f compose.yaml up -d --wait postgres` | PASS; banco/volume novos e container saudável, executado na raiz do projeto |
| `npm run prisma:generate` | PASS antes e depois de npm ci; Client 7.10.1 gerado sem artefato anterior |
| `npm run prisma:validate` | PASS antes e depois da reinstalação; schema válido |
| `npm run prisma:migrate:deploy` | PASS; aplicou as 2 migrations em banco vazio; repetições após npm ci e após reinício sem migrations pendentes |
| `npm ci` backend / frontend | PASS; respectivamente 268 / 86 pacotes instalados pelos lockfiles existentes |
| `npm run build` backend | PASS; TypeScript compilou com Client final 7.10.1; o runner E2E também recompilou o backend |
| `npm run build` frontend | PASS; TypeScript e Vite 7.3.6, 80 módulos transformados |
| `npm run test:config` | PASS; 4 testes, 0 falhas, cancelados ou ignorados |
| `npm test` | PASS; 14 testes contabilizados pelo Node: 4 configuração + 1 data escolar + 1 teste integrado contendo 8 subtestes; 0 falhas, cancelados ou ignorados |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | PASS; 1 cenário Playwright, 0 falhas; o runner oficial criou banco próprio, aplicou migrations, executou seed, build e iniciou API/Vite |
| `npm run prisma:seed`, duas vezes no banco de validação | PASS; 4 segmentos, 16 salas e 22 contas; a integração também validou idempotência e Argon2id |
| `PORT=3101 npm start` e chamadas HTTP aos endpoints existentes | PASS; serviço compilado iniciou; login de Gestão/Porteiro, cadastro de aluno sintético e registro de liberação retornaram os status esperados; serviço encerrado intencionalmente após a fixture |
| Consultas somente leitura com `node --input-type=module` e `pg`, SHA-256 via `node:crypto` | PASS; histórico, checksums, constraints, índices e limpeza dos bancos temporários conferidos; não é runner de migrations |
| Mesmo projeto Compose: `restart postgres`, seguido de `up -d --wait postgres` | PASS; persistência confirmada após reinício do cluster isolado |
| Mesmo projeto Compose: `stop postgres` | PASS; serviços de teste encerrados, volume sintético preservado, sem exclusão de dados |
| `git diff --check` e comparação de manifestos/lockfiles/migrations | PASS; nenhuma alteração nesses arquivos; única mudança versionada desta rodada é este relatório em MVP_PROGRESS.md |

### Prisma e diagnóstico da rede

Não ocorreu HTTP 403 nesta rodada. A URL oficial de checksum `https://binaries.prisma.sh/all_commits/d1b3f377ca835d73fd50954a5e22128b9ebdd6b8/debian-openssl-3.0.x/schema-engine.gz.sha256`, consultada com `curl --silent --show-error --fail --max-time 30`, respondeu **HTTP 200**, com resultado de verificação TLS **0**. O schema engine nativo instalado pelo pacote oficial identifica o mesmo commit `d1b3f377ca835d73fd50954a5e22128b9ebdd6b8`; plataforma `debian-openssl-3.0.x`.

O `npm config get strict-ssl` retornou `true`; não havia variáveis `PRISMA_*` nem `NODE_TLS_REJECT_UNAUTHORIZED` exportadas como overrides. Proxy e confiança de CA do ambiente foram mantidos. Não se usaram runners temporários, ferramentas em `previous-prisma-tools`, engines alternativos, mirrors, `db push`, reset, registro artificial do histórico ou desativação de TLS/checksum. A resolução foi a aplicação efetiva da política externa, sem modificar dependências.

### Backend, E2E e Socket.io

Os 8 subtestes integrados executaram de fato: seed/hashes, JWT e credenciais, autorização e entradas inválidas, cadastro/edição/auditoria, inativação/reativação, importação atômica, Socket.io/concorrência e constraint de escopo do usuário. O teste de data conferiu as bordas do dia escolar em São Paulo.

O Socket.io foi validado por WebSocket autenticado. Conexões sem credencial, com token inválido ou perfil Porteiro foram recusadas; Sala e Sala Geral receberam o evento mínimo após persistência, sem entrega às salas/segmentos indevidos. Cinco chamadas concorrentes produziram uma resposta 201 e quatro 409, com uma única liberação persistida. A consulta REST após reconexão recuperou o estado.

O cenário E2E passou com os cinco contextos previstos: Gestão, Portaria, Sala, Sala Geral e outra Sala. Conferiu cadastro, edição, inativação/reativação, importação, chamada, isolamento, duplicidade, recuperação após offline, proteção de rota, cookie HttpOnly, ausência de token em storage, restauração de sessão, logout e senha incorreta. `frontend/test-results/.last-run.json` terminou com `status: passed` e `failedTests: []`.

Os únicos avisos do E2E foram de precedência entre `NO_COLOR` e `FORCE_COLOR`; não houve falha de navegador ou teste. Os bancos `saida_test_*` e `saida_e2e_*` criados pelos scripts foram removidos pelos próprios scripts, confirmado por consulta ao catálogo.

### Migrations e persistência

As migrations `20261002175139_initial_schema` e `20261104000100_usuario_scope` foram aplicadas pela CLI convencional, ambas com `finished_at` preenchido, sem rollback e com uma etapa aplicada. O SHA-256 de cada arquivo SQL corresponde ao checksum registrado em `_prisma_migrations`.

No banco principal de validação, após o seed duplo, a API oficial criou exclusivamente uma fixture sintética: 1 aluno, 1 registro de Gerenciamento e 1 Liberacao. Antes/depois do reinício do PostgreSQL foram comparadas contagens e impressões SHA-256 dos registros completos das seis tabelas de domínio, além do histórico/timestamps/checksums das migrations, definições de constraints e índices. Tudo permaneceu igual: **4 segmentos / 16 salas / 22 usuários / 1 aluno sintético / 1 liberação / 1 auditoria**. Foram confirmadas 8 FKs validadas, a CHECK de escopo de Usuario e a unicidade diária de Liberacao.

Não se copiaram dados reais nem o schema de bancos anteriores. Não foram repetidos nesta rodada o smoke HTTPS/Nginx `test:production`, backup/restauração ou checks de infraestrutura real; os resultados históricos dessas verificações não são apresentados como passes atuais.

### Problemas corrigidos e pendências

- **Resolvido:** bloqueio externo do download do Prisma; o domínio agora está efetivamente permitido e o caminho oficial passou. Não houve mudança de código, arquitetura, funcionalidades, dependências ou migrations.
- **Resolvido:** dependência de artefatos antigos para demonstrar o build; Client e builds foram renovados após instalação pelos lockfiles.
- **Testes reprovados nesta rodada:** nenhum nas suítes oficiais executadas. Não restou bloqueio técnico observado para iniciar homologação sintética.
- **Homologação pendente:** executar e registrar o aceite com os responsáveis da escola, usando dados sintéticos; validar navegadores/dispositivos e rede representativos, fluxos dos perfis, Sala Geral, concorrência, reconexão e comportamento do dia escolar. O cenário automatizado em Chromium não substitui esse aceite.
- **Revisão de issues/documentação de release pendente:** confrontar os critérios de SI-030/SI-031 e suas dependências com as evidências atuais antes de qualquer alteração de status. As referências ao bloqueio anterior nos documentos de release devem ser reconciliadas nessa revisão; não se atualizou nenhum estado de issue aqui.
- **Dados reais/produção continuam pendentes:** provisionamento de senhas exclusivas por conta; credenciais separadas de migration/runtime e grants mínimos; banco privado; domínio/TLS/renovação/proxy; firewall; backups externos criptografados com retenção e restauração medida; monitoração e política de logs/dados. Preservados os limites conhecidos de JWT sem refresh/revogação central e histórico exibido pelo cadastro atual.

**Próxima etapa recomendada:** homologação funcional supervisionada com dados sintéticos, registrando evidências e critérios de aceite. Nenhum deploy, push, merge, commit, tag, release, modificação de main/develop ou fechamento remoto de issues foi realizado. Produção exige trabalho e validação próprios posteriores.

## Revisão final — 04/11/2026 (America/Sao_Paulo)

**Classificação: BLOQUEADO para publicação.** A implementação foi preservada e recebeu correções mínimas de segurança. A reprodução convencional continua impedida pela política de rede, e os requisitos operacionais para dados reais não estão atendidos. Não há declaração de produção pronta nem de aprovação atual das suítes completas.

### Git e preservação

Estado inicial limpo em `feature/SI-030`, HEAD `9990fd5`. Todos os commits anteriores foram preservados. O commit local `d580f95` contém patches de dependências, guardas de produção, logs sanitizados, testes de configuração/proxy e remoção do runner alternativo. Não foram reconstruídas funcionalidades, alteradas regras de negócio ou modificada a arquitetura.

Não houve push, merge, publicação, tag/release, branch de release, exclusão de branch ou fechamento remoto de issues. A entrega permanece em `feature/SI-030` para revisão e futura integração autorizada em develop.

### Diagnóstico do Prisma

- O rascunho tem `binaries.prisma.sh`, mas a instância retornou observações atuais, política `enforced`, `allowed_hosts=[]` e nenhuma inclusão efetiva desse domínio. O arquivo de política de startup também não o contém.
- A requisição HTTPS pelo proxy respondeu `CONNECT 403 Forbidden`. A falha ocorre antes do download/checksum do engine, não é evidência de senha de banco incorreta nem de problema com a migration.
- `prisma:generate`, `prisma:validate` e `prisma:migrate:deploy` foram executados com DATABASE_URL de PostgreSQL isolado, tanto na versão anterior quanto após o patch 7.10.1. Todos retornaram exit 1 no download do checksum por HTTP 403.
- Nenhuma verificação de integridade/TLS foi desligada. Não foram usados mirror, engine alternativo, `db push`, reset ou registro fictício de migrations nesta revisão.
- A configuração externa ainda precisa ser salva/aplicada nas configurações do ambiente; uma nova escrita no mesmo rascunho não aplica a política. Se o produto exigir reconexão/recriação, fazê-la pelo fluxo suportado e conferir novamente a política efetiva. O agente não dispõe de ferramenta de aplicação imediata da política.

### Independência de ferramentas temporárias

O hook `PRISMA_MIGRATION_RUNNER` foi removido de `backend/tests/integration.test.ts` e `backend/src/scripts/e2e.ts`: ambos chamam sempre `npm run prisma:migrate:deploy`. Source, scripts e dist recompilado não contêm referências ao runner nem a `/tmp/saida-prisma-tools`.

As ferramentas antigas foram preservadas em `/workspace/saida-release-validation/previous-prisma-tools`, deixando o caminho antigo indisponível. Nenhuma foi executada nesta revisão. Builds, seed, testes de configuração e smoke HTTPS operaram nessa condição. O runtime não precisa dessas ferramentas.

**Limite importante:** o Prisma Client presente no checkout foi gerado na etapa anterior com 7.10.0. As dependências agora estão em 7.10.1. O build com o artefato existente passou, mas a geração limpa do client final e a restauração em uma tarefa nova permanecem pendentes. Não usar o build atual como prova de geração convencional bem-sucedida.

### Ambiente de validação e dados

Foi criado um projeto Compose separado, `saida-release-validation`, com volume próprio, credenciais aleatórias e PostgreSQL em `127.0.0.1:55432`, sem alterar dados de produção. Configuração e artefatos privados estão fora do checkout em `/workspace/saida-release-validation`, com diretório 0700 e arquivos sensíveis 0600.

A aplicação das migrations convencionais em banco vazio foi tentada e bloqueada. Para as verificações **independentes** de seed, backup e proxy, copiou-se somente o schema do banco local de desenvolvimento para esse cluster; nenhum dado de aluno foi copiado e a tabela `_prisma_migrations` dessa fixture não foi preenchida artificialmente. A fixture não substitui nem simula o sucesso de `migrate:deploy`.

Os testes padrão criaram e removeram seus próprios bancos temporários, no cluster separado, e falharam antes de executar os casos integrados. O backend de smoke foi iniciado via `npm start`, com NODE_ENV=production e sem SEED_DEFAULT_PASSWORD no serviço; a senha sintética foi usada somente pelo processo de teste. Backend e proxy de smoke foram encerrados depois da verificação. O cluster sintético foi preservado para eventual retomada.

### Resultados efetivamente executados nesta revisão

| Verificação | Resultado e limite |
| --- | --- |
| `npm ci` backend/frontend, lockfiles finais | PASS, 268/86 pacotes respectivamente |
| `npm run build` backend | PASS com client anteriormente gerado; geração limpa final pendente |
| `npm run build` frontend | PASS, 80 módulos Vite |
| `npm run prisma:generate` | BLOQUEADO, exit 1, checksum do engine com 403 |
| `npm run prisma:validate` | BLOQUEADO, exit 1, mesmo motivo |
| `npm run prisma:migrate:deploy` | BLOQUEADO em banco isolado vazio, exit 1 |
| `npm run test:config` | PASS, 4 testes, 0 falhas/ignorados; origem HTTPS, cookie Secure, segredo JWT e recusa do seed em produção |
| `npm test` final | FAIL de preparação: 6 testes totais, 5 passaram (4 configuração + data escolar), 1 integração falhou ao aplicar migrations; 0 ignorados/cancelados. Os 8 subcasos de domínio da integração não executaram. |
| `npm run test:e2e` final | BLOQUEADO no migrate:deploy; nenhum teste de navegador executado nesta revisão |
| `npm run prisma:seed`, duas vezes | PASS em NODE_ENV=test/desenvolvimento, contra schema isolado; preservou 4 segmentos, 16 salas, 22 contas e hashes Argon2id |
| Histórico de migrations anterior | PASS em leitura: 2 migrations concluídas, sem rollback e SHA-256 correspondente aos arquivos versionados. Não prova aplicação convencional em banco novo. |
| Backup/restauração | PASS: pg_dump custom + pg_restore em outro banco novo, com contagens, hashes, FKs, CHECK e índice único preservados; somente dados sintéticos locais |
| `nginx -t` | PASS no exemplo adaptado a portas/certificado locais; Nginx oficial 1.28, artefatos verificados pela imagem oficial |
| `npm run test:production` | PASS, 1 teste HTTPS local: certificado confiado explicitamente e verificado, SPA, API, HttpOnly/Secure/Lax, CORS, origem indevida e Socket.io autenticado. Não é o E2E do MVP nem prova de operação real. |
| `npm audit --omit=dev` backend/frontend | Zero ocorrências reportadas depois dos patches; também confirmado no backend após npm ci. Não equivale a auditoria externa ou ausência de vulnerabilidades desconhecidas. |
| Git/segredos | `git diff --check` passou; somente exemplos .env são versionados; verificações limitadas por padrões no diff não encontraram chaves/tokens. |

Falhas locais investigadas: o primeiro teste de proxy encontrou permissões 0700/0600 nos artefatos públicos e depois uma limitação de comunicação entre o Docker daemon e o worker. Foram corrigidas as permissões apenas de `frontend/dist`; o proxy oficial foi executado localmente no mesmo worker, sem contornar política de rede e com TLS verificado. O teste padrão `test:production` passou na última execução. Esses diagnósticos não corrigem a restrição externa do Prisma.

### Correções e arquivos relevantes

- Patches compatíveis: `prisma`, `@prisma/client`, `@prisma/adapter-pg` 7.10.0 → 7.10.1; Body Parser 2.3.0 → 2.4.0; Zod 4.6.5 → 4.6.7 e transitivas corrigidas. A auditoria inicial backend reportava 6 ocorrências altas e 2 moderadas; a final reportou zero. Frontend já reportava zero em produção.
- `backend/src/config.ts`: exige FRONTEND_ORIGIN HTTPS explícita/canônica em produção; preserva cookie HttpOnly/Secure/SameSite=Lax.
- `backend/src/scripts/seed.ts` e `server.ts`: não registram detalhes brutos de falhas do driver/encerramento; erros de configuração do seed mantêm mensagens seguras.
- `compose.yaml`: porta de PostgreSQL de desenvolvimento restrita a loopback. Aplicação da mudança em containers antigos exige recriação; foi aplicada e conferida no cluster de validação, sem recriar o banco de desenvolvimento existente.
- Testes/scripts padrão: `tests/config.test.ts`, `production-tests/https.test.ts` e scripts npm correspondentes. Runner alternativo removido de integração/E2E.
- `deploy/`: exemplos de ambiente sem senha compartilhada, Nginx e systemd. Nenhum servidor real foi implantado, e o unit systemd não foi executado neste ambiente.
- README, API.md, PRODUCTION.md e RELEASE_MVP.md atualizados com passos, contratos, ambiente, backup/restauração e gates de publicação.

O rascunho `start_skill` do ambiente também foi atualizado, com salvamento confirmado, para remover instruções do runner temporário e registrar os bloqueios. O domínio continua no rascunho e o install_script padrão continua dependente dele. Nada foi aplicado/publicado pelo salvamento; ativação/publicação do ambiente é uma ação posterior do usuário pelo produto, separada da release da aplicação.

### Bloqueios e recomendação

1. **Reprodução e qualidade:** aplicar `binaries.prisma.sh`, gerar o client final e concluir migrations/integração/E2E padrão em ambiente limpo. Não marcar SI-030/SI-031 concluídas antes disso.
2. **Credenciais reais:** falta provisionamento seguro e validado de estrutura e senhas exclusivas por conta. SEED_DEFAULT_PASSWORD continua somente para desenvolvimento; copiar o banco de bootstrap para produção é vedado.
3. **Operação real:** domínio/certificado/renovação, papéis restritos e rede privada do banco, firewall, backup criptografado externo/retencão/ensaio de desastre, logs e alertas ainda precisam ser configurados e validados. O smoke e o restore locais não satisfazem esses gates.
4. **Limites conhecidos preservados:** JWT sem refresh/revogação central, logout local por cookie; nomes/sala de histórico seguem o cadastro atual. Sem novas funcionalidades de gestão de credenciais, snapshots históricos ou relatórios avançados nesta revisão.

Recomendação: manter a publicação bloqueada. Após o gate de reprodução/testes, avaliar homologação com dados sintéticos. Só recomendar produção após os gates operacionais e de credenciais de RELEASE_MVP.md/PRODUCTION.md e uma revisão autorizada.

### Retomada recomendada

1. Continuar em `feature/SI-030`, preservando os commits locais e lendo o Git status.
2. Salvar/aplicar o domínio nas configurações do ambiente e conferir a política efetiva atual. Não editar network-policy.json, usar mirror, desligar TLS/checksum ou reinstalar as ferramentas WASM.
3. Reusar o cluster isolado (não produção), injetando com segurança suas variáveis. Em backend executar `npm run prisma:generate`, `npm run prisma:validate`, `npm run prisma:migrate:deploy`, seed duas vezes, build, `npm run test:config`, `npm test` e `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`; repetir build frontend. Fazer também a reprodução em checkout/client/banco limpos e registrar o resultado.
4. Repetir o smoke local pelo script `test:production` conforme PRODUCTION.md; não usar contas reais nesse teste.
5. Revisar os gates operacionais antes de dados reais e obter autorização explícita para push, integração em develop, release/publicação ou fechamento remoto de issues.

## Histórico da implementação anterior (03/11/2026)

O checkout inicial era `work` em `aa6707d` (main), limpo. A implementação posterior foi encontrada em develop `69626d4` e preservada; SI-002 a SI-008 já estavam concluídas. As 30 issues SI-002 a SI-031 foram consultadas por páginas web após a API GraphQL/REST recusar acesso; critérios e milestones estão em BACKLOG_REFERENCE.md.

Commits de implementação: `c8fd69b` (SI-009/SI-010), `b9f3c72` (SI-011 a SI-016), `8881624` (SI-017 a SI-021), `9711d4e` (SI-022 a SI-026), `d13dc59` (SI-027 a SI-029), `844783b` (formatação), `9990fd5` (documentação). Foram entregues Gestão, Portaria, Sala e Sala Geral com persistência, auditoria, autorização, importação atômica e Socket.io isolado.

Naquela execução, com ferramentas oficiais WASM 7.10.0 e override temporário, 10 testes backend e 1 cenário E2E passaram; o reinício do PostgreSQL preservou 4/16/22 e as duas migrations. Esse é um registro histórico, não o resultado da revisão atual nem prova do caminho padrão. As instruções antigas de retomada pelo override foram substituídas pelas instruções acima; o hook não existe mais no projeto.
