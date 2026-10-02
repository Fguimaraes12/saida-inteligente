import 'dotenv/config';

import argon2 from 'argon2';

import { prisma } from '../database/prisma.js';
import { Role } from '../generated/prisma/client.js';

const segmentos = [
  { nome: 'Educação Infantil', series: [2, 3, 4, 5] },
  { nome: 'Fundamental I', series: [1, 2, 3, 4, 5] },
  { nome: 'Fundamental II', series: [6, 7, 8, 9] },
  { nome: 'Ensino Médio', series: [1, 2, 3] },
] as const;

const usuariosGlobais = [
  { usuario: 'gestao', role: Role.GESTAO },
  { usuario: 'portaria', role: Role.PORTEIRO },
] as const;

const usuariosGerais = [
  { usuario: 'infantil_geral', segmento: 'Educação Infantil' },
  { usuario: 'fund1_geral', segmento: 'Fundamental I' },
  { usuario: 'fund2_geral', segmento: 'Fundamental II' },
  { usuario: 'medio_geral', segmento: 'Ensino Médio' },
] as const;

const usuariosPorSala = [
  { usuario: 'infantil_2', segmento: 'Educação Infantil', serie: 2 },
  { usuario: 'infantil_3', segmento: 'Educação Infantil', serie: 3 },
  { usuario: 'infantil_4', segmento: 'Educação Infantil', serie: 4 },
  { usuario: 'infantil_5', segmento: 'Educação Infantil', serie: 5 },
  { usuario: 'fund1_1ano', segmento: 'Fundamental I', serie: 1 },
  { usuario: 'fund1_2ano', segmento: 'Fundamental I', serie: 2 },
  { usuario: 'fund1_3ano', segmento: 'Fundamental I', serie: 3 },
  { usuario: 'fund1_4ano', segmento: 'Fundamental I', serie: 4 },
  { usuario: 'fund1_5ano', segmento: 'Fundamental I', serie: 5 },
  { usuario: 'fund2_6ano', segmento: 'Fundamental II', serie: 6 },
  { usuario: 'fund2_7ano', segmento: 'Fundamental II', serie: 7 },
  { usuario: 'fund2_8ano', segmento: 'Fundamental II', serie: 8 },
  { usuario: 'fund2_9ano', segmento: 'Fundamental II', serie: 9 },
  { usuario: 'medio_1ano', segmento: 'Ensino Médio', serie: 1 },
  { usuario: 'medio_2ano', segmento: 'Ensino Médio', serie: 2 },
  { usuario: 'medio_3ano', segmento: 'Ensino Médio', serie: 3 },
] as const;

function validarAmbiente(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('O seed é destinado apenas a desenvolvimento/MVP e não pode ser executado em produção.');
  }

  const senhaPadrao = process.env.SEED_DEFAULT_PASSWORD?.trim();

  if (!senhaPadrao) {
    throw new Error('SEED_DEFAULT_PASSWORD deve ser definida e não pode estar vazia para executar o seed.');
  }

  return senhaPadrao;
}

async function main(): Promise<void> {
  const senhaHash = await argon2.hash(validarAmbiente(), { type: argon2.argon2id });

  await prisma.$transaction(async (tx) => {
    const segmentoPorNome = new Map<string, { id: number }>();
    const salaPorChave = new Map<string, { id: number }>();

    for (const segmentoInicial of segmentos) {
      const segmento = await tx.segmento.upsert({
        where: { nome: segmentoInicial.nome },
        create: { nome: segmentoInicial.nome },
        update: {},
      });
      segmentoPorNome.set(segmento.nome, segmento);

      for (const serie of segmentoInicial.series) {
        const sala = await tx.sala.upsert({
          where: { segmentoId_serie: { segmentoId: segmento.id, serie } },
          create: { segmentoId: segmento.id, serie },
          update: {},
        });
        salaPorChave.set(`${segmento.nome}:${serie}`, sala);
      }
    }

    for (const usuarioInicial of usuariosGlobais) {
      await tx.usuario.upsert({
        where: { usuario: usuarioInicial.usuario },
        create: { ...usuarioInicial, senhaHash },
        update: {},
      });
    }

    for (const usuarioInicial of usuariosGerais) {
      const segmento = segmentoPorNome.get(usuarioInicial.segmento);
      if (!segmento) {
        throw new Error(`Segmento inicial não encontrado: ${usuarioInicial.segmento}.`);
      }

      await tx.usuario.upsert({
        where: { usuario: usuarioInicial.usuario },
        create: { usuario: usuarioInicial.usuario, senhaHash, role: Role.SALA, segmentoId: segmento.id },
        update: {},
      });
    }

    for (const usuarioInicial of usuariosPorSala) {
      const sala = salaPorChave.get(`${usuarioInicial.segmento}:${usuarioInicial.serie}`);
      if (!sala) {
        throw new Error(`Sala inicial não encontrada: ${usuarioInicial.segmento}, série ${usuarioInicial.serie}.`);
      }

      await tx.usuario.upsert({
        where: { usuario: usuarioInicial.usuario },
        create: { usuario: usuarioInicial.usuario, senhaHash, role: Role.SALA, salaId: sala.id },
        update: {},
      });
    }
  });

  console.log('Seed concluído:');
  console.log('4 segmentos');
  console.log('16 salas');
  console.log('22 usuários');
}

void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Falha ao executar o seed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
