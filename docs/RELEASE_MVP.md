# Preparação da release v0.1.0 — SI-031

Não criar branch de release, tag nem publicação nesta issue. Nenhuma issue remota deve ser fechada sem autorização. A entrega local parte de develop `69626d4` e usa commits por etapa em branches feature/SI-XXX. O estado executado das verificações está em MVP_PROGRESS.md.

Antes de preparar `release/v0.1.0` em trabalho posterior autorizado:

1. Conferir SI-002 a SI-030 contra os critérios em BACKLOG_REFERENCE.md e os resultados executados.
2. Aplicar migrations em banco vazio, gerar Prisma Client e executar o seed duas vezes verificando idempotência.
3. Executar builds, testes PostgreSQL/HTTP/Socket.io e testes reais de navegador. Conferir escopo individual e Sala Geral, importação sem efeitos parciais, concorrência, dia escolar e reconexão.
4. Validar persistência após reinício do PostgreSQL; não usar `compose down -v` em banco com dados.
5. Conferir ausência de segredos no diff/histórico novo e revisar configurações HTTPS/cookies/origem/fuso.
6. Revisar limitações do bootstrap compartilhado e planejar provisionamento individual antes de uso real com alunos.
7. Obter autorização explícita antes de push, merge em main, exclusão de branch ou fechamento de issues.

A aprovação desta preparação não publica código nem substitui a validação operacional na escola.
