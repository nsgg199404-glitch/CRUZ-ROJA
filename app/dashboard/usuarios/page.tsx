"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";

export default function GestionUsuariosPage() {
    const router = useRouter();
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [vistaActual, setVistaActual] = useState<"lista" | "formulario">("lista");

    const [miRol, setMiRol] = useState<string>("voluntario");

    const [busqueda, setBusqueda] = useState("");
    const [filtroFilial, setFiltroFilial] = useState("VER TODOS");

    const [stats, setStats] = useState({ total: 0, socorrismo: 0, juventud: 0, otros: 0 });

    const estadoInicialForm = {
        nombreCompleto: "",
        filial: "",
        carnet: "",
        password: "",
        brigada: "Sin Asignar",
        rol: "Voluntario"
    };
    const [formUser, setFormUser] = useState(estadoInicialForm);
    const [guardando, setGuardando] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);

    useEffect(() => {
        const miCarnet = localStorage.getItem("carnetUsuario");
        if (miCarnet) {
            getDoc(doc(db, "usuarios", miCarnet)).then(snap => {
                if (snap.exists()) {
                    setMiRol(snap.data().rol?.toLowerCase() || "voluntario");
                }
            });
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "usuarios"), (snapshot) => {
            const lista: any[] = [];
            let cTotal = 0, cSocorrismo = 0, cJuventud = 0, cOtros = 0;

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                lista.push({ id: docSnap.id, ...data });

                cTotal++;
                if (data.filial === "Socorrismo") cSocorrismo++;
                else if (data.filial === "Juventud") cJuventud++;
                else cOtros++;
            });

            lista.sort((a, b) => a.nombre?.localeCompare(b.nombre));

            setUsuarios(lista);
            setStats({ total: cTotal, socorrismo: cSocorrismo, juventud: cJuventud, otros: cOtros });
            setCargando(false);
        });

        return () => unsubscribe();
    }, []);

    const usuariosFiltrados = usuarios.filter(user => {
        const coincideTexto = user.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || user.id.includes(busqueda);
        const coincideFilial = filtroFilial === "VER TODOS" || user.filial === filtroFilial;
        return coincideTexto && coincideFilial;
    });

    // --- FUNCIÓN DE EXPORTACIÓN A EXCEL (CSV) CORREGIDA PARA EL SALVADOR ---
    const exportarExcel = () => {
        if (usuariosFiltrados.length === 0) return alert("No hay usuarios para exportar.");

        const encabezados = ["Nombre Completo", "Número de Carnet", "Filial", "Brigada", "Rol", "Fecha de Creación", "Turnos Asistidos", "Horas de Servicio"];

        const filas = usuariosFiltrados.map(user => [
            `"${user.nombre || ""}"`,
            `"${user.id || ""}"`,
            `"${user.filial || ""}"`,
            `"${user.brigada || ""}"`,
            `"${user.rol || ""}"`,
            `"${user.fechaRegistro || ""}"`,
            `"${user.turnosAsistidos || 0}"`,
            `"${user.horasServicio || 0}"`
        ]);

        // Usamos punto y coma (;) para que Excel en nuestra región lo separe en columnas
        const contenidoCSV = [
            encabezados.join(";"),
            ...filas.map(fila => fila.join(";"))
        ].join("\n");

        const bom = "\uFEFF";
        const blob = new Blob([bom + contenidoCSV], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        const fechaArchivo = new Date().toLocaleDateString('es-SV').replace(/\//g, '-');
        link.setAttribute("download", `Personal_Operativo_${fechaArchivo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormUser(prev => ({ ...prev, [name]: value }));
    };

    const abrirFormularioNuevo = () => {
        setFormUser(estadoInicialForm);
        setEditandoId(null);
        setVistaActual("formulario");
    };

    const abrirEdicion = (user: any) => {
        setFormUser({
            nombreCompleto: user.nombre || "",
            filial: user.filial || "",
            carnet: user.id,
            password: user.password || "",
            brigada: user.brigada || "Sin Asignar",
            rol: user.rol || "Voluntario"
        });
        setEditandoId(user.id);
        setVistaActual("formulario");
    };

    const guardarUsuario = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formUser.carnet || !formUser.nombreCompleto || !formUser.password || !formUser.filial) {
            return alert("Por favor completa todos los campos requeridos.");
        }

        setGuardando(true);
        try {
            const userRef = doc(db, "usuarios", formUser.carnet);

            const datosUsuario = {
                nombre: formUser.nombreCompleto.toUpperCase(),
                filial: formUser.filial,
                carnet: formUser.carnet,
                password: formUser.password,
                brigada: formUser.brigada,
                rol: formUser.rol,
                esAdmin: formUser.rol !== "Voluntario"
            };

            if (editandoId) {
                await updateDoc(userRef, datosUsuario);
                alert("✅ Usuario actualizado exitosamente.");
            } else {
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    alert("❌ Este número de carnet ya está registrado.");
                    setGuardando(false);
                    return;
                }

                await setDoc(userRef, {
                    ...datosUsuario,
                    fechaRegistro: new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }),
                    turnosAsistidos: 0,
                    horasServicio: 0,
                    ultimoAcceso: "Nunca"
                });
                alert("✅ Usuario registrado exitosamente.");
            }

            setVistaActual("lista");
            setFormUser(estadoInicialForm);
            setEditandoId(null);
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("❌ Hubo un error al guardar el usuario.");
        }
        setGuardando(false);
    };

    const eliminarUsuario = async (user: any) => {
        if (confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente a ${user.nombre} (Carnet: ${user.id})?`)) {
            try {
                await deleteDoc(doc(db, "usuarios", user.id));
                alert("Usuario eliminado correctamente.");
            } catch (error) {
                console.error("Error eliminando:", error);
                alert("No se pudo eliminar el usuario.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans pb-24 relative">

            <div className="sticky top-0 z-20">
                <header className="bg-white p-4 shadow-sm flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => {
                            if (vistaActual === "formulario") setVistaActual("lista");
                            else router.push("/dashboard");
                        }} className="text-[#C62828] font-bold text-xl">←</button>
                        <h1 className="text-[#C62828] font-bold text-lg tracking-wide uppercase">
                            {vistaActual === "lista" ? "GESTIÓN DE USUARIOS" : (editandoId ? "EDITAR USUARIO" : "NUEVO VOLUNTARIO")}
                        </h1>
                    </div>
                </header>

                {vistaActual === "lista" && (
                    <div className="bg-[#B71C1C] text-white p-6 shadow-md text-center">
                        <h2 className="font-bold text-lg tracking-widest uppercase">FUERZA OPERATIVA</h2>
                        <p className="text-sm mt-1 mb-3 text-red-100">TOTAL PERSONAL: <span className="font-bold text-white">{stats.total}</span></p>
                        <div className="flex justify-center gap-4 text-xs font-semibold text-red-100">
                            <p>Socorrismo: <span className="text-white">{stats.socorrismo}</span></p>
                            <p>Juventud: <span className="text-white">{stats.juventud}</span></p>
                            <p>Otros: <span className="text-white">{stats.otros}</span></p>
                        </div>
                    </div>
                )}
            </div>

            <main className="p-4 max-w-3xl mx-auto">

                {vistaActual === "lista" && (
                    <>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                <div className="flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-gray-300 pb-3 sm:pb-0 pr-0 sm:pr-4">
                                    <span className="text-gray-500 font-bold text-sm whitespace-nowrap">Filtrar por:</span>
                                    <select
                                        value={filtroFilial}
                                        onChange={(e) => setFiltroFilial(e.target.value)}
                                        className="bg-transparent font-bold text-gray-800 outline-none"
                                    >
                                        <option value="VER TODOS">VER TODOS</option>
                                        <option value="Socorrismo">Socorrismo</option>
                                        <option value="Juventud">Juventud</option>
                                        <option value="Junta Local">Junta Local</option>
                                        <option value="Guardavidas">Guardavidas</option>
                                        <option value="Damas Voluntarias">Damas Voluntarias</option>
                                    </select>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar nombre o carnet..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="p-2 border border-gray-300 rounded outline-none focus:border-[#B71C1C] text-sm flex-1 md:w-64"
                                />
                            </div>

                            {/* BOTÓN DE EXPORTAR */}
                            <button
                                onClick={exportarExcel}
                                className="bg-[#107C41] text-white px-4 py-2 rounded font-bold text-xs hover:bg-green-800 transition shadow flex items-center gap-2 w-full md:w-auto justify-center"
                            >
                                EXPORTAR A EXCEL
                            </button>
                        </div>

                        {cargando ? (
                            <p className="text-center text-gray-500 mt-10">Cargando base de datos...</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {usuariosFiltrados.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10 bg-white rounded-xl border border-gray-200">No se encontraron voluntarios.</p>
                                ) : (
                                    usuariosFiltrados.map((user) => {
                                        const bloqueadoPorJerarquia = user.rol === "Superadmin" && miRol !== "superadmin";

                                        return (
                                            <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3 hover:shadow-md transition group">
                                                <div className="w-12 h-12 rounded bg-red-50 flex items-center justify-center text-[#B71C1C] text-2xl shrink-0">
                                                    👤
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 truncate">
                                                        {user.nombre}
                                                        {user.rol === "Superadmin" && <span className="ml-2 text-[9px] bg-red-100 text-red-800 px-1 py-0.5 rounded uppercase">👑 ROOT</span>}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-[#B71C1C] uppercase tracking-wider mt-1 truncate">
                                                        {user.brigada} - {user.filial || "SIN FILIAL"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">Carnet: {user.id} | Rol: {user.rol || "Voluntario"}</p>
                                                </div>

                                                {!bloqueadoPorJerarquia && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => abrirEdicion(user)}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-50 transition"
                                                            title="Editar usuario"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => eliminarUsuario(user)}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                                                            title="Eliminar usuario"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        <button
                            onClick={abrirFormularioNuevo}
                            className="fixed bottom-6 right-6 bg-[#C62828] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-red-800 transition z-20"
                        >
                            +
                        </button>
                    </>
                )}

                {vistaActual === "formulario" && (
                    <form onSubmit={guardarUsuario} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-5 mt-4">

                        <div>
                            <label className="text-xs font-bold text-[#C62828] mb-1 block">Nombre Completo</label>
                            <input
                                type="text"
                                name="nombreCompleto"
                                value={formUser.nombreCompleto}
                                onChange={handleInputChange}
                                required
                                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-[#C62828] bg-gray-50"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-800 mb-1 block">Filial / Cuerpo:</label>
                            <select
                                name="filial"
                                value={formUser.filial}
                                onChange={handleInputChange}
                                required
                                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-[#C62828] bg-gray-50 appearance-none"
                            >
                                <option value="">Seleccione una Filial...</option>
                                <option value="Socorrismo">Socorrismo</option>
                                <option value="Juventud">Juventud</option>
                                <option value="Junta Local">Junta Local</option>
                                <option value="Guardavidas">Guardavidas</option>
                                <option value="Damas Voluntarias">Damas Voluntarias</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[#C62828] mb-1 block">Número de Carnet</label>
                            <input
                                type="text"
                                name="carnet"
                                value={formUser.carnet}
                                onChange={handleInputChange}
                                required
                                disabled={!!editandoId}
                                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-[#C62828] disabled:bg-gray-200 disabled:text-gray-500 bg-gray-50"
                            />
                            {editandoId && <p className="text-[10px] text-gray-500 mt-1">El carnet no se puede modificar una vez registrado.</p>}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[#C62828] mb-1 block">Asignar Contraseña</label>
                            <input
                                type="text"
                                name="password"
                                value={formUser.password}
                                onChange={handleInputChange}
                                required
                                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-[#C62828] bg-gray-50"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-800 mb-1 block">Asignar Brigada:</label>
                            <select
                                name="brigada"
                                value={formUser.brigada}
                                onChange={handleInputChange}
                                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-[#C62828] bg-gray-50 appearance-none"
                            >
                                <option value="Sin Asignar">Sin Asignar</option>
                                <option value="Brigada 1">Brigada 1</option>
                                <option value="Brigada 2">Brigada 2</option>
                                <option value="Brigada 3">Brigada 3</option>
                                <option value="Brigada 4">Brigada 4</option>
                                <option value="Brigada 5">Brigada 5</option>
                                <option value="Fin de Semana">Fin de Semana</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-800 mb-1 block">Rol / Jerarquía:</label>
                            <select
                                name="rol"
                                value={formUser.rol}
                                onChange={handleInputChange}
                                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-[#C62828] bg-gray-50 appearance-none"
                            >
                                <option value="Voluntario">Voluntario</option>
                                <option value="Jefe de Brigada">Jefe de Brigada</option>
                                <option value="Administrador General">Administrador General</option>
                                {miRol === "superadmin" && <option value="Superadmin">Superadmin</option>}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={guardando}
                            className="w-full bg-[#B71C1C] text-white py-4 rounded-lg font-bold tracking-widest shadow-md hover:bg-red-800 transition uppercase mt-4 disabled:opacity-50"
                        >
                            {guardando ? "Guardando..." : (editandoId ? "ACTUALIZAR USUARIO" : "CREAR CUENTA")}
                        </button>
                    </form>
                )}

            </main>
        </div>
    );
}