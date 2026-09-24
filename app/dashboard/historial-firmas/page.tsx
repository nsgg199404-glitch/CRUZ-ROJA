"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";

export default function HistorialFirmasPage() {
    const router = useRouter();
    const [cargando, setCargando] = useState(true);
    const [accesoDenegado, setAccesoDenegado] = useState(false);

    // Estados
    const [asistencias, setAsistencias] = useState<any[]>([]);
    const [vistaActual, setVistaActual] = useState<"lista" | "detalle">("lista");
    const [asistenciaSeleccionada, setAsistenciaSeleccionada] = useState<any>(null);
    const [detallesHoras, setDetallesHoras] = useState<any[]>([]);
    const [cargandoDetalles, setCargandoDetalles] = useState(false);

    // 1. Verificar acceso de Superadmin
    useEffect(() => {
        const verificarAcceso = async () => {
            const carnetGuardado = localStorage.getItem("carnetUsuario");
            if (!carnetGuardado) return router.push("/");
            const snap = await getDoc(doc(db, "usuarios", carnetGuardado));
            if (snap.exists() && snap.data().rol?.toLowerCase() === "superadmin") {
                cargarAsistencias();
            } else {
                setAccesoDenegado(true);
                setTimeout(() => router.push("/dashboard"), 2000);
            }
        };
        verificarAcceso();
    }, [router]);

    // 2. Cargar la lista general de asistencias (Tarjetas tipo App Móvil)
    const cargarAsistencias = async () => {
        try {
            const snap = await getDocs(collection(db, "asistencias"));
            const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            // Ordenar por fecha más reciente (usando timestamp si existe, si no, parseando la fecha)
            lista.sort((a, b) => {
                if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
                const parseDate = (d: string) => d ? new Date(d.split('-').reverse().join('-')).getTime() : 0;
                return parseDate(b.fecha) - parseDate(a.fecha);
            });

            setAsistencias(lista);
        } catch (error) {
            console.error("Error cargando asistencias:", error);
        }
        setCargando(false);
    };

    // 3. Cargar detalles cruzados con "registro_horas" al tocar una tarjeta
    const abrirDetalle = async (asistencia: any) => {
        setAsistenciaSeleccionada(asistencia);
        setVistaActual("detalle");
        setCargandoDetalles(true);
        setDetallesHoras([]); // Limpiar tabla anterior

        try {
            // Buscamos los registros de horas que coincidan con la fecha exacta del cierre de turno
            const q = query(collection(db, "registro_horas"), where("fechaExacta", "==", asistencia.fecha));
            const snap = await getDocs(q);

            const registros: any[] = [];
            snap.forEach(doc => {
                const data = doc.data();
                // Filtramos que pertenezcan a la misma brigada/turno
                if (data.brigada && asistencia.turno && data.brigada.toUpperCase() === asistencia.turno.toUpperCase()) {
                    registros.push(data);
                }
            });

            // Ordenamos alfabéticamente por nombre
            registros.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
            setDetallesHoras(registros);

        } catch (error) {
            console.error("Error buscando el detalle de horas:", error);
        }
        setCargandoDetalles(false);
    };

    // 4. Funciones de Exportación
    const imprimirPDF = () => {
        const originalTitle = document.title;
        document.title = `Asistencia_${asistenciaSeleccionada?.turno}_${asistenciaSeleccionada?.fecha}`;
        window.print();
        setTimeout(() => document.title = originalTitle, 1000);
    };

    const compartirWhatsApp = () => {
        let texto = `*REPORTE DE ASISTENCIA - CRUZ ROJA GUAZAPA*%0A`;
        texto += ` *Fecha:* ${asistenciaSeleccionada.fecha}%0A`;
        texto += ` *Turno:* ${asistenciaSeleccionada.turno}%0A`;
        texto += ` *Total Voluntarios:* ${detallesHoras.length}%0A%0A`;

        texto += `*DETALLE DE PERSONAL:*%0A`;
        detallesHoras.forEach((reg, index) => {
            texto += `${index + 1}. ${reg.nombre} (${reg.carnet})%0A`;
            texto += `    Entrada: ${reg.horaEntrada || "--"} | Salida: ${reg.horaSalida || "--"}%0A`;
            texto += `    Horas: ${reg.horasTrabajadas || 0} hrs%0A%0A`;
        });

        const url = `https://wa.me/?text=${texto}`;
        window.open(url, '_blank');
    };

    if (accesoDenegado) return <div className="min-h-screen flex items-center justify-center font-bold text-red-600">Acceso Denegado. Solo Superadmin.</div>;
    if (cargando) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando asistencias...</div>;

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans pb-24 print:bg-white print:pb-0">

            {/* CSS PARA EL PDF PERFECTO EN BLANCO Y NEGRO */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: portrait; margin: 15mm; }
                    html, body, main, div { height: auto !important; overflow: visible !important; max-height: none !important; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
                    aside, header, nav, button, .no-impresion { display: none !important; }
                    .area-impresion { display: block !important; width: 100% !important; color: black !important; }
                    table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th, td { border: 1px solid black !important; padding: 6px; text-align: left; }
                    th { background-color: #e5e7eb !important; }
                }
            `}} />

            {/* HEADER WEB */}
            <div className="no-impresion">
                <header className="bg-[#C62828] p-4 shadow-sm flex items-center justify-center relative">
                    <button
                        onClick={() => vistaActual === "detalle" ? setVistaActual("lista") : router.push("/dashboard")}
                        className="absolute left-4 text-white font-bold text-xl"
                    >
                        ←
                    </button>
                    <h1 className="text-white font-bold text-lg tracking-wide uppercase">
                        {vistaActual === "lista" ? "Historial de Asistencias" : "Detalle de Turno"}
                    </h1>
                </header>
            </div>

            <main className="max-w-3xl mx-auto p-4">

                {/* VISTA 1: LISTADO TIPO APP MÓVIL */}
                {vistaActual === "lista" && (
                    <div className="flex flex-col gap-4 no-impresion">
                        {asistencias.map((asist, index) => {
                            // Extraer los carnets de los que sí asistieron
                            const presentes = Object.keys(asist.detalles || {}).filter(k => asist.detalles[k] === "ASISTENCIA");

                            return (
                                <div
                                    key={asist.id || index}
                                    onClick={() => abrirDetalle(asist)}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition transform hover:-translate-y-1"
                                >
                                    <h3 className="text-[#C62828] font-bold text-[15px] mb-1">CIERRE DE TURNO</h3>
                                    <div className="flex items-start gap-1">
                                        <span className="text-green-500 font-bold mt-[2px]">☑</span>
                                        <p className="text-gray-700 text-sm leading-tight">
                                            <span className="font-bold text-green-700 uppercase">Asistieron ({presentes.length}):</span> {presentes.join(", ")}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 border-t pt-3">
                                        <div className="flex items-center gap-1 text-gray-500 text-xs font-bold">
                                            <span>📅</span> {asist.fecha}
                                        </div>
                                        <div className="bg-[#333333] text-white text-[10px] px-3 py-1 font-bold rounded uppercase tracking-wider">
                                            {asist.turno}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {asistencias.length === 0 && <p className="text-center text-gray-500 mt-10">No hay registros de asistencias.</p>}
                    </div>
                )}

                {/* VISTA 2: DETALLE DEL TURNO Y EXPORTACIÓN */}
                {vistaActual === "detalle" && asistenciaSeleccionada && (
                    <div className="no-impresion flex flex-col h-[85vh]">

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-black text-[#C62828] uppercase text-lg">{asistenciaSeleccionada.turno}</h2>
                                <span className="text-gray-500 font-bold text-sm">📅 {asistenciaSeleccionada.fecha}</span>
                            </div>
                            <p className="text-sm text-gray-600 font-bold bg-gray-50 p-2 rounded inline-block">
                                Total de Voluntarios: {detallesHoras.length}
                            </p>
                        </div>

                        {cargandoDetalles ? (
                            <div className="flex-1 flex justify-center items-center text-blue-600 font-bold animate-pulse">Cruzando bases de datos de Firebase...</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm mb-24">
                                {detallesHoras.length > 0 ? (
                                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                                        <thead>
                                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                                                <th className="p-3 font-bold text-gray-700">VOLUNTARIO / CARNET</th>
                                                <th className="p-3 font-bold text-gray-700 text-center">ENTRADA</th>
                                                <th className="p-3 font-bold text-gray-700 text-center">SALIDA</th>
                                                <th className="p-3 font-bold text-gray-700 text-center text-[#C62828]">HORAS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detallesHoras.map((reg, idx) => (
                                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <p className="font-bold text-gray-800">{reg.nombre}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono">{reg.carnet}</p>
                                                    </td>
                                                    <td className="p-3 text-center font-bold text-gray-600">{reg.horaEntrada || "--"}</td>
                                                    <td className="p-3 text-center font-bold text-gray-600">{reg.horaSalida || "--"}</td>
                                                    <td className="p-3 text-center font-black text-[#C62828] text-base">{reg.horasTrabajadas || 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        No se encontraron registros de horas exactos para {asistenciaSeleccionada.turno} en la fecha {asistenciaSeleccionada.fecha}.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* BOTONES FLOTANTES DE EXPORTACIÓN */}
                        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 flex gap-3 justify-center">
                            <button onClick={compartirWhatsApp} disabled={cargandoDetalles || detallesHoras.length === 0} className="flex-1 max-w-xs bg-[#25D366] text-white py-4 rounded-lg font-bold hover:bg-[#128C7E] transition uppercase shadow-md flex items-center justify-center gap-2">
                                COMPARTIR WHATSAPP
                            </button>
                            <button onClick={imprimirPDF} disabled={cargandoDetalles || detallesHoras.length === 0} className="flex-1 max-w-xs bg-[#C62828] text-white py-4 rounded-lg font-bold hover:bg-red-800 transition uppercase shadow-md flex items-center justify-center gap-2">
                                EXPORTAR PDF
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* 
                VISTA DEL DOCUMENTO OFICIAL PARA IMPRESIÓN (PDF)
                */}
            {vistaActual === "detalle" && (
                <div className="hidden area-impresion font-sans text-black">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-xl font-black uppercase tracking-widest text-black">CRUZ ROJA SALVADOREÑA</h1>
                        <h2 className="text-md font-bold uppercase tracking-widest text-gray-800">SECCIONAL GUAZAPA</h2>
                        <h3 className="text-lg font-black uppercase mt-4 underline text-black">REPORTE OFICIAL DE ASISTENCIA</h3>
                    </div>

                    <div className="flex justify-between font-bold mb-6 text-sm uppercase text-black">
                        <p>BRIGADA/TURNO: <span className="font-normal">{asistenciaSeleccionada?.turno}</span></p>
                        <p>FECHA: <span className="font-normal">{asistenciaSeleccionada?.fecha}</span></p>
                        <p>TOTAL PERSONAL: <span className="font-normal">{detallesHoras.length} Voluntarios</span></p>
                    </div>

                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="w-8 text-center">Nº</th>
                                <th>CARNET</th>
                                <th>NOMBRE COMPLETO</th>
                                <th className="text-center">HORA ENTRADA</th>
                                <th className="text-center">HORA SALIDA</th>
                                <th className="text-center">TOTAL HORAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detallesHoras.map((reg, index) => (
                                <tr key={index}>
                                    <td className="text-center font-bold">{index + 1}</td>
                                    <td className="font-mono text-[11px] text-center">{reg.carnet}</td>
                                    <td className="font-bold">{reg.nombre}</td>
                                    <td className="text-center">{reg.horaEntrada || "--"}</td>
                                    <td className="text-center">{reg.horaSalida || "--"}</td>
                                    <td className="text-center font-bold">{reg.horasTrabajadas || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-32 flex justify-around text-center text-black">
                        <div>
                            <div className="w-48 border-t border-black mx-auto mb-1"></div>
                            <p className="font-bold text-xs uppercase">Jefatura de Brigada</p>
                        </div>
                        <div>
                            <div className="w-48 border-t border-black mx-auto mb-1"></div>
                            <p className="font-bold text-xs uppercase">Administración General</p>
                        </div>
                    </div>

                    <p className="text-center text-[9px] text-gray-500 mt-8 italic">Documento generado por el Sistema Operativo Cruz Roja Guazapa.</p>
                </div>
            )}
        </div>
    );
}