import { prisma } from '../database/prisma.js';

export const usuarioRepository = {
  findByUsername(usuario: string) {
    return prisma.usuario.findUnique({
      where: { usuario },
      select: {
        id: true,
        usuario: true,
        senhaHash: true,
        role: true,
        salaId: true,
        segmentoId: true,
      },
    });
  },
};
