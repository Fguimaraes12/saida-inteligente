import { prisma } from "../database/prisma.js";
import type { Aluno, Prisma } from "../generated/prisma/client.js";
const include = {
  aluno: { include: { sala: { include: { segmento: true } } } },
} as const;
export type Release = Prisma.LiberacaoGetPayload<{ include: typeof include }>;
export const liberacaoRepository = {
  async withLockedAluno<T>(
    id: number,
    execute: (
      aluno: Aluno | null,
      create: (data: {
        alunoId: number;
        porteiroId: number;
        dataHora: Date;
        dataLiberacao: Date;
      }) => Promise<Release>,
    ) => Promise<T>,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Aluno" WHERE id = ${id} FOR UPDATE`;
      const aluno = await tx.aluno.findUnique({ where: { id } });
      return execute(aluno, (data) => tx.liberacao.create({ data, include }));
    });
  },
  list: (where: Prisma.LiberacaoWhereInput) =>
    prisma.liberacao.findMany({
      where,
      include,
      orderBy: [{ dataHora: "desc" }, { id: "desc" }],
    }),
};
