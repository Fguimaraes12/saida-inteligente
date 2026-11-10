import { prisma } from "../database/prisma.js";
import type { AcaoGerenciamento, Prisma } from "../generated/prisma/client.js";
import type { AlunoInput } from "../schemas/domainSchema.js";
export const alunoRepository = {
  list: (where: Prisma.AlunoWhereInput) =>
    prisma.aluno.findMany({
      where,
      include: { sala: { include: { segmento: true } } },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    }),
  find: (id: number) => prisma.aluno.findUnique({ where: { id } }),
  create: (data: AlunoInput, usuarioId: number) =>
    prisma.aluno.create({
      data: {
        ...data,
        gerenciamentos: { create: { usuarioId, acao: "CADASTRO" } },
      },
    }),
  update: (
    id: number,
    data: AlunoInput | { ativo: boolean },
    usuarioId: number,
    acao: AcaoGerenciamento,
  ) =>
    prisma.aluno.update({
      where: { id },
      data: { ...data, gerenciamentos: { create: { usuarioId, acao } } },
    }),
  import: (alunos: AlunoInput[], usuarioId: number) =>
    prisma.$transaction(
      alunos.map((data) =>
        prisma.aluno.create({
          data: {
            ...data,
            gerenciamentos: { create: { usuarioId, acao: "IMPORTACAO" } },
          },
        }),
      ),
    ),
};
