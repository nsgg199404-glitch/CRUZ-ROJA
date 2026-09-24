"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function GenerarReportePage() {
    const router = useRouter();
    const [cargando, setCargando] = useState(true);
    const [calculando, setCalculando] = useState(false);
    const [accesoDenegado, setAccesoDenegado] = useState(false);

    const fechaActual = new Date();
    const [mesSeleccionado, setMesSeleccionado] = useState(String(fechaActual.getMonth() + 1).padStart(2, '0'));
    const [anioSeleccionado, setAnioSeleccionado] = useState(String(fechaActual.getFullYear()));

    const meses = [
        { val: "01", nom: "Enero" }, { val: "02", nom: "Febrero" }, { val: "03", nom: "Marzo" },
        { val: "04", nom: "Abril" }, { val: "05", nom: "Mayo" }, { val: "06", nom: "Junio" },
        { val: "07", nom: "Julio" }, { val: "08", nom: "Agosto" }, { val: "09", nom: "Septiembre" },
        { val: "10", nom: "Octubre" }, { val: "11", nom: "Noviembre" }, { val: "12", nom: "Diciembre" }
    ];

    const [actividades, setActividades] = useState({ asambleas: "", reuniones: "", campamentos: "", practicas: "", seminarios: "", charlas: "", cursos: "", talleres: "", cursosPA: "" });
    const [cajaChica, setCajaChica] = useState({ saldoAnterior: "", ingreso: "", egreso: "" });
    const [miembrosManual, setMiembrosManual] = useState({ permiso: "", sancionados: "", expulsados: "", retirados: "", periodo: "", causa: "", nuevoIngreso: "" });

    const [asisSec, setAsisSec] = useState({ heridos: "", quemados: "", fracturados: "", intoxicados: "", partos: "", enferm: "", curaciones: "", inyecciones: "", otros: "" });
    const [asisTra, setAsisTra] = useState({ heridos: "", quemados: "", fracturados: "", intoxicados: "", embarazos: "", enferm: "", vehiculos: "", otros: "" });
    const [asisRes, setAsisRes] = useState({ accid: "", verticales: "", acuaticos: "", profundos: "", simples: "", otros: "" });
    const [asisCom, setAsisCom] = useState({ excursiones: "", repartos: "", damnificados: "", comVis: "", escVis: "", charlas: "", instVis: "", evDep: "", evSoc: "", otros: "" });

    const [autoStats, setAutoStats] = useState({ totalMiembros: 0, miembrosActivos: 0, horasTrabajadas: 0.0 });
    const [debugInfo, setDebugInfo] = useState({ horasEncontradas: 0, atencionesEncontradas: 0 });

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

    useEffect(() => {
        if (cargando || accesoDenegado) return;

        const calcularAutomaticos = async () => {
            setCalculando(true);
            try {
                const usersSnap = await getDocs(collection(db, "usuarios"));
                const horasSnap = await getDocs(collection(db, "registro_horas"));
                let totalH = 0;
                let hEncontradas = 0;
                const carnetUnicos = new Set();
                const mesAnioBuscado = `${mesSeleccionado}/${anioSeleccionado}`;

                horasSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.fecha === mesAnioBuscado || (data.fechaExacta && data.fechaExacta.includes(`-${mesSeleccionado}-${anioSeleccionado}`))) {
                        hEncontradas++;
                        totalH += (Number(data.horasTrabajadas) || 0);
                        if (data.carnet) carnetUnicos.add(data.carnet);
                    }
                });

                setAutoStats({
                    totalMiembros: usersSnap.size,
                    miembrosActivos: carnetUnicos.size,
                    horasTrabajadas: Math.round(totalH * 100) / 100
                });

                const atencionesSnap = await getDocs(collection(db, "bitacora_atenciones"));
                let s_heridos = 0, s_quemados = 0, s_fracturados = 0, s_enferm = 0, s_intoxicados = 0, s_partos = 0;
                let t_heridos = 0, t_quemados = 0, t_fracturados = 0, t_enferm = 0, t_intoxicados = 0, t_embarazos = 0, t_vehiculos = 0;
                let r_accid = 0;
                let aEncontradas = 0;

                const tagBusqueda = `-${mesSeleccionado}-${anioSeleccionado}`;
                const tagBusqueda2 = `/${mesSeleccionado}/${anioSeleccionado}`;

                atencionesSnap.forEach(doc => {
                    const data = doc.data();
                    let match = false;

                    if (data.fecha && (data.fecha.includes(tagBusqueda) || data.fecha.includes(tagBusqueda2))) match = true;
                    if (!match && data.fechaHora && (data.fechaHora.includes(tagBusqueda) || data.fechaHora.includes(tagBusqueda2))) match = true;

                    if (match) {
                        aEncontradas++;
                        const cantPacientes = data.pacientes ? (data.pacientes.includes("|") ? data.pacientes.split("|").length : 1) : 1;
                        const esSeccional = data.vehiculo === "Ninguno (En Seccional)";
                        if (!esSeccional) t_vehiculos++;

                        const tipo = (data.tipoServicio || "").toLowerCase();

                        if (tipo.includes("quemadura")) {
                            esSeccional ? (s_quemados += cantPacientes) : (t_quemados += cantPacientes);
                        } else if (tipo.includes("herida") || tipo.includes("arma") || tipo.includes("cortante")) {
                            esSeccional ? (s_heridos += cantPacientes) : (t_heridos += cantPacientes);
                        } else if (tipo.includes("traumatismo") || tipo.includes("fractura") || tipo.includes("caída") || tipo.includes("caida")) {
                            esSeccional ? (s_fracturados += cantPacientes) : (t_fracturados += cantPacientes);
                        } else if (tipo.includes("enfermedad") || tipo.includes("común") || tipo.includes("comun")) {
                            esSeccional ? (s_enferm += cantPacientes) : (t_enferm += cantPacientes);
                        } else if (tipo.includes("tránsito") || tipo.includes("transito") || tipo.includes("accidente")) {
                            r_accid += 1;
                            esSeccional ? (s_heridos += cantPacientes) : (t_heridos += cantPacientes);
                        } else if (tipo.includes("intoxicad") || tipo.includes("intoxicación")) {
                            esSeccional ? (s_intoxicados += cantPacientes) : (t_intoxicados += cantPacientes);
                        } else if (tipo.includes("parto") || tipo.includes("embarazo")) {
                            esSeccional ? (s_partos += cantPacientes) : (t_embarazos += cantPacientes);
                        }
                    }
                });

                setDebugInfo({ atencionesEncontradas: aEncontradas, horasEncontradas: hEncontradas });

                setAsisSec(prev => ({ ...prev, heridos: s_heridos ? s_heridos.toString() : "", quemados: s_quemados ? s_quemados.toString() : "", fracturados: s_fracturados ? s_fracturados.toString() : "", enferm: s_enferm ? s_enferm.toString() : "", intoxicados: s_intoxicados ? s_intoxicados.toString() : "", partos: s_partos ? s_partos.toString() : "" }));
                setAsisTra(prev => ({ ...prev, heridos: t_heridos ? t_heridos.toString() : "", quemados: t_quemados ? t_quemados.toString() : "", fracturados: t_fracturados ? t_fracturados.toString() : "", enferm: t_enferm ? t_enferm.toString() : "", vehiculos: t_vehiculos ? t_vehiculos.toString() : "", intoxicados: t_intoxicados ? t_intoxicados.toString() : "", embarazos: t_embarazos ? t_embarazos.toString() : "" }));
                setAsisRes(prev => ({ ...prev, accid: r_accid ? r_accid.toString() : "" }));

            } catch (error) { console.error(error); }
            setCalculando(false);
        };
        calcularAutomaticos();
    }, [mesSeleccionado, anioSeleccionado, cargando, accesoDenegado]);

    const totalAnteriorIngreso = (Number(cajaChica.saldoAnterior) + Number(cajaChica.ingreso)).toFixed(2);
    const saldoActual = (Number(totalAnteriorIngreso) - Number(cajaChica.egreso)).toFixed(2);
    const handleChange = (setter: any, state: any) => (e: any) => setter({ ...state, [e.target.name]: e.target.value });

    const imprimirDocumento = () => {
        window.print();
    };

    if (accesoDenegado) return <div className="min-h-screen flex items-center justify-center font-bold text-red-600">Acceso Denegado.</div>;
    if (cargando) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando...</div>;

    const mesNombre = meses.find(m => m.val === mesSeleccionado)?.nom || "";

    const PrintRow = ({ val, label, special = false, valWidth = "w-10" }: { val: any, label: string, special?: boolean, valWidth?: string }) => (
        <div className="flex px-1 py-[1.5px] text-[11px] text-black leading-tight items-center">
            <div className={`${valWidth} text-left font-bold text-black pl-1`}>{val && val !== "0" && val !== 0 ? val : "___"}</div>
            <div className={`flex-1 text-black ${special ? "text-[10px] italic" : "whitespace-nowrap"}`}>{label}</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans">

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    aside, header, nav { display: none !important; }
                    .no-impresion { display: none !important; }
                    .area-impresion { display: block !important; width: 100% !important; }
                    .header-bg { background-color: #D1D5DB !important; }
                }
            `}} />

            {/* FORMULARIO WEB */}
            <div className="no-impresion pb-24">
                <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                    <button onClick={() => router.push("/dashboard")} className="text-[#C62828] font-bold text-xl">←</button>
                    <h1 className="text-[#C62828] font-bold text-lg tracking-wide uppercase">GENERAR INFORME MENSUAL</h1>
                </header>

                <main className="p-4 max-w-5xl mx-auto flex flex-col gap-6">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-gray-600 block mb-1">Mes:</label>
                            <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg outline-none font-bold text-[#C62828]">
                                {meses.map(m => <option key={m.val} value={m.val}>{m.nom}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-gray-600 block mb-1">Año:</label>
                            <input type="number" value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-bold text-[#C62828]" />
                        </div>
                    </div>

                    <div className="text-center text-xs font-bold text-gray-500 bg-green-50 p-2 rounded border border-green-200">
                        {calculando ? "Buscando..." : `Datos encontrados: ${debugInfo.atencionesEncontradas} atenciones y ${debugInfo.horasEncontradas} registros de horas en ${mesNombre} ${anioSeleccionado}.`}
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-[#C62828] font-bold text-sm uppercase mb-3">1. Asistencia a la Población</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold border-b pb-1 mb-2">En Seccional</h3>
                                <input type="number" name="heridos" value={asisSec.heridos} placeholder="Heridos" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="number" name="quemados" value={asisSec.quemados} placeholder="Quemados" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="number" name="fracturados" value={asisSec.fracturados} placeholder="Fracturados" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="number" name="intoxicados" value={asisSec.intoxicados} placeholder="Intoxicados" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="number" name="partos" value={asisSec.partos} placeholder="Partos" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="number" name="enferm" value={asisSec.enferm} placeholder="Enferm. Comunes" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="number" name="curaciones" value={asisSec.curaciones} placeholder="Curaciones" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="number" name="inyecciones" value={asisSec.inyecciones} placeholder="Inyecciones" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                                <input type="text" name="otros" value={asisSec.otros} placeholder="Otros" onChange={handleChange(setAsisSec, asisSec)} className="p-2 border rounded" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold border-b pb-1 mb-2">Traslados</h3>
                                <input type="number" name="heridos" value={asisTra.heridos} placeholder="Heridos" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded" />
                                <input type="number" name="quemados" value={asisTra.quemados} placeholder="Quemados" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded" />
                                <input type="number" name="fracturados" value={asisTra.fracturados} placeholder="Fracturados" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded" />
                                <input type="number" name="intoxicados" value={asisTra.intoxicados} placeholder="Intoxicados" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded" />
                                <input type="number" name="embarazos" value={asisTra.embarazos} placeholder="Embarazos" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded" />
                                <input type="number" name="enferm" value={asisTra.enferm} placeholder="Enferm. Comunes" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded" />
                                <input type="number" name="vehiculos" value={asisTra.vehiculos} placeholder="Cant. Vehículos" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded bg-gray-50" />
                                <input type="text" name="otros" value={asisTra.otros} placeholder="Otros" onChange={handleChange(setAsisTra, asisTra)} className="p-2 border rounded" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold border-b pb-1 mb-2">Rescates</h3>
                                <input type="number" name="accid" value={asisRes.accid} placeholder="Accid. Tránsito" onChange={handleChange(setAsisRes, asisRes)} className="p-2 border rounded" />
                                <input type="number" name="verticales" value={asisRes.verticales} placeholder="Verticales" onChange={handleChange(setAsisRes, asisRes)} className="p-2 border rounded" />
                                <input type="number" name="acuaticos" value={asisRes.acuaticos} placeholder="Acuáticos" onChange={handleChange(setAsisRes, asisRes)} className="p-2 border rounded" />
                                <input type="number" name="profundos" value={asisRes.profundos} placeholder="Profundos" onChange={handleChange(setAsisRes, asisRes)} className="p-2 border rounded" />
                                <input type="number" name="simples" value={asisRes.simples} placeholder="Simples" onChange={handleChange(setAsisRes, asisRes)} className="p-2 border rounded" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold border-b pb-1 mb-2">Comunitarias</h3>
                                <input type="number" name="excursiones" value={asisCom.excursiones} placeholder="Excursiones" onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="repartos" value={asisCom.repartos} placeholder="Repartos" onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="damnificados" value={asisCom.damnificados} placeholder="Damnificados" onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="comVis" value={asisCom.comVis} placeholder="Comunidades Vis." onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="escVis" value={asisCom.escVis} placeholder="Centros Esc. Vis." onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="charlas" value={asisCom.charlas} placeholder="Charlas impartidas" onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="instVis" value={asisCom.instVis} placeholder="Instituciones Vis." onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="evDep" value={asisCom.evDep} placeholder="Eventos Deportivos" onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                                <input type="number" name="evSoc" value={asisCom.evSoc} placeholder="Eventos Sociales" onChange={handleChange(setAsisCom, asisCom)} className="p-2 border rounded" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-[#C62828] font-bold text-sm mb-3 uppercase">2. Actividades Internas</h2>
                            <div className="flex flex-col gap-2 text-sm">
                                <input type="number" name="asambleas" placeholder="Asambleas" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="reuniones" placeholder="Reuniones" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="campamentos" placeholder="Campamentos" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="practicas" placeholder="Prácticas" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="seminarios" placeholder="Seminarios" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="charlas" placeholder="Charlas" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="cursos" placeholder="Cursos" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="talleres" placeholder="Talleres" onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                                <input type="number" name="cursosPA" placeholder="Curso Primeros Aux." onChange={handleChange(setActividades, actividades)} className="p-2 border rounded" />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-[#C62828] font-bold text-sm mb-3 uppercase">3. Caja Chica ($)</h2>
                            <div className="flex flex-col gap-2 text-sm">
                                <input type="number" step="0.01" name="saldoAnterior" placeholder="Saldo Anterior" onChange={handleChange(setCajaChica, cajaChica)} className="p-2 border rounded" />
                                <input type="number" step="0.01" name="ingreso" placeholder="Ingreso" onChange={handleChange(setCajaChica, cajaChica)} className="p-2 border rounded" />
                                <input type="number" step="0.01" name="egreso" placeholder="Egreso" onChange={handleChange(setCajaChica, cajaChica)} className="p-2 border rounded" />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-[#C62828] font-bold text-sm mb-3 uppercase">4. Miembros</h2>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div className="border border-gray-200 rounded p-2 text-center">
                                    <p className="font-bold text-lg text-blue-600">{autoStats.totalMiembros}</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Con Carné</p>
                                </div>
                                <div className="border border-gray-200 rounded p-2 text-center">
                                    <p className="font-bold text-lg text-green-600">{autoStats.miembrosActivos}</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Activos</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 text-sm">
                                <input type="number" name="permiso" placeholder="Permiso" onChange={handleChange(setMiembrosManual, miembrosManual)} className="p-2 border rounded" />
                                <input type="number" name="sancionados" placeholder="Sancionados" onChange={handleChange(setMiembrosManual, miembrosManual)} className="p-2 border rounded" />
                                <input type="number" name="expulsados" placeholder="Expulsados" onChange={handleChange(setMiembrosManual, miembrosManual)} className="p-2 border rounded" />
                                <input type="number" name="retirados" placeholder="Retirados" onChange={handleChange(setMiembrosManual, miembrosManual)} className="p-2 border rounded" />
                                <input type="text" name="periodo" placeholder="Por un periodo de:" onChange={handleChange(setMiembrosManual, miembrosManual)} className="p-2 border rounded" />
                                <input type="text" name="causa" placeholder="Causa:" onChange={handleChange(setMiembrosManual, miembrosManual)} className="p-2 border rounded" />
                                <input type="number" name="nuevoIngreso" placeholder="Nuevo Ingreso" onChange={handleChange(setMiembrosManual, miembrosManual)} className="p-2 border rounded" />
                                <input type="text" disabled value={autoStats.horasTrabajadas.toFixed(1)} placeholder="0.0" className="p-2 border rounded font-bold text-center bg-gray-100 text-[#C62828]" title="Horas Trabajadas" />
                            </div>
                        </div>
                    </div>

                    <button onClick={imprimirDocumento} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-lg hover:bg-red-800 transition shadow-md mt-2 uppercase tracking-widest">
                        IMPRIMIR INFORME OFICIAL
                    </button>
                </main>
            </div>

            {/* DOCUMENTO OFICIAL PARA IMPRESIÓN */}
            <div className="hidden area-impresion text-black font-sans bg-white">

                <div className="text-center font-bold mb-4">
                    <h1 className="text-[16px] uppercase tracking-wide text-black">CRUZ ROJA SALVADOREÑA</h1>
                    <h2 className="text-[14px] uppercase tracking-wide text-black">INFORME CONSOLIDADO DE ACTIVIDADES MENSUALES</h2>
                </div>

                <div className="flex justify-between font-bold mb-4 text-[13px] uppercase text-black">
                    <p>SECCIONAL: <span className="font-normal">GUAZAPA</span></p>
                    <p>MES: <span className="font-normal capitalize">{mesNombre}</span></p>
                    <p>AÑO: <span className="font-normal">{anioSeleccionado}</span></p>
                </div>

                <table className="w-full border-collapse border border-black text-black text-[12px] mb-4">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="border border-black header-bg uppercase p-1 align-middle w-1/4 text-black">CASOS ATENDIDOS EN SECCIONAL</th>
                            <th colSpan={3} className="border border-black header-bg uppercase p-1 text-black">ACTIVIDADES DE ASISTENCIA A LA POBLACIÓN</th>
                        </tr>
                        <tr>
                            <th className="border border-black header-bg uppercase p-1 w-1/4 text-black">TRASLADOS REALIZADOS</th>
                            <th className="border border-black header-bg uppercase p-1 w-1/4 text-black">RESCATES REALIZADOS</th>
                            <th className="border border-black header-bg uppercase p-1 w-1/4 text-black">ACTIVIDADES COMUNITARIAS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black align-top py-1">
                                <PrintRow val={asisSec.heridos} label="Heridos" />
                                <PrintRow val={asisSec.quemados} label="Quemados" />
                                <PrintRow val={asisSec.fracturados} label="Fracturados" />
                                <PrintRow val={asisSec.intoxicados} label="Intoxicados" />
                                <PrintRow val={asisSec.partos} label="Partos" />
                                <PrintRow val={asisSec.enferm} label="Enferm. Comunes" />
                                <PrintRow val={asisSec.curaciones} label="Curaciones" />
                                <PrintRow val={asisSec.inyecciones} label="Inyecciones" />
                                <div className="flex px-1 py-[1.5px] text-[11px] text-black mt-1 items-center">
                                    <div className="w-10 text-left font-bold text-black pl-1">{asisSec.otros && asisSec.otros !== "0" ? asisSec.otros : "___"}</div>
                                    <div className="flex-1 text-black whitespace-nowrap">Otros</div>
                                </div>
                            </td>
                            <td className="border border-black align-top py-1">
                                <PrintRow val={asisTra.heridos} label="Heridos" />
                                <PrintRow val={asisTra.quemados} label="Quemados" />
                                <PrintRow val={asisTra.fracturados} label="Fracturados" />
                                <PrintRow val={asisTra.intoxicados} label="Intoxicados" />
                                <PrintRow val={asisTra.embarazos} label="Embarazos" />
                                <PrintRow val={asisTra.enferm} label="Enferm. Comunes" />
                                <PrintRow val={asisTra.vehiculos} label="Cant. de Vehícul." />
                                <PrintRow val={asisTra.otros} label="Otros" />
                            </td>
                            <td className="border border-black align-top py-1">
                                <PrintRow val={asisRes.accid} label="Accid. Tránsito" />
                                <PrintRow val={asisRes.verticales} label="Rescat. Verticales" />
                                <PrintRow val={asisRes.acuaticos} label="Acuáticos" />
                                <PrintRow val={asisRes.profundos} label="Rescat. Profundos" />
                                <PrintRow val={asisRes.simples} label="Rescates simples" />
                                <PrintRow val={asisRes.otros} label="Otros" />
                            </td>
                            <td className="border border-black align-top py-1 relative pb-6">
                                <PrintRow val={asisCom.excursiones} label="Excursiones" />
                                <PrintRow val={asisCom.repartos} label="Repartos" />
                                <PrintRow val={asisCom.damnificados} label="Damnificados" />
                                <PrintRow val={asisCom.comVis} label="Comunidades Vis." />
                                <PrintRow val={asisCom.escVis} label="Centros Esc. Vis." />
                                <PrintRow val={asisCom.charlas} label="Charlas impartidas" />
                                <PrintRow val={asisCom.instVis} label="Instituciones Vis." />
                                <PrintRow val={asisCom.evDep} label="Eventos Deportivos" />
                                <PrintRow val={asisCom.evSoc} label="Eventos Sociales" />
                                <span className="absolute bottom-1 right-2 text-[9px] text-black italic">(Ejem. Desfiles.)</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table className="w-full border-collapse border border-black text-black text-[12px]">
                    <thead>
                        <tr><th colSpan={3} className="border border-black header-bg uppercase p-1 text-black">ACTIVIDADES INTERNAS</th></tr>
                        <tr>
                            <th className="border border-black header-bg uppercase p-1 w-1/3 text-black">ACTIVIDADES</th>
                            <th className="border border-black header-bg uppercase p-1 w-1/3 text-black">CAJA CHICA</th>
                            <th className="border border-black header-bg uppercase p-1 w-1/3 text-black">MIEMBROS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black align-top py-1">
                                <PrintRow val={actividades.asambleas} label="Asambleas" />
                                <PrintRow val={actividades.reuniones} label="Reuniones" />
                                <PrintRow val={actividades.campamentos} label="Campamentos" />
                                <PrintRow val={actividades.practicas} label="Prácticas" />
                                <PrintRow val={actividades.seminarios} label="Seminarios" />
                                <PrintRow val={actividades.charlas} label="Charlas" />
                                <PrintRow val={actividades.cursos} label="Cursos" />
                                <PrintRow val={actividades.talleres} label="Talleres" />
                                <PrintRow val={actividades.cursosPA} label="Curso Primeros Aux." />
                            </td>
                            <td className="border border-black align-top py-1">
                                <PrintRow val={cajaChica.saldoAnterior ? `$${cajaChica.saldoAnterior}` : null} label="Saldo Anterior" valWidth="w-20" />
                                <PrintRow val={cajaChica.ingreso ? `$${cajaChica.ingreso}` : null} label="Ingreso" valWidth="w-20" />
                                <PrintRow val={totalAnteriorIngreso !== "0.00" ? `$${totalAnteriorIngreso}` : null} label="Total" valWidth="w-20" />
                                <PrintRow val={cajaChica.egreso ? `$${cajaChica.egreso}` : null} label="Egreso" valWidth="w-20" />
                                <PrintRow val={saldoActual !== "0.00" ? `$${saldoActual}` : null} label="Saldo" valWidth="w-20" />
                            </td>
                            <td className="border border-black align-top py-1">
                                <PrintRow val={autoStats.totalMiembros} label="Con carné" />
                                <PrintRow val={autoStats.miembrosActivos} label="Activos" />
                                <PrintRow val={miembrosManual.permiso} label="Permiso" />
                                <PrintRow val={miembrosManual.sancionados} label="Sancionados" />
                                <PrintRow val={miembrosManual.expulsados} label="Expulsados" />
                                <PrintRow val={miembrosManual.retirados} label="Retirados" />
                                <PrintRow val={null} label={`Por periodo de: ${miembrosManual.periodo}`} special={true} />
                                <PrintRow val={null} label={`Causa: ${miembrosManual.causa}`} special={true} />
                                <PrintRow val={miembrosManual.nuevoIngreso} label="Nuevo Ingreso" />
                                <PrintRow val={autoStats.horasTrabajadas > 0 ? autoStats.horasTrabajadas : null} label="Horas Trabajadas" />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="mt-14 flex justify-between px-10 text-[12px] font-bold text-black">
                    <div className="w-40 border-t border-black text-center pt-1">Firma</div>
                    <div className="w-40 border-t border-black text-center pt-1">Jefe Dptal/Local</div>
                    <div className="w-40 border-t border-black text-center pt-1">Deleg. Dptal/Junta</div>
                </div>
            </div>
        </div>
    );
}