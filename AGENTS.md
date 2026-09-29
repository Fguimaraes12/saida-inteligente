# Project

Saída Inteligente é um MVP escolar para gerenciamento
de liberações de alunos.

A especificação funcional está em:
docs/planejamento-mvp.md

Leia essa especificação antes de implementar funcionalidades.

# Architecture

- Monólito
- frontend: React + TypeScript
- backend: Node.js + Express + TypeScript
- PostgreSQL
- Prisma
- Socket.io
- JWT

Backend em camadas:

Route -> Controller -> Service -> Repository -> Database

Regras de negócio devem ficar em Services.
Controllers devem permanecer simples.
Repositories devem cuidar somente de persistência.

# Development rules

- Use TypeScript.
- Não adicionar dependências sem necessidade.
- Não introduzir microsserviços.
- Não implementar funcionalidades fora do MVP.
- Não alterar regras de negócio sem apontar a mudança.
- Prefira soluções simples e convencionais.
- Mantenha nomes e estruturas consistentes.
- Execute testes e validações existentes após alterações.

# Workflow

Antes de mudanças relevantes:
1. Leia a especificação.
2. Inspecione o código existente.
3. Explique brevemente o plano.
4. Implemente apenas o escopo solicitado.
5. Execute as validações disponíveis.
6. Informe arquivos alterados e decisões tomadas.