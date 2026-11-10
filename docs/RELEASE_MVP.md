# Preparação da release v0.1.0 — SI-031

**Atualização de 05/11/2026 (America/Sao_Paulo): APTO PARA HOMOLOGAÇÃO com dados sintéticos.** Prisma, builds e suítes padrão passaram; evidências em MVP_PROGRESS.md e roteiro Windows/Docker Desktop em [HOMOLOGATION.md](HOMOLOGATION.md). A publicação em produção continua bloqueada pelos gates operacionais e de credenciais reais.

O checklist e a tabela abaixo preservam a revisão histórica de 04/11/2026, quando o download do Prisma ainda estava bloqueado. Não representam os resultados atuais nem uma mudança de estado das issues; confrontar os critérios com as evidências novas antes de atualizá-los.

Este documento prepara a futura integração em develop. Não cria release, branch de release, tag, push, merge, publicação nem fechamento de issue. Os commits locais e a branch `feature/SI-030` foram preservados.

## Critérios das issues

| Issue | Aceite original | Situação desta revisão |
| --- | --- | --- |
| SI-030 (#29) | Ambiente limpo executa o projeto seguindo apenas a documentação | Documentação, exemplos e lockfiles revisados; instalações/builds passaram. Continua pendente gerar/validar/aplicar migrations pela CLI padrão e repetir integração/E2E, sem artefatos anteriores. |
| SI-031 (#30) | Dependências P0/P1 necessárias concluídas e validações finais planejadas; sem criar branch/tag/release nesta issue | Validações e plano definidos abaixo. Não marcar concluída enquanto SI-030 estiver pendente. Nenhuma operação remota realizada. |

## Evidências e distinções

- Builds e instalação congelada de ambos os projetos verificados.
- Testes de configuração e smoke HTTPS local aprovados; ver contagens e execução em MVP_PROGRESS.md.
- `npm test` falha na preparação do banco com 403 do Prisma; os casos de domínio da integração não executam. O runner E2E falha antes do navegador. Não usar os passes históricos com WASM como resultado atual dos scripts padrão.
- Seed em desenvolvimento, backup/restauração sintética e integridade somente leitura do histórico anterior foram verificados separadamente. Eles não substituem migration em banco vazio.
- Auditoria npm de dependências de produção retornou zero ocorrências após os patches compatíveis; isso não comprova segurança operacional ou ausência de vulnerabilidades desconhecidas.
- Runtime e scripts não usam mais ferramentas temporárias; o client presente foi gerado antes desta revisão e precisa ser regenerado pela CLI na versão final.

## Checklist para futura integração em develop

- [x] Git inicial limpo, branch e histórico identificados; desenvolvimento preservado.
- [x] SI-030/SI-031 e suas dependências revisadas contra BACKLOG_REFERENCE.md.
- [x] Backend/frontend compilam e lockfiles instalam sem relaxar TLS/checksum.
- [x] Guardas de origem HTTPS, cookie de produção e recusa do seed em produção validados.
- [x] Exemplos Nginx/systemd, ambiente, backup e restauração documentados.
- [x] Segredos locais não versionados; logs de seed/encerramento sanitizados.
- [ ] Salvar/aplicar a liberação de binaries.prisma.sh no ambiente e confirmar a política observada. O domínio presente apenas no rascunho não resolve o runtime.
- [ ] Em checkout/banco limpos, executar a CLI Prisma padrão da versão final: generate, validate e migrate:deploy. Não usar client antigo, `db push`, engine alternativo ou flags que ignorem integridade.
- [ ] Rodar `npm test` e `npm run test:e2e` padrão até a conclusão real dos casos, verificando também limpeza dos bancos temporários.
- [ ] Repetir build após geração do client final e registrar a evidência em MVP_PROGRESS.md.
- [ ] Revisar diff/commits e obter autorização explícita antes de push/merge em develop ou qualquer outra operação remota.

## Gates para dados reais e publicação em produção

- [ ] Provisionar estrutura e senhas exclusivas por conta, com Argon2id e entrega segura; não copiar o banco/senha compartilhada de desenvolvimento. Procedimento ainda não implementado/validado.
- [ ] Configurar segredo JWT exclusivo, credencial restrita de runtime e credencial separada de migrations; banco privado, grants mínimos, SCRAM e TLS se remoto.
- [ ] Instalar domínio/certificado real, renovação e reverse proxy; validar login, logout, perfis, Sala Geral, isolamento, chamada concorrente e reconexão na rede da escola.
- [ ] Conferir firewall, permissões de arquivos públicos/privados, rate limit considerando NAT, headers e proteção de WebSocket. Não expor backend/PostgreSQL diretamente.
- [ ] Ativar backups criptografados fora do host, retenção aprovada, alertas e ensaio de restauração com RPO/RTO medidos. Teste local sintético não cobre desastre real.
- [ ] Configurar monitoração de banco, disco, certificado, erros e notificações; definir acesso e retenção dos logs e dados pessoais.
- [ ] Aprovar os limites conhecidos: ausência de refresh/revogação central e apresentação histórica vinculada ao cadastro atual. Não presumir auditoria imutável de nomes/sala.
- [ ] Revisão final e autorização explícita para branch/tag/release/publicação em trabalho posterior.

## Sequência de validação após desbloqueio

Em PostgreSQL exclusivamente de validação, sem dados reais:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run prisma:seed
npm run build
npm run test:config
npm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
cd ../frontend
npm ci
npm run build
```

O runner E2E cria seu próprio banco e serviços, com credenciais sintéticas; não apontá-lo para produção. Depois repetir o smoke de proxy seguindo PRODUCTION.md e registrar a reprodução limpa. A autorização para integrar em develop não autoriza automaticamente merge em main, tag, publicação ou fechamento remoto de issues.

## Retorno operacional

Antes de uma migration real, criar e verificar backup. Guardar os artefatos da versão anterior. Em incidente, bloquear escritas e avaliar compatibilidade do schema; não fazer downgrade de schema com reset/db push. Restaurar em banco novo ou usar uma migration corretiva revisada, com aprovação do responsável. Detalhes de deploy, papéis, backup/restauração e limites estão em PRODUCTION.md.
