import { AppError } from "../errors/AppError.js";
import { Prisma } from "../generated/prisma/client.js";
import { liberacaoRepository } from "../repositories/liberacaoRepository.js";
import { schoolDate } from "./dateService.js";
import type { AuthUser } from "./sessionService.js";
export const liberacaoService = {
  async create(alunoId: number, user: AuthUser) {
    try {
      return await liberacaoRepository.withLockedAluno(
        alunoId,
        async (aluno, create) => {
          if (!aluno)
            throw new AppError(404, "ALUNO_NOT_FOUND", "Aluno não encontrado.");
          if (!aluno.ativo)
            throw new AppError(
              409,
              "ALUNO_INATIVO",
              "Aluno inativo não pode ser chamado.",
            );
          const now = new Date();
          return create({
            alunoId,
            porteiroId: user.id,
            dataHora: now,
            dataLiberacao: schoolDate(now),
          });
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new AppError(
          409,
          "ALUNO_JA_LIBERADO",
          "O aluno já possui uma liberação registrada hoje.",
        );
      throw error;
    }
  },
  mine(user: AuthUser) {
    return liberacaoRepository.list({
      dataLiberacao: schoolDate(),
      aluno: {
        sala: user.salaId
          ? { id: user.salaId }
          : { segmentoId: user.segmentoId! },
      },
    });
  },
  history(data?: string) {
    return liberacaoRepository.list({
      dataLiberacao: data ? new Date(`${data}T00:00:00.000Z`) : schoolDate(),
    });
  },
};
