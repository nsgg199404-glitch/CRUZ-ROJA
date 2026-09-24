"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, getDocs, query, where, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

export default function AsistenciaPage() {
    const router = useRouter();
    const [cargando, setCargando] = useState(false);
    const [fechaTitulo, setFechaTitulo] = useState("");
    const [fechaExacta, setFechaExacta] = useState("");
    const [mesAnio, setMesAnio] = useState("");
    const [brigadaActual, setBrigadaActual] = useState("");
    const [voluntarios, setVoluntarios] = useState<any[]>([]);
    const [docAsistenciaDiaId, setDocAsistenciaDiaId] = useState("");

    const [mostrarModalApoyo, setMostrarModalApoyo] = useState(false);
    const [busquedaApoyo, setBusquedaApoyo] = useState("");
    const [resultadosApoyo, setResultadosApoyo] = useState<any[]>([]);

    useEffect(() => {
        const ahora = new Date();
        const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        setFechaTitulo(ahora.toLocaleDateString("es-SV", opcionesFecha).toUpperCase());

        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = ahora.getFullYear();

        const fExacta = `${dia}-${mes}-${anio}`;
        setFechaExacta(fExacta);
        setMesAnio(`${mes}/${anio}`);

        const calcularBrigadaAutomatica = () => {
            const diaLogico = new Date(ahora);
            if (ahora.getHours() < 6) diaLogico.setDate(diaLogico.getDate() - 1);

            const diaSemana = diaLogico.getDay();
            const horaActual = ahora.getHours();
            const esFinDeSemana = (diaSemana === 0 || diaSemana === 6);

            if (esFinDeSemana && horaActual >= 6 && horaActual < 18) {
                return "FIN DE SEMANA";
            }

            const fechaAncla = new Date(2026, 8, 23);
            diaLogico.setHours(0, 0, 0, 0);
            fechaAncla.setHours(0, 0, 0, 0);

            const diffTiempo = diaLogico.getTime() - fechaAncla.getTime();
            const diffDias = Math.floor(diffTiempo / (1000 * 3600 * 24));

            const secuencia = [3, 4, 1, 2];
            const indice = ((diffDias % 4) + 4) % 4;

            return `BRIGADA ${secuencia[indice]}`;
        };

        const brigada = calcularBrigadaAutomatica();
        setBrigadaActual(brigada);
        setDocAsistenciaDiaId(`${fExacta}_${brigada.replace(/ /g, "")}`);

    }, []);

    useEffect(() => {
        if (!brigadaActual || !docAsistenciaDiaId) return;

        const cargarDatos = async () => {
            setCargando(true);
            try {
                const docAsistenciaMaestra = await getDoc(doc(db, "asistencias", docAsistenciaDiaId));
                let asistenciasPrevias: any = {};

                if (docAsistenciaMaestra.exists()) {
                    asistenciasPrevias = docAsistenciaMaestra.data().detalles || {};
                }

                const q = query(collection(db, "usuarios"), where("brigada", "==", brigadaActual.replace("BRIGADA ", "Brigada ")));
                const querySnapshot = await getDocs(q);

                let listaFinal: any[] = [];

                for (const docUsuario of querySnapshot.docs) {
                    const data = docUsuario.data();
                    const carnet = docUsuario.id;

                    let horaE = "";
                    let horaS = "";
                    let estadoActual = asistenciasPrevias[carnet] || "Falta";
                    let estaBloqueado = estadoActual === "Asiste";

                    if (docAsistenciaMaestra.exists()) {
                        const registroIndividual = await getDoc(doc(db, "registro_horas", `${fechaExacta}_${carnet}`));
                        if (registroIndividual.exists()) {
                            const dataIndiv = registroIndividual.data();
                            horaE = revertirAmPm(dataIndiv.horaEntrada);
                            horaS = revertirAmPm(dataIndiv.horaSalida);
                        }
                    }

                    listaFinal.push({
                        id: carnet,
                        nombre: data.nombre,
                        carnet: carnet,
                        rol: data.rol || "Voluntario",
                        estado: estadoActual,
                        horaEntrada: horaE,
                        horaSalida: horaS,
                        esApoyo: false,
                        bloqueado: estaBloqueado
                    });
                }

                if (docAsistenciaMaestra.exists()) {
                    for (const [carnetApoyo, estadoApoyo] of Object.entries(asistenciasPrevias)) {
                        if (!listaFinal.some(v => v.carnet === carnetApoyo)) {
                            const userRef = await getDoc(doc(db, "usuarios", carnetApoyo));
                            const registroIndiv = await getDoc(doc(db, "registro_horas", `${fechaExacta}_${carnetApoyo}`));

                            if (userRef.exists()) {
                                listaFinal.push({
                                    id: carnetApoyo,
                                    nombre: userRef.data().nombre,
                                    carnet: carnetApoyo,
                                    rol: userRef.data().rol || "Voluntario",
                                    estado: estadoApoyo,
                                    horaEntrada: registroIndiv.exists() ? revertirAmPm(registroIndiv.data().horaEntrada) : "",
                                    horaSalida: registroIndiv.exists() ? revertirAmPm(registroIndiv.data().horaSalida) : "",
                                    esApoyo: true,
                                    bloqueado: estadoApoyo === "Asiste"
                                });
                            }
                        }
                    }
                }

                setVoluntarios(listaFinal);
            } catch (error) {
                console.error("Error al cargar datos:", error);
            }
            setCargando(false);
        };

        cargarDatos();
    }, [brigadaActual, docAsistenciaDiaId, fechaExacta]);


    const revertirAmPm = (horaAmPm: string) => {
        if (!horaAmPm) return "";
        const [time, modifier] = horaAmPm.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
        return `${hours.padStart(2, '0')}:${minutes}`;
    };

    const formatearHoraAmPm = (hora24: string) => {
        if (!hora24) return "";
        const [h, m] = hora24.split(':');
        let horas = parseInt(h, 10);
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        return `${horas}:${m} ${ampm}`;
    };

    const calcularHoras = (estado: string, entrada: string, salida: string) => {
        if (estado !== "Asiste") return 0;
        if (!entrada && !salida) return 12;
        if (!entrada || !salida) return 0;

        const [hE, mE] = entrada.split(':').map(Number);
        const [hS, mS] = salida.split(':').map(Number);

        let minE = hE * 60 + mE;
        let minS = hS * 60 + mS;

        if (minS < minE) minS += 24 * 60;

        return Math.round(((minS - minE) / 60) * 100) / 100;
    };

    const actualizarCampo = (index: number, campo: string, valor: any) => {
        const nuevosVoluntarios = [...voluntarios];
        // Prevenir actualización si está bloqueado
        if (nuevosVoluntarios[index].bloqueado) return;

        nuevosVoluntarios[index][campo] = valor;
        setVoluntarios(nuevosVoluntarios);
    };

    const guardarAsistencia = async () => {
        setCargando(true);
        try {
            let detallesMaestros: any = {};
            let totalAsistentes = 0;

            const batchPromises = voluntarios.map(async (vol) => {
                detallesMaestros[vol.carnet] = vol.estado;
                if (vol.estado === "Asiste") totalAsistentes++;

                const horasTrabajadas = calcularHoras(vol.estado, vol.horaEntrada, vol.horaSalida);

                // 1. Guardar en registro_horas
                const registroRef = doc(db, "registro_horas", `${fechaExacta}_${vol.carnet}`);
                await setDoc(registroRef, {
                    brigada: vol.esApoyo ? `Apoyo en ${brigadaActual}` : brigadaActual,
                    carnet: vol.carnet,
                    fecha: mesAnio,
                    fechaExacta: fechaExacta,
                    horaEntrada: formatearHoraAmPm(vol.horaEntrada),
                    horaSalida: formatearHoraAmPm(vol.horaSalida),
                    horasTrabajadas: horasTrabajadas,
                    nombre: vol.nombre,
                    estado: vol.estado,
                    timestamp: new Date().toLocaleString("es-SV", { timeZone: "America/El_Salvador" }),
                    tipoMiembro: vol.rol
                });

                // 2. Control Inteligente de turnosAsistidos
                const docAsistenciaAntigua = await getDoc(doc(db, "asistencias", docAsistenciaDiaId));
                let yaHabiaAsistidoHoy = false;
                if (docAsistenciaAntigua.exists()) {
                    yaHabiaAsistidoHoy = docAsistenciaAntigua.data().detalles[vol.carnet] === "Asiste";
                }

                const usuarioRef = doc(db, "usuarios", vol.carnet);
                const userSnap = await getDoc(usuarioRef);

                if (userSnap.exists()) {
                    let turnosActuales = Number(userSnap.data().turnosAsistidos) || 0;
                    let horasActuales = Number(userSnap.data().horasServicio) || 0;

                    if (vol.estado === "Asiste" && !yaHabiaAsistidoHoy) {
                        turnosActuales += 1;
                        horasActuales += horasTrabajadas;
                    } else if (vol.estado !== "Asiste" && yaHabiaAsistidoHoy) {
                        turnosActuales -= 1;
                        if (turnosActuales < 0) turnosActuales = 0;

                    }

                    await updateDoc(usuarioRef, {
                        turnosAsistidos: turnosActuales,
                        horasServicio: horasActuales
                    });
                }
            });

            await Promise.all(batchPromises);

            // 3. Guardar el documento maestro
            await setDoc(doc(db, "asistencias", docAsistenciaDiaId), {
                detalles: detallesMaestros,
                fecha: fechaExacta,
                timestamp: new Date().toLocaleString("es-SV", { timeZone: "America/El_Salvador" }),
                totalVoluntarios: totalAsistentes,
                turno: brigadaActual
            });

            alert(" Asistencia actualizada correctamente.");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error al guardar asistencia:", error);
            alert(" Hubo un error al actualizar la asistencia.");
        }
        setCargando(false);
    };

    const buscarVoluntarioApoyo = async () => {
        if (!busquedaApoyo.trim()) return;
        try {
            const q = query(collection(db, "usuarios"));
            const querySnapshot = await getDocs(q);
            const resultados = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((u: any) =>
                    u.nombre.toLowerCase().includes(busquedaApoyo.toLowerCase()) ||
                    u.id.includes(busquedaApoyo)
                )
                .filter((u: any) => !voluntarios.some(v => v.carnet === u.id));

            setResultadosApoyo(resultados);
        } catch (error) {
            console.error("Error buscando apoyos:", error);
        }
    };

    const agregarApoyo = (usuario: any) => {
        setVoluntarios([...voluntarios, {
            id: usuario.id,
            nombre: usuario.nombre,
            carnet: usuario.id,
            rol: usuario.rol || "Voluntario",
            estado: "Asiste",
            horaEntrada: "",
            horaSalida: "",
            esApoyo: true,
            bloqueado: false
        }]);
        setMostrarModalApoyo(false);
        setBusquedaApoyo("");
        setResultadosApoyo([]);
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] pb-24 font-sans">

            <div className="bg-[#B71C1C] text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/dashboard")} className="text-white text-2xl font-bold">←</button>
                    <div>
                        <h1 className="font-black text-lg tracking-wider">{fechaTitulo}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold uppercase text-red-200">TURNO AUTOMÁTICO:</span>
                            <span className="font-bold text-white text-lg">{brigadaActual || "Calculando..."}</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="p-4 max-w-2xl mx-auto">
                <button
                    onClick={() => setMostrarModalApoyo(true)}
                    className="w-full bg-[#1E88E5] text-white font-bold py-4 rounded-lg mb-4 shadow-sm hover:bg-blue-700 transition uppercase tracking-wider text-sm"
                >
                    + AGREGAR VOLUNTARIO DE APOYO
                </button>

                {cargando && voluntarios.length === 0 ? (
                    <p className="text-center text-gray-500 mt-10">Cargando personal y verificando registros previos...</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {voluntarios.map((vol, index) => {
                            const horasCalculadas = calcularHoras(vol.estado, vol.horaEntrada, vol.horaSalida);
                            const opacidad = vol.bloqueado ? "opacity-60 cursor-not-allowed" : "cursor-pointer";
                            const fondoTarjeta = vol.bloqueado ? "bg-green-50/40 border-green-200" : "bg-white border-gray-200";

                            return (
                                <div key={vol.carnet} className={`rounded-xl shadow-sm border p-4 ${vol.esApoyo ? 'border-blue-300' : ''} ${fondoTarjeta}`}>
                                    <div className="mb-3">
                                        <h3 className="font-bold text-gray-900 text-lg">
                                            {vol.nombre}
                                            {vol.esApoyo && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2 align-middle">APOYO</span>}
                                            {vol.bloqueado && <span className="text-[10px] bg-green-100 border border-green-300 text-green-800 px-2 py-1 rounded ml-2 align-middle shadow-sm">✅ REGISTRADO</span>}
                                        </h3>
                                        <p className="text-xs text-gray-500">Carnet: {vol.carnet}</p>
                                    </div>

                                    <div className="flex justify-center gap-6 mb-4">
                                        <label className={`flex items-center gap-2 ${opacidad}`}>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${vol.estado === 'Asiste' ? 'border-green-600' : 'border-gray-300'}`}>
                                                {vol.estado === 'Asiste' && <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>}
                                            </div>
                                            <input type="radio" className="hidden" disabled={vol.bloqueado} checked={vol.estado === 'Asiste'} onChange={() => actualizarCampo(index, 'estado', 'Asiste')} />
                                            <span className="text-sm text-gray-800 font-bold">Asiste</span>
                                        </label>

                                        <label className={`flex items-center gap-2 ${opacidad}`}>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${vol.estado === 'Permiso' ? 'border-yellow-500' : 'border-gray-300'}`}>
                                                {vol.estado === 'Permiso' && <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>}
                                            </div>
                                            <input type="radio" className="hidden" disabled={vol.bloqueado} checked={vol.estado === 'Permiso'} onChange={() => actualizarCampo(index, 'estado', 'Permiso')} />
                                            <span className="text-sm text-gray-800">Permiso</span>
                                        </label>

                                        <label className={`flex items-center gap-2 ${opacidad}`}>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${vol.estado === 'Falta' ? 'border-red-600' : 'border-gray-300'}`}>
                                                {vol.estado === 'Falta' && <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>}
                                            </div>
                                            <input type="radio" className="hidden" disabled={vol.bloqueado} checked={vol.estado === 'Falta'} onChange={() => actualizarCampo(index, 'estado', 'Falta')} />
                                            <span className="text-sm text-gray-800">Falta</span>
                                        </label>
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 relative">
                                            <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-gray-500 font-bold">ENTRADA</span>
                                            <input
                                                type="time"
                                                value={vol.horaEntrada}
                                                disabled={vol.estado !== 'Asiste' || vol.bloqueado}
                                                onChange={(e) => actualizarCampo(index, 'horaEntrada', e.target.value)}
                                                className="w-full border border-gray-300 rounded p-2 text-center text-sm disabled:bg-gray-100 outline-none focus:border-red-600"
                                            />
                                        </div>
                                        <div className="flex-1 relative">
                                            <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-gray-500 font-bold">SALIDA</span>
                                            <input
                                                type="time"
                                                value={vol.horaSalida}
                                                disabled={vol.estado !== 'Asiste' || vol.bloqueado}
                                                onChange={(e) => actualizarCampo(index, 'horaSalida', e.target.value)}
                                                className="w-full border border-gray-300 rounded p-2 text-center text-sm disabled:bg-gray-100 outline-none focus:border-red-600"
                                            />
                                        </div>
                                        <div className="w-20 text-center">
                                            <span className="font-bold text-[#C62828] text-sm">{horasCalculadas} hrs</span>
                                        </div>
                                    </div>

                                    {vol.estado === 'Asiste' && !vol.horaEntrada && !vol.horaSalida && (
                                        <p className="text-[10px] text-green-600 font-bold mt-2 text-center">Asignación automática: 12.0 horas completas.</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-200">
                <button
                    onClick={guardarAsistencia}
                    disabled={cargando || !brigadaActual}
                    className="w-full max-w-2xl mx-auto block bg-[#C62828] text-white font-bold py-4 rounded-lg shadow-md hover:bg-red-800 transition uppercase tracking-widest disabled:opacity-50"
                >
                    {cargando ? "ACTUALIZANDO REGISTROS..." : "GUARDAR ASISTENCIA"}
                </button>
            </div>

            {mostrarModalApoyo && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#1E88E5] text-white">
                            <h2 className="font-bold text-lg uppercase tracking-wider">Buscar Voluntario</h2>
                            <button onClick={() => setMostrarModalApoyo(false)} className="text-white font-bold text-xl hover:text-gray-200">✕</button>
                        </div>
                        <div className="p-5">
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Nombre o Carnet..."
                                    value={busquedaApoyo}
                                    onChange={(e) => setBusquedaApoyo(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg p-3 outline-none focus:border-[#1E88E5] shadow-inner"
                                />
                                <button onClick={buscarVoluntarioApoyo} className="bg-[#1E88E5] text-white px-4 rounded-lg font-bold shadow hover:bg-blue-600 transition">🔍</button>
                            </div>

                            <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
                                {resultadosApoyo.length === 0 ? (
                                    <p className="text-center text-gray-500 text-sm py-4">Ingresa un nombre o carnet para buscar.</p>
                                ) : (
                                    resultadosApoyo.map(res => (
                                        <div key={res.id} className="flex justify-between items-center border border-gray-200 p-3 rounded-lg hover:bg-blue-50 transition">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{res.nombre}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-1">Carnet: {res.id}</p>
                                            </div>
                                            <button
                                                onClick={() => agregarApoyo(res)}
                                                className="bg-[#00E676] text-white text-xs font-bold px-4 py-2 rounded shadow hover:bg-green-600 transition"
                                            >
                                                AGREGAR
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}