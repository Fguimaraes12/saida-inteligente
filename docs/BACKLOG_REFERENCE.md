# Backlog consultado no GitHub

Fonte: https://github.com/FrancinatoSilva/saida-inteligente/issues. Consulta em 03/11/2026 (America/Sao_Paulo). A API GraphQL/REST recusou acesso; foram lidas as páginas web das 30 issues. Os estados abaixo são os remotos observados, não uma declaração de conclusão local.

## SI-002 — Configurar PostgreSQL para desenvolvimento local

Issue #1 · CLOSED · Milestone 1 — Persistência e Modelo de Dados

Objetivo


Disponibilizar uma instância PostgreSQL reproduzível para desenvolvimento.


Implementação


Configurar PostgreSQL via Docker Compose, volume persistente, variáveis de ambiente e .env.example sem credenciais reais.


Critérios de aceite




Banco sobe via Docker Compose.
n- Backend alcança PostgreSQL.
n- Dados persistem após reinício.
- Configuração documentada.




Dependências


Nenhuma.

## SI-003 — Integrar Prisma ao backend

Issue #2 · CLOSED · Milestone 1 — Persistência e Modelo de Dados

Objetivo


Adicionar infraestrutura de ORM e migrations.


Implementação


Integrar Prisma ao backend e centralizar o acesso ao banco.


Critérios de aceite




Prisma reconhece o banco local.
n- Prisma Client pode ser gerado.
n- Backend continua compilando.
- Acesso ao banco centralizado.




Dependências


SI-002.

## SI-004 — Modelar entidades e relacionamentos do domínio

Issue #3 · CLOSED · Milestone 1 — Persistência e Modelo de Dados

Objetivo


Representar corretamente as entidades e relacionamentos do domínio do MVP.


Implementação


Modelar Usuario, Sala, Aluno, Liberacao e Gerenciamento, incluindo roles, vínculos, unicidade e inativação lógica.


Critérios de aceite




Entidades e cardinalidades corretas.
n- Constraints de usuário e matrícula representadas.
n- Liberação referencia aluno e porteiro.
n- Gerenciamento registra usuário, aluno, ação e horário.
n- Schema validado pelo Prisma.




Dependências


SI-003.

## SI-005 — Criar migration inicial

Issue #4 · CLOSED · Milestone 1 — Persistência e Modelo de Dados

Objetivo


Criar a primeira migration reproduzível do domínio.


Implementação


Gerar migration inicial a partir do schema validado e o Prisma Client correspondente.


Critérios de aceite




Migration funciona em banco vazio.
n- Banco corresponde ao schema.
n- Migration reproduzível.
- Prisma Client gerado corretamente.




Dependências


SI-004.

## SI-006 — Padronizar validação e tratamento de erros

Issue #5 · CLOSED · Milestone 2 — Fundação da API e Segurança

Objetivo


Criar fundação comum de validação e erros usando Zod.


Implementação


Definir middleware global e formato consistente de erros, sem duplicar tratamento nos controllers.


Critérios de aceite




Middleware global implementado.
n- Stack não exposta.
n- Erros consistentes no formato definido.
- Controllers não duplicam tratamento.




Dependências


Nenhuma.

## SI-007 — Criar dados iniciais necessários ao MVP

Issue #6 · CLOSED · Milestone 2 — Fundação da API e Segurança

Objetivo


Disponibilizar dados iniciais para uso imediato do MVP.


Implementação


Criar seed reproduzível de salas, usuário Gestão, usuário Porteiro e usuários Sala, mantendo senhas protegidas.


Critérios de aceite




Seed reproduzível.
n- Ambiente utilizável sem inserções manuais.
n- Senhas nunca persistidas em texto puro.




Dependências


SI-005.

## SI-008 — Implementar autenticação por login

Issue #7 · CLOSED · Milestone 2 — Fundação da API e Segurança

Objetivo


Permitir login autenticado para os perfis do MVP.


Implementação


Implementar POST /auth/login com validação de credenciais e emissão de JWT.


Critérios de aceite




Credenciais válidas autenticam.
n- Senha incorreta e usuário inexistente são rejeitados.
n- Senha nunca retornada.
n- Role preservada.
n- JWT emitido corretamente.




Dependências


SI-005 e SI-006.

## SI-009 — Implementar middleware de autenticação

Issue #8 · OPEN · Milestone 2 — Fundação da API e Segurança

Objetivo


Proteger casos de uso com autenticação JWT.


Implementação


Implementar middleware para validar token e disponibilizar o usuário autenticado.


Critérios de aceite




Ausência de token rejeitada.
n- Token inválido ou expirado rejeitado.
n- Usuário autenticado disponibilizado aos casos de uso.




Dependências


SI-008.

## SI-010 — Implementar autorização por role

Issue #9 · OPEN · Milestone 2 — Fundação da API e Segurança

Objetivo


Aplicar permissões por perfil.


Implementação


Autorizar os perfis GESTAO, PORTEIRO e SALA conforme suas regras de acesso.


Critérios de aceite




Permissões respeitadas.
n- SALA não acessa outra Sala.
n- Acessos indevidos retornam HTTP adequado.




Dependências


SI-009.

## SI-011 — Implementar consulta de salas

Issue #10 · OPEN · Milestone 3 — Gestão de Salas e Alunos

Objetivo


Permitir consulta das salas disponíveis.


Implementação


Implementar GET /salas para Gestão e Porteiro.


Critérios de aceite




Gestão consulta salas.
n- Porteiro consulta salas.
n- Resposta permite seleção segmento → série.




Dependências


SI-010.

## SI-012 — Implementar listagem e busca de alunos

Issue #11 · OPEN · Milestone 3 — Gestão de Salas e Alunos

Objetivo


Permitir listagem e pesquisa de alunos para os fluxos autorizados.


Implementação


Implementar GET /alunos com filtros segmento, série e busca.


Critérios de aceite




Filtros funcionam.
n- Pesquisa funciona.
n- Porteiro nunca recebe aluno inativo.
- Autorização respeitada.




Dependências


SI-011.

## SI-013 — Implementar cadastro manual de aluno

Issue #12 · OPEN · Milestone 3 — Gestão de Salas e Alunos

Objetivo


Permitir que Gestão cadastre alunos manualmente.


Implementação


Implementar POST /alunos com validações, matrícula única, sala obrigatória e auditoria.


Critérios de aceite




Apenas Gestão.
n- Matrícula única.
n- Nome e Sala obrigatórios.
n- Aluno inicia ativo.
n- Gerenciamento registrado.




Dependências


SI-010 e SI-011.

## SI-014 — Implementar edição de aluno

Issue #13 · OPEN · Milestone 3 — Gestão de Salas e Alunos

Objetivo


Permitir edição segura dos dados de um aluno.


Implementação


Implementar PUT /alunos/:id com validação, preservação de constraints e auditoria EDITADO.


Critérios de aceite




Apenas Gestão.
n- Validação aplicada.
n- Constraints preservadas.
- Auditoria EDITADO registrada.




Dependências


SI-013.

## SI-015 — Implementar ativação/inativação de aluno

Issue #14 · OPEN · Milestone 3 — Gestão de Salas e Alunos

Objetivo


Permitir remoção lógica de alunos.


Implementação


Implementar PATCH /alunos/:id/status para ativar ou inativar, preservando o histórico e auditando a ação.


Critérios de aceite




Remoção lógica.
n- Apenas Gestão.
n- Histórico preservado.
- Auditoria registrada.




Dependências


SI-013.

## SI-016 — Implementar importação de alunos via JSON

Issue #15 · OPEN · Milestone 3 — Gestão de Salas e Alunos

Objetivo


Permitir importação de alunos para uma Sala.


Implementação


Implementar POST /salas/:id/alunos/importacao com contrato JSON, validação e auditoria.


Critérios de aceite




Array não vazio.
n- Nome e matrícula obrigatórios e matrícula única.
n- Sala vem da URL.
n- Erro não gera estado parcial silencioso.
n- Auditoria registrada.




Dependências


SI-013.

## SI-017 — Implementar registro de liberação

Issue #16 · OPEN · Milestone 4 — Fluxo de Liberação

Objetivo


Registrar a liberação diária de um aluno.


Implementação


Implementar POST /liberacoes, derivando porteiro da autenticação e aplicando as regras de aluno ativo, horário no backend e unicidade diária com timezone definido.


Critérios de aceite




Apenas PORTEIRO.
n- Porteiro vem da autenticação.
n- Aluno existe e está ativo.
n- Horário gerado pelo backend.
n- Uma liberação por aluno por dia.




Dependências


SI-010 e SI-012.

## SI-018 — Implementar consulta diária da própria Sala

Issue #17 · OPEN · Milestone 4 — Fluxo de Liberação

Objetivo


Permitir que uma Sala consulte suas liberações do dia.


Implementação


Implementar GET /salas/minha/liberacoes derivando a Sala da autenticação.


Critérios de aceite




Apenas SALA.
n- Sala vem da autenticação.
n- Somente liberações do dia e alunos da própria Sala.
- Histórico permanece no banco.




Dependências


SI-017.

## SI-019 — Integrar Socket.io ao backend

Issue #18 · OPEN · Milestone 5 — Tempo Real

Objetivo


Integrar comunicação em tempo real ao monólito.


Implementação


Configurar Socket.io com conexões autenticáveis, mantendo o backend funcional.


Critérios de aceite




Socket.io integrado ao monólito.
n- Conexões autenticáveis.
n- Backend continua funcionando normalmente.




Dependências


SI-009.

## SI-020 — Autorizar canais por Sala

Issue #19 · OPEN · Milestone 5 — Tempo Real

Objetivo


Isolar canais de tempo real por Sala.


Implementação


Autorizar o canal sala:{id} exclusivamente a partir da Sala presente na autenticação.


Critérios de aceite




Sala derivada da autenticação.
n- Cliente não escolhe Sala arbitrariamente.
n- Uma Sala não recebe dados de outra.




Dependências


SI-019 e SI-010.

## SI-021 — Publicar nova liberação em tempo real

Issue #20 · OPEN · Milestone 5 — Tempo Real

Objetivo


Notificar a Sala correta após uma liberação persistida.


Implementação


Publicar no Socket.io o fluxo POST /liberacoes → PostgreSQL → sala:{id}.


Critérios de aceite




Evento somente após persistência.
n- Apenas Sala correspondente recebe.
n- Payload mínimo.
- Falha de Socket não duplica liberação.




Dependências


SI-017 e SI-020.

## SI-022 — Criar fundação de autenticação e navegação do frontend

Issue #21 · OPEN · Milestone 6 — Frontend Funcional

Objetivo


Estabelecer autenticação e navegação no frontend.


Implementação


Criar cliente HTTP, estado de autenticação, gerenciamento de token, rotas e proteção por perfil.


Critérios de aceite




Cliente HTTP definido.
n- Estado e token gerenciados.
n- Rotas protegidas por perfil.




Dependências


SI-008 e SI-010.

## SI-023 — Implementar tela de Login

Issue #22 · OPEN · Milestone 6 — Frontend Funcional

Objetivo


Disponibilizar a tela de login para os perfis do MVP.


Implementação


Implementar login integrado à fundação de autenticação e redirecionamento por role.


Critérios de aceite




Login válido redireciona conforme role.
n- Erro de credenciais tratado.
n- Loading evita submissão repetida.




Dependências


SI-022.

## SI-024 — Implementar interface da Gestão

Issue #23 · OPEN · Milestone 6 — Frontend Funcional

Objetivo


Disponibilizar os fluxos de gestão de alunos.


Implementação


Implementar seleção de segmento/série, visualização, busca, adição, edição, ativação/inativação e importação JSON.


Critérios de aceite




Fluxos administrativos previstos disponíveis para Gestão.




Dependências


SI-011 até SI-016 e SI-022.

## SI-025 — Implementar interface da Portaria

Issue #24 · OPEN · Milestone 6 — Frontend Funcional

Objetivo


Disponibilizar o fluxo rápido de chamada da Portaria.


Implementação


Implementar fluxo segmento → série → busca de aluno → registro de chamada.


Critérios de aceite




Poucos cliques.
n- Pesquisa rápida.
n- Feedback claro.
n- Aluno inativo não aparece.
n- Evita submissão duplicada.




Dependências


SI-011, SI-012, SI-017 e SI-022.

## SI-026 — Implementar interface da Sala

Issue #25 · OPEN · Milestone 6 — Frontend Funcional

Objetivo


Disponibilizar a visualização em tempo real da Sala.


Implementação


Implementar busca inicial de liberações, renderização, conexão Socket.io e resincronização REST após reconexão.


Critérios de aceite




Login e consulta inicial.
n- Novas liberações renderizadas em tempo real.
n- Reconexão sincroniza novamente pela API REST.




Dependências


SI-018, SI-021 e SI-022.

## SI-027 — Criar testes das regras críticas do backend

Issue #26 · OPEN · Milestone 7 — Qualidade e Release do MVP

Objetivo


Cobrir as regras críticas do backend.


Implementação


Criar testes para autenticação, autorização, matrícula duplicada, aluno inativo, liberação duplicada, isolamento entre Salas, importação inválida e auditoria.


Critérios de aceite




Cobertura mínima das regras críticas listadas.




Dependências


Implementações correspondentes das regras cobertas.

## SI-028 — Validar fluxos integrados do MVP

Issue #27 · OPEN · Milestone 7 — Qualidade e Release do MVP

Objetivo


Validar o MVP de ponta a ponta.


Implementação


Executar validação integrada dos fluxos de Gestão, Porteiro e Sala.


Critérios de aceite




Fluxos de Gestão, Porteiro e Sala validados ponta a ponta.




Dependências


Funcionalidades do MVP integradas.

## SI-029 — Revisar segurança e casos de borda

Issue #28 · OPEN · Milestone 7 — Qualidade e Release do MVP

Objetivo


Verificar segurança e comportamentos de borda.


Implementação


Validar JWT ausente ou inválido, role incorreta, acesso entre Salas, payload inválido, IDs inexistentes, matrícula duplicada, chamada duplicada e exposição de dados sensíveis.


Critérios de aceite




Casos de segurança e borda listados verificados.




Dependências


Implementações de autenticação, autorização e regras de domínio.

## SI-030 — Preparar configuração e documentação de execução

Issue #29 · OPEN · Milestone 7 — Qualidade e Release do MVP

Objetivo


Permitir execução do projeto em ambiente limpo.


Implementação


Documentar pré-requisitos, .env.example, instalação, Docker, migrations, seed, backend, frontend, build e testes.


Critérios de aceite




Um ambiente limpo executa o projeto seguindo apenas a documentação.




Dependências


Configurações e fluxos do MVP disponíveis.

## SI-031 — Preparar release MVP v0.1.0

Issue #30 · OPEN · Milestone 7 — Qualidade e Release do MVP

Objetivo


Preparar o processo de release do MVP v0.1.0.


Implementação


Planejar release/v0.1.0 e validações finais, sem criar branch de release, tag ou release nesta issue.


Critérios de aceite




Dependências P0/P1 necessárias ao MVP concluídas.
- Validações finais planejadas.




Dependências


Issues P0/P1 necessárias ao MVP.
