# Planejamento do MVP — Saída Inteligente

**Disciplina:** Atividades Práticas Interdisciplinares de Extensão II  
**Curso:** Sistemas de Informação

---

## 1. Funcionalidades do MVP

**Gestão**
- Login (usuário/senha) — login único, um administrador no MVP
- Selecionar segmento → série
- Tela de gerenciamento de alunos da série:
  - Buscar aluno
  - Adicionar aluno manualmente
  - Importar alunos em lote via JSON para uma série específica
  - Editar aluno
  - Remover aluno (inativação lógica)

**Porteiro**
- Login (usuário/senha) — um único porteiro no MVP
- Selecionar segmento → série
- Buscar/selecionar aluno na lista
- Registrar chamada do aluno

**Sala**
- Login próprio por série/sala (usuário/senha individual)
- Usuário vinculado previamente à sua respectiva sala
- Visualizar somente os alunos chamados da própria sala
- Receber novas chamadas em tempo real

**Fora do MVP (versões futuras):**
- Telas/relatórios avançados de histórico de chamadas
- Múltiplos porteiros simultâneos com sincronização avançada
- Notificação push para responsáveis
- Permissões granulares por usuário
- Múltiplas turmas da mesma série (ex.: 6º A, 6º B, 6º C)

> **Premissa do MVP:** na escola atendida existe somente uma turma por série. Portanto, não há necessidade de distinguir turmas por letras. Cada registro de `Sala` representa diretamente uma série dentro de um segmento de ensino.

---

## 2. Usuários

Todos os usuários autenticáveis ficam centralizados na entidade `Usuario`, diferenciados por `role`.

**Com login no sistema:**

| Perfil | Autenticação | Permissões |
|---|---|---|
| **GESTAO** | Login único (usuário/senha) | Cadastrar, editar, inativar e importar alunos de qualquer segmento/série |
| **PORTEIRO** | Login único (usuário/senha) | Consultar alunos e registrar chamadas |
| **SALA** | Login individual por sala/série | Visualizar, em modo somente leitura, os alunos chamados da própria sala |

**Envolvidos, sem login no sistema:**

| Envolvido | Papel |
|---|---|
| **Responsável** | Comparece à portaria e informa o nome do aluno |
| **Aluno** | Visualiza seu nome na tela da sala e se dirige à saída |

**Regras de associação do usuário:**
- Usuários `GESTAO` e `PORTEIRO` não possuem `sala_id`.
- Usuários `SALA` possuem obrigatoriamente um `sala_id` associado.
- Um usuário `SALA` só pode consultar informações da própria sala.

---

## 3. Entidades

### Entidades principais

**Usuario**
- `id` (PK)
- `usuario` (único)
- `senha_hash`
- `role` (`GESTAO`, `PORTEIRO`, `SALA`)
- `sala_id` (FK → Sala, nullable; obrigatório quando `role = SALA`)

**Sala**
- `id` (PK)
- `segmento`
- `serie`

**Aluno**
- `id` (PK)
- `matricula` (única)
- `nome`
- `sala_id` (FK → Sala)
- `ativo` (boolean)

**Liberacao**
- `id` (PK)
- `aluno_id` (FK → Aluno)
- `porteiro_id` (FK → Usuario)
- `data_hora`

### Entidade de auditoria da Gestão

**Gerenciamento**
- `id` (PK)
- `usuario_id` (FK → Usuario)
- `aluno_id` (FK → Aluno)
- `data_hora`
- `acao` (`CRIADO`, `EDITADO`, `INATIVADO`, `IMPORTADO`)

### Cardinalidades

| Relacionamento | Cardinalidade |
|---|---|
| Sala → Aluno | 1 sala possui N alunos |
| Usuario (`SALA`) → Sala | N usuários podem estar associados a 1 sala; no MVP será utilizado 1 login por sala |
| Aluno → Liberacao | 1 aluno pode possuir N liberações ao longo do histórico |
| Usuario (`PORTEIRO`) → Liberacao | 1 porteiro registra N liberações |
| Usuario (`GESTAO`) → Aluno (via Gerenciamento) | 1 gestor pode realizar N ações sobre alunos |

> A tabela `Liberacao` funciona como histórico permanente de chamadas. Nenhum registro precisa ser apagado ou resetado diariamente.
>
> A tela da Sala simplesmente consulta e exibe as liberações pertencentes ao dia atual.
>
> A FK que liga aluno e sala fica em `Aluno` (lado N da relação), apontando para `Sala` (lado 1).

---

## 4. Fluxos Principais

### Fluxo A — Cadastro de alunos (Gestão)
1. Gestão faz login.
2. Seleciona segmento → série.
3. Adiciona um aluno manualmente ou realiza importação em lote via JSON.
4. Sistema grava os alunos em `Aluno`.
5. Sistema registra a ação correspondente em `Gerenciamento`.

### Fluxo B — Chamada (Porteiro)
1. Responsável informa o nome do aluno na portaria.
2. Porteiro faz login.
3. Seleciona segmento → série.
4. Busca e seleciona o aluno na lista.
5. Sistema valida se o aluno está ativo e se já existe liberação para ele no dia atual.
6. Sistema grava uma nova `Liberacao` (`aluno_id`, `porteiro_id`, `data_hora`).
7. Sistema envia um evento em tempo real para a Sala correspondente ao aluno.

### Fluxo C — Exibição em tempo real (Sala)
1. Sala faz login com sua conta própria.
2. Backend identifica a sala através do usuário autenticado.
3. Sistema consulta as liberações do dia atual pertencentes aos alunos daquela Sala.
4. Lista inicial é exibida.
5. Cliente conecta ao WebSocket/Socket.io no canal autorizado da própria sala.
6. Novas liberações são adicionadas automaticamente à tela.
7. Em caso de reconexão, a aplicação consulta novamente as liberações do dia para garantir sincronização.

### Fluxo D — Edição/remoção de aluno (Gestão)
1. Gestão busca o aluno.
2. Edita os dados ou remove logicamente (`ativo = false`).
3. Sistema registra a ação em `Gerenciamento`.

---

## 5. Regras de Negócio

- Um aluno só pode estar vinculado a uma sala/série por vez.
- A escola possui apenas uma turma por série no contexto atual do MVP.
- Cada aluno deve possuir uma `matricula` única.
- Remover aluno = inativar (`ativo = false`), nunca deletar fisicamente.
- Aluno inativo não aparece nas buscas do Porteiro.
- A tela da Sala exibe apenas alunos liberados **no dia atual**.
- Não existe status de "chamado" que precise ser resetado diariamente.
- O histórico de `Liberacao` é permanente.
- A definição de "dia atual" deve ser calculada de forma consistente pelo backend, utilizando um fuso horário definido para a aplicação.
- Toda liberação deve obrigatoriamente possuir um `porteiro_id` autenticado.
- Apenas usuários com `role = PORTEIRO` podem registrar liberações.
- Apenas usuários com `role = GESTAO` podem cadastrar, editar, importar ou inativar alunos.
- Usuários com `role = SALA` possuem acesso somente leitura e exclusivamente aos dados da própria sala.
- O backend não deve confiar em um `sala_id` informado pelo cliente da Sala; a sala deve ser obtida através do usuário autenticado/JWT.
- Um aluno não deve possuir mais de uma liberação no mesmo dia. A regra também protege contra duplo clique ou requisições repetidas acidentalmente.
- O WebSocket só pode inscrever um usuário `SALA` no canal correspondente à sala associada à sua conta.

---

## 6. Contrato de Importação JSON

A importação em lote utiliza JSON em UTF-8.

A sala é definida pela rota da requisição, evitando repetir `segmento`, `serie` ou `salaId` para cada aluno.

**Exemplo:**

```http
POST /salas/3/alunos/importacao
```

```json
{
  "alunos": [
    {
      "matricula": "20260001",
      "nome": "Ana Silva"
    },
    {
      "matricula": "20260002",
      "nome": "João Pereira"
    }
  ]
}
```

### Regras da importação

- `alunos` deve ser um array não vazio.
- `matricula` é obrigatória e deve ser única.
- `nome` é obrigatório.
- Todos os alunos importados são associados à sala indicada na URL.
- Nenhum aluno deve informar manualmente `segmento`, `serie` ou `salaId` dentro do objeto.
- Registros inválidos devem retornar mensagens claras de validação.
- Matrículas duplicadas devem ser rejeitadas.
- A operação deve evitar importação parcial silenciosa; erros precisam ser informados explicitamente.

---

## 7. Convenções JSON da API

A API utiliza um padrão consistente de serialização:

- JSON em UTF-8
- propriedades em `camelCase`
- datas em ISO 8601
- booleanos como `true` / `false`
- ausência de valor representada por `null` quando aplicável
- listas representadas sempre como arrays (`[]`)

**Exemplo de Aluno:**

```json
{
  "id": 42,
  "matricula": "20260001",
  "nome": "Ana Silva",
  "ativo": true,
  "salaId": 3,
  "createdAt": "2026-09-29T18:32:10.000Z"
}
```

**Exemplo de erro:**

```json
{
  "error": {
    "code": "ALUNO_JA_LIBERADO",
    "message": "O aluno já possui uma liberação registrada hoje."
  }
}
```

**Exemplo de erro de validação:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos.",
    "details": [
      {
        "field": "nome",
        "message": "Nome é obrigatório."
      }
    ]
  }
}
```

---

## 8. API Necessária

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/login` | Login de Gestão, Porteiro ou Sala; retorna token JWT |

### Salas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/salas` | Lista salas/séries disponíveis para Gestão e Porteiro |

### Gestão — Alunos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/alunos?segmento=&serie=&busca=` | Lista/busca alunos por segmento e série |
| `POST` | `/alunos` | Cadastra um aluno manualmente |
| `POST` | `/salas/:id/alunos/importacao` | Importa alunos em lote via JSON para uma sala específica |
| `PUT` | `/alunos/:id` | Edita dados de um aluno |
| `PATCH` | `/alunos/:id/status` | Ativa/inativa logicamente um aluno |

### Porteiro — Chamada

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/alunos?segmento=&serie=&busca=` | Busca aluno para chamada |
| `POST` | `/liberacoes` | Registra uma nova `Liberacao` |

**Exemplo de body:**

```json
{
  "alunoId": 42
}
```

> O `porteiroId` não deve ser enviado pelo frontend. O backend identifica o porteiro através do JWT.

### Sala — Visualização

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/salas/minha/liberacoes` | Retorna as liberações do dia da sala associada ao usuário autenticado |
| `WebSocket` | `sala:{id}` | Canal interno para push em tempo real de novas liberações |

> O cliente não escolhe arbitrariamente o canal `sala:{id}`. O servidor valida a identidade do usuário e autoriza somente o canal correspondente à sua própria sala.

---

## 9. Arquitetura da Aplicação

O MVP utiliza uma arquitetura **monolítica simples**, com um único repositório contendo frontend e backend separados por pasta.

```text
saida-inteligente/
├── frontend/
├── backend/
├── docs/
├── .gitignore
├── README.md
└── docker-compose.yml
```

### Backend

Arquitetura em camadas tradicional:

```text
HTTP Request
     ↓
Routes
     ↓
Controller
     ↓
Service
     ↓
Repository
     ↓
PostgreSQL
```

Responsabilidades:

- **Routes:** definição das rotas e aplicação de middlewares.
- **Controllers:** entrada e saída HTTP; não concentram regras de negócio.
- **Services:** regras de negócio e orquestração dos casos de uso.
- **Repositories:** acesso e persistência de dados.
- **Middlewares:** autenticação, autorização, tratamento de erros e responsabilidades transversais.
- **Schemas:** validação dos dados recebidos pela API.
- **WebSocket:** configuração do Socket.io e publicação das atualizações em tempo real.

**Estrutura base sugerida:**

```text
backend/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── routes/
│   ├── middlewares/
│   ├── schemas/
│   ├── database/
│   ├── websocket/
│   ├── app.ts
│   └── server.ts
├── tests/
├── package.json
└── tsconfig.json
```

### Frontend

Estrutura simples baseada em páginas, componentes e serviços:

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── Login/
│   │   ├── Gestao/
│   │   ├── Portaria/
│   │   └── Sala/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── routes/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── tsconfig.json
```

### Princípios arquiteturais

- Um único backend.
- Um único banco PostgreSQL.
- Um único frontend React com interfaces diferentes conforme o perfil autenticado.
- REST para operações convencionais.
- Socket.io somente para atualizações em tempo real.
- Nada de microsserviços, filas, Redis ou infraestrutura distribuída no MVP.
- Regras de negócio concentradas na camada `Service`.
- Banco e API são a fonte de verdade; WebSocket apenas comunica mudanças aos clientes conectados.

---

## 10. Requisitos Não Funcionais

- **Tempo real:** atualização da tela da Sala em até aproximadamente 2–3 segundos após a chamada do Porteiro.
- **Disponibilidade:** sistema disponível durante todo o horário de saída.
- **Segurança:** senhas armazenadas com hash, nunca em texto puro; comunicação via HTTPS em produção.
- **Autorização:** endpoints protegidos por JWT e role.
- **Usabilidade:** fluxo do Porteiro rápido, com poucos cliques e busca eficiente.
- **Escalabilidade mínima:** múltiplas salas conectadas simultaneamente sem perda de atualização.
- **Auditoria:** ações de Gestão e liberações registradas com data/hora.
- **Consistência:** reconexão do WebSocket deve recarregar o estado atual pela API REST.
- **Persistência:** liberações nunca são apagadas para realizar o início de um novo dia.

---

## 11. Stack Recomendada

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React + TypeScript | Interface componentizada e tipagem estática |
| Backend | Node.js + Express + TypeScript | Estrutura simples para API REST e integração com tempo real |
| Validação | Zod | Contratos de entrada explícitos e compatíveis com TypeScript |
| Tempo real | Socket.io | Atualização da tela da Sala sem polling constante |
| Banco de dados | PostgreSQL | Modelo relacional simples e adequado ao domínio |
| ORM | Prisma | Modelagem, migrations e acesso tipado ao PostgreSQL |
| Autenticação | JWT + bcrypt | Autenticação stateless e armazenamento seguro de senhas |
| Desenvolvimento local | Docker Compose | Subida simples do PostgreSQL e serviços necessários ao projeto |

---

## 12. Riscos Técnicos

- **Latência ou queda no tempo real:** conexão instável pode fazer a Sala perder eventos momentaneamente — mitigar com reconexão automática e nova consulta REST após reconectar.
- **Importação mal formatada:** JSON inválido ou dados incompletos podem quebrar o fluxo — mitigar com schemas de validação e mensagens de erro claras.
- **Requisição duplicada:** duplo clique ou repetição acidental pode registrar a mesma chamada — mitigar validando se o aluno já possui uma liberação no dia atual.
- **Login persistente da Sala:** tela pode permanecer autenticada por longos períodos — limitar a conta a permissões somente leitura e aos dados da própria sala.
- **Falha de rede na portaria:** sem conexão, a chamada não poderá ser registrada — manter mensagens claras de erro; estratégias offline ficam fora do MVP.
- **Controle de escopo:** tempo real, autenticação e três interfaces já representam complexidade suficiente — evitar adicionar infraestrutura ou funcionalidades não necessárias ao MVP.

---

## 13. Resumo do Fluxo Técnico

```text
RESPONSÁVEL
     │
     ▼
PORTEIRO
     │
     │ busca e seleciona aluno
     ▼
POST /liberacoes
     │
     ▼
Controller
     │
     ▼
Service
     │
     ├── valida aluno
     ├── valida duplicidade diária
     ├── identifica porteiro pelo JWT
     │
     ▼
Repository
     │
     ▼
PostgreSQL
     │
     └──────────────► Socket.io
                         │
                         ▼
                   SALA DO ALUNO
```

A aplicação permanece propositalmente simples: um monólito, um banco relacional, uma API REST e comunicação WebSocket apenas onde o tempo real é necessário.
