import { describe, it, expect } from "vitest";
import { formDataToObject } from "./forms";

describe("formDataToObject", () => {
  it("serializa un formulario simple", () => {
    const fd = new FormData();
    fd.append("nombre", "Juan");
    fd.append("email", "juan@example.com");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Juan",
      email: "juan@example.com",
    });
  });

  it("agrupa multivalor (checkboxes) en array", () => {
    const fd = new FormData();
    fd.append("nombre", "María");
    fd.append("turnos", "lunes");
    fd.append("turnos", "miércoles");
    fd.append("turnos", "viernes");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "María",
      turnos: ["lunes", "miércoles", "viernes"],
    });
  });

  it("excluye campos de la blacklist (password)", () => {
    const fd = new FormData();
    fd.append("nombre", "Ana");
    fd.append("password", "secreto123");
    fd.append("email", "ana@example.com");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Ana",
      email: "ana@example.com",
    });
    expect(result.password).toBeUndefined();
  });

  it("excluye passwordConfirm, passwordNueva, passwordActual", () => {
    const fd = new FormData();
    fd.append("passwordActual", "vieja123");
    fd.append("passwordNueva", "nueva456");
    fd.append("passwordNuevaConfirm", "nueva456");

    const result = formDataToObject(fd);
    expect(Object.keys(result).length).toBe(0);
  });

  it("excluye token de la blacklist", () => {
    const fd = new FormData();
    fd.append("nombre", "Carlos");
    fd.append("token", "abc123xyz");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Carlos",
    });
    expect(result.token).toBeUndefined();
  });

  it("excluye File instances", () => {
    const fd = new FormData();
    fd.append("nombre", "Diana");
    fd.append("fichero", new File(["contenido"], "doc.pdf"));
    fd.append("email", "diana@example.com");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Diana",
      email: "diana@example.com",
    });
    expect(result.fichero).toBeUndefined();
  });

  it("excluye campos con prefix _ (campos técnicos)", () => {
    const fd = new FormData();
    fd.append("nombre", "Eduardo");
    fd.append("_id", "123");
    fd.append("_action", "update");
    fd.append("email", "edu@example.com");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Eduardo",
      email: "edu@example.com",
    });
    expect(result._id).toBeUndefined();
    expect(result._action).toBeUndefined();
  });

  it("convierte string vacío a undefined, no incluye en resultado", () => {
    const fd = new FormData();
    fd.append("nombre", "Fernando");
    fd.append("notas", "");
    fd.append("email", "fer@example.com");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Fernando",
      email: "fer@example.com",
    });
    expect(result.notas).toBeUndefined();
  });

  it("mezcla: valores simples + multivalor + excluidos", () => {
    const fd = new FormData();
    fd.append("casetaId", "caseta-1");
    fd.append("fecha", "2026-05-18");
    fd.append("password", "noDebes");
    fd.append("turnos", "lunes");
    fd.append("turnos", "viernes");
    fd.append("_id", "turno-42");
    fd.append("notas", "");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      casetaId: "caseta-1",
      fecha: "2026-05-18",
      turnos: ["lunes", "viernes"],
    });
    expect(Object.keys(result).length).toBe(3);
  });

  it("soporta campo excludeFields adicional", () => {
    const fd = new FormData();
    fd.append("nombre", "Gisela");
    fd.append("customSecret", "no-incluir");
    fd.append("email", "gisela@example.com");

    const result = formDataToObject(fd, {
      excludeFields: ["customSecret"],
    });
    expect(result).toEqual({
      nombre: "Gisela",
      email: "gisela@example.com",
    });
    expect(result.customSecret).toBeUndefined();
  });

  it("mezcla File + blacklist en multivalor", () => {
    const fd = new FormData();
    fd.append("nombre", "Hugo");
    fd.append("adjuntos", new File(["a"], "a.pdf"));
    fd.append("adjuntos", new File(["b"], "b.pdf"));
    fd.append("email", "hugo@example.com");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Hugo",
      email: "hugo@example.com",
    });
    expect(result.adjuntos).toBeUndefined();
  });

  it("retorna objeto vacío si todos los campos se excluyen", () => {
    const fd = new FormData();
    fd.append("password", "123");
    fd.append("token", "xyz");
    fd.append("_id", "456");

    const result = formDataToObject(fd);
    expect(result).toEqual({});
  });

  it("preserva strings numéricos como strings (FormData siempre devuelve strings)", () => {
    const fd = new FormData();
    fd.append("cantidad", "42");
    fd.append("precio", "19.99");
    fd.append("porcentaje", "0");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      cantidad: "42",
      precio: "19.99",
      porcentaje: "0",
    });
    expect(typeof result.cantidad).toBe("string");
    expect(typeof result.precio).toBe("string");
  });

  it("simula booleanos checkbox: múltiples valores con mismo nombre -> array", () => {
    // En HTML, checkboxes con mismo name generan multivalor en FormData.
    // El frontend puede interpretar como booleano, pero formDataToObject preserva strings.
    const fd = new FormData();
    fd.append("casetas", "caseta-1");
    fd.append("casetas", "caseta-2");
    fd.append("casetas", "caseta-3");
    fd.append("activo", "on"); // Checkbox checked

    const result = formDataToObject(fd);
    expect(result).toEqual({
      casetas: ["caseta-1", "caseta-2", "caseta-3"],
      activo: "on",
    });
    expect(Array.isArray(result.casetas)).toBe(true);
  });

  it("checkbox no enviado (no checked) resulta en campo ausente", () => {
    // Checkboxes unchecked no aparecen en FormData
    const fd = new FormData();
    fd.append("nombre", "Test");
    // No añadimos 'confirmado' porque estaría unchecked

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Test",
    });
    expect(result.confirmado).toBeUndefined();
  });

  it("soporta campos con guiones (kebab-case)", () => {
    const fd = new FormData();
    fd.append("primer-nombre", "Juan");
    fd.append("apellido-paterno", "García");
    fd.append("email-trabajo", "juan@work.com");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      "primer-nombre": "Juan",
      "apellido-paterno": "García",
      "email-trabajo": "juan@work.com",
    });
  });

  it("soporta campos con underscores (snake_case) pero no prefix _", () => {
    const fd = new FormData();
    fd.append("primer_nombre", "María");
    fd.append("apellido_materno", "López");
    fd.append("_id", "no-incluir"); // Prefix _ se excluye

    const result = formDataToObject(fd);
    expect(result).toEqual({
      primer_nombre: "María",
      apellido_materno: "López",
    });
    expect(result._id).toBeUndefined();
  });

  it("maneja mezcla de vacíos, multivalor y excluidos complejos", () => {
    const fd = new FormData();
    fd.append("nombre", "Test");
    fd.append("apellido", ""); // Vacío -> excluido
    fd.append("turnos", "lunes");
    fd.append("turnos", ""); // Un valor vacío en multivalor
    fd.append("turnos", "miércoles");
    fd.append("password", "secret"); // Blacklist
    fd.append("comentarios", ""); // Vacío

    const result = formDataToObject(fd);
    expect(result).toEqual({
      nombre: "Test",
      turnos: ["lunes", "miércoles"], // El vacío se filtra
    });
  });

  it("soporta excludeFields con nombres en kebab y snake case", () => {
    const fd = new FormData();
    fd.append("campo-publico", "visible");
    fd.append("campo_secreto", "oculto");
    fd.append("email", "test@example.com");

    const result = formDataToObject(fd, {
      excludeFields: ["campo-publico", "campo_secreto"],
    });
    expect(result).toEqual({
      email: "test@example.com",
    });
    expect(result["campo-publico"]).toBeUndefined();
    expect(result["campo_secreto"]).toBeUndefined();
  });

  it("preserva orden de inserción (único para first occurrence en multivalor)", () => {
    const fd = new FormData();
    fd.append("z_field", "z1");
    fd.append("a_field", "a1");
    fd.append("m_field", "m1");

    const result = formDataToObject(fd);
    const keys = Object.keys(result);
    // FormData.keys() itera en orden de inserción
    expect(keys).toEqual(["z_field", "a_field", "m_field"]);
  });

  it("mezcla compleja: números + booleanos + multivalor + vacíos + excluidos", () => {
    const fd = new FormData();
    fd.append("casetaId", "c-1");
    fd.append("jornalDiario", "50.00");
    fd.append("turnos", "turno-1");
    fd.append("turnos", "turno-2");
    fd.append("activo", "on");
    fd.append("notas", "");
    fd.append("password", "secret");
    fd.append("_metadata", "ignored");
    fd.append("cantidad", "100");

    const result = formDataToObject(fd);
    expect(result).toEqual({
      casetaId: "c-1",
      jornalDiario: "50.00",
      turnos: ["turno-1", "turno-2"],
      activo: "on",
      cantidad: "100",
    });
    expect(Object.keys(result).length).toBe(5);
  });
});
