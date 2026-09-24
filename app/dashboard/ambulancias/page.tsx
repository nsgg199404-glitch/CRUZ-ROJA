"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ChequeoAmbulanciasPage() {
    const router = useRouter();
    const [cargando, setCargando] = useState(false);
    const [usuarioActivo, setUsuarioActivo] = useState<any>(null);

    // Referencia para el input de archivo
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);

    // Estado del formulario
    const [formData, setFormData] = useState({
        unidad: "CR-237",
        nivelAceite: "Alto (Correcto)",
        nivelAgua: "Alto (Correcto)",
        estadoLlantas: "Bueno",
        lucesSirena: "Bueno",
        kilometraje: ""
    });

    // Opciones de los selects (basadas en las capturas)
    const opcionesUnidad = ["CR-237", "CR-55", "CR-4", "Vehículo Particular", "Ninguno (En Seccional)"];
    const opcionesNivel = ["Alto (Correcto)", "Medio", "Bajo (Rellenar)", "Crítico (Vacío)"];
    const opcionesEstado = ["Bueno", "Regular", "Malo (Reparar)"];

    // 1. Cargar usuario
    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (carnetGuardado) {
            getDoc(doc(db, "usuarios", carnetGuardado)).then(snap => {
                if (snap.exists()) setUsuarioActivo({ carnet: carnetGuardado, ...snap.data() });
            });
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFotoArchivo(file);
            setFotoPreview(URL.createObjectURL(file));
        }
    };

    // Función que evalúa el estado general para el Muro de Novedades
    const evaluarEstadoGeneral = () => {
        const valores = [formData.nivelAceite, formData.nivelAgua, formData.estadoLlantas, formData.lucesSirena];

        const tieneMalo = valores.some(v => v.includes("Crítico") || v.includes("Malo"));
        const tieneRegular = valores.some(v => v.includes("Bajo") || v.includes("Medio") || v.includes("Regular"));

        if (tieneMalo) return { texto: "NO OPERATIVA (Requiere Reparación)", emoji: "🔴" };
        if (tieneRegular) return { texto: "OPERATIVA CON PRECAUCIÓN", emoji: "🟡" };
        return { texto: "UNIDAD OPERATIVA - BUEN ESTADO", emoji: "✅" };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuarioActivo) return alert("Error: Usuario no identificado.");

        setCargando(true);
        try {
            let fotoUrl = "";

            // 1. Subir la foto si existe
            if (fotoArchivo) {
                const storage = getStorage();
                const nombreArchivo = `${Date.now()}_${fotoArchivo.name}`;
                const storageRef = ref(storage, `checkeo_ambulancias/${nombreArchivo}`);
                await uploadBytes(storageRef, fotoArchivo);
                fotoUrl = await getDownloadURL(storageRef);
            }

            const fechaActual = new Date().toLocaleString("es-SV", {
                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
            });

            // 2. Guardar en la colección de Chequeos
            const checkeoData = {
                ...formData,
                kilometraje: Number(formData.kilometraje) || 0,
                fotoUrl: fotoUrl,
                autor: usuarioActivo.nombre,
                carnetAutor: usuarioActivo.carnet,
                fechaHora: fechaActual,
                timestamp: Date.now()
            };

            await addDoc(collection(db, "checkeo_ambulancias"), checkeoData);

            // 3. PUBLICAR AUTOMÁTICAMENTE EN EL MURO DE NOVEDADES
            const estadoGeneral = evaluarEstadoGeneral();
            const descripcionNovedad = `${estadoGeneral.emoji} Revisión ${formData.unidad}:  ${estadoGeneral.texto}. Km: ${formData.kilometraje}\nAceite: ${formData.nivelAceite}\nAgua: ${formData.nivelAgua}\nLlantas: ${formData.estadoLlantas}\nLuces: ${formData.lucesSirena}`;

            await addDoc(collection(db, "novedades"), {
                autor: usuarioActivo.carnet,
                autorNombre: usuarioActivo.nombre,
                carnetAutor: usuarioActivo.carnet,
                descripcion: descripcionNovedad,
                fecha: fechaActual,
                fotoUrl: fotoUrl,
                id: "",
                timestamp: Date.now(),
                titulo: `CHEQUEO UNIDAD ${formData.unidad}`
            });

            // 4. Imprimir PDF
            window.print();

            // 5. Limpiar y avisar
            alert(" Chequeo guardado y publicado en el Muro de Novedades.");
            router.push("/dashboard");

        } catch (error) {
            console.error("Error al guardar chequeo:", error);
            alert(" Hubo un error. Verifica tu conexión.");
        }
        setCargando(false);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans print:bg-white">

            <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10 print:hidden">
                <button onClick={() => router.push("/dashboard")} className="text-[#C62828] font-bold text-xl">
                    ←
                </button>
                <h1 className="text-black font-bold text-lg tracking-wide uppercase">
                    CHEQUEO DE AMBULANCIA
                </h1>
            </header>

            <main className="p-4 max-w-xl mx-auto mt-2">

                {/* Formulario que se oculta al imprimir (solo se verá la versión limpia) */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 print:hidden">

                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Unidad:</label>
                        <select name="unidad" value={formData.unidad} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 focus:border-[#C62828] focus:outline-none">
                            {opcionesUnidad.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Nivel de Aceite:</label>
                        <select name="nivelAceite" value={formData.nivelAceite} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 focus:border-[#C62828] focus:outline-none">
                            {opcionesNivel.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Nivel de Agua:</label>
                        <select name="nivelAgua" value={formData.nivelAgua} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 focus:border-[#C62828] focus:outline-none">
                            {opcionesNivel.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Estado Llantas:</label>
                        <select name="estadoLlantas" value={formData.estadoLlantas} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 focus:border-[#C62828] focus:outline-none">
                            {opcionesEstado.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Luces/Sirena:</label>
                        <select name="lucesSirena" value={formData.lucesSirena} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 focus:border-[#C62828] focus:outline-none">
                            {opcionesEstado.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Kilometraje:</label>
                        <input type="number" name="kilometraje" placeholder="000000" value={formData.kilometraje} onChange={handleInputChange} required className="w-full p-4 border border-gray-400 rounded-lg text-gray-800 focus:border-[#C62828] focus:outline-none" />
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFotoSelect} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-[#FF8F00] text-white py-4 rounded-lg font-bold text-sm tracking-widest hover:bg-orange-600 transition shadow flex items-center justify-center gap-2">
                            TOMAR FOTO EVIDENCIA
                        </button>

                        {fotoPreview && (
                            <div className="w-full h-48 bg-gray-100 border border-gray-200 mt-2 flex items-center justify-center overflow-hidden rounded">
                                <img src={fotoPreview} alt="Evidencia" className="w-full h-full object-contain" />
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={cargando} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-md tracking-wider hover:bg-red-800 transition shadow-md mt-4">
                        {cargando ? "PROCESANDO..." : "GUARDAR Y GENERAR PDF"}
                    </button>
                </form>

                {/* 
                    VISTA SOLO PARA IMPRESIÓN PDF
                */}
                <div className="hidden print:block font-sans text-black">
                    <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold">REPORTE DE CHEQUEO DE UNIDAD</h1>
                            <p className="text-sm text-gray-600">Cruz Roja Salvadoreña - Seccional Guazapa</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-xl">{formData.unidad}</p>
                            <p className="text-sm">Fecha: {new Date().toLocaleDateString("es-SV")}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 border border-gray-300 p-6 rounded">
                        <div><p className="font-bold text-xs text-gray-500 uppercase">Responsable</p><p className="font-semibold">{usuarioActivo?.nombre || "N/A"}</p></div>
                        <div><p className="font-bold text-xs text-gray-500 uppercase">Kilometraje</p><p className="font-semibold">{formData.kilometraje} Km</p></div>

                        <div className="col-span-2 border-t pt-4 mt-2"></div>

                        <div><p className="font-bold text-xs text-gray-500 uppercase">Nivel de Aceite</p><p className="font-semibold">{formData.nivelAceite}</p></div>
                        <div><p className="font-bold text-xs text-gray-500 uppercase">Nivel de Agua</p><p className="font-semibold">{formData.nivelAgua}</p></div>
                        <div><p className="font-bold text-xs text-gray-500 uppercase">Estado Llantas</p><p className="font-semibold">{formData.estadoLlantas}</p></div>
                        <div><p className="font-bold text-xs text-gray-500 uppercase">Luces / Sirena</p><p className="font-semibold">{formData.lucesSirena}</p></div>
                    </div>

                    <div className="text-center font-bold text-lg mb-6 p-3 bg-gray-100 rounded">
                        ESTADO: {evaluarEstadoGeneral().texto}
                    </div>

                    {fotoPreview && (
                        <div className="mt-8 text-center border p-2">
                            <p className="font-bold mb-2">Evidencia Fotográfica:</p>
                            <img src={fotoPreview} alt="Evidencia PDF" className="max-h-80 mx-auto" />
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}