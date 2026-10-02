-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GESTAO', 'PORTEIRO', 'SALA');

-- CreateEnum
CREATE TYPE "AcaoGerenciamento" AS ENUM ('CADASTRO', 'EDICAO', 'INATIVACAO', 'REATIVACAO', 'IMPORTACAO');

-- CreateTable
CREATE TABLE "Segmento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Segmento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sala" (
    "id" SERIAL NOT NULL,
    "serie" INTEGER NOT NULL,
    "segmentoId" INTEGER NOT NULL,

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "salaId" INTEGER,
    "segmentoId" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluno" (
    "id" SERIAL NOT NULL,
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "salaId" INTEGER NOT NULL,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liberacao" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "porteiroId" INTEGER NOT NULL,
    "dataHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataLiberacao" DATE NOT NULL,

    CONSTRAINT "Liberacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gerenciamento" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "acao" "AcaoGerenciamento" NOT NULL,
    "dataHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gerenciamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Segmento_nome_key" ON "Segmento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Sala_segmentoId_serie_key" ON "Sala"("segmentoId", "serie");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_salaId_key" ON "Usuario"("salaId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_segmentoId_key" ON "Usuario"("segmentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_matricula_key" ON "Aluno"("matricula");

-- CreateIndex
CREATE INDEX "Aluno_salaId_ativo_idx" ON "Aluno"("salaId", "ativo");

-- CreateIndex
CREATE INDEX "Liberacao_dataLiberacao_idx" ON "Liberacao"("dataLiberacao");

-- CreateIndex
CREATE UNIQUE INDEX "Liberacao_alunoId_dataLiberacao_key" ON "Liberacao"("alunoId", "dataLiberacao");

-- AddForeignKey
ALTER TABLE "Sala" ADD CONSTRAINT "Sala_segmentoId_fkey" FOREIGN KEY ("segmentoId") REFERENCES "Segmento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_segmentoId_fkey" FOREIGN KEY ("segmentoId") REFERENCES "Segmento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liberacao" ADD CONSTRAINT "Liberacao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liberacao" ADD CONSTRAINT "Liberacao_porteiroId_fkey" FOREIGN KEY ("porteiroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gerenciamento" ADD CONSTRAINT "Gerenciamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gerenciamento" ADD CONSTRAINT "Gerenciamento_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
