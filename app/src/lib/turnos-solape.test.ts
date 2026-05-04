import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarSolape, type TurnoRango } from "./turnos-solape";

const EMP_A = "ckemp000000000000000000a";
const EMP_B = "ckemp000000000000000000b";
const CASETA_1 = "ckcas000000000000000000x";
const CASETA_2 = "ckcas000000000000000000y";

function iso(day: number, hour: number): string {
  const d = new Date(Date.UTC(2026, 4, day, hour, 0, 0));
  return d.toISOString();
}

test("sin existentes → no solapa", () => {
  const res = detectarSolape([], {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 10),
    fechaFin: iso(1, 14),
  });
  assert.deepEqual(res, { solapa: false });
});

test("intervalos que se tocan (14→14) → no solapa", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 10), fechaFin: iso(1, 14) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 14),
    fechaFin: iso(1, 18),
  });
  assert.deepEqual(res, { solapa: false });
});

test("intervalos solapados misma caseta → solapa", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 10), fechaFin: iso(1, 14) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 12),
    fechaFin: iso(1, 16),
  });
  assert.equal(res.solapa, true);
  if (res.solapa) {
    assert.equal(res.conflictos.length, 1);
    assert.equal(res.conflictos[0].turnoId, "t1");
  }
});

test("intervalos solapados distinta caseta → solapa (regla de negocio)", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 10), fechaFin: iso(1, 14) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 12),
    fechaFin: iso(1, 16),
  });
  assert.equal(res.solapa, true);
  if (res.solapa) {
    assert.equal(res.conflictos[0].casetaId, CASETA_1);
  }
  // mismo escenario con casetas distintas
  const nuevoEnOtraCaseta = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 12),
    fechaFin: iso(1, 16),
  });
  assert.equal(nuevoEnOtraCaseta.solapa, true);
});

test("turno cross-midnight solapa con turno del día siguiente", () => {
  // Turno 20:00 día 1 → 02:00 día 2
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 20), fechaFin: iso(2, 2) },
  ];
  // Nuevo: 01:00 → 05:00 día 2 → solapa con la cola
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(2, 1),
    fechaFin: iso(2, 5),
  });
  assert.equal(res.solapa, true);
});

test("excluirTurnoId → no solapa consigo mismo", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 10), fechaFin: iso(1, 14) },
  ];
  const res = detectarSolape(
    existentes,
    { empleadoId: EMP_A, fechaInicio: iso(1, 10), fechaFin: iso(1, 14) },
    { excluirTurnoId: "t1" }
  );
  assert.deepEqual(res, { solapa: false });
});

test("turnos de otro empleado → ignorados", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_B, casetaId: CASETA_2, fechaInicio: iso(1, 10), fechaFin: iso(1, 14) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 12),
    fechaFin: iso(1, 16),
  });
  assert.deepEqual(res, { solapa: false });
});

test("diferencia de 1 ms en el borde → solapa", () => {
  // existente [10:00, 14:00), nuevo [13:59:59.999, 18:00) → solapa por 1ms
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 10), fechaFin: iso(1, 14) },
  ];
  const finMenos1 = new Date(new Date(iso(1, 14)).getTime() - 1).toISOString();
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: finMenos1,
    fechaFin: iso(1, 18),
  });
  assert.equal(res.solapa, true);
});

test("turno de 24h exacto → solapa con cualquier interior", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 0), fechaFin: iso(2, 0) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 12),
    fechaFin: iso(1, 13),
  });
  assert.equal(res.solapa, true);
});

test("nuevo totalmente dentro de existente → solapa", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 8), fechaFin: iso(1, 20) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 10),
    fechaFin: iso(1, 12),
  });
  assert.equal(res.solapa, true);
  if (res.solapa) assert.equal(res.conflictos.length, 1);
});

test("nuevo engloba a un existente → solapa", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 10), fechaFin: iso(1, 12) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 8),
    fechaFin: iso(1, 20),
  });
  assert.equal(res.solapa, true);
});

test("múltiples existentes, varios conflictos reportados", () => {
  const existentes: TurnoRango[] = [
    { id: "t1", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(1, 8), fechaFin: iso(1, 11) },
    { id: "t2", empleadoId: EMP_A, casetaId: CASETA_2, fechaInicio: iso(1, 13), fechaFin: iso(1, 16) },
    { id: "t3", empleadoId: EMP_A, casetaId: CASETA_1, fechaInicio: iso(2, 10), fechaFin: iso(2, 12) },
  ];
  const res = detectarSolape(existentes, {
    empleadoId: EMP_A,
    fechaInicio: iso(1, 10),
    fechaFin: iso(1, 14),
  });
  assert.equal(res.solapa, true);
  if (res.solapa) {
    assert.equal(res.conflictos.length, 2);
    const ids = res.conflictos.map((c) => c.turnoId).sort();
    assert.deepEqual(ids, ["t1", "t2"]);
  }
});
