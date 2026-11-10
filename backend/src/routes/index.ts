import { Router } from "express";
import { healthController } from "../controllers/healthController.js";
import { authRoutes } from "./authRoutes.js";
import { authenticate, authorize } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import * as schema from "../schemas/domainSchema.js";
import * as c from "../controllers/domainController.js";
export const routes = Router();
routes.get("/health", healthController);
routes.use("/auth", authRoutes);
routes.use(authenticate);
const staff = authorize("GESTAO", "PORTEIRO");
const gestao = authorize("GESTAO");
routes.get("/salas", staff, c.listSalas);
routes.get(
  "/alunos",
  staff,
  validate({ query: schema.alunoQuery }),
  c.listAlunos,
);
routes.post(
  "/alunos",
  gestao,
  validate({ body: schema.alunoSchema }),
  c.createAluno,
);
routes.put(
  "/alunos/:id",
  gestao,
  validate({ params: schema.idParams, body: schema.alunoSchema }),
  c.editAluno,
);
routes.patch(
  "/alunos/:id/status",
  gestao,
  validate({ params: schema.idParams, body: schema.statusSchema }),
  c.statusAluno,
);
routes.post(
  "/salas/:id/alunos/importacao",
  gestao,
  validate({ params: schema.idParams, body: schema.importSchema }),
  c.importAlunos,
);
routes.post(
  "/liberacoes",
  authorize("PORTEIRO"),
  validate({ body: schema.releaseSchema }),
  c.createRelease,
);
routes.get(
  "/liberacoes",
  authorize("PORTEIRO"),
  validate({ query: schema.historyQuery }),
  c.history,
);
routes.get(
  "/salas/minha/liberacoes",
  authorize("SALA"),
  validate({ query: schema.historyQuery.pick({}) }),
  c.mine,
);
