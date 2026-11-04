# Progresso do MVP — Saída Inteligente

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
