import { describe, it, expect } from "vitest";
import { parseListParams, validateWhitelisted } from "./list-params";

describe("parseListParams", () => {
  it("caso válido: page=2, pageSize=25, sort=nombre, order=asc", () => {
    const result = parseListParams(
      {
        page: "2",
        pageSize: "25",
        sort: "nombre",
        order: "asc",
      },
      {
        allowedSorts: ["nombre", "email", "createdAt"],
      }
    );

    expect(result).toEqual({
      page: 2,
      pageSize: 25,
      sort: "nombre",
      order: "asc",
      skip: 25,
      take: 25,
    });
  });

  it("page < 1 clampea a 1", () => {
    const result = parseListParams({ page: "0" });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it("page negativo clampea a 1", () => {
    const result = parseListParams({ page: "-5" });
    expect(result.page).toBe(1);
  });

  it("page no numérico usa default 1", () => {
    const result = parseListParams({ page: "abc" });
    expect(result.page).toBe(1);
  });

  it("pageSize no whitelisted usa default", () => {
    const result = parseListParams({ pageSize: "999" });
    expect(result.pageSize).toBe(25); // default
  });

  it("pageSize whitelisted se usa", () => {
    const result = parseListParams({ pageSize: "50" });
    expect(result.pageSize).toBe(50);
  });

  it("sort no en allowedSorts ignora", () => {
    const result = parseListParams(
      { sort: "forbiddenField" },
      { allowedSorts: ["nombre", "email"] }
    );
    expect(result.sort).toBeUndefined();
  });

  it("sort sin allowedSorts ignora", () => {
    const result = parseListParams({ sort: "nombre" });
    expect(result.sort).toBeUndefined();
  });

  it("order asc se acepta", () => {
    const result = parseListParams({ order: "asc" });
    expect(result.order).toBe("asc");
  });

  it("order desc se acepta", () => {
    const result = parseListParams({ order: "desc" });
    expect(result.order).toBe("desc");
  });

  it("order inválido ignora", () => {
    const result = parseListParams({ order: "invalid" });
    expect(result.order).toBeUndefined();
  });

  it("calcula skip/take correctamente: page=3, pageSize=10", () => {
    const result = parseListParams(
      { page: "3", pageSize: "10" },
      { allowedPageSizes: [10, 25, 50, 100] }
    );
    expect(result.skip).toBe(20); // (3-1)*10
    expect(result.take).toBe(10);
  });

  it("array de valores usa primer elemento", () => {
    const result = parseListParams({
      page: ["5", "99"],
      sort: ["nombre", "email"],
      order: ["asc", "desc"],
    });
    expect(result.page).toBe(5);
    expect(result.sort).toBeUndefined(); // sin allowedSorts
    expect(result.order).toBe("asc");
  });

  it("pageSize default personalizado", () => {
    const result = parseListParams({}, { defaultPageSize: 50 });
    expect(result.pageSize).toBe(50);
  });

  it("allowedPageSizes personalizado", () => {
    const result = parseListParams(
      { pageSize: "200" },
      { allowedPageSizes: [100, 200, 500] }
    );
    expect(result.pageSize).toBe(200);
  });

  it("searchParams vacío usa todos los defaults", () => {
    const result = parseListParams({});
    expect(result).toEqual({
      page: 1,
      pageSize: 25,
      sort: undefined,
      order: undefined,
      skip: 0,
      take: 25,
    });
  });

  it("sort vacío no se acepta", () => {
    const result = parseListParams(
      { sort: "" },
      { allowedSorts: ["nombre"] }
    );
    expect(result.sort).toBeUndefined();
  });
});

describe("validateWhitelisted", () => {
  it("valor whitelisted valida", () => {
    const result = validateWhitelisted("asc", ["asc", "desc"], "order");
    expect(result).toBe("asc");
  });

  it("valor no whitelisted lanza error", () => {
    expect(() => {
      validateWhitelisted("invalid", ["asc", "desc"], "order");
    }).toThrow();
  });

  it("whitelist vacía lanza error", () => {
    expect(() => {
      validateWhitelisted("valor", [], "campo");
    }).toThrow(/Whitelist vacía/);
  });
});
