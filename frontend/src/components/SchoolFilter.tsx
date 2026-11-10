import { salaLabel, type Sala } from "../types";
export function SchoolFilter({
  salas,
  segmento,
  salaId,
  onSegmento,
  onSala,
}: {
  salas: Sala[];
  segmento: string;
  salaId: string;
  onSegmento: (value: string) => void;
  onSala: (value: string) => void;
}) {
  return (
    <div className="filters">
      <label>
        Segmento
        <select
          value={segmento}
          onChange={(e) => {
            onSegmento(e.target.value);
            onSala("");
          }}
        >
          <option value="">Selecione o segmento</option>
          {[...new Set(salas.map((s) => s.segmento.nome))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Série / sala
        <select
          value={salaId}
          disabled={!segmento}
          onChange={(e) => onSala(e.target.value)}
        >
          <option value="">Selecione a sala</option>
          {salas
            .filter((s) => s.segmento.nome === segmento)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {salaLabel(s)}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}
