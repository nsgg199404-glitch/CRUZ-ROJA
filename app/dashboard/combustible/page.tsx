"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase"; // Subimos 3 niveles para llegar a la raíz
import { collection, addDoc } from "firebase/firestore";

export default function ControlCombustible() {
    const router = useRouter();

    // Estados para los campos del formulario
    const [unidad, setUnidad] = useState("CR-237");
    const [kilometraje, setKilometraje] = useState("");
    const [monto, setMonto] = useState("");
    const [guardando, setGuardando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);

        try {
            // Obtenemos quién está registrando esto
            const carnetGuardado = localStorage.getItem("carnetUsuario") || "Desconocido";

            // Guardamos en la colección "control_combustible"
            await addDoc(collection(db, "control_combustible"), {
                unidad,
                kilometraje: Number(kilometraje),
                monto: Number(monto),
                registradoPor: carnetGuardado,
                fechaRegistro: new Date().toISOString(),
            });

            alert("Carga de combustible registrada con éxito.");
            router.push("/dashboard"); // Regresamos al panel principal
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al registrar la carga.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col items-center py-10 font-sans">

            {/* Botón para regresar */}
            <div className="w-full max-w-md px-6 mb-4">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="text-gray-500 font-bold text-sm flex items-center hover:text-[#C62828] transition"
                >
                    &larr; Volver al Panel
                </button>
            </div>

            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-md border border-gray-100">
                <h1 className="text-xl font-bold text-[#C62828] text-center mb-8 uppercase tracking-wide">
                    Control de Combustible
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Select de Unidad */}
                    <div>
                        <label className="block text-sm font-bold text-black mb-2">
                            Unidad Abastecida:
                        </label>
                        <select
                            value={unidad}
                            onChange={(e) => setUnidad(e.target.value)}
                            className="w-full border border-gray-400 rounded-lg p-3 text-black focus:outline-none focus:border-[#C62828] bg-transparent"
                        >
                            <option value="CR-237">CR-237</option>
                            <option value="CR-55">CR-55</option>
                            <option value="CR-4">CR-4</option>
                            <option value="Vehículo Particular">Vehículo Particular</option>
                            <option value="Ninguno (En Seccional)">Ninguno (En Seccional)</option>
                        </select>
                    </div>

                    {/* Input de Kilometraje */}
                    <div>
                        <input
                            type="number"
                            required
                            placeholder="Kilometraje Actual"
                            value={kilometraje}
                            onChange={(e) => setKilometraje(e.target.value)}
                            className="w-full border border-gray-400 rounded-lg p-3 text-black placeholder-[#C62828] focus:outline-none focus:border-[#C62828] bg-transparent"
                        />
                    </div>

                    {/* Input de Monto */}
                    <div className="relative">
                        <span className="absolute left-4 top-3 text-gray-400 font-bold text-lg">C</span>
                        <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="Monto de Diesel ($)"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            className="w-full border border-gray-400 rounded-lg p-3 pl-10 text-black placeholder-[#C62828] focus:outline-none focus:border-[#C62828] bg-transparent"
                        />
                    </div>

                    {/* Botón de Foto (Simulado por ahora para no requerir Firebase Storage inmediato) */}
                    <button
                        type="button"
                        className="w-full bg-[#3F5159] text-white font-bold py-4 rounded-lg tracking-wider flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-md"
                    >
                        📷 FOTO DEL TICKET / BOMBA
                    </button>

                    {/* Botón de Submit */}
                    <button
                        type="submit"
                        disabled={guardando}
                        className="w-full bg-[#C62828] text-white font-bold py-4 rounded-lg tracking-wider uppercase hover:bg-red-800 transition shadow-md mt-4 disabled:opacity-50"
                    >
                        {guardando ? "Registrando..." : "Registrar Carga"}
                    </button>

                </form>
            </div>
        </div>
    );
}