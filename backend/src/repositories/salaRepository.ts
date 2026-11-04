import { prisma } from "../database/prisma.js";
export const salaRepository = {
  list: () =>
    prisma.sala.findMany({
      include: { segmento: true },
      orderBy: [{ segmentoId: "asc" }, { serie: "asc" }],
    }),
  find: (id: number) => prisma.sala.findUnique({ where: { id } }),
};
