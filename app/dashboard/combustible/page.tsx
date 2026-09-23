"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, storage } from "../../../firebase";
import { collection, doc, setDoc, addDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Combustible() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado para saber quién hace la carga
    const [usuarioActivo, setUsuarioActivo] = useState<any>(null);

    const [foto, setFoto] = useState<File | null>(null);
    const [vistaPrevia, setVistaPrevia] = useState("");
    const [errorFoto, setErrorFoto] = useState("");
    const [unidad, setUnidad] = useState("CR-237");
    const [kilometraje, setKilometraje] = useState("");
    const [monto, setMonto] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [registroId, setRegistroId] = useState<string | null>(null);

    // 1. Cargar el usuario activo al entrar a la pantalla
    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (carnetGuardado) {
            getDoc(doc(db, "usuarios", carnetGuardado)).then(snap => {
                if (snap.exists()) setUsuarioActivo({ carnet: carnetGuardado, ...snap.data() });
            });
        }
    }, []);

    function seleccionarFoto(evento: React.ChangeEvent<HTMLInputElement>) {
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
        if (!usuarioActivo) return alert("Error: Usuario no identificado.");

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
            // A. Guardar en la colección de Combustible
            const cargaRef = registroId
                ? doc(db, "cargasCombustible", registroId)
                : doc(collection(db, "cargasCombustible"));

            setRegistroId(cargaRef.id);

            const fotoRef = ref(storage, `combustible/${cargaRef.id}/ticket`);

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

            // B. PUBLICAR AUTOMÁTICAMENTE EN NOVEDADES
            const fechaActual = new Date().toLocaleString("es-SV", {
                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
            });

            const descripcionNovedad = `⛽ ABASTECIMIENTO DE COMBUSTIBLE\nUnidad: ${unidad.trim()}\nMonto: $${dolares.toFixed(2)}\nKilometraje: ${km} Km.`;

            await addDoc(collection(db, "novedades"), {
                autor: usuarioActivo.carnet,
                autorNombre: usuarioActivo.nombre,
                carnetAutor: usuarioActivo.carnet,
                descripcion: descripcionNovedad,
                fecha: fechaActual,
                fotoUrl: fotoURL,
                id: "",
                timestamp: Date.now(),
                titulo: `RECARGA DE COMBUSTIBLE - ${unidad.trim()}`
            });

            setMensaje("✅ Carga registrada y publicada en Novedades.");
            setRegistroId(null);
            setKilometraje("");
            setMonto("");
            setFoto(null);
            setVistaPrevia("");

            if (fileInputRef.current) fileInputRef.current.value = "";

        } catch (error) {
            console.error("Error al registrar carga:", error);
            const codigo = typeof error === "object" && error !== null && "code" in error
                ? String(error.code)
                : "error desconocido";

            setMensaje(`❌ No se pudo completar el registro: ${codigo}.`);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#F5F7FA] px-5 py-8 text-gray-900 font-sans">
            <div className="mx-auto w-full max-w-md">

                <button
                    onClick={() => router.push("/dashboard")}
                    className="mb-4 text-sm font-bold text-gray-600 hover:text-[#C62828] transition flex items-center gap-2"
                >
                    ← Volver al Panel
                </button>

                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h1 className="mb-6 text-center text-xl font-bold text-[#C62828] uppercase tracking-wide">
                        CONTROL DE COMBUSTIBLE
                    </h1>

                    <div className="space-y-5">
                        <div>
                            <label htmlFor="unidad" className="mb-2 block text-sm font-bold text-gray-800">
                                Unidad Abastecida:
                            </label>
                            <select
                                id="unidad"
                                value={unidad}
                                onChange={(e) => setUnidad(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-[#C62828] focus:outline-none shadow-sm"
                            >
                                <option value="CR-237">CR-237</option>
                                <option value="CR-55">CR-55</option>
                                <option value="CR-4">CR-4</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="kilometraje" className="sr-only">Kilometraje actual</label>
                            <input
                                id="kilometraje"
                                type="number"
                                min="0"
                                placeholder="Kilometraje Actual"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm placeholder:text-[#C62828] focus:border-[#C62828] focus:outline-none shadow-sm"
                                value={kilometraje}
                                onChange={(e) => setKilometraje(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <label htmlFor="monto" className="sr-only">Monto de diésel en dólares</label>
                            <span className="absolute left-4 top-3 font-bold text-gray-400">$</span>
                            <input
                                id="monto"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Monto de Diesel"
                                className="w-full rounded-lg border border-gray-300 pl-8 pr-4 py-3 text-sm placeholder:text-[#C62828] focus:border-[#C62828] focus:outline-none shadow-sm"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={seleccionarFoto}
                                style={{ display: "none" }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full rounded-lg bg-[#455a64] px-4 py-4 text-sm font-bold tracking-widest text-white shadow hover:bg-[#37474f] transition uppercase flex items-center justify-center gap-2"
                            >
                                📸 FOTO DEL TICKET / BOMBA
                            </button>
                        </div>

                        {errorFoto && (
                            <p role="alert" className="text-sm text-[#C62828] text-center font-bold">
                                {errorFoto}
                            </p>
                        )}

                        {vistaPrevia && (
                            <figure className="rounded-lg border border-gray-200 p-2 bg-gray-50 shadow-inner">
                                <img
                                    src={vistaPrevia}
                                    alt="Vista previa del ticket"
                                    className="max-h-64 w-full rounded object-contain"
                                />
                                <figcaption className="mt-2 break-all text-center text-xs text-gray-500 font-semibold">
                                    {foto?.name}
                                </figcaption>
                            </figure>
                        )}

                        <button
                            type="button"
                            onClick={registrarCarga}
                            disabled={guardando}
                            className="mt-4 w-full rounded-lg bg-[#C62828] px-4 py-4 text-sm font-bold tracking-widest text-white shadow-md hover:bg-red-800 disabled:cursor-wait disabled:opacity-60 transition uppercase"
                        >
                            {guardando ? "GUARDANDO..." : "REGISTRAR CARGA"}
                        </button>

                        {mensaje && (
                            <p role="status" className="mt-3 text-center text-sm font-bold text-gray-800">
                                {mensaje}
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}