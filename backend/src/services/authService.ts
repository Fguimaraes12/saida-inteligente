import argon2 from 'argon2';
import { SignJWT } from 'jose';

import { AppError } from '../errors/AppError.js';
import { usuarioRepository } from '../repositories/usuarioRepository.js';
import type { LoginInput } from '../schemas/authSchema.js';

const DEFAULT_JWT_EXPIRES_IN = '8h';

type JwtExpiration = {
  expiresIn: string;
  maxAgeMs: number;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET não está definida. Configure backend/.env antes de autenticar usuários.');
  }

  return new TextEncoder().encode(secret);
}

function getJwtExpiration(): JwtExpiration {
  const expiresIn = process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_JWT_EXPIRES_IN;
  const match = /^(\d+)(s|m|h|d)$/.exec(expiresIn);

  if (!match) {
    throw new Error('JWT_EXPIRES_IN deve usar um período inteiro em s, m, h ou d, por exemplo: 8h.');
  }

  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const unitMs: Record<typeof unit, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const maxAgeMs = amount * unitMs[unit];

  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0) {
    throw new Error('JWT_EXPIRES_IN deve representar uma duração positiva válida.');
  }

  return { expiresIn, maxAgeMs };
}

export const authService = {
  async login({ usuario, senha }: LoginInput) {
    const jwtSecret = getJwtSecret();
    const user = await usuarioRepository.findByUsername(usuario);
    const senhaValida = user ? await argon2.verify(user.senhaHash, senha) : false;

    if (!user || !senhaValida) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.');
    }

    const { expiresIn, maxAgeMs } = getJwtExpiration();
    const token = await new SignJWT({
      role: user.role,
      salaId: user.salaId,
      segmentoId: user.segmentoId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(jwtSecret);

    return {
      token,
      maxAgeMs,
      usuario: {
        id: user.id,
        usuario: user.usuario,
        role: user.role,
        salaId: user.salaId,
        segmentoId: user.segmentoId,
      },
    };
  },
};
