import type { RequestHandler } from "express";
import { alunoService } from "../services/alunoService.js";
import { salaService } from "../services/salaService.js";
import { liberacaoService } from "../services/liberacaoService.js";
import { publishRelease } from "../websocket/index.js";
export const listSalas: RequestHandler = async (_req, res) => {
  res.json(await salaService.list());
};
export const listAlunos: RequestHandler = async (req, res) => {
  res.json(await alunoService.list(res.locals.query, req.user));
};
export const createAluno: RequestHandler = async (req, res) => {
  res.status(201).json(await alunoService.create(req.body, req.user));
};
export const editAluno: RequestHandler = async (req, res) => {
  res.json(await alunoService.edit(Number(req.params.id), req.body, req.user));
};
export const statusAluno: RequestHandler = async (req, res) => {
  res.json(
    await alunoService.status(Number(req.params.id), req.body.ativo, req.user),
  );
};
export const importAlunos: RequestHandler = async (req, res) => {
  res
    .status(201)
    .json(
      await alunoService.import(
        Number(req.params.id),
        req.body.alunos,
        req.user,
      ),
    );
};
export const createRelease: RequestHandler = async (req, res) => {
  const release = await liberacaoService.create(req.body.alunoId, req.user);
  publishRelease(release);
  res.status(201).json(release);
};
export const mine: RequestHandler = async (req, res) => {
  res.json(await liberacaoService.mine(req.user));
};
export const history: RequestHandler = async (_req, res) => {
  res.json(await liberacaoService.history(res.locals.query.data));
};
