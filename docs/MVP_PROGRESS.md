# Progresso do MVP — Saída Inteligente

Registro em 03/11/2026 (America/Sao_Paulo). Fluxos funcionais implementados e validados localmente com PostgreSQL real, HTTP, Socket.io e Chromium. A validação dos comandos padrão da CLI Prisma em ambiente limpo continua pendente por bloqueio de rede; não considerar essa etapa nem a publicação concluídas.

## Base e rastreabilidade

O checkout inicial era a branch local `work` em `aa6707d` (main), sem alterações. A inspeção de todas as branches remotas encontrou implementação posterior em develop `69626d4`; essa base foi usada sem merge em main, reset ou recriação de funcionalidades. A consulta às 30 issues SI-002 a SI-031 foi feita pela interface web do GitHub após a CLI retornar Forbidden tanto em GraphQL quanto em REST. Critérios, dependências e milestones estão em BACKLOG_REFERENCE.md.

Commits locais de implementação e validação:

- `c8fd69b`: SI-009/SI-010 — cookie JWT, sessão atual e autorização.
- `b9f3c72`: SI-011 a SI-016 — consulta, alunos, importação e auditoria.
- `8881624`: SI-017 a SI-021 — liberações, dia escolar, constraint de escopo e Socket.io.
- `9711d4e`: SI-022 a SI-026 — navegação e telas dos três perfis.
- `d13dc59`: SI-027 a SI-029 — testes reais e recuperação offline/online.
- `844783b`: formatação das camadas para revisão.

A branch final é `feature/SI-030`, contendo os commits anteriores por ancestralidade. Nenhum push, merge remoto, fechamento de issue, exclusão de branch, tag, branch de release ou publicação foi executado. Os estados remotos das issues não foram alterados.

## Issues e critérios

| Issues | Resultado local |
| --- | --- |
| SI-002 a SI-008 | Implementações herdadas de develop, preservadas. Verificados Compose, schema/client, migrations em banco vazio, seed idempotente e login Argon2id/cookie. |
| SI-009/SI-010 | Implementados; ausência, adulteração e expiração de JWT rejeitadas; perfis e escopos respeitados. |
| SI-011/SI-012 | Salas e busca/filtros funcionais; Portaria não recebe inativos; SALA não recebe cadastro geral. |
| SI-013 a SI-016 | Cadastro ativo, edição, status e importação estrita/atômica com auditoria na mesma transação. Matrícula única e erros sem efeitos parciais verificados. |
| SI-017/SI-018 | Chamadas com porteiro/horário do servidor, aluno ativo, unicidade no banco, consulta diária individual e Sala Geral. |
| SI-019 a SI-021 | Socket.io autenticado, inscrição por conta, evento mínimo pós-commit; isolamento e persistência sob concorrência verificados. |
| SI-022 a SI-026 | Interfaces integradas, cookie HttpOnly, navegação protegida, Gestão/Portaria/Sala funcionais em navegador. Reconexão e recuperação por REST verificadas. |
| SI-027 | Testes críticos executados: 10 passaram, 0 falharam, 0 ignorados/cancelados. |
| SI-028 | Um cenário E2E completo em Chromium passou com contextos de navegador separados para Gestão, Portaria, Sala, Sala Geral e outra Sala. |
| SI-029 | Casos listados de JWT, perfis, escopo, JSON/IDs inválidos, matrícula/chamada duplicada, origem indevida e resposta sem senha/hash/token verificados. Arquivos .env não versionados; varredura do diff sem padrões de chave privada/token GitHub. |
| SI-030 | README, exemplos e instruções preparados. Instalações congeladas/builds passaram. **Pendente:** executar a sequência padrão completa da CLI Prisma em ambiente limpo após permitir binaries.prisma.sh. |
| SI-031 | Preparação e critérios finais em RELEASE_MVP.md; não declarada concluída enquanto SI-030 permanece pendente. Nenhuma release criada. |

## Arquivos e funcionalidades

- Backend: `src/config.ts`, `services/sessionService.ts`, middlewares de autenticação/perfil/origem, rotas de sessão e erros sanitizados.
- `schemas/domainSchema.ts`, repositories/services de salas, alunos e liberações, controller fino e rotas REST.
- Auditoria com os enums consolidados: CADASTRO, EDICAO, INATIVACAO, REATIVACAO, IMPORTACAO. Sem exclusão física.
- `prisma/migrations/20261104000100_usuario_scope`: CHECK para vínculos de usuário. A unicidade aluno/data já existia na migration inicial e foi preservada/testada diretamente.
- `websocket/index.ts` e servidor HTTP compartilhado: conta determina canal individual/segmento, evento contém apenas ID, conexão expirada é encerrada.
- Frontend: cliente HTTP, sessão, navegação protegida, filtros de segmento/sala, páginas Login/Gestao/Portaria/Sala, feedback e estilos responsivos. Painel restaura estado em connect/online e por REST periódico.
- Testes: `backend/tests`, `backend/src/scripts/e2e.ts`, `frontend/playwright.config.ts`, `frontend/tests/mvp.spec.ts`. Os runners criam bancos temporários e removem somente os bancos próprios; precisam de CREATEDB.
- Documentação: README, API.md, BACKLOG_REFERENCE.md, RELEASE_MVP.md e nota das decisões posteriores na especificação inicial.

## Verificações efetivamente executadas

1. `npm ci` em backend e frontend com os lockfiles finais: passaram (270 e 86 pacotes, respectivamente).
2. `npm run build` em ambos: passaram; TypeScript backend e frontend, produção Vite (80 módulos).
3. Geração do Prisma Client com `@prisma/internals` e `@prisma/client-generator-ts` oficiais 7.10.0, usando DMMF/WASM e sem engine nativo: passou.
4. As duas migrations foram aplicadas pelo engine WASM oficial distribuído em Prisma 7.10.0, por `applyMigrations`, com histórico real em `_prisma_migrations`. Aplicação em bancos vazios dos testes e reaplicação idempotente (lista de migrations aplicadas vazia) passaram. Não foi usado `db push` nem registro fictício de migrations.
5. Seed executado e repetido: 4 segmentos, 16 salas, 22 usuários; hashes Argon2id e preservação idempotente conferidos.
6. `PRISMA_MIGRATION_RUNNER=/tmp/saida-prisma-tools/migrate.mjs npm test`, em backend: 10 passaram na última execução. Inclui cinco requisições concorrentes de chamada (uma 201, quatro 409), constraint de unicidade testada também via Prisma, auditoria e importação com rollback.
7. `PRISMA_MIGRATION_RUNNER=/tmp/saida-prisma-tools/migrate.mjs PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`, em backend: um cenário passou em Chromium real. Os três perfis operaram, Sala Geral recebeu o segmento correto, outra Sala ficou isolada, chamada duplicada foi rejeitada e a chamada feita offline apareceu após reconexão. Também foram verificados restauração de sessão, logout, login inválido, cookie HttpOnly e ausência de token em localStorage/sessionStorage.
8. `docker compose restart postgres` seguido de espera da saúde: persistiu 4/16/22 e duas migrations aplicadas. Nenhum banco temporário de testes ficou remanescente na checagem.
9. Servidores de desenvolvimento existentes: API `/health` 200, HTML frontend 200 e `/api/auth/me` sem cookie 401.
10. `git diff --check` passou; os .env locais estão ignorados. Varredura limitada do diff por padrões de chave privada/token GitHub não encontrou ocorrências; isso não equivale a uma auditoria de segurança externa.

Falhas investigadas: comandos nativos Prisma retornaram 403 no download do checksum; nenhuma verificação foi desabilitada. Tentativas iniciais de E2E identificaram localizadores ambíguos de select/status e a necessidade de tratar explicitamente offline/online no painel. Foram corrigidos; o último E2E passou. Não há falha funcional conhecida nos testes finais executados.

## Limites e pendências reais

- **Rede:** `npm run prisma:generate`, `npm run prisma:validate` e `npm run prisma:migrate:deploy` na CLI padrão ainda retornam 403 para `binaries.prisma.sh` nesta instância. O domínio foi adicionado ao rascunho de configuração, mas isso não aplica a política atual. Revisar/salvar nas configurações do ambiente e publicar pelo produto quando apropriado; depois repetir os comandos e a validação sem override. Não usar PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING nem desativar TLS.
- A alternativa WASM usou somente pacotes oficiais com versões alinhadas e integridade npm, instalados fora do checkout em `/tmp/saida-prisma-tools`. Não alterou dependências para engines alternativos no produto. Esse diretório é temporário e não deve ser presumido em uma máquina nova. O fluxo padrão documentado no README continua sendo a CLI Prisma.
- `install_script` e `start_skill` do ambiente foram atualizados no rascunho para a aplicação atual; o salvamento foi confirmado. O install_script padrão inclui geração Prisma e permanece sujeito à pendência de rede acima. Scripts salvos não foram publicados nem executados pelo salvamento. Não foi validada restauração de snapshot em uma tarefa nova.
- Bootstrap usa senha compartilhada temporária de SEED_DEFAULT_PASSWORD; não há gestão/troca/recuperação individual de credenciais. O seed não roda em produção e não redefine senhas existentes.
- JWT não tem refresh/revogação central; logout expira o cookie local. O ambiente de produção requer HTTPS e frontend/API no mesmo site. Não foi realizado deploy de produção nem teste operacional na escola.
- Histórico permanece no banco e não é editável/deletável pela API; sua apresentação de nome/sala segue o cadastro atual conforme a modelagem herdada. Não foram adicionados snapshots históricos, progressão anual ou relatórios avançados.

## Retomada recomendada

1. Continuar da branch `feature/SI-030` neste checkout, lendo o Git status antes de modificar arquivos. Não recriar worktree nem descartar commits locais.
2. Salvar a liberação de `binaries.prisma.sh` nas configurações do ambiente. Testar novamente o download/comandos padrão; a ausência de valores de token no ambiente não implica falta de autenticação GitHub.
3. Em backend: `npm run prisma:generate`, `npm run prisma:validate`, `npm run prisma:migrate:deploy`, `npm run build`, `npm test` e `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`, sem PRISMA_MIGRATION_RUNNER. Em frontend: `npm ci` e `npm run build`.
4. Registrar o resultado da reprodução padrão em ambiente limpo e concluir a revisão de SI-030/SI-031. Para executar agora nesta mesma máquina, o override WASM acima já foi validado.
5. Solicitar autorização explícita somente antes de push, merge em main, exclusão de branches ou fechamento de issues remotas; não foi dada autorização para essas ações.
