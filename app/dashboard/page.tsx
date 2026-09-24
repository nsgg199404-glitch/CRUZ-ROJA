
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function Dashboard() {
    const [rolActual, setRolActual] = useState<string>("voluntario");
    const router = useRouter();

    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (!carnetGuardado) return;

        const docRef = doc(db, "usuarios", carnetGuardado);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setRolActual(docSnap.data().rol?.toLowerCase() || "voluntario");
            }
        });

        return () => unsubscribe();
    }, []);

    const gridBotones = [
        { titulo: "MURO DE\nNOVEDADES", icono: "≡", permisos: ["superadmin", "administrador general", "jefe de brigada", "voluntario"], ruta: "/dashboard/novedades" },
        { titulo: "BITÁCORA DE\nATENCIONES", icono: "⋆｡ﾟ☁︎｡⋆｡ ﾟ☾ ﾟ｡⋆", permisos: ["superadmin", "administrador general", "jefe de brigada", "voluntario"], ruta: "/dashboard/bitacora" },
        { titulo: "VER\nINVENTARIO", icono: "♯", permisos: ["superadmin", "administrador general", "jefe de brigada", "voluntario"], ruta: "/dashboard/inventario" },
        { titulo: "GESTIONAR\nEQUIPO APH", icono: "✮", permisos: ["superadmin", "administrador general", "jefe de brigada"], ruta: "/dashboard/equipo-aph" },
        { titulo: "CHEQUEO DE\nAMBULANCIAS", icono: "☼", permisos: ["superadmin", "administrador general", "jefe de brigada"], ruta: "/dashboard/ambulancias" },
        { titulo: "CONTROL DE\nCOMBUSTIBLE", icono: "❦", permisos: ["superadmin", "administrador general", "jefe de brigada", "voluntario"], ruta: "/dashboard/combustible" },
        { titulo: "GUÍA\nMÉDICA", icono: "ᯓ★", permisos: ["superadmin", "administrador general", "jefe de brigada", "voluntario"], ruta: "/dashboard/guia-medica" },
        { titulo: "CIERRE\nTURNO", icono: "𖦹", permisos: ["superadmin", "administrador general", "jefe de brigada", "voluntario"], ruta: "/dashboard/cierre-turno" }
    ];

    const listBotones = [
        { titulo: "GENERAR REPORTES (PDF)", icono: "𝄞", permisos: ["superadmin"], ruta: "/dashboard/reportes" },
        { titulo: "GESTIONAR USUARIOS", icono: "❀", permisos: ["superadmin", "administrador general", "jefe de brigada"], ruta: "/dashboard/usuarios" },
        { titulo: "TOMAR ASISTENCIA", icono: "☁︎", permisos: ["superadmin", "administrador general", "jefe de brigada"], ruta: "/dashboard/asistencia" },
        { titulo: "PANEL SERVICIO SOCIAL", icono: "✶", permisos: ["superadmin"], ruta: "/dashboard/servicio-social" },
        { titulo: "VER HISTORIAL DE FIRMAS", icono: "⌗", permisos: ["superadmin"], ruta: "/dashboard/historial-firmas" },
        { titulo: "PANEL SUPER ADMIN", icono: "➤", permisos: ["superadmin"], ruta: "/dashboard/superadmin" }
    ];

    const botonesGridPermitidos = gridBotones.filter(btn => btn.permisos.includes(rolActual));
    const botonesListaPermitidos = listBotones.filter(btn => btn.permisos.includes(rolActual));

    return (
        <div className="p-8 flex justify-center w-full">
            <div className="max-w-2xl w-full">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {botonesGridPermitidos.map((btn, index) => (
                        <button key={index}
                            onClick={() => router.push(btn.ruta)}
                            className="bg-[#C62828] text-white p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-red-800 transition shadow-md h-36">
                            <span className="text-3xl opacity-90">{btn.icono}</span>
                            <span className="text-[11px] font-bold text-center uppercase tracking-wider whitespace-pre-line">{btn.titulo}</span>
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-3">
                    {botonesListaPermitidos.map((btn, index) => (
                        <button key={index}
                            onClick={() => router.push(btn.ruta)}
                            className="bg-[#C62828] text-white py-4 rounded-xl text-xs font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-red-800 transition shadow-md">
                            <span>{btn.icono}</span> {btn.titulo}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}