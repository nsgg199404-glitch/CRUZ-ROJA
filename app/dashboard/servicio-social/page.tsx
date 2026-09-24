"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, doc, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot } from "firebase/firestore";

export default function ServicioSocialPage() {
    const router = useRouter();
    const [vistaActual, setVistaActual] = useState<"menu" | "gestion" | "asistencia" | "historial" | "reportes">("menu");

    const [estudiantes, setEstudiantes] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [cargando, setCargando] = useState(false);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [estudianteForm, setEstudianteForm] = useState({ carnet: "", nombre: "", edad: "", institucion: "Complejo Educativo Delfina de Díaz", horasSolicitadas: 150, horasCompletadas: 0 });
    const [editando, setEditando] = useState(false);

    const [asistenciaDia, setAsistenciaDia] = useState<{ [key: string]: { seleccionado: boolean, horas: number } }>({});
    const [seleccionReporte, setSeleccionReporte] = useState<{ [key: string]: boolean }>({});

    // 1. CARGAR ESTUDIANTES DIRECTO DE LA COLECCIÓN "usuarios"
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "usuarios"), (snapshot) => {
            const listaRaw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            const lista = listaRaw.filter(u =>
                String(u.rol).toLowerCase() === "estudiante" ||
                String(u.brigada).toUpperCase() === "SERVICIO SOCIAL"
            );

            lista.sort((a: any, b: any) => (a.nombre || "").localeCompare(b.nombre || ""));
            setEstudiantes(lista);

            const asisIni: any = {};
            const repIni: any = {};
            lista.forEach(est => {
                asisIni[est.id] = { seleccionado: false, horas: 0 };
                repIni[est.id] = true;
            });
            setAsistenciaDia(asisIni);
            setSeleccionReporte(repIni);
        });
        return () => unsubscribe();
    }, []);

    // 2. CARGAR HISTORIAL
    useEffect(() => {
        if (vistaActual === "historial") {
            const unsubscribe = onSnapshot(collection(db, "historial_servicio_social"), (snapshot) => {
                const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                lista.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
                setHistorial(lista);
            });
            return () => unsubscribe();
        }
    }, [vistaActual]);

    // 3. GUARDAR / EDITAR ESTUDIANTE EN "usuarios"
    const guardarEstudiante = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);
        try {
            if (editando) {
                await updateDoc(doc(db, "usuarios", estudianteForm.carnet), {
                    nombre: estudianteForm.nombre,
                    edad: Number(estudianteForm.edad),
                    institucion: estudianteForm.institucion,
                    horasSolicitadas: Number(estudianteForm.horasSolicitadas),
                    horasCompletadas: Number(estudianteForm.horasCompletadas)
                });
            } else {
                await setDoc(doc(db, "usuarios", estudianteForm.carnet), {
                    brigada: "SERVICIO SOCIAL",
                    carnet: estudianteForm.carnet,
                    edad: Number(estudianteForm.edad),
                    faltasConsecutivas: 0,
                    horasCompletadas: 0,
                    horasSolicitadas: Number(estudianteForm.horasSolicitadas),
                    institucion: estudianteForm.institucion,
                    nombre: estudianteForm.nombre,
                    rol: "estudiante",
                    turnosAsistidos: 0
                });
            }
            cerrarModal();
        } catch (error) { console.error(error); alert("Error al guardar el estudiante en Firebase."); }
        setCargando(false);
    };

    const eliminarEstudiante = async (id: string, nombre: string) => {
        if (confirm(`¿Estás seguro de eliminar a ${nombre}? Esto borrará su registro de usuario.`)) {
            await deleteDoc(doc(db, "usuarios", id));
        }
    };

    const abrirModal = (est: any = null) => {
        if (est) {
            setEstudianteForm({
                carnet: est.carnet || est.id,
                nombre: est.nombre || "",
                edad: est.edad || "",
                institucion: est.institucion || "",
                horasSolicitadas: est.horasSolicitadas || 150,
                horasCompletadas: est.horasCompletadas || 0
            });
            setEditando(true);
        } else {
            setEstudianteForm({ carnet: "", nombre: "", edad: "", institucion: "Complejo Educativo Delfina de Díaz", horasSolicitadas: 150, horasCompletadas: 0 });
            setEditando(false);
        }
        setModalAbierto(true);
    };
    const cerrarModal = () => setModalAbierto(false);

    // 4. GUARDAR ASISTENCIA
    const guardarAsistencia = async () => {
        setCargando(true);
        try {
            const fechaHoy = new Date().toLocaleDateString("es-SV", { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timestamp = Date.now();

            for (const est of estudiantes) {
                const registro = asistenciaDia[est.id];
                if (registro && registro.seleccionado && registro.horas > 0) {

                    const nuevasHoras = Number(est.horasCompletadas || 0) + Number(registro.horas);
                    const nuevosTurnos = Number(est.turnosAsistidos || 0) + 1;

                    await updateDoc(doc(db, "usuarios", est.id), {
                        horasCompletadas: nuevasHoras,
                        turnosAsistidos: nuevosTurnos
                    });

                    await addDoc(collection(db, "historial_servicio_social"), {
                        nombre: est.nombre,
                        carnet: est.carnet,
                        brigada: "SERVICIO SOCIAL",
                        horas: Number(registro.horas),
                        fecha: fechaHoy.replace(/\//g, "-"),
                        timestamp: timestamp
                    });
                }
            }
            alert("Asistencia y horas guardadas correctamente.");
            setVistaActual("menu");
        } catch (error) { console.error(error); alert("Error al guardar asistencia."); }
        setCargando(false);
    };

    // 5. FUNCIONES PARA REPORTE 
    const alternarSeleccionReporte = (id: string) => {
        setSeleccionReporte(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const exportarExcel = () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Carnet;Nombre Completo;Institución;Edad;Horas Completadas;Horas Solicitadas;Progreso;Estado\n";

        estudiantes.filter(est => seleccionReporte[est.id]).forEach(est => {
            const completadas = est.horasCompletadas || 0;
            const solicitadas = est.horasSolicitadas || 150;
            const porcentaje = Math.min(100, Math.round((completadas / solicitadas) * 100));
            const estado = completadas >= solicitadas ? "COMPLETADO" : "EN PROCESO";

            csvContent += `="${est.carnet}";"${est.nombre}";"${est.institucion}";${est.edad || ""};${completadas};${solicitadas};${porcentaje}%;${estado}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Reporte_Servicio_Social_${new Date().toLocaleDateString("es-SV").replace(/\//g, "-")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderProgreso = (completadas: number, solicitadas: number) => {
        const c = Number(completadas) || 0;
        const s = Number(solicitadas) || 150;
        const terminado = c >= s;
        return (
            <p className={`text-xs font-bold mt-2 ${terminado ? 'text-green-600' : 'text-gray-500'}`}>
                {terminado ? "¡COMPLETADO! " : "EN PROCESO "}
                ({c} / {s} hrs)
            </p>
        );
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans pb-24 print:bg-white print:pb-0">

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: portrait; margin: 15mm; }
                    html, body, main, div { 
                        height: auto !important; 
                        overflow: visible !important; 
                        max-height: none !important;
                    }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    aside, header, nav, button, .no-impresion { display: none !important; }
                    
                    .area-impresion { display: block !important; width: 100% !important; color: black !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                }
            `}} />

            <div className="no-impresion">
                <header className="bg-[#C62828] p-4 shadow-sm flex items-center justify-center relative">
                    {vistaActual !== "menu" && (
                        <button onClick={() => setVistaActual("menu")} className="absolute left-4 text-white font-bold text-xl">←</button>
                    )}
                    {vistaActual === "menu" && (
                        <button onClick={() => router.push("/dashboard")} className="absolute left-4 text-white font-bold text-xl">←</button>
                    )}
                    <h1 className="text-white font-bold text-lg tracking-wide uppercase">
                        {vistaActual === "menu" ? "CENTRO DE SERVICIO SOCIAL" :
                            vistaActual === "gestion" ? "GESTIÓN DE ESTUDIANTES" :
                                vistaActual === "asistencia" ? "ASISTENCIA SERVICIO SOCIAL" :
                                    vistaActual === "historial" ? "HISTORIAL DE ASISTENCIAS" : "GENERAR REPORTE"}
                    </h1>
                </header>
            </div>

            <main className="max-w-3xl mx-auto p-4">

                {vistaActual === "menu" && (
                    <div className="flex flex-col gap-6 mt-4">
                        <div>
                            <p className="font-bold text-gray-700 mb-2">Gestión y Control</p>
                            <button onClick={() => setVistaActual("gestion")} className="w-full bg-[#1976D2] text-white py-4 rounded font-bold shadow hover:bg-blue-800 transition uppercase tracking-wider">
                                GESTIÓN DE ESTUDIANTES
                            </button>
                        </div>
                        <div>
                            <p className="font-bold text-gray-700 mb-2">Operaciones Diarias</p>
                            <button onClick={() => setVistaActual("asistencia")} className="w-full bg-[#388E3C] text-white py-4 rounded font-bold shadow hover:bg-green-800 transition uppercase tracking-wider mb-4">
                                TOMA DE ASISTENCIA
                            </button>
                            <button onClick={() => setVistaActual("historial")} className="w-full bg-[#512DA8] text-white py-4 rounded font-bold shadow hover:bg-purple-800 transition uppercase tracking-wider">
                                HISTORIAL DE ASISTENCIAS
                            </button>
                        </div>
                        <div className="border-t pt-4">
                            <button onClick={() => setVistaActual("reportes")} className="w-full bg-white border border-gray-300 text-gray-800 py-4 rounded font-bold shadow-sm hover:bg-gray-50 transition uppercase tracking-wider flex items-center justify-center gap-2">
                                GENERAR REPORTE PDF / EXCEL
                            </button>
                        </div>
                    </div>
                )}

                {vistaActual === "gestion" && (
                    <div className="no-impresion">
                        <button onClick={() => abrirModal()} className="w-full bg-black text-white py-4 rounded font-bold uppercase tracking-wider mb-6 shadow-md hover:bg-gray-800">
                            + Registrar Nuevo Estudiante
                        </button>

                        <div className="flex flex-col gap-3">
                            {estudiantes.map(est => (
                                <div key={est.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
                                    <div className="pr-16">
                                        <h3 className="font-bold text-black text-[15px]">{est.nombre}</h3>
                                        <p className="text-gray-500 text-[11px] mt-1">Carnet: {est.carnet} | Inst: {est.institucion}</p>
                                        {renderProgreso(est.horasCompletadas, est.horasSolicitadas)}
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-3 text-lg">
                                        <button onClick={() => abrirModal(est)} className="text-blue-500 hover:text-blue-700"></button>
                                        <button onClick={() => eliminarEstudiante(est.id, est.nombre)} className="text-red-500 hover:text-red-700"></button>
                                    </div>
                                </div>
                            ))}
                            {estudiantes.length === 0 && <p className="text-center text-gray-500 mt-4">No hay estudiantes registrados.</p>}
                        </div>
                    </div>
                )}

                {vistaActual === "asistencia" && (
                    <div className="no-impresion flex flex-col h-[85vh]">
                        <p className="text-gray-500 text-sm text-center mb-4">Marca a los estudiantes presentes y asigna sus horas de hoy.</p>

                        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-24">
                            {estudiantes.map(est => (
                                <div key={est.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={asistenciaDia[est.id]?.seleccionado || false}
                                        onChange={(e) => setAsistenciaDia(prev => ({ ...prev, [est.id]: { ...prev[est.id], seleccionado: e.target.checked } }))}
                                        className="w-6 h-6 border-2 border-[#C62828] rounded text-[#C62828] focus:ring-[#C62828]"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-black text-sm">{est.nombre}</h3>
                                        <p className="text-gray-500 text-[10px]">{est.institucion} - Carnet: {est.carnet}</p>
                                        {renderProgreso(est.horasCompletadas, est.horasSolicitadas)}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-gray-500">Horas Hoy</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={asistenciaDia[est.id]?.horas || ""}
                                            onChange={(e) => setAsistenciaDia(prev => ({ ...prev, [est.id]: { ...prev[est.id], horas: Number(e.target.value) } }))}
                                            className="w-14 p-2 text-center border-2 border-gray-300 rounded bg-gray-50 font-bold"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t shadow-lg z-20">
                            <button onClick={guardarAsistencia} disabled={cargando} className="w-full max-w-3xl mx-auto block bg-[#C62828] text-white py-4 rounded font-bold text-lg hover:bg-red-800 transition uppercase tracking-widest">
                                {cargando ? "GUARDANDO..." : "GUARDAR HORAS"}

                            </button>
                        </div>
                    </div>
                )}

                {vistaActual === "historial" && (
                    <div className="no-impresion flex flex-col gap-3">
                        {historial.map(reg => (
                            <div key={reg.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-black text-sm">{reg.nombre}</h3>
                                    <p className="text-purple-700 font-bold text-[10px] uppercase mt-1">Brigada: {reg.brigada}</p>
                                    <p className="text-gray-500 text-[10px]">Fecha: {reg.fecha}</p>
                                </div>
                                <div className="bg-green-50 border border-green-100 rounded p-2 text-center w-16">
                                    <p className="text-[9px] text-green-700 font-bold">HORAS</p>
                                    <p className="text-green-600 font-black text-lg">+{reg.horas || 0}</p>
                                </div>
                            </div>
                        ))}
                        {historial.length === 0 && <p className="text-center text-gray-500 mt-10">No hay registros de historial.</p>}
                    </div>
                )}

                {vistaActual === "reportes" && (
                    <div className="no-impresion pb-24">
                        <p className="text-gray-600 text-sm mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                            Selecciona los estudiantes que deseas incluir en el reporte.
                        </p>

                        <div className="flex justify-between mb-4">
                            <button onClick={() => {
                                const todos = { ...seleccionReporte };
                                estudiantes.forEach(e => todos[e.id] = true);
                                setSeleccionReporte(todos);
                            }} className="text-blue-600 text-xs font-bold border border-blue-600 px-3 py-1 rounded hover:bg-blue-50">Marcar Todos</button>
                            <button onClick={() => {
                                const ninguno = { ...seleccionReporte };
                                estudiantes.forEach(e => ninguno[e.id] = false);
                                setSeleccionReporte(ninguno);
                            }} className="text-gray-500 text-xs font-bold border border-gray-400 px-3 py-1 rounded hover:bg-gray-50">Desmarcar Todos</button>
                        </div>

                        <div className="flex flex-col gap-2 mb-8">
                            {estudiantes.map(est => (
                                <label key={est.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={seleccionReporte[est.id] || false}
                                        onChange={() => alternarSeleccionReporte(est.id)}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-gray-800">{est.nombre}</p>
                                        <p className="text-xs text-gray-500">Carnet: {est.carnet} | Horas: {est.horasCompletadas}/{est.horasSolicitadas}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 flex gap-3 justify-center">
                            <button onClick={exportarExcel} className="flex-1 max-w-xs bg-[#2E7D32] text-white py-4 rounded-lg font-bold hover:bg-green-800 transition uppercase shadow-md flex items-center justify-center gap-2">
                                EXPORTAR EXCEL
                            </button>
                            <button onClick={() => {
                                const originalTitle = document.title;
                                document.title = `Reporte_Estudiantes_${new Date().toLocaleDateString("es-SV").replace(/\//g, "-")}`;
                                window.print();
                                setTimeout(() => document.title = originalTitle, 1000);
                            }} className="flex-1 max-w-xs bg-[#C62828] text-white py-4 rounded-lg font-bold hover:bg-red-800 transition uppercase shadow-md flex items-center justify-center gap-2">
                                IMPRIMIR PDF
                            </button>
                        </div>
                    </div>
                )}

                {/* MODAL */}
                {modalAbierto && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl w-full max-w-sm p-6 relative shadow-2xl">
                            <h2 className="text-lg font-bold text-black mb-4 border-b pb-2">{editando ? "Editar Estudiante" : "Nuevo Estudiante"}</h2>

                            <form onSubmit={guardarEstudiante} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Carnet / ID</label>
                                    <input type="text" required disabled={editando} value={estudianteForm.carnet} onChange={e => setEstudianteForm({ ...estudianteForm, carnet: e.target.value })} className={`w-full border-b-2 py-1 outline-none text-black ${editando ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500'}`} />
                                    {editando && <p className="text-[9px] text-gray-400 mt-1">El carnet no se puede editar porque es el ID del sistema.</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre Completo</label>
                                    <input type="text" required value={estudianteForm.nombre} onChange={e => setEstudianteForm({ ...estudianteForm, nombre: e.target.value })} className="w-full border-b-2 border-gray-300 py-1 outline-none focus:border-blue-500 text-black" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Edad</label>
                                    <input type="number" required value={estudianteForm.edad} onChange={e => setEstudianteForm({ ...estudianteForm, edad: e.target.value })} className="w-full border-b-2 border-gray-300 py-1 outline-none focus:border-blue-500 text-black" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Institución de Procedencia</label>
                                    <select value={estudianteForm.institucion} onChange={e => setEstudianteForm({ ...estudianteForm, institucion: e.target.value })} className="w-full border-b-2 border-gray-300 py-1 outline-none focus:border-blue-500 text-black bg-white">
                                        <option value="Complejo Educativo Delfina de Díaz">Complejo Educativo Delfina de Díaz</option>
                                        <option value="Instituto Nacional de Guazapa">Instituto Nacional de Guazapa</option>
                                        <option value="Universidad Don Bosco">Universidad Don Bosco</option>
                                        <option value="Universidad de El Salvador">Universidad de El Salvador</option>
                                        <option value="Otra">Otra</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Horas Solicitadas (Meta)</label>
                                    <input type="number" required value={estudianteForm.horasSolicitadas} onChange={e => setEstudianteForm({ ...estudianteForm, horasSolicitadas: Number(e.target.value) })} className="w-full border-b-2 border-gray-300 py-1 outline-none focus:border-blue-500 text-black font-bold" />
                                </div>
                                {editando && (
                                    <div>
                                        <label className="text-[10px] font-bold text-red-500 uppercase">Ajuste Manual de Horas (Completadas)</label>
                                        <input type="number" step="0.1" required value={estudianteForm.horasCompletadas} onChange={e => setEstudianteForm({ ...estudianteForm, horasCompletadas: Number(e.target.value) })} className="w-full border-b-2 border-red-300 py-1 outline-none focus:border-red-500 text-black font-bold" />
                                    </div>
                                )}

                                <div className="flex justify-end gap-4 mt-2">
                                    <button type="button" onClick={cerrarModal} className="text-[#C62828] font-bold text-sm uppercase tracking-wide">CANCELAR</button>
                                    <button type="submit" disabled={cargando} className="text-[#C62828] font-bold text-sm uppercase tracking-wide">{cargando ? "..." : "GUARDAR"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>

            {/* REPORTE OFICIAL PDF */}
            <div className="hidden area-impresion">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-black uppercase text-black">CRUZ ROJA SALVADOREÑA</h1>
                    <h2 className="text-lg font-bold uppercase text-black">SECCIONAL GUAZAPA</h2>
                    <p className="text-md text-gray-700 mt-2 uppercase underline">Reporte de Control de Estudiantes de Servicio Social</p>
                    <p className="text-xs text-gray-500 mt-1">Fecha de Emisión: {new Date().toLocaleDateString("es-SV")}</p>
                </div>

                <table className="w-full border-collapse border border-black text-sm text-black">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-2 text-center w-8">Nº</th>
                            <th className="border border-black p-2 text-center w-16">CARNET</th>
                            <th className="border border-black p-2 text-left">NOMBRE DEL ESTUDIANTE</th>
                            <th className="border border-black p-2 text-left">INSTITUCIÓN</th>
                            <th className="border border-black p-2 text-center w-24">HORAS</th>
                            <th className="border border-black p-2 text-center w-24">ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estudiantes.filter(est => seleccionReporte[est.id]).map((est, index) => {
                            const completadas = est.horasCompletadas || 0;
                            const solicitadas = est.horasSolicitadas || 150;
                            const terminado = completadas >= solicitadas;

                            return (
                                <tr key={est.id}>
                                    <td className="border border-black p-2 text-center">{index + 1}</td>
                                    <td className="border border-black p-2 font-mono text-xs text-center">{est.carnet}</td>
                                    <td className="border border-black p-2 font-bold">{est.nombre}</td>
                                    <td className="border border-black p-2 text-xs">{est.institucion}</td>
                                    <td className="border border-black p-2 text-center font-bold">{completadas} / {solicitadas}</td>
                                    <td className={`border border-black p-2 text-center font-bold text-[10px] ${terminado ? 'text-black' : 'text-gray-600'}`}>
                                        {terminado ? "COMPLETADO" : "EN PROCESO"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="mt-24 flex justify-around text-center text-black">
                    <div>
                        <div className="w-48 border-t border-black mx-auto mb-1"></div>
                        <p className="font-bold text-xs uppercase">Coordinación de Servicio Social</p>
                    </div>
                    <div>
                        <div className="w-48 border-t border-black mx-auto mb-1"></div>
                        <p className="font-bold text-xs uppercase">Jefatura Local</p>
                    </div>
                </div>
            </div>

        </div>
    );
}