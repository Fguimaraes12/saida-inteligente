import "dotenv/config";

export const frontendOrigin =
  process.env.FRONTEND_ORIGIN || "http://localhost:5173";
export const appTimezone = process.env.APP_TIMEZONE || "America/Sao_Paulo";
// Validate early rather than failing on the first release.
new Intl.DateTimeFormat("en-CA", { timeZone: appTimezone }).format();
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
export function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret === "CHANGE_ME" || secret.length < 32) {
    throw new Error(
      "JWT_SECRET deve ter pelo menos 32 caracteres e ser exclusivo do ambiente.",
    );
  }
  return new TextEncoder().encode(secret);
}
