import { parseCookie } from "cookie";
import { jwtVerify } from "jose";
import { jwtSecret } from "../config.js";
import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/AppError.js";

export type AuthUser = {
  id: number;
  usuario: string;
  role: "GESTAO" | "PORTEIRO" | "SALA";
  salaId: number | null;
  segmentoId: number | null;
};
export const publicUserSelect = {
  id: true,
  usuario: true,
  role: true,
  salaId: true,
  segmentoId: true,
} as const;
export async function authenticateCookie(
  header?: string,
): Promise<{ user: AuthUser; expiresAt: number }> {
  const unauthorized = () =>
    new AppError(
      401,
      "UNAUTHENTICATED",
      "Sessão inválida ou expirada. Entre novamente.",
    );
  const token = parseCookie(header || "").access_token;
  if (!token) throw unauthorized();
  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
      requiredClaims: ["sub", "exp", "iat"],
    }));
  } catch {
    throw unauthorized();
  }
  const id = Number(payload.sub);
  if (!Number.isSafeInteger(id) || id <= 0) throw unauthorized();
  // Read current permissions so stale JWT claims cannot retain an old scope.
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: publicUserSelect,
  });
  if (!user) throw unauthorized();
  const scoped =
    Number(user.salaId !== null) + Number(user.segmentoId !== null);
  if (
    (user.role === "SALA" && scoped !== 1) ||
    (user.role !== "SALA" && scoped !== 0)
  )
    throw unauthorized();
  return { user, expiresAt: payload.exp! * 1000 };
}
