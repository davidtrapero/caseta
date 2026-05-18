import { describe, it, expect } from "vitest";
import { crearSolicitudEmpleadoSchema } from "./schema";

describe("crearSolicitudEmpleadoSchema", () => {
  it("debería validar DNI obligatorio", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      email: "juan@test.com",
      turnoIds: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).not.toThrow();
  });

  it("debería rechazar si falta DNI", () => {
    const data = {
      nombre: "Juan",
      apellidos: "García",
      email: "juan@test.com",
      turnoIds: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow();
  });

  it("debería rechazar si nombre vacío", () => {
    const data = {
      dni: "12345678X",
      nombre: "",
      apellidos: "García",
      email: "juan@test.com",
      turnoIds: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow();
  });

  it("debería aceptar email o telefono opcionales", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      email: "juan@test.com",
      turnoIds: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).not.toThrow();
  });

  it("debería rechazar turnos vacíos", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      email: "juan@test.com",
      turnoIds: [],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow();
  });

  it("debería detectar turnos duplicados", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      email: "juan@test.com",
      turnoIds: ["turno1", "turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow("duplicados");
  });
});
