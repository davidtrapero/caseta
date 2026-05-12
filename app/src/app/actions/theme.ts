"use server";

// Acción global — no pertenece a ninguna ruta concreta.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Theme } from "@/lib/theme";

export async function setTheme(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set("caseta-theme", theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 año
  });
  revalidatePath("/", "layout");
}
