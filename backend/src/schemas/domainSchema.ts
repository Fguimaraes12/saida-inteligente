import { z } from "zod";
const id = z.number().int().positive();
const text = z.string().trim().min(1).max(200);
export const idParams = z.object({ id: z.coerce.number().int().positive() });
export const alunoFields = z.object({ matricula: text, nome: text });
export const alunoSchema = alunoFields.extend({ salaId: id }).strict();
export const statusSchema = z.object({ ativo: z.boolean() }).strict();
export const importSchema = z
  .object({ alunos: z.array(alunoFields.strict()).min(1).max(1000) })
  .strict();
export const releaseSchema = z.object({ alunoId: id }).strict();
export const alunoQuery = z
  .object({
    segmento: text.optional(),
    serie: z.coerce.number().int().positive().optional(),
    salaId: z.coerce.number().int().positive().optional(),
    busca: z.string().trim().max(200).optional(),
    ativo: z.enum(["true", "false"]).optional(),
  })
  .strict();
export const historyQuery = z
  .object({ data: z.iso.date().optional() })
  .strict();
export type AlunoInput = z.infer<typeof alunoSchema>;
export type AlunoQuery = z.infer<typeof alunoQuery>;
