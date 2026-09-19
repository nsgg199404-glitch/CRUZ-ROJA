"use client";

import { useState } from "react";
import { db, storage } from "../../firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
export default function Combustible() {

    const [foto, setFoto] = useState<File | null>(null);
    const [vistaPrevia, setVistaPrevia] = useState("");
    const [errorFoto, setErrorFoto] = useState("");
    const [unidad, setUnidad] = useState("CR-237");
    const [kilometraje, setKilometraje] = useState("");
    const [monto, setMonto] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [registroId, setRegistroId] = useState<string | null>(null);

    function seleccionarFoto(
        evento: React.ChangeEvent<HTMLInputElement>
    ) {
        const archivo = evento.target.files?.[0];
        if (!archivo) return;

        setErrorFoto("");

        if (!archivo.type.startsWith("image/")) {
            setErrorFoto("Selecciona un archivo de imagen.");
            evento.target.value = "";
            return;
        }

        if (archivo.size > 5 * 1024 * 1024) {
            setErrorFoto("La foto debe pesar como máximo 5 MB.");
            evento.target.value = "";
            return;
        }

        const lector = new FileReader();

        lector.onload = () => {
            setFoto(archivo);
            setVistaPrevia(lector.result as string);
        };

        lector.onerror = () => {
            setErrorFoto("No se pudo leer la foto. Intenta nuevamente.");
        };

        lector.readAsDataURL(archivo);
    }

    async function registrarCarga() {
        if (guardando) return;

        setMensaje("");

        const km = Number(kilometraje);
        const dolares = Number(monto);

        if (!unidad.trim()) {
            setMensaje("Escribe la unidad abastecida.");
            return;
        }

        if (!kilometraje.trim() || !Number.isFinite(km) || km < 0) {
            setMensaje("Escribe un kilometraje válido.");
            return;
        }

        if (!monto.trim() || !Number.isFinite(dolares) || dolares <= 0) {
            setMensaje("El monto debe ser mayor que cero.");
            return;
        }

        if (!foto) {
            setMensaje("Selecciona una foto del ticket.");
            return;
        }

        setGuardando(true);

        try {
            // Conservamos el mismo identificador si hay que reintentar.
            const cargaRef = registroId
                ? doc(db, "cargasCombustible", registroId)
                : doc(collection(db, "cargasCombustible"));

            setRegistroId(cargaRef.id);

            const fotoRef = ref(
                storage,
                `combustible/${cargaRef.id}/ticket`
            );

            await uploadBytes(fotoRef, foto, {
                contentType: foto.type,
            });

            const fotoURL = await getDownloadURL(fotoRef);

            await setDoc(cargaRef, {
                unidad: unidad.trim(),
                kilometraje: km,
                monto: Math.round(dolares * 100) / 100,
                moneda: "USD",
                fotoURL,
                fotoRuta: fotoRef.fullPath,
                fecha: serverTimestamp(),
            });

            setMensaje("Carga registrada correctamente.");
            setRegistroId(null);
            setKilometraje("");
            setMonto("");
            setFoto(null);
            setVistaPrevia("");
        } catch (error) {
            console.error("Error al registrar carga:", error);

            const codigo =
                typeof error === "object" && error !== null && "code" in error
                    ? String(error.code)
                    : "error desconocido";

            setMensaje(`No se pudo completar el registro: ${codigo}.`);
        } finally {
            setGuardando(false);
        }
    }
    return (


        <main className="min-h-screen bg-white px-5 py-8 text-gray-900">
            <section className="mx-auto w-full max-w-sm">
                <h1 className="mb-8 text-center text-lg font-bold text-red-700">
                    CONTROL DE COMBUSTIBLE
                </h1>

                <div className="space-y-5">
                    <div>
                        <label
                            htmlFor="unidad"
                            className="mb-2 block text-sm font-semibold"
                        >
                            Unidad abastecida:
                        </label>
                        <input
                            id="unidad"
                            type="text"
                            value={unidad}
                            onChange={(e) => setUnidad(e.target.value)}
                            className="w-full rounded border border-gray-400 bg-gray-100 px-3 py-3 text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="kilometraje" className="sr-only">
                            Kilometraje actual
                        </label>
                        <input
                            id="kilometraje"
                            type="number"
                            min="0"
                            placeholder="Kilometraje actual"
                            className="w-full rounded border border-gray-400 px-3 py-3 text-sm placeholder:text-red-700"
                            value={kilometraje}
                            onChange={(e) => setKilometraje(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="monto" className="sr-only">
                            Monto de diésel en dólares
                        </label>
                        <input
                            id="monto"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Monto de diésel ($)"
                            className="w-full rounded border border-gray-400 px-3 py-3 text-sm placeholder:text-red-700"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                        />

                    </div>

                    <label className="relative flex min-h-11 w-full cursor-pointer items-center justify-center rounded-sm bg-[#455a64] px-4 py-3 text-xs font-semibold tracking-wider text-white shadow-md hover:bg-[#37474f] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#455a64]">
                        📷 FOTO DEL TICKET / BOMBA

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={seleccionarFoto}
                            aria-label="Tomar o seleccionar foto del ticket"
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                    </label>

                    {errorFoto && (
                        <p role="alert" className="text-sm text-red-700">
                            {errorFoto}
                        </p>
                    )}

                    {vistaPrevia && (
                        <figure className="rounded border border-gray-300 p-3">
                            <img
                                src={vistaPrevia}
                                alt="Vista previa del ticket de combustible"
                                className="max-h-64 w-full rounded object-contain"
                            />
                            <figcaption className="mt-2 break-all text-center text-xs text-gray-600">
                                {foto?.name}
                            </figcaption>
                        </figure>
                    )}
                    <button
                        type="button"
                        onClick={registrarCarga}
                        disabled={guardando}
                        className="mt-4 min-h-12 w-full rounded-sm bg-[#c60000] px-4 py-3 text-xs font-bold tracking-widest text-white shadow-md hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
                    >
                        {guardando ? "GUARDANDO..." : "REGISTRAR CARGA"}
                    </button>

                    {mensaje && (
                        <p role="status" className="mt-3 text-center text-sm text-gray-800">
                            {mensaje}
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}