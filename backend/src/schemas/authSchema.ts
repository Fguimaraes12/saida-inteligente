import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().trim().min(1, 'Usuário é obrigatório.'),
  senha: z.string().min(1, 'Senha é obrigatória.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
