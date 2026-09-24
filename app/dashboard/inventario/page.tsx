"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, onSnapshot, query, doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";

export default function InventarioPage() {
    const router = useRouter();

    const [inventario, setInventario] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [vistaActual, setVistaActual] = useState<"categorias" | "lista" | "detalle" | "formulario">("categorias");
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
    const [rolUsuario, setRolUsuario] = useState("voluntario");

    // Estado del formulario (para edición)
    const [formData, setFormData] = useState({
        nombre: "",
        numSerie: "",
        fechaRevision: "",
        estado: "",
        color: "",
        descripcion: "",
        cantidad: "",
        categoria: ""
    });

    // 1. Cargar rol del usuario
    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (carnetGuardado) {
            getDoc(doc(db, "usuarios", carnetGuardado)).then(snap => {
                if (snap.exists()) setRolUsuario(snap.data().rol?.toLowerCase() || "voluntario");
            });
        }
    }, []);

    // 2. Descargar inventario
    useEffect(() => {
        const q = query(collection(db, "inventario_aph"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(doc => ({
                firebaseId: doc.id,
                ...doc.data()
            }));
            setInventario(lista);
            setCargando(false);
        });
        return () => unsubscribe();
    }, []);

    // 3. Filtros
    const itemsFiltrados = inventario.filter(item => {
        const coincideCategoria = categoriaSeleccionada === "Todo" || item.categoria === categoriaSeleccionada;
        const termino = busqueda.toLowerCase();
        const coincideBusqueda =
            (item.nombre && item.nombre.toLowerCase().includes(termino)) ||
            (item.id && item.id.toLowerCase().includes(termino)) ||
            (item.numSerie && item.numSerie.toLowerCase().includes(termino));

        return coincideCategoria && coincideBusqueda;
    });

    const getColorEstado = (estado: string) => {
        const est = estado?.toLowerCase() || "";
        if (est.includes("excelente") || est.includes("buen")) return "text-[#388E3C]";
        if (est.includes("mal") || est.includes("dañad")) return "text-[#D32F2F]";
        if (est.includes("incompleto")) return "text-[#558B2F]";
        return "text-gray-500";
    };

    const abrirCategoria = (nombreCategoria: string) => {
        setCategoriaSeleccionada(nombreCategoria);
        setBusqueda("");
        setVistaActual("lista");
    };

    const abrirDetalle = (item: any) => {
        setItemSeleccionado(item);
        setVistaActual("detalle");
    };

    const habilitarEdicion = () => {
        setFormData({
            nombre: itemSeleccionado.nombre || "",
            numSerie: itemSeleccionado.numSerie || itemSeleccionado.id || "",
            fechaRevision: itemSeleccionado.fechaRevision || "",
            estado: itemSeleccionado.estado || "",
            color: itemSeleccionado.color || "",
            descripcion: itemSeleccionado.descripcion || "",
            cantidad: itemSeleccionado.cantidad || "",
            categoria: itemSeleccionado.categoria || ""
        });
        setVistaActual("formulario");
    };

    const handleActualizar = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, "inventario_aph", itemSeleccionado.firebaseId), {
                ...formData
            });
            // Actualizar el item visualmente y volver a detalles
            setItemSeleccionado({ ...itemSeleccionado, ...formData });
            setVistaActual("detalle");
        } catch (error) {
            console.error("Error al actualizar:", error);
            alert("Error al actualizar el registro.");
        }
    };

    const eliminarItem = async () => {
        if (confirm(`¿Estás seguro de que deseas eliminar permanentemente "${itemSeleccionado.nombre}" del inventario?`)) {
            await deleteDoc(doc(db, "inventario_aph", itemSeleccionado.firebaseId));
            setVistaActual("lista");
            setItemSeleccionado(null);
        }
    };

    const compartirWhatsApp = () => {
        const texto = `*INVENTARIO CRUX ROJA*\nArtículo: ${itemSeleccionado.nombre}\nID/Serie: ${itemSeleccionado.numSerie || itemSeleccionado.id || "N/A"}\nEstado: ${itemSeleccionado.estado}\nCantidad: ${itemSeleccionado.cantidad}\nDescripción: ${itemSeleccionado.descripcion || "N/A"}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
    };

    const compartirCorreo = () => {
        const texto = `INVENTARIO CRUZ ROJA\n\nArtículo: ${itemSeleccionado.nombre}\nID/Serie: ${itemSeleccionado.numSerie || itemSeleccionado.id || "N/A"}\nEstado: ${itemSeleccionado.estado}\nCantidad: ${itemSeleccionado.cantidad}\nDescripción: ${itemSeleccionado.descripcion || "N/A"}`;
        window.open(`mailto:?subject=Detalle de Inventario: ${itemSeleccionado.nombre}&body=${encodeURIComponent(texto)}`);
    };

    const exportarPDF = () => {
        window.print();
    };

    const puedeEditar = rolUsuario === "superadmin" || rolUsuario === "administrador general";

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans print:bg-white">

            <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10 print:hidden">
                <button
                    onClick={() => {
                        if (vistaActual === "detalle") setVistaActual("lista");
                        else if (vistaActual === "formulario") setVistaActual("detalle");
                        else if (vistaActual === "lista") setVistaActual("categorias");
                        else router.push("/dashboard");
                    }}
                    className="text-[#C62828] font-bold text-xl"
                >
                    ←
                </button>
                <h1 className="text-[#C62828] font-bold text-lg tracking-wide uppercase">
                    {vistaActual === "categorias" ? "SELECCIONE UBICACIÓN" :
                        vistaActual === "formulario" ? "EDITAR ARTÍCULO" :
                            categoriaSeleccionada === "Todo" ? "TODO EL INVENTARIO" : `INVENTARIO: ${categoriaSeleccionada}`}
                </h1>
            </header>

            <main className="p-4 max-w-xl mx-auto flex flex-col gap-4">

                {cargando ? (
                    <p className="text-center text-gray-500 mt-10">Cargando inventario...</p>
                ) : vistaActual === "categorias" ? (

                    <div className="flex flex-col gap-3 mt-2">
                        <button onClick={() => abrirCategoria("Ambulancia CR-237")} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-sm uppercase shadow-sm flex justify-center items-center gap-2 hover:bg-red-800 transition">🚑 AMBULANCIA CR-237</button>
                        <button onClick={() => abrirCategoria("Ambulancia CR-55")} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-sm uppercase shadow-sm flex justify-center items-center gap-2 hover:bg-red-800 transition">🚑 AMBULANCIA CR-55</button>
                        <button onClick={() => abrirCategoria("Ambulancia CR-4")} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-sm uppercase shadow-sm flex justify-center items-center gap-2 hover:bg-red-800 transition">🚑 AMBULANCIA CR-4</button>
                        <button onClick={() => abrirCategoria("Equipo de Rescate")} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-sm uppercase shadow-sm flex justify-center items-center gap-2 hover:bg-red-800 transition">🩸 EQUIPO DE RESCATE</button>
                        <button onClick={() => abrirCategoria("Clínica")} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-sm uppercase shadow-sm flex justify-center items-center gap-2 hover:bg-red-800 transition">🏥 CLÍNICA</button>
                        <button onClick={() => abrirCategoria("Bodega")} className="w-full bg-[#C62828] text-white py-4 rounded-lg font-bold text-sm uppercase shadow-sm flex justify-center items-center gap-2 hover:bg-red-800 transition">📦 BODEGA</button>
                        <div className="mt-4">
                            <button onClick={() => abrirCategoria("Todo")} className="w-full bg-gray-600 text-white py-4 rounded-lg font-bold text-sm uppercase shadow-sm hover:bg-gray-700 transition">VER TODO EL INVENTARIO</button>
                        </div>
                    </div>

                ) : vistaActual === "lista" ? (

                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por Nombre o ID"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C62828] bg-white shadow-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            {itemsFiltrados.length === 0 ? (
                                <p className="text-center text-gray-500 mt-6">No se encontraron artículos.</p>
                            ) : (
                                itemsFiltrados.map((item) => (
                                    <div
                                        key={item.firebaseId}
                                        onClick={() => abrirDetalle(item)}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 flex overflow-hidden p-2 items-center gap-4 cursor-pointer hover:shadow-md transition"
                                    >
                                        <div className="w-20 h-20 shrink-0 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {item.fotoUrl ? (
                                                <img src={item.fotoUrl} alt={item.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-gray-400 text-3xl">🖼️</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-center flex-1 py-1">
                                            <h3 className="font-bold text-gray-900 text-md leading-tight mb-1">{item.nombre || "Sin Nombre"}</h3>
                                            <p className={`text-sm font-semibold mb-1 ${getColorEstado(item.estado)}`}>
                                                {item.estado || "Estado desconocido"}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Cant: {item.cantidad || 0} | {item.color || "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                ) : vistaActual === "detalle" && itemSeleccionado ? (

                    /* ==============================
                       VISTA 3: DETALLE DEL ARTÍCULO
                    ============================== */
                    <div className="bg-white rounded-xl overflow-hidden print:shadow-none">

                        {itemSeleccionado.fotoUrl && (
                            <div className="w-full h-64 bg-gray-200 flex justify-center items-center">
                                <img src={itemSeleccionado.fotoUrl} alt={itemSeleccionado.nombre} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="p-5 flex flex-col gap-3 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-[#C62828] mb-2">{itemSeleccionado.nombre}</h2>

                            <p className="text-sm text-gray-600">Serie/ID: {itemSeleccionado.numSerie || itemSeleccionado.id || "N/A"}</p>
                            <p className="text-sm text-gray-600">Revisión: {itemSeleccionado.fechaRevision || "N/A"}</p>
                            <p className={`text-sm font-semibold ${getColorEstado(itemSeleccionado.estado)}`}>Estado: {itemSeleccionado.estado}</p>
                            <p className="text-sm text-gray-600">Color: {itemSeleccionado.color || "N/A"}</p>

                            <div className="mt-2">
                                <p className="text-xs font-bold text-gray-800 mb-1">Descripción:</p>
                                <div className="bg-white border border-gray-200 p-3 text-sm text-gray-600 rounded">
                                    {itemSeleccionado.descripcion || "Sin descripción."}
                                </div>
                            </div>

                            <p className="text-[#1976D2] font-bold text-lg mt-2">Cantidad: {itemSeleccionado.cantidad}</p>
                        </div>

                        {/* Botones de Acción (Ocultos al imprimir) */}
                        <div className="p-4 flex flex-col gap-3 print:hidden">
                            {/* Fila 1: Opciones de Compartir (Todos pueden ver esto) */}
                            <div className="flex gap-2">
                                <button onClick={compartirWhatsApp} className="flex-1 bg-[#25D366] text-white py-3 rounded font-bold text-xs uppercase hover:bg-green-600 transition shadow">
                                    WHATSAPP
                                </button>
                                <button onClick={compartirCorreo} className="flex-1 bg-blue-600 text-white py-3 rounded font-bold text-xs uppercase hover:bg-blue-700 transition shadow">
                                    CORREO
                                </button>
                                <button onClick={exportarPDF} className="flex-1 bg-gray-800 text-white py-3 rounded font-bold text-xs uppercase hover:bg-gray-900 transition shadow">
                                    PDF
                                </button>
                            </div>

                            {/*  Editar y Eliminar */}
                            {puedeEditar && (
                                <div className="flex gap-2 mt-2">
                                    <button onClick={habilitarEdicion} className="flex-1 bg-[#B71C1C] text-white py-3 rounded font-bold text-sm uppercase hover:bg-red-900 transition shadow">
                                        EDITAR
                                    </button>
                                    <button onClick={eliminarItem} className="flex-1 bg-red-600 text-white py-3 rounded font-bold text-sm uppercase hover:bg-red-700 transition shadow">
                                        ELIMINAR
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                ) : vistaActual === "formulario" && itemSeleccionado ? (

                    /* 
                 EDICIÓN DEL ARTÍCULO
                     */
                    <form onSubmit={handleActualizar} className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-4 border border-gray-200">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Nombre del Artículo</label>
                            <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Serie / ID</label>
                                <input type="text" value={formData.numSerie} onChange={(e) => setFormData({ ...formData, numSerie: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Cantidad</label>
                                <input type="number" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Estado</label>
                                <input type="text" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} placeholder="Ej: Buen Estado" className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Color</label>
                                <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Descripción</label>
                            <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows={3} className="w-full p-3 border border-gray-300 rounded-lg resize-none"></textarea>
                        </div>

                        <button type="submit" className="w-full bg-[#1976D2] text-white py-4 rounded-lg font-bold text-sm uppercase hover:bg-blue-800 transition mt-2 shadow">
                            ACTUALIZAR REGISTRO
                        </button>
                    </form>

                ) : null}
            </main>
        </div>
    );
}