export type User = {
  id: number;
  usuario: string;
  role: "GESTAO" | "PORTEIRO" | "SALA";
  salaId: number | null;
  segmentoId: number | null;
};
export type Sala = {
  id: number;
  serie: number;
  segmentoId: number;
  segmento: { id: number; nome: string };
};
export type Aluno = {
  id: number;
  matricula: string;
  nome: string;
  ativo: boolean;
  salaId: number;
  sala?: Sala;
};
export type Release = {
  id: number;
  dataHora: string;
  dataLiberacao: string;
  aluno: Aluno;
};
export function salaLabel(sala: Sala) {
  return sala.segmento.nome === "Educação Infantil"
    ? `Infantil ${["", "", "II", "III", "IV", "V"][sala.serie]}`
    : `${sala.serie}º ${sala.segmento.nome === "Ensino Médio" ? "série" : "ano"}`;
}
