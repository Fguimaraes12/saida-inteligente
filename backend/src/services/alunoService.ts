import { AppError } from "../errors/AppError.js";
import { alunoRepository } from "../repositories/alunoRepository.js";
import { salaRepository } from "../repositories/salaRepository.js";
import type { AlunoInput, AlunoQuery } from "../schemas/domainSchema.js";
import type { AuthUser } from "./sessionService.js";

async function requireSala(id: number) {
  if (!(await salaRepository.find(id)))
    throw new AppError(404, "SALA_NOT_FOUND", "Sala não encontrada.");
}
export const alunoService = {
  list(query: AlunoQuery, user: AuthUser) {
    return alunoRepository.list({
      ...(user.role === "PORTEIRO"
        ? { ativo: true }
        : query.ativo
          ? { ativo: query.ativo === "true" }
          : {}),
      ...(query.salaId ? { salaId: query.salaId } : {}),
      sala: {
        ...(query.serie ? { serie: query.serie } : {}),
        ...(query.segmento ? { segmento: { nome: query.segmento } } : {}),
      },
      ...(query.busca
        ? {
            OR: [
              { nome: { contains: query.busca, mode: "insensitive" } },
              { matricula: { contains: query.busca, mode: "insensitive" } },
            ],
          }
        : {}),
    });
  },
  async create(data: AlunoInput, user: AuthUser) {
    await requireSala(data.salaId);
    return alunoRepository.create(data, user.id);
  },
  async edit(id: number, data: AlunoInput, user: AuthUser) {
    await requireSala(data.salaId);
    return alunoRepository.update(id, data, user.id, "EDICAO");
  },
  status(id: number, ativo: boolean, user: AuthUser) {
    return alunoRepository.update(
      id,
      { ativo },
      user.id,
      ativo ? "REATIVACAO" : "INATIVACAO",
    );
  },
  async import(
    id: number,
    alunos: Omit<AlunoInput, "salaId">[],
    user: AuthUser,
  ) {
    await requireSala(id);
    if (new Set(alunos.map((a) => a.matricula)).size !== alunos.length)
      throw new AppError(
        409,
        "MATRICULA_DUPLICADA",
        "Matrículas repetidas no arquivo.",
      );
    return alunoRepository.import(
      alunos.map((a) => ({ ...a, salaId: id })),
      user.id,
    );
  },
};
