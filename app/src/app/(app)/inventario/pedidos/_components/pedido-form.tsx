"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  FormError,
} from "../../../admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { crearPedidoAction, editarPedidoAction } from "../actions";
import { FMT_EUR } from "@/lib/intl";

const FORMATO_EUR = FMT_EUR;

type Modo = "crear" | "editar";

type Opcion = { id: string; nombre: string };

type Linea = {
  productoId: string;
  cantidad: string;
  precioUnitario: string;
};

type PedidoFormProps = {
  modo: Modo;
  proveedores: Opcion[];
  casetas: Opcion[];
  productos: Array<{
    id: string;
    nombre: string;
    unidad: string;
    casetas: Array<{ casetaId: string }>;
  }>;
  initial?: {
    id: string;
    proveedorId: string;
    casetaId: string;
    lineas: Array<{
      productoId: string;
      cantidad: string;
      precioUnitario: string;
    }>;
  };
};

export function PedidoForm({
  modo,
  proveedores,
  casetas,
  productos,
  initial,
}: PedidoFormProps) {
  const action = modo === "crear" ? crearPedidoAction : editarPedidoAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const vals = state && !state.ok ? state.values ?? {} : {};

  const [proveedorId, setProveedorId] = useState(initial?.proveedorId ?? "");
  const [casetaId, setCasetaId] = useState(initial?.casetaId ?? "");
  const [lineas, setLineas] = useState<Linea[]>(
    initial?.lineas && initial.lineas.length > 0
      ? initial.lineas
      : [{ productoId: "", cantidad: "", precioUnitario: "" }]
  );

  // Restaurar estado controlado tras error de validación
  useEffect(() => {
    if (state && !state.ok && vals) {
      if (vals.proveedorId) setProveedorId(vals.proveedorId as string);
      if (vals.casetaId) setCasetaId(vals.casetaId as string);
      if (vals.lineasJson) {
        try {
          const lineasRestauradas = JSON.parse(vals.lineasJson as string) as Array<{
            productoId: string;
            cantidad: number;
            precioUnitario: number;
          }>;
          setLineas(lineasRestauradas.map((l) => ({
            productoId: l.productoId,
            cantidad: String(l.cantidad),
            precioUnitario: String(l.precioUnitario),
          })));
        } catch {
          // JSON inválido: no restaurar líneas
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const productosDeLaCaseta = useMemo(
    () => productos.filter((p) => p.casetas.some((c) => c.casetaId === casetaId)),
    [productos, casetaId]
  );

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  const total = lineas.reduce((acc, l) => {
    const c = Number(l.cantidad) || 0;
    const p = Number(l.precioUnitario) || 0;
    return acc + c * p;
  }, 0);

  const actualizarLinea = (idx: number, campo: keyof Linea, valor: string) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l))
    );
  };

  const añadirLinea = () =>
    setLineas((prev) => [
      ...prev,
      { productoId: "", cantidad: "", precioUnitario: "" },
    ]);

  const quitarLinea = (idx: number) =>
    setLineas((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)
    );

  // Al cambiar de caseta, limpiar productos incompatibles.
  const onCambioCaseta = (nuevaId: string) => {
    setCasetaId(nuevaId);
    setLineas((prev) =>
      prev.map((l) => {
        const prod = productos.find((p) => p.id === l.productoId);
        if (prod && !prod.casetas.some((c) => c.casetaId === nuevaId)) {
          return { ...l, productoId: "" };
        }
        return l;
      })
    );
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? <FormError message={state.error} /> : null}

      {modo === "editar" && initial ? (
        <input type="hidden" name="_id" value={initial.id} />
      ) : null}

      <input type="hidden" name="proveedorId" value={proveedorId} />
      <input type="hidden" name="casetaId" value={casetaId} />
      <input
        type="hidden"
        name="lineasJson"
        value={JSON.stringify(
          lineas
            .filter((l) => l.productoId && l.cantidad && l.precioUnitario)
            .map((l) => ({
              productoId: l.productoId,
              cantidad: Number(l.cantidad),
              precioUnitario: Number(l.precioUnitario),
            }))
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="proveedor">Proveedor</Label>
          <select
            id="proveedor"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="" disabled>
              Selecciona un proveedor
            </option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <FieldError messages={errors.proveedorId} />
        </div>
        <div>
          <Label htmlFor="caseta">Caseta destino</Label>
          <select
            id="caseta"
            value={casetaId}
            onChange={(e) => onCambioCaseta(e.target.value)}
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="" disabled>
              Selecciona una caseta
            </option>
            {casetas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <FieldError messages={errors.casetaId} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Líneas del pedido</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={añadirLinea}
            disabled={!casetaId}
          >
            Añadir línea
          </Button>
        </div>
        {!casetaId ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Selecciona una caseta para añadir productos.
          </p>
        ) : productosDeLaCaseta.length === 0 ? (
          <p className="mt-2 text-xs text-destructive-foreground">
            Esta caseta no tiene productos activos.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {lineas.map((l, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_120px_140px_auto] items-end gap-2 rounded-md border border-border bg-card/40 p-2"
              >
                <div>
                  <Label htmlFor={`prod-${idx}`} className="text-xs">
                    Producto
                  </Label>
                  <select
                    id={`prod-${idx}`}
                    value={l.productoId}
                    onChange={(e) =>
                      actualizarLinea(idx, "productoId", e.target.value)
                    }
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">—</option>
                    {productosDeLaCaseta.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.unidad})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`cant-${idx}`} className="text-xs">
                    Cantidad
                  </Label>
                  <Input
                    id={`cant-${idx}`}
                    type="number"
                    step="0.001"
                    min="0"
                    value={l.cantidad}
                    onChange={(e) =>
                      actualizarLinea(idx, "cantidad", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`prec-${idx}`} className="text-xs">
                    Precio unitario (€)
                  </Label>
                  <Input
                    id={`prec-${idx}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.precioUnitario}
                    onChange={(e) =>
                      actualizarLinea(idx, "precioUnitario", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => quitarLinea(idx)}
                    disabled={lineas.length === 1}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <FieldError messages={errors.lineasJson} />
      </div>

      <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
        <span className="text-sm text-muted-foreground">Total estimado</span>
        <span className="font-mono text-lg font-medium">
          {FORMATO_EUR.format(total)}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Guardando…"
            : modo === "crear"
              ? "Crear pedido"
              : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/inventario/pedidos">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
