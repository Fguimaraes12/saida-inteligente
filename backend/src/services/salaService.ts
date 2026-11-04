import { salaRepository } from "../repositories/salaRepository.js";
export const salaService = { list: () => salaRepository.list() };
