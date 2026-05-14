"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = { debeCambiar: boolean };

// Si el usuario tiene la flag debeCambiarPassword=true, lo redirigimos
// a /cuenta/password-inicial salvo que ya esté allí. Es un guardia best-effort
// del lado cliente: la página destino vuelve a leer la flag desde la BD para
// confirmar y la propia action verifica el invariante antes de permitir el cambio.
export function EnforcePasswordChange({ debeCambiar }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (debeCambiar && pathname !== "/cuenta/password-inicial") {
      router.replace("/cuenta/password-inicial");
    }
  }, [debeCambiar, pathname, router]);

  return null;
}
