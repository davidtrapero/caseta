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
});
