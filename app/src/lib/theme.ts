import { cookies } from "next/headers";

export type Theme = "light" | "dark";

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const value = cookieStore.get("caseta-theme")?.value;
  return value === "dark" ? "dark" : "light";
}
