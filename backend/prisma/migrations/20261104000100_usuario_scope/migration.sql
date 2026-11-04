-- Keep the consolidated individual/general SALA scope invariant at the database boundary.
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_role_scope_check" CHECK (
  ("role" IN ('GESTAO', 'PORTEIRO') AND "salaId" IS NULL AND "segmentoId" IS NULL)
  OR ("role" = 'SALA' AND (("salaId" IS NOT NULL AND "segmentoId" IS NULL)
    OR ("salaId" IS NULL AND "segmentoId" IS NOT NULL)))
);
