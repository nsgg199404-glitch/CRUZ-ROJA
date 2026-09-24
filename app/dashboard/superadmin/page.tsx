"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, onSnapshot, doc, getDoc, addDoc, deleteDoc } from "firebase/firestore";

export default function SuperAdminPanelPage() {
    const router = useRouter();
    const [cargando, setCargando] = useState(true);
    const [accesoDenegado, setAccesoDenegado] = useState(false);

    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [alertas, setAlertas] = useState<any[]>([]);
    const [brigadasStats, setBrigadasStats] = useState<{ nombre: string, asistencias: number }[]>([]);

    const [filtroBrigada, setFiltroBrigada] = useState("TODAS LAS BRIGADAS");
    const [busqueda, setBusqueda] = useState("");
    const [modalAlerta, setModalAlerta] = useState(false);
    const [alertaForm, setAlertaForm] = useState({ carnet: "", limite: 3 });

    useEffect(() => {
        const verificarAcceso = async () => {
            const carnetGuardado = localStorage.getItem("carnetUsuario");
            if (!carnetGuardado) return router.push("/");
            const snap = await getDoc(doc(db, "usuarios", carnetGuardado));
            if (snap.exists() && snap.data().rol?.toLowerCase() === "superadmin") {
                setCargando(false);
            } else {
                setAccesoDenegado(true);
                setTimeout(() => router.push("/dashboard"), 2000);
            }
        };
        verificarAcceso();
    }, [router]);

    // Cargar y procesar datos con lectura flexible de campos
    useEffect(() => {
        if (cargando || accesoDenegado) return;

        const unsubUsuarios = onSnapshot(collection(db, "usuarios"), (snapshot) => {
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
            setUsuarios(lista);

            // Agrupar estadísticas por brigada de forma robusta
            const stats: Record<string, number> = {};

            // Inicializar brigadas comunes por defecto para que el gráfico siempre muestre estructura
            ["BRIGADA 1", "BRIGADA 2", "BRIGADA 3", "BRIGADA 4", "FIN DE SEMANA"].forEach(b => {
                stats[b] = 0;
            });

            lista.forEach(u => {
                const brigadaRaw = u.brigada ? String(u.brigada).toUpperCase().trim() : "SIN ASIGNAR";
                // Normalizar nombres de brigadas si vienen abreviadas
                let brigada = brigadaRaw;
                if (brigada === "B1") brigada = "BRIGADA 1";
                if (brigada === "B2") brigada = "BRIGADA 2";
                if (brigada === "B3") brigada = "BRIGADA 3";
                if (brigada === "B4") brigada = "BRIGADA 4";
                if (brigada === "FS") brigada = "FIN DE SEMANA";

                // Buscar el valor de asistencias en cualquiera de las variantes posibles de Firebase
                const asistencias = Number(u.turnosAsistidos || u.asistencias || u.totalTurnos || 0);

                if (brigada !== "SIN ASIGNAR" && brigada !== "SERVICIO SOCIAL") {
                    if (!stats[brigada]) stats[brigada] = 0;
                    stats[brigada] += asistencias;
                }
            });

            const statsArray = Object.keys(stats).map(key => ({
                nombre: key,
                asistencias: stats[key]
            })).sort((a, b) => b.asistencias - a.asistencias);

            setBrigadasStats(statsArray);
        });

        const unsubAlertas = onSnapshot(collection(db, "alertas_monitoreo"), (snapshot) => {
            const listaAlertas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setAlertas(listaAlertas);
        });

        return () => {
            unsubUsuarios();
            unsubAlertas();
        };
    }, [cargando, accesoDenegado]);

    const guardarAlerta = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const voluntario = usuarios.find(u => String(u.carnet) === String(alertaForm.carnet));
            if (!voluntario) {
                alert("No se encontró ningún voluntario con ese carnet.");
                return;
            }

            await addDoc(collection(db, "alertas_monitoreo"), {
                carnet: alertaForm.carnet,
                nombre: voluntario.nombre,
                limiteFaltas: Number(alertaForm.limite),
                fechaCreacion: new Date().toISOString()
            });

            setModalAlerta(false);
            setAlertaForm({ carnet: "", limite: 3 });
        } catch (error) {
            console.error(error);
            alert("Error al guardar la alerta.");
        }
    };

    const eliminarAlerta = async (id: string) => {
        if (confirm("¿Eliminar esta alerta de monitoreo?")) {
            await deleteDoc(doc(db, "alertas_monitoreo", id));
        }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        const coincideBrigada = filtroBrigada === "TODAS LAS BRIGADAS" || String(u.brigada).toUpperCase().includes(filtroBrigada.replace("BRIGADA ", ""));
        const coincideBusqueda = (u.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) || String(u.carnet).includes(busqueda);
        return coincideBrigada && coincideBusqueda && u.rol !== "superadmin";
    });

    const exportarExcel = () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Carnet;Nombre Completo;Brigada;Turnos Asistidos (Anual);Faltas Acumuladas;Estado\n";

        usuariosFiltrados.forEach(u => {
            const asistencias = Number(u.turnosAsistidos || u.asistencias || 0);
            const faltas = Number(u.faltasConsecutivas || 0);
            let estado = faltas === 0 ? "EXCELENTE" : faltas < 3 ? "EN OBSERVACION" : "CRITICO";
            csvContent += `="${u.carnet}";"${u.nombre}";"${u.brigada || "Sin Asignar"}";${asistencias};${faltas};"${estado}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Control_Voluntarios_${new Date().toLocaleDateString("es-SV").replace(/\//g, "-")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generarPDF = () => {
        const originalTitle = document.title;
        document.title = `Reporte_SuperAdmin_${new Date().toLocaleDateString("es-SV").replace(/\//g, "-")}`;
        window.print();
        setTimeout(() => document.title = originalTitle, 1000);
    };

    if (accesoDenegado) return <div className="min-h-screen flex items-center justify-center font-bold text-[#8B0000]">Acceso Denegado. Protocolo Superadmin Requerido.</div>;
    if (cargando) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando base de datos central...</div>;

    const maxAsistencias = brigadasStats.length > 0 ? Math.max(...brigadasStats.map(b => b.asistencias), 10) : 10;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-28 text-gray-800">

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: portrait; margin: 15mm; }
                    html, body, main, div { height: auto !important; overflow: visible !important; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; }
                    aside, header, nav, button, input, select, .no-impresion { display: none !important; }
                    .area-impresion { display: block !important; width: 100% !important; color: black !important; }
                    .grafico-barra { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    table { page-break-inside: auto; border-collapse: collapse; width: 100%; margin-top: 20px; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th, td { border: 1px solid #475569 !important; padding: 8px; text-align: left; }
                    th { background-color: #E2E8F0 !important; color: #0F172A !important; }
                }
            `}} />

            <div className="no-impresion">
                <header className="bg-[#8B0000] p-4 shadow-md flex items-center justify-center relative">
                    <button onClick={() => router.push("/dashboard")} className="absolute left-4 text-white font-bold text-xl hover:text-gray-300">
                        &#8592;
                    </button>
                    <h1 className="text-white font-bold text-lg tracking-widest uppercase">
                        PANEL SUPER ADMINISTRADOR
                    </h1>
                </header>
            </div>

            <main className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-8 mt-4">

                {/* GRÁFICO MEJORADO */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-[#8B0000] font-bold text-sm tracking-widest uppercase mb-6 border-b border-gray-200 pb-2">
                        RENDIMIENTO GLOBAL POR BRIGADAS
                    </h2>

                    <div className="h-72 flex items-end justify-around gap-4 pt-6 relative border-l-2 border-b-2 border-gray-300 pb-2 px-4">
                        <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-between -z-10 px-2 pointer-events-none">
                            {[100, 75, 50, 25, 0].map(pct => (
                                <div key={pct} className="w-full border-t border-gray-100 flex items-center">
                                    <span className="absolute -left-9 text-[10px] text-gray-400 font-mono">
                                        {Math.round((maxAsistencias * pct) / 100)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {brigadasStats.map((stat, index) => {
                            const alturaPct = (stat.asistencias / maxAsistencias) * 100;
                            const bgColor = index % 2 === 0 ? "bg-[#8B0000]" : "bg-[#334155]";

                            return (
                                <div key={stat.nombre} className="flex flex-col items-center w-full max-w-[70px] h-full justify-end group">
                                    <span className="text-xs font-bold text-gray-700 mb-1 font-mono">
                                        {stat.asistencias}
                                    </span>
                                    <div
                                        style={{ height: `${Math.max(alturaPct, 8)}%` }}
                                        className={`w-full ${bgColor} rounded-t-md shadow-md transition-all duration-500 grafico-barra`}
                                    ></div>
                                    <span className="text-[10px] font-bold text-gray-700 mt-3 text-center uppercase truncate w-full">
                                        {stat.nombre.replace("BRIGADA ", "B")}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-center text-[10px] text-gray-500 mt-4 uppercase tracking-widest">Acumulado de Asistencias Anuales por Brigada</p>
                </section>

                {/* ALERTAS */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 no-impresion">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-2">
                        <h2 className="text-[#8B0000] font-bold text-sm tracking-widest uppercase">
                            SISTEMA DE ALERTAS
                        </h2>
                        <button onClick={() => setModalAlerta(true)} className="bg-[#1E293B] text-white text-xs px-4 py-2 rounded shadow hover:bg-gray-800 transition tracking-widest uppercase font-bold">
                            + NUEVA ALERTA
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alertas.map(alerta => {
                            const vol = usuarios.find(u => String(u.carnet) === String(alerta.carnet));
                            const faltasActuales = vol ? Number(vol.faltasConsecutivas || 0) : 0;
                            const excedido = faltasActuales >= alerta.limiteFaltas;

                            return (
                                <div key={alerta.id} className={`p-4 rounded-lg border-l-4 shadow-sm relative ${excedido ? 'bg-red-50 border-[#8B0000]' : 'bg-gray-50 border-gray-400'}`}>
                                    <div className="pr-8">
                                        <h3 className="font-bold text-gray-900 text-sm uppercase">{alerta.nombre || "Usuario Desconocido"}</h3>
                                        <p className="text-xs text-gray-500 font-mono mt-1">CARNET: {alerta.carnet}</p>

                                        <div className="mt-3">
                                            {excedido ? (
                                                <p className="text-xs font-bold text-[#8B0000]">
                                                    ALERTA CRÍTICA: El voluntario lleva {faltasActuales} turnos sin asistir. (Límite: {alerta.limiteFaltas})
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-600 font-medium">
                                                    Monitoreo activo. Faltas actuales: {faltasActuales} / {alerta.limiteFaltas}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => eliminarAlerta(alerta.id)} className="absolute top-4 right-4 text-gray-400 hover:text-[#8B0000] font-bold">
                                        &#10005;
                                    </button>
                                </div>
                            );
                        })}
                        {alertas.length === 0 && <p className="text-gray-500 text-sm italic col-span-2">No hay alertas de monitoreo configuradas actualmente.</p>}
                    </div>
                </section>

                {/* TABLA DE SEMÁFORO */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-200 pb-2 gap-4">
                        <h2 className="text-[#8B0000] font-bold text-sm tracking-widest uppercase">
                            CONTROL DE PERSONAL REGISTRADO
                        </h2>

                        <div className="flex gap-2 w-full md:w-auto no-impresion">
                            <select
                                value={filtroBrigada}
                                onChange={(e) => setFiltroBrigada(e.target.value)}
                                className="p-2 border border-gray-300 rounded text-xs font-bold text-gray-700 bg-gray-50 outline-none focus:border-gray-500"
                            >
                                <option value="TODAS LAS BRIGADAS">TODAS LAS BRIGADAS</option>
                                <option value="BRIGADA 1">BRIGADA 1</option>
                                <option value="BRIGADA 2">BRIGADA 2</option>
                                <option value="BRIGADA 3">BRIGADA 3</option>
                                <option value="BRIGADA 4">BRIGADA 4</option>
                                <option value="FIN DE SEMANA">FIN DE SEMANA</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Buscar nombre o carnet..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="p-2 border border-gray-300 rounded text-xs w-full md:w-64 bg-gray-50 outline-none focus:border-gray-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto area-impresion">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-[#1E293B] text-white">
                                    <th className="p-3 font-medium text-xs tracking-wider">CARNET</th>
                                    <th className="p-3 font-medium text-xs tracking-wider">NOMBRE DEL VOLUNTARIO</th>
                                    <th className="p-3 font-medium text-xs tracking-wider">BRIGADA</th>
                                    <th className="p-3 font-medium text-xs tracking-wider text-center">ASISTENCIAS</th>
                                    <th className="p-3 font-medium text-xs tracking-wider text-center">FALTAS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosFiltrados.map((u, idx) => {
                                    const asistencias = Number(u.turnosAsistidos || u.asistencias || 0);
                                    const faltas = Number(u.faltasConsecutivas || 0);

                                    let colorFaltas = "text-gray-600";
                                    if (faltas === 0) colorFaltas = "text-green-700 font-bold";
                                    else if (faltas >= 3) colorFaltas = "text-[#8B0000] font-black";

                                    return (
                                        <tr key={u.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 font-mono text-xs text-gray-500">{u.carnet}</td>
                                            <td className="p-3 font-bold text-gray-800 uppercase">{u.nombre}</td>
                                            <td className="p-3 text-xs text-gray-600 uppercase">{u.brigada || "Sin Asignar"}</td>
                                            <td className="p-3 text-center font-bold text-gray-700">{asistencias}</td>
                                            <td className={`p-3 text-center ${colorFaltas}`}>{faltas}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {usuariosFiltrados.length === 0 && <p className="text-center text-gray-500 mt-6 text-sm">No se encontraron registros que coincidan con la búsqueda.</p>}
                    </div>
                </section>

                {/* BOTONES */}
                <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 flex gap-4 justify-center no-impresion">
                    <button onClick={exportarExcel} className="w-full max-w-xs bg-[#475569] text-white py-4 rounded font-bold hover:bg-[#334155] transition uppercase tracking-widest shadow-md">
                        EXPORTAR A EXCEL
                    </button>
                    <button onClick={generarPDF} className="w-full max-w-xs border-2 border-[#8B0000] text-[#8B0000] bg-white py-4 rounded font-bold hover:bg-[#8B0000] hover:text-white transition uppercase tracking-widest shadow-md">
                        GENERAR REPORTE PDF
                    </button>
                </div>
            </main>

            {/* MODAL */}
            {modalAlerta && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 no-impresion">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <h2 className="text-lg font-black text-[#8B0000] mb-6 border-b border-gray-200 pb-2 uppercase tracking-widest">Configurar Alerta</h2>

                        <form onSubmit={guardarAlerta} className="flex flex-col gap-5">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Carnet del Voluntario</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. 133171"
                                    value={alertaForm.carnet}
                                    onChange={e => setAlertaForm({ ...alertaForm, carnet: e.target.value })}
                                    className="w-full border-b-2 border-gray-300 py-2 outline-none focus:border-[#8B0000] text-gray-800 font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Límite de Faltas Permitidas</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="Ej. 3"
                                    value={alertaForm.limite}
                                    onChange={e => setAlertaForm({ ...alertaForm, limite: Number(e.target.value) })}
                                    className="w-full border-b-2 border-gray-300 py-2 outline-none focus:border-[#8B0000] text-gray-800 font-bold text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-4 mt-4">
                                <button type="button" onClick={() => setModalAlerta(false)} className="text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-gray-800">CANCELAR</button>
                                <button type="submit" className="text-[#8B0000] font-bold text-xs uppercase tracking-widest hover:text-red-900">ACTIVAR ALERTA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}