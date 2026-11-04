import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, usuario: string) {
  await page.goto("/login");
  await page.getByLabel("Usuário", { exact: true }).fill(usuario);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.SEED_DEFAULT_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
test("Gestão, Porteiro, Sala e Sala Geral executam o fluxo ponta a ponta", async ({
  browser,
}) => {
  const managerContext = await browser.newContext(),
    gateContext = await browser.newContext(),
    roomContext = await browser.newContext(),
    generalContext = await browser.newContext(),
    otherContext = await browser.newContext();
  const manager = await managerContext.newPage(),
    gate = await gateContext.newPage(),
    room = await roomContext.newPage(),
    general = await generalContext.newPage(),
    other = await otherContext.newPage();
  try {
    await login(manager, "gestao");
    await expect(manager).toHaveURL(/gestao$/);
    await manager
      .getByRole("combobox", { name: "Segmento", exact: true })
      .selectOption({ label: "Fundamental I" });
    await manager.getByRole("combobox", { name: "Série / sala", exact: true }).selectOption({ label: "1º ano" });
    await manager.getByLabel("Nome do aluno").fill("Ana Integração");
    await manager.getByLabel("Matrícula", { exact: true }).fill("E2E-001");
    await manager
      .getByRole("button", { name: "Salvar aluno", exact: true })
      .click();
    await expect(manager.getByRole("status").filter({ hasText: /cadastrado|Importação concluída/ })).toContainText("Aluno cadastrado");
    await manager.getByRole("button", { name: "Editar", exact: true }).click();
    await manager.getByLabel("Nome do aluno").fill("Ana Revisada");
    await manager.getByRole("button", { name: "Salvar aluno" }).click();
    await expect(
      manager.getByRole("cell", { name: "Ana Revisada", exact: true }),
    ).toBeVisible();
    manager.on("dialog", (dialog) => dialog.accept());
    await manager
      .getByRole("button", { name: "Inativar", exact: true })
      .click();
    await expect(
      manager.getByRole("cell", { name: "Inativo", exact: true }),
    ).toBeVisible();
    await login(gate, "portaria");
    await expect(gate).toHaveURL(/portaria$/);
    await gate
      .getByRole("combobox", { name: "Segmento", exact: true })
      .selectOption({ label: "Fundamental I" });
    await gate.getByRole("combobox", { name: "Série / sala", exact: true }).selectOption({ label: "1º ano" });
    await expect(
      gate.getByText("Nenhum aluno ativo encontrado."),
    ).toBeVisible();
    await manager
      .getByRole("button", { name: "Reativar", exact: true })
      .click();
    await expect(
      manager.getByRole("cell", { name: "Ativo", exact: true }),
    ).toBeVisible();
    await manager
      .getByLabel("Conteúdo JSON")
      .fill(
        JSON.stringify({
          alunos: [{ nome: "Bia Importada", matricula: "E2E-002" }],
        }),
      );
    await manager
      .getByRole("button", { name: "Importar para esta sala" })
      .click();
    await expect(manager.getByRole("status").filter({ hasText: /cadastrado|Importação concluída/ })).toContainText(
      "Importação concluída",
    );
    await login(room, "fund1_1ano");
    await login(general, "fund1_geral");
    await login(other, "fund1_2ano");
    await expect(room.getByRole("status")).toContainText("Conectado");
    await expect(general.getByRole("status")).toContainText("Conectado");
    await gate.getByLabel("Buscar por nome ou matrícula").fill("Ana");
    await gate.getByRole("button", { name: "Chamar aluno" }).click();
    await expect(gate.getByRole("status").filter({ hasText: /registrada/ })).toContainText("registrada");
    await expect(
      room.getByRole("heading", { name: "Ana Revisada", exact: true }),
    ).toBeVisible();
    await expect(
      general.getByRole("heading", { name: "Ana Revisada", exact: true }),
    ).toBeVisible();
    await expect(
      other.getByRole("heading", { name: "Ana Revisada", exact: true }),
    ).toHaveCount(0);
    await gate.getByRole("button", { name: "Chamar aluno" }).click();
    await expect(gate.getByRole("alert")).toContainText(
      "já possui uma liberação",
    );
    await roomContext.setOffline(true);
    await expect(room.getByRole("status")).toContainText("Reconectando");
    await gate.getByLabel("Buscar por nome ou matrícula").fill("Bia");
    await gate.getByRole("button", { name: "Chamar aluno" }).click();
    await expect(gate.getByRole("status").filter({ hasText: /registrada/ })).toContainText("Chamada de Bia");
    await roomContext.setOffline(false);
    await expect(
      room.getByRole("heading", { name: "Bia Importada", exact: true }),
    ).toBeVisible();
    await expect(
      room.getByRole("heading", { name: "Ana Revisada", exact: true }),
    ).toBeVisible();
    await room.goto("/gestao");
    await expect(room).toHaveURL(/sala$/);
    const cookies = await roomContext.cookies();
    expect(cookies.find((c) => c.name === "access_token")?.httpOnly).toBe(true);
    expect(
      await room.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
    await manager.reload();
    await expect(manager).toHaveURL(/gestao$/);
    await expect(
      manager.getByRole("heading", { name: "Alunos", exact: true }),
    ).toBeVisible();
    await manager.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(manager).toHaveURL(/login$/);
    await manager.getByLabel("Usuário", { exact: true }).fill("gestao");
    await manager.getByLabel("Senha", { exact: true }).fill("incorrect");
    await manager.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(manager.getByRole("alert")).toContainText(
      "Usuário ou senha inválidos",
    );
  } finally {
    await Promise.all(
      [
        managerContext,
        gateContext,
        roomContext,
        generalContext,
        otherContext,
      ].map((c) => c.close()),
    );
  }
});
