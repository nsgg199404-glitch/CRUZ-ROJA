"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import { collection, doc, onSnapshot, query, orderBy, limit } from "firebase/firestore";

export default function Dashboard() {
    const [usuarioActivo, setUsuarioActivo] = useState<any>(null);
    const [lideres, setLideres] = useState<any[]>([]);
    const router = useRouter();

    // --- ESTADOS DEL CALENDARIO ---
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [mesCalendario, setMesCalendario] = useState(new Date(2026, 8, 1)); // Inicia en Sept 2026

    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (!carnetGuardado) {
            router.push("/");
            return;
        }

        const docRef = doc(db, "usuarios", carnetGuardado);
        const unsubscribeUsuario = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setUsuarioActivo(docSnap.data());
            } else {
                localStorage.removeItem("carnetUsuario");
                router.push("/");
            }
        });

        const q = query(collection(db, "usuarios"), orderBy("turnosAsistidos", "desc"), limit(10));
        const unsubscribeLideres = onSnapshot(q, (querySnapshot) => {
            const listaLideres: any[] = [];
            querySnapshot.forEach((documento) => {
                listaLideres.push({ id: documento.id, ...documento.data() });
            });
            setLideres(listaLideres);
        });

        return () => {
            unsubscribeUsuario();
            unsubscribeLideres();
        };
    }, [router]);

    const handleCerrarSesion = () => {
        localStorage.removeItem("carnetUsuario");
        router.push("/");
    };

    // --- LÓGICA MATEMÁTICA DEL CALENDARIO ---
    const cambiarMes = (offset: number) => {
        setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + offset, 1));
    };

    const getBrigada = (fecha: Date) => {
        // Fecha ancla: 1 de Septiembre 2026 fue B1
        const anchor = new Date(2026, 8, 1);
        const utc1 = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
        const utc2 = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        const diff = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));

        const baseIndex = ((diff % 4) + 4) % 4;
        const bases = [
            { nombre: "B1", color: "bg-[#D32F2F]" }, // Rojo
            { nombre: "B2", color: "bg-[#1976D2]" }, // Azul
            { nombre: "B3", color: "bg-[#388E3C]" }, // Verde
            { nombre: "B4", color: "bg-[#F57C00]" }  // Naranja
        ];

        const res = { ...bases[baseIndex] };
        const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado

        // Si es fin de semana, agregamos B5
        if (diaSemana === 0 || diaSemana === 6) {
            res.nombre += " + B5";
        }
        return res;
    };

    const generarDiasMes = () => {
        const year = mesCalendario.getFullYear();
        const month = mesCalendario.getMonth();
        const diasEnMes = new Date(year, month + 1, 0).getDate();
        const primerDia = new Date(year, month, 1).getDay();

        const dias = [];
        for (let i = 0; i < primerDia; i++) dias.push(null); // Espacios vacíos
        for (let i = 1; i <= diasEnMes; i++) dias.push(new Date(year, month, i));
        return dias;
    };

    const mesesNombres = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

    if (!usuarioActivo) {
        return <div className="flex min-h-screen items-center justify-center text-[#C62828] font-bold">Cargando tu perfil operativo...</div>;
    }

    const rolActual = usuarioActivo.rol?.toLowerCase() || "voluntario";
    const gridBotones = [
        { titulo: "MURO DE\nNOVEDADES", icono: "≡", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "BITÁCORA DE\nATENCIONES", icono: "📄", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "VER\nINVENTARIO", icono: "👁️", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "GESTIONAR\nEQUIPO APH", icono: "✍️", permisos: ["superadmin", "administrador", "jefe de brigada"] },
        { titulo: "CHEQUEO DE\nAMBULANCIAS", icono: "🔧", permisos: ["superadmin", "administrador", "jefe de brigada"] },
        {
            titulo: "CONTROL DE\nCOMBUSTIBLE",
            icono: "⛽",
            permisos: ["superadmin", "administrador", "voluntario"],
            onClick: () =>router.push("/combustible")
        },


        { titulo: "GUÍA\nMÉDICA", icono: "📖", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "CIERRE\nTURNO", icono: "🛑", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] }
    ];
    const listBotones = [
        { titulo: "GENERAR REPORTES (PDF)", icono: "📄", permisos: ["superadmin", "administrador"] },
        { titulo: "GESTIONAR USUARIOS", icono: "⚙️", permisos: ["superadmin", "administrador"] },
        { titulo: "TOMAR ASISTENCIA", icono: "📋", permisos: ["superadmin", "administrador", "jefe de brigada"] },
        { titulo: "PANEL SERVICIO SOCIAL", icono: "❤️", permisos: ["superadmin", "administrador"] }
    ];
    const botonesGridPermitidos = gridBotones.filter(btn => btn.permisos.includes(rolActual));
    const botonesListaPermitidos = listBotones.filter(btn => btn.permisos.includes(rolActual));

    return (
        <div className="flex min-h-screen bg-[#F8F9FA] font-sans relative">

            {/* --- COLUMNA IZQUIERDA --- */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col items-center py-10 px-6 shrink-0 z-10">
                <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 overflow-hidden border-4 border-white shadow-md">
                    <img src="/logo.jpg" alt="Perfil" className="w-full h-full object-cover" />
                </div>

                <div className="text-center mb-8">
                    <p className="text-[#C62828] font-bold text-lg leading-tight">
                        ¡Hola,<br />{usuarioActivo.nombre.split(" ")[0]}!
                    </p>
                    <p className="text-gray-400 text-xs mt-1">Carnet: {usuarioActivo.carnet}</p>
                    <p className="text-[#C62828] text-[10px] uppercase font-bold mt-1 bg-red-50 rounded-full px-2 py-1 inline-block">
                        {usuarioActivo.rol}
                    </p>
                </div>

                <div className="border border-red-100 rounded-2xl p-4 text-center w-full shadow-sm bg-white mb-6">
                    <span className="text-2xl">🏆</span>
                    <p className="text-4xl font-bold text-[#C62828] my-1">{usuarioActivo.turnosAsistidos || 0}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Mis Turnos</p>
                </div>

                {/* BOTÓN PARA ABRIR CALENDARIO */}
                <button
                    onClick={() => setMostrarCalendario(true)}
                    className="w-full bg-[#C62828] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-800 transition shadow-md mb-2"
                >
                    📅 CALENDARIO
                </button>

                <button
                    onClick={handleCerrarSesion}
                    className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center hover:bg-gray-200 transition"
                >
                    CERRAR SESIÓN
                </button>
            </aside>

            {/* --- COLUMNA CENTRAL --- */}
            <main className="flex-1 p-8 overflow-y-auto flex justify-center">
                <div className="max-w-2xl w-full">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {botonesGridPermitidos.map((btn, index) => (
                            <button key={index}
                                onClick={(btn as any).onClick}
                                className="bg-[#C62828] text-white p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-red-800 transition shadow-md h-36">
                                <span className="text-3xl opacity-90">{btn.icono}</span>
                                <span className="text-[11px] font-bold text-center uppercase tracking-wider whitespace-pre-line">{btn.titulo}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-3">
                        {botonesListaPermitidos.map((btn, index) => (
                            <button key={index}
                                className="bg-[#C62828] text-white py-4 rounded-xl text-xs font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-red-800 transition shadow-md">
                                <span>{btn.icono}</span> {btn.titulo}
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* --- COLUMNA DERECHA --- */}
            <aside className="w-80 bg-white border-l border-gray-200 p-8 overflow-y-auto shrink-0 hidden lg:block z-10">
                <div className="mb-8">
                    <h3 className="text-[#C62828] font-bold tracking-wider flex items-center gap-2 text-sm">🏆 TABLA DE LÍDERES</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase">Ordenado por cantidad de turnos</p>
                </div>
                <div className="flex flex-col gap-6">
                    {lideres.map((lider, index) => (
                        <div key={lider.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-300 font-bold text-sm w-4 text-center">{index + 1}</span>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm border border-gray-100 shadow-sm">
                                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "👤"}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-700">{lider.nombre}</p>
                                    <p className="text-[10px] text-gray-400">{lider.brigada || "Sin brigada"}</p>
                                </div>
                            </div>
                            <span className="text-[#C62828] font-bold text-sm">{lider.turnosAsistidos || 0}</span>
                        </div>
                    ))}
                </div>
            </aside>

            {/* ========================================== */}
            {/* MODAL DEL CALENDARIO DINÁMICO */}
            {/* ========================================== */}
            {mostrarCalendario && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        {/* Header del Calendario */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <button onClick={() => cambiarMes(-1)} className="bg-[#C62828] text-white w-10 h-10 rounded-lg font-bold hover:bg-red-800 transition">&lt;</button>
                            <h2 className="text-xl font-bold text-gray-800">
                                {mesesNombres[mesCalendario.getMonth()]} {mesCalendario.getFullYear()}
                            </h2>
                            <button onClick={() => cambiarMes(1)} className="bg-[#C62828] text-white w-10 h-10 rounded-lg font-bold hover:bg-red-800 transition">&gt;</button>
                        </div>

                        {/* Días de la Semana */}
                        <div className="grid grid-cols-7 gap-1 p-4 pb-2 bg-gray-50 border-b border-gray-200">
                            {["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"].map(dia => (
                                <div key={dia} className="text-center font-bold text-gray-500 text-xs tracking-wider">{dia}</div>
                            ))}
                        </div>

                        {/* Cuadrícula de Fechas */}
                        <div className="grid grid-cols-7 gap-2 p-4">
                            {generarDiasMes().map((fecha, idx) => {
                                if (!fecha) return <div key={idx} className="h-20 rounded-xl bg-transparent"></div>;

                                const brigada = getBrigada(fecha);
                                return (
                                    <div key={idx} className="h-20 rounded-xl border border-gray-200 flex flex-col items-center justify-center bg-white shadow-sm overflow-hidden">
                                        <span className="text-sm font-bold text-gray-700 mb-1">{fecha.getDate()}</span>
                                        <span className={`${brigada.color} text-white text-[10px] font-bold px-2 py-1 rounded w-11/12 text-center break-words leading-tight`}>
                                            {brigada.nombre}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botón de Cerrar */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button onClick={() => setMostrarCalendario(false)} className="text-gray-500 font-bold text-sm hover:text-gray-800 transition">
                                CERRAR
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}