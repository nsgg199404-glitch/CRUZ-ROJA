"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// Asegúrate de que la ruta a firebase sea correcta (../../firebase)
import { db } from "../../firebase";
import { collection, doc, onSnapshot, query, orderBy, limit } from "firebase/firestore";

export default function Dashboard() {
    const [usuarioActivo, setUsuarioActivo] = useState<any>(null);
    const [lideres, setLideres] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        // 1. LEEMOS QUIÉN INICIÓ SESIÓN DESDE LA MEMORIA
        const carnetGuardado = localStorage.getItem("carnetUsuario");

        // Si alguien intenta entrar a /dashboard sin iniciar sesión, lo regresamos
        if (!carnetGuardado) {
            router.push("/");
            return;
        }

        // 2. ESCUCHADOR DEL PERFIL DINÁMICO
        const docRef = doc(db, "usuarios", carnetGuardado);
        const unsubscribeUsuario = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setUsuarioActivo(docSnap.data());
            } else {
                // Si el usuario fue borrado de la base de datos, lo sacamos
                localStorage.removeItem("carnetUsuario");
                router.push("/");
            }
        });

        // 3. ESCUCHADOR DE LA TABLA DE LÍDERES
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

    // Función para cerrar sesión
    const handleCerrarSesion = () => {
        localStorage.removeItem("carnetUsuario");
        router.push("/");
    };

    // Pantalla de carga mientras lee la base de datos
    if (!usuarioActivo) {
        return <div className="flex min-h-screen items-center justify-center text-[#C62828] font-bold">Cargando tu perfil operativo...</div>;
    }

    // ==========================================
    // SISTEMA DE PERMISOS POR ROLES
    // ==========================================
    // Obtenemos el rol del usuario (si no tiene, por defecto es "voluntario")
    const rolActual = usuarioActivo.rol?.toLowerCase() || "voluntario";

    // Cuadrícula principal (Tú decides aquí qué roles ven cada botón)
    const gridBotones = [
        { titulo: "MURO DE\nNOVEDADES", icono: "≡", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "BITÁCORA DE\nATENCIONES", icono: "📄", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "VER\nINVENTARIO", icono: "👁️", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "GESTIONAR\nEQUIPO APH", icono: "✍️", permisos: ["superadmin", "administrador", "jefe de brigada"] },
        { titulo: "CHEQUEO DE\nAMBULANCIAS", icono: "🔧", permisos: ["superadmin", "administrador", "jefe de brigada"] },
        { titulo: "CONTROL DE\nCOMBUSTIBLE", icono: "⛽", permisos: ["superadmin", "administrador"] },
        { titulo: "GUÍA\nMÉDICA", icono: "📖", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] },
        { titulo: "CIERRE\nTURNO", icono: "🛑", permisos: ["superadmin", "administrador", "jefe de brigada", "voluntario"] }
    ];

    // Botones inferiores de administración
    const listBotones = [
        { titulo: "GENERAR REPORTES (PDF)", icono: "📄", permisos: ["superadmin", "administrador"] },
        { titulo: "GESTIONAR USUARIOS", icono: "⚙️", permisos: ["superadmin", "administrador"] },
        { titulo: "TOMAR ASISTENCIA", icono: "📋", permisos: ["superadmin", "administrador", "jefe de brigada"] },
        { titulo: "PANEL SERVICIO SOCIAL", icono: "❤️", permisos: ["superadmin", "administrador"] }
    ];

    // Filtramos los botones: Solo guarda los que incluyan el rol de quien inició sesión
    const botonesGridPermitidos = gridBotones.filter(btn => btn.permisos.includes(rolActual));
    const botonesListaPermitidos = listBotones.filter(btn => btn.permisos.includes(rolActual));

    return (
        <div className="flex min-h-screen bg-[#F8F9FA] font-sans">

            {/* --- 1. COLUMNA IZQUIERDA (Perfil Real) --- */}
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

                <button className="w-full bg-[#C62828] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-800 transition shadow-md mb-2">
                    📅 CALENDARIO
                </button>

                {/* Botón de cerrar sesión para poder probar otros usuarios */}
                <button
                    onClick={handleCerrarSesion}
                    className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center hover:bg-gray-200 transition"
                >
                    CERRAR SESIÓN
                </button>
            </aside>

            {/* --- 2. COLUMNA CENTRAL (Botones Dinámicos según Rol) --- */}
            <main className="flex-1 p-8 overflow-y-auto flex justify-center">
                <div className="max-w-2xl w-full">

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {botonesGridPermitidos.map((btn, index) => (
                            <button
                                key={index}
                                className="bg-[#C62828] text-white p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-red-800 transition shadow-md h-36"
                            >
                                <span className="text-3xl opacity-90">{btn.icono}</span>
                                <span className="text-[11px] font-bold text-center uppercase tracking-wider whitespace-pre-line">
                                    {btn.titulo}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        {botonesListaPermitidos.map((btn, index) => (
                            <button
                                key={index}
                                className="bg-[#C62828] text-white py-4 rounded-xl text-xs font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-red-800 transition shadow-md"
                            >
                                <span>{btn.icono}</span> {btn.titulo}
                            </button>
                        ))}
                    </div>

                </div>
            </main>

            {/* --- 3. COLUMNA DERECHA (Tabla de Líderes) --- */}
            <aside className="w-80 bg-white border-l border-gray-200 p-8 overflow-y-auto shrink-0 hidden lg:block z-10">
                <div className="mb-8">
                    <h3 className="text-[#C62828] font-bold tracking-wider flex items-center gap-2 text-sm">
                        🏆 TABLA DE LÍDERES
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase">Ordenado por cantidad de turnos</p>
                </div>

                <div className="flex flex-col gap-6">
                    {lideres.map((lider, index) => {
                        let medalla = "";
                        if (index === 0) medalla = "🥇";
                        else if (index === 1) medalla = "🥈";
                        else if (index === 2) medalla = "🥉";

                        return (
                            <div key={lider.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-300 font-bold text-sm w-4 text-center">{index + 1}</span>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm border border-gray-100 shadow-sm">
                                        {medalla || "👤"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-700">{lider.nombre}</p>
                                        <p className="text-[10px] text-gray-400">{lider.brigada || "Sin brigada"}</p>
                                    </div>
                                </div>
                                <span className="text-[#C62828] font-bold text-sm">{lider.turnosAsistidos || 0}</span>
                            </div>
                        );
                    })}
                </div>
            </aside>

        </div>
    );
}