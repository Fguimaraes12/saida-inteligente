# Contrato da API — MVP v0.1.0

HTTP JSON UTF-8, camelCase, IDs inteiros positivos, datas ISO 8601. Base no desenvolvimento: backend na porta 3000; Vite encaminha `/api/*` para a API e `/socket.io` para Socket.io. A aplicação usa cookies, nunca token no armazenamento do navegador. JSON limitado a 1 MB; importação limitada a 1.000 alunos por requisição.

## Autenticação e segurança

`POST /auth/login` recebe `{"usuario":"portaria","senha":"..."}`. Retorna 200 com `{"usuario":{"id":2,"usuario":"portaria","role":"PORTEIRO","salaId":null,"segmentoId":null}}`. O JWT HS256 é enviado apenas no cookie `access_token` HttpOnly, SameSite=Lax, Path=/, Secure em produção e com duração `JWT_EXPIRES_IN` (padrão 8h). `JWT_SECRET` deve ser aleatório e ter ao menos 32 caracteres. Não há refresh token.

`GET /auth/me`: 200 com o mesmo objeto público, ou 401. O middleware verifica assinatura, validade e existência do usuário, carregando o perfil/escopo atual do banco. `POST /auth/logout`: 204 e expira o cookie. Logout remove o cookie daquele navegador; não existe lista de revogação de JWT. O frontend fecha a conexão Socket ao sair. Um token já copiado permanece válido até expirar.

Em produção, FRONTEND_ORIGIN deve ser uma origem HTTPS explícita, sem caminho/barra final; ausência ou valor inseguro impedem a inicialização. CORS permite somente `FRONTEND_ORIGIN` com credenciais. Mutações com Origin diferente são recusadas (403); cookies SameSite=Lax e Sec-Fetch-Site reforçam a proteção. Clientes nativos sem Origin usam normalmente a API. Produção requer HTTPS e frontend/API no mesmo site; recomenda-se reverse proxy com `/api` e `/socket.io`. Deploy entre sites diferentes não está configurado.

## Rotas e permissões

| Método / rota | Perfil | Entrada e resposta |
| --- | --- | --- |
| GET `/health` | Público | 200 `{"status":"ok"}` (liveness; não é diagnóstico contínuo do banco) |
| GET `/salas` | GESTAO, PORTEIRO | 200 array `{id,serie,segmentoId,segmento:{id,nome}}` |
| GET `/alunos` | GESTAO, PORTEIRO | Filtros opcionais `segmento` (nome exato), `serie`, `salaId`, `busca` (nome/matrícula sem diferenciar maiúsculas), `ativo=true/false`. 200 array de alunos com sala e segmento. PORTEIRO recebe somente ativos, mesmo com `ativo=false`. |
| POST `/alunos` | GESTAO | `{matricula,nome,salaId}` → 201 aluno ativo |
| PUT `/alunos/:id` | GESTAO | `{matricula,nome,salaId}` → 200 aluno atualizado |
| PATCH `/alunos/:id/status` | GESTAO | `{ativo:boolean}` → 200 aluno; nunca exclui fisicamente |
| POST `/salas/:id/alunos/importacao` | GESTAO | `{"alunos":[{"matricula":"20260001","nome":"Ana Silva"}]}` → 201 array dos alunos criados; todos ou nenhum |
| POST `/liberacoes` | PORTEIRO | `{alunoId}` → 201 `{id,alunoId,porteiroId,dataHora,dataLiberacao,aluno}`; porteiro e horário vêm do servidor |
| GET `/liberacoes?data=YYYY-MM-DD` | PORTEIRO | 200 array das chamadas daquela data; sem filtro usa hoje. Histórico diário simples, sem relatórios avançados. |
| GET `/salas/minha/liberacoes` | SALA | 200 array somente do dia e do escopo autenticado. Não aceita filtros de sala/segmento do cliente. |

`Aluno` tem `{id,matricula,nome,ativo,salaId}`; listagens incluem `sala`. Nomes e matrículas: 1–200 caracteres após trim. Os corpos de domínio são estritos: campos extras (por exemplo `porteiroId`, `ativo` no cadastro ou `salaId` nos itens de importação) retornam 400. `matricula` é única globalmente, incluindo alunos inativos.

Cada cadastro/edição/status/importação grava `Gerenciamento` na mesma transação: `CADASTRO`, `EDICAO`, `INATIVACAO`, `REATIVACAO`, `IMPORTACAO`. Mantêm-se os enums consolidados no schema; os nomes EDITADO/CRIADO da especificação inicial foram substituídos em develop antes desta implementação. Chamadas e auditorias não possuem endpoints de edição/exclusão.

A Sala individual possui `salaId`; a Sala Geral possui somente `segmentoId` e reúne as salas do respectivo segmento. Contas GESTAO/PORTEIRO não possuem nenhum vínculo. Uma constraint CHECK protege essa invariável no banco. As consultas históricas mantêm a modelagem existente: os dados de aluno/sala são resolvidos pelo cadastro atual, não por uma cópia histórica; alterações futuras de sala podem mudar essa apresentação. Não existe rotina de progressão anual neste MVP.

## Dia escolar e concorrência

`APP_TIMEZONE` (padrão `America/Sao_Paulo`) define o dia de modo consistente. `dataHora` é timestamptz; `dataLiberacao` é a data civil escolar em coluna DATE, serializada como ISO à meia-noite UTC. Uma constraint única `(alunoId,dataLiberacao)` impede duplicidade inclusive em requisições concorrentes. O registro trava a linha do aluno na transação antes de conferir atividade, serializando-o com edições/inativações.

## Erros

Formato: `{"error":{"code":"CODIGO","message":"Mensagem","details":[{"path":"campo","message":"Motivo"}]}}`; details só aparece na validação.

| HTTP | Código | Situação |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Payload/query/ID inválido ou JSON malformado |
| 400 | INVALID_REFERENCE | Referência não existe mais durante uma operação |
| 401 | INVALID_CREDENTIALS / UNAUTHENTICATED | Login incorreto / sessão ausente, inválida ou expirada |
| 403 | FORBIDDEN / ORIGIN_NOT_ALLOWED | Perfil ou origem não autorizado |
| 404 | ALUNO_NOT_FOUND / SALA_NOT_FOUND / NOT_FOUND | ID não existe / rota não existe |
| 409 | MATRICULA_DUPLICADA | Matrícula já cadastrada ou repetida na importação |
| 409 | ALUNO_INATIVO / ALUNO_JA_LIBERADO | Aluno inativo / chamada duplicada no dia |
| 413 | PAYLOAD_TOO_LARGE | JSON excede 1 MB |
| 500 | INTERNAL_ERROR | Falha inesperada; sem stack, SQL, tokens ou credenciais na resposta |

## Socket.io

Conexão no mesmo servidor HTTP, path `/socket.io`, cookie enviado por `withCredentials: true`. Apenas SALA pode conectar. Falhas do handshake: `UNAUTHENTICATED` ou `FORBIDDEN`. Origem do navegador deve corresponder a `FRONTEND_ORIGIN`.

O servidor inscreve automaticamente em `sala:{salaId}` ou `segmento:{segmentoId}`, conforme o vínculo da conta no banco. Não há evento de join controlado pelo cliente. A sessão expirada desconecta o socket. Alterações administrativas externas do vínculo exigem reconexão para renovar o canal.

Após commit da liberação, `liberacao:criada` envia somente `{id}` aos canais da sala e do segmento correspondente. O frontend recarrega o estado por REST, tanto nesse evento quanto a cada `connect` (incluindo reconexão), e a cada minuto para a virada do dia/recuperação de notificações. Uma falha de notificação não desfaz a persistência nem cria outra liberação. A lista REST é a fonte de verdade.

## Operação e validação da release

O [roteiro de produção](PRODUCTION.md) define a topologia HTTPS, rate limit de login no Nginx, banco privado com papéis separados, backup e credenciais individuais. A senha compartilhada do seed é vedada para dados reais. Os patches Prisma 7.10.1, Body Parser 2.4.0, Zod 4.6.7 e dependências transitivas corrigem as ocorrências encontradas no npm audit nesta revisão; isso não equivale a uma auditoria externa. Verificações padrão de integração/E2E permanecem bloqueadas pela política de rede aplicada; o smoke local de TLS/proxy é uma evidência independente, não sua substituição.
