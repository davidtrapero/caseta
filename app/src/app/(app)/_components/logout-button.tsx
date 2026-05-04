"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogOutButton() {
  const router = useRouter();

  async function onClick() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="justify-start gap-3 w-full"
    >
      <LogOut className="h-4 w-4" />
      Salir
    </Button>
  );
}
