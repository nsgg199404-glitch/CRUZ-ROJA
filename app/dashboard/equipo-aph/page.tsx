"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, addDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function RegistroEquipoPage() {
    const router = useRouter();
    const [cargando, setCargando] = useState(false);

    // Referencia para el input de archivo oculto
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);

    // Estado del formulario (Mapeado a los campos exactos de Firebase)
    const [formData, setFormData] = useState({
        categoria: "Ambulancia CR-237", // Ubicación / Unidad
        nombre: "",
        cantidad: "",
        numSerie: "",
        color: "Rojo",
        estado: "Excelente Estado",
        descripcion: ""
    });

    // Listas desplegables idénticas a la app móvil
    const ubicaciones = ["Ambulancia CR-237", "Ambulancia CR-55", "Ambulancia CR-4", "Clínica", "Equipo de Rescate", "Bodega"];
    const colores = ["Rojo", "Azul", "Amarillo", "Verde", "Negro", "Blanco", "Gris / Plata", "Naranja", "Otro"];
    const estados = ["Excelente Estado", "Buen Estado", "Mal Estado (Dañado)", "Incompleto", "Para Descarte"];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFotoArchivo(file);
            setFotoPreview(URL.createObjectURL(file)); // Generar vista previa temporal
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);

        try {
            let fotoUrl = "";

            // 1. Subir la imagen a Firebase Storage si se seleccionó una
            if (fotoArchivo) {
                const storage = getStorage();
                const nombreArchivo = `${Date.now()}_${fotoArchivo.name}`;
                const storageRef = ref(storage, `inventario_aph/${nombreArchivo}`);
                await uploadBytes(storageRef, fotoArchivo);
                fotoUrl = await getDownloadURL(storageRef);
            }

            // 2. Generar la fecha de revisión actual (DD/MM/YYYY)
            const fechaActual = new Date().toLocaleDateString("es-SV", {
                day: "2-digit", month: "2-digit", year: "numeric"
            });

            // 3. Guardar el documento en Firestore
            const docRef = await addDoc(collection(db, "inventario_aph"), {
                cantidad: formData.cantidad,
                categoria: formData.categoria,
                color: formData.color,
                descripcion: formData.descripcion,
                estado: formData.estado,
                fechaRevision: fechaActual,
                fotoUrl: fotoUrl,
                nombre: formData.nombre,
                numSerie: formData.numSerie,
                id: "" // Lo dejamos vacío temporalmente
            });

            // 4. Actualizar el campo 'id' con el ID real del documento (como lo hace Kotlin)
            await updateDoc(docRef, { id: docRef.id });

            // 5. Limpiar formulario y mostrar éxito
            alert(" Equipo registrado exitosamente en el inventario.");
            router.push("/dashboard/inventario"); // Redirigir a la vista de inventario

        } catch (error) {
            console.error("Error al guardar equipo:", error);
            alert(" Hubo un error al guardar el registro. Verifica tu conexión.");
        }

        setCargando(false);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans">

            <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => router.push("/dashboard")} className="text-[#C62828] font-bold text-xl">
                    ←
                </button>
                <h1 className="text-[#C62828] font-bold text-lg tracking-wide uppercase">
                    REGISTRO DE EQUIPO APH
                </h1>
            </header>

            <main className="p-4 max-w-xl mx-auto mt-2">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                    {/* Ubicación / Unidad */}
                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Ubicación / Unidad:</label>
                        <select name="categoria" value={formData.categoria} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 text-md focus:border-[#C62828] focus:outline-none">
                            {ubicaciones.map(ub => <option key={ub} value={ub}>{ub}</option>)}
                        </select>
                    </div>

                    {/* Nombre del Equipo */}
                    <div>
                        <input type="text" name="nombre" placeholder="Nombre del Equipo" value={formData.nombre} onChange={handleInputChange} required className="w-full p-4 border border-gray-400 rounded-lg text-gray-800 text-md focus:border-[#C62828] focus:outline-none" />
                    </div>

                    {/* Cantidad y Serie */}
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="cantidad" placeholder="Cantidad" value={formData.cantidad} onChange={handleInputChange} required className="w-full p-4 border border-gray-400 rounded-lg text-gray-800 text-md focus:border-[#C62828] focus:outline-none" />
                        <input type="text" name="numSerie" placeholder="N° Serie (ID)" value={formData.numSerie} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg text-gray-800 text-md focus:border-[#C62828] focus:outline-none" />
                    </div>

                    {/* Color */}
                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Color:</label>
                        <select name="color" value={formData.color} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 text-md focus:border-[#C62828] focus:outline-none">
                            {colores.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="text-sm font-bold text-gray-800 mb-1 block">Estado:</label>
                        <select name="estado" value={formData.estado} onChange={handleInputChange} className="w-full p-4 border border-gray-400 rounded-lg bg-transparent text-gray-800 text-md focus:border-[#C62828] focus:outline-none">
                            {estados.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>

                    {/* Descripción */}
                    <div>
                        <textarea name="descripcion" placeholder="Descripción / Observaciones" value={formData.descripcion} onChange={handleInputChange} rows={3} className="w-full p-4 border border-gray-400 rounded-lg text-gray-800 text-md resize-none focus:border-[#C62828] focus:outline-none"></textarea>
                    </div>

                    {/* Subida de Imagen */}
                    <div className="flex flex-col gap-2">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFotoSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-[#455A64] text-white py-4 rounded-lg font-bold text-sm tracking-widest hover:bg-gray-700 transition shadow flex items-center justify-center gap-2"
                        >
                            TOMAR / SUBIR FOTO
                        </button>

                        {/* Área de Vista Previa (Recuadro gris) */}
                        <div className="w-full h-48 bg-gray-100 border border-gray-200 mt-2 flex items-center justify-center overflow-hidden rounded">
                            {fotoPreview ? (
                                <img src={fotoPreview} alt="Vista previa" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-gray-400 text-sm">Sin imagen seleccionada</span>
                            )}
                        </div>
                    </div>

                    {/* Botón de Guardar */}
                    <button
                        type="submit"
                        disabled={cargando}
                        className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-md tracking-wider hover:bg-red-800 transition shadow-md mt-4"
                    >
                        {cargando ? "GUARDANDO..." : "GUARDAR EN INVENTARIO"}
                    </button>
                </form>
            </main>
        </div>
    );
}