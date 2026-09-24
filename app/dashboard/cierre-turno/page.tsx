"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";

export default function CierreTurnoPage() {
    const router = useRouter();
    const [cargando, setCargando] = useState(false);
    const [usuarioActivo, setUsuarioActivo] = useState<any>(null);
    const [novedadesManuales, setNovedadesManuales] = useState("");

    // Datos recopilados para el reporte
    const [atenciones, setAtenciones] = useState<any[]>([]);
    const [asistencia, setAsistencia] = useState<any[]>([]);
    const [fechaReporte, setFechaReporte] = useState("");

    // 1. Cargar el usuario activo
    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (carnetGuardado) {
            getDoc(doc(db, "usuarios", carnetGuardado)).then(snap => {
                if (snap.exists()) setUsuarioActivo({ carnet: carnetGuardado, ...snap.data() });
            });
        }

        // Establecer la fecha actual por defecto (DD-MM-YYYY)
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        setFechaReporte(`${dia}-${mes}-${anio}`);
    }, []);

    const generarReporte = async () => {
        if (!usuarioActivo) return alert("Error: Usuario no identificado.");
        setCargando(true);

        try {
            // A. Obtener Bitácora de Atenciones del día
            const atencionesRef = collection(db, "bitacora_atenciones");
            const qAtenciones = query(atencionesRef, where("fecha", "==", fechaReporte));
            const snapAtenciones = await getDocs(qAtenciones);
            const listaAtenciones = snapAtenciones.docs.map(doc => doc.data());
            setAtenciones(listaAtenciones);

            // B. Obtener Registro de Horas (Asistencia) del día
            const asistenciaRef = collection(db, "registro_horas");
            const qAsistencia = query(asistenciaRef, where("fechaExacta", "==", fechaReporte));
            const snapAsistencia = await getDocs(qAsistencia);
            const listaAsistencia = snapAsistencia.docs.map(doc => doc.data());
            setAsistencia(listaAsistencia);

            // Una vez cargados los datos, ejecutamos la impresión del navegador tras un breve retraso
            setTimeout(() => {
                window.print();
                setCargando(false);
            }, 1000);

        } catch (error) {
            console.error("Error al recopilar datos:", error);
            alert(" Hubo un error al generar el reporte.");
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans print:bg-white">

            {/* 
                VISTA DEL DASHBOARD
            */}
            <div className="print:hidden pb-20">
                <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                    <button onClick={() => router.push("/dashboard")} className="text-[#C62828] font-bold text-xl">←</button>
                    <h1 className="text-[#C62828] font-bold text-lg tracking-wide uppercase">CIERRE DE TURNO</h1>
                </header>

                <main className="p-4 max-w-md mx-auto mt-6">
                    <div className="flex flex-col items-center mb-6">
                        <span className="text-5xl mb-2"></span>
                        <h2 className="text-xl font-bold text-[#C62828]">CIERRE DE TURNO</h2>
                        <p className="text-gray-500 text-sm">Generación automática de reporte</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
                        <p className="text-sm text-gray-500 font-bold mb-3 flex items-center gap-2">
                            <span>ℹ</span> El sistema incluirá automáticamente:
                        </p>
                        <ul className="text-sm text-gray-700 flex flex-col gap-2">
                            <li className="flex items-center gap-2"><span className="text-green-500">✅</span> Lista de asistencia de hoy.</li>
                            <li className="flex items-center gap-2"><span className="text-green-500">✅</span> Bitácora de emergencias de hoy.</li>
                        </ul>
                    </div>

                    <div className="mb-6">
                        <label className="text-sm font-bold text-gray-700 mb-2 block">Fecha de Cierre (DD-MM-YYYY):</label>
                        <input
                            type="text"
                            value={fechaReporte}
                            onChange={(e) => setFechaReporte(e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-lg bg-white text-gray-800 focus:border-[#C62828] focus:outline-none"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="text-sm font-bold text-gray-700 mb-2 block">Novedades / Observaciones:</label>
                        <textarea
                            rows={4}
                            placeholder="Ej: Unidad 123 queda con tanque lleno. Camilla auxiliar dañada..."
                            value={novedadesManuales}
                            onChange={(e) => setNovedadesManuales(e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-lg bg-gray-100 text-gray-800 resize-none focus:border-[#C62828] focus:outline-none"
                        ></textarea>
                    </div>

                    <button
                        onClick={generarReporte}
                        disabled={cargando}
                        className="w-full bg-[#D32F2F] text-white py-4 rounded-lg font-bold text-md tracking-wider hover:bg-red-800 transition shadow-md"
                    >
                        {cargando ? "RECOPILANDO DATOS..." : " GENERAR Y ENVIAR PDF"}
                    </button>
                </main>
            </div>


            {/* 
                VISTA SOLO PARA IMPRESIÓN PDF
             */}
            <div className="hidden print:block p-8 text-black bg-white min-h-screen">

                {/* Cabecera del PDF */}
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black uppercase">REPORTE DE CIERRE DE TURNO</h1>
                        <p className="text-md text-gray-700 font-bold">Cruz Roja Salvadoreña - Seccional Guazapa</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg">Fecha: {fechaReporte}</p>
                        <p className="text-sm">Generado por: {usuarioActivo?.nombre || "N/A"}</p>
                    </div>
                </div>

                {/*  Asistencia */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold bg-gray-200 p-2 mb-4 border border-gray-400 uppercase">1. Control de Asistencia</h2>
                    {asistencia.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No se encontraron registros de asistencia para esta fecha.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse border border-gray-400">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-400 p-2 text-left">Carnet</th>
                                    <th className="border border-gray-400 p-2 text-left">Nombre del Voluntario</th>
                                    <th className="border border-gray-400 p-2 text-center">Entrada</th>
                                    <th className="border border-gray-400 p-2 text-center">Salida</th>
                                    <th className="border border-gray-400 p-2 text-center">Horas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {asistencia.map((asis, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-400 p-2 font-mono">{asis.carnet}</td>
                                        <td className="border border-gray-400 p-2 font-semibold">{asis.nombre}</td>
                                        <td className="border border-gray-400 p-2 text-center">{asis.horaEntrada || "--:--"}</td>
                                        <td className="border border-gray-400 p-2 text-center">{asis.horaSalida || "--:--"}</td>
                                        <td className="border border-gray-400 p-2 text-center">{asis.horasTrabajadas || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/*  Emergencias Atendidas */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold bg-gray-200 p-2 mb-4 border border-gray-400 uppercase">2. Bitácora de Emergencias</h2>
                    {atenciones.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No se reportaron atenciones en esta fecha.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse border border-gray-400">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-400 p-2 text-left">Unidad</th>
                                    <th className="border border-gray-400 p-2 text-left">Tipo de Atención</th>
                                    <th className="border border-gray-400 p-2 text-left">Lugar</th>
                                    <th className="border border-gray-400 p-2 text-left">Paciente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atenciones.map((aten, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-400 p-2 font-bold">{aten.unidad}</td>
                                        <td className="border border-gray-400 p-2">{aten.tipoAtencion}</td>
                                        <td className="border border-gray-400 p-2">{aten.lugarIncidente}</td>
                                        <td className="border border-gray-400 p-2">{aten.nombrePaciente || "No especificado"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/*  Observaciones */}
                <div className="mb-12">
                    <h2 className="text-lg font-bold bg-gray-200 p-2 mb-4 border border-gray-400 uppercase">3. Novedades y Observaciones del Turno</h2>
                    <div className="border border-gray-400 p-4 min-h-[100px] text-sm">
                        {novedadesManuales ? novedadesManuales : <span className="text-gray-400 italic">Sin observaciones reportadas.</span>}
                    </div>
                </div>

                {/* Firmas */}
                <div className="grid grid-cols-2 gap-8 mt-16 text-center">
                    <div>
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p className="font-bold text-sm uppercase">{usuarioActivo?.nombre || "JEFE DE TURNO"}</p>
                        <p className="text-xs text-gray-600">Jefe de Turno / Despacho</p>
                    </div>
                    <div>
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p className="font-bold text-sm uppercase">ADMINISTRACIÓN LOCAL</p>
                        <p className="text-xs text-gray-600">Vo. Bo.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}