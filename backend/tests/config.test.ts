import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function config(environment: Record<string, string>) {
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      'const c = await import("./src/config.ts"); c.jwtSecret(); console.log(JSON.stringify({origin:c.frontendOrigin,cookie:c.cookieOptions}));',
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DOTENV_CONFIG_PATH: "/dev/null",
        JWT_SECRET: "test-only-secret-with-at-least-32-characters",
        FRONTEND_ORIGIN: "",
        ...environment,
      },
    },
  );
}
test("desenvolvimento usa cookie HttpOnly/SameSite e origem local padrão", () => {
  const result = config({ NODE_ENV: "development" });
  assert.equal(result.status, 0);
  const settings = JSON.parse(result.stdout);
  assert.equal(settings.origin, "http://localhost:5173");
  assert.deepEqual(settings.cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
});
test("produção exige origem HTTPS explícita e emite cookie Secure", () => {
  const result = config({
    NODE_ENV: "production",
    FRONTEND_ORIGIN: "https://app.escola.example",
  });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout).cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  for (const origin of [
    "",
    "http://app.escola.example",
    "https://app.escola.example/caminho",
    "https://usuario:senha@app.escola.example",
    "inválido",
  ]) {
    const invalid = config({ NODE_ENV: "production", FRONTEND_ORIGIN: origin });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /FRONTEND_ORIGIN/);
  }
});
test("segredo JWT ausente, placeholder ou curto é recusado", () => {
  for (const secret of ["", "CHANGE_ME", "curto"]) {
    const invalid = config({ NODE_ENV: "development", JWT_SECRET: secret });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /JWT_SECRET/);
  }
});
test("seed convencional é bloqueado em produção antes de conectar ao banco", () => {
  const result = spawnSync("npm", ["run", "prisma:seed"], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
      FRONTEND_ORIGIN: "https://app.escola.example",
      SEED_DEFAULT_PASSWORD: "test-only-not-a-production-password",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /não pode ser executado em produção/);
  assert.ok(!result.stderr.includes("test-only-not-a-production-password"));
});
