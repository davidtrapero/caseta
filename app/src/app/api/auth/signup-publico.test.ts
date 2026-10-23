import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-reset";
import { POST } from "./[...all]/route";

const EMAIL = "intruso@test.local";

function signUpRequest(): Request {
  return new Request("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ email: EMAIL, password: "12345678", name: "Intruso" }),
  });
}

describe("registro público de Better Auth", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await resetDb();
  });

  it("POST /api/auth/sign-up/email se rechaza y no crea usuario", async () => {
    const res = await POST(signUpRequest());

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await prisma.user.count({ where: { email: EMAIL } })).toBe(0);
  });
});
