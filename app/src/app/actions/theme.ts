"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type Theme = "light" | "dark";

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
