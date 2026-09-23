"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, addDoc, onSnapshot, doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";

export default function BitacoraPage() {
    const router = useRouter();
    const [atenciones, setAtenciones] = useState<any[]>([]);
    const [vistaActual, setVistaActual] = useState<"lista" | "formulario" | "detalle">("lista");
    const [atencionSeleccionada, setAtencionSeleccionada] = useState<any>(null);
    const [cargando, setCargando] = useState(false);
    const [rolUsuario, setRolUsuario] = useState("voluntario");
    const [editandoId, setEditandoId] = useState<string | null>(null);

    // NUEVO: Estados dinámicos para múltiples pacientes
    const [cantidadPacientes, setCantidadPacientes] = useState(1);
    const [pacientes, setPacientes] = useState([{ nombre: "", edad: "" }]);

    // Estado para los datos generales del viaje
    const estadoInicialViaje = {
        categoria: "Atención Médica",
        unidad: "CR-55",
        tipoEmergencia: "",
        destino: "",
        horaSalida: "",
        horaEntrada: "",
        kmSalida: "",
        kmEntrada: "",
        motorista: "",
        personalAPH: ""
    };
    const [formData, setFormData] = useState(estadoInicialViaje);

    // 1. Cargar el rol del usuario actual
    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (carnetGuardado) {
            getDoc(doc(db, "usuarios", carnetGuardado)).then(snap => {
                if (snap.exists()) {
                    setRolUsuario(snap.data().rol?.toLowerCase() || "voluntario");
                }
            });
        }
    }, []);

    // 2. Cargar historial
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "bitacora_atenciones"), (snapshot) => {
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setAtenciones(lista);
        });
        return () => unsubscribe();
    }, []);

    // 3. Autocompletar Kilometraje SOLO si es un NUEVO registro
    useEffect(() => {
        if (vistaActual === "formulario" && !editandoId) {
            const ultimaAtencion = atenciones.find(a => a.vehiculo === formData.unidad);
            if (ultimaAtencion && ultimaAtencion.kmEntrada) {
                setFormData(prev => ({ ...prev, kmSalida: ultimaAtencion.kmEntrada }));
            } else {
                setFormData(prev => ({ ...prev, kmSalida: "" }));
            }
        }
    }, [formData.unidad, vistaActual, editandoId, atenciones]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // NUEVO: Función para manejar el cambio de cantidad de pacientes
    const handleCantidadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cantidad = parseInt(e.target.value.replace(/\D/g, '')) || 1;
        setCantidadPacientes(cantidad);

        setPacientes(prevPacientes => {
            const nuevosPacientes = [...prevPacientes];
            while (nuevosPacientes.length < cantidad) {
                nuevosPacientes.push({ nombre: "", edad: "" });
            }
            return nuevosPacientes.slice(0, cantidad);
        });
    };

    // --- FUNCIÓN PARA LLENAR EL FORMULARIO EN MODO EDICIÓN ---
    const habilitarEdicion = () => {
        // Intentar separar el string consolidado de pacientes si es posible
        let arregloPacientes = [{ nombre: atencionSeleccionada.pacientes || "", edad: "" }];
        setPacientes(arregloPacientes);
        setCantidadPacientes(1);

        setFormData({
            categoria: "Atención Médica",
            unidad: atencionSeleccionada.vehiculo || "CR-55",
            tipoEmergencia: atencionSeleccionada.tipoServicio || "",
            destino: atencionSeleccionada.lugar || "",
            horaSalida: atencionSeleccionada.horaSalida || "",
            horaEntrada: atencionSeleccionada.horaEntrada || "",
            kmSalida: atencionSeleccionada.kmSalida || "",
            kmEntrada: atencionSeleccionada.kmEntrada || "",
            motorista: atencionSeleccionada.motorista || "",
            personalAPH: atencionSeleccionada.personal || ""
        });

        setEditandoId(atencionSeleccionada.id);
        setVistaActual("formulario");
    };

    // --- FUNCIÓN PARA GUARDAR (NUEVO O EDITADO) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);
        try {
            // Consolidar pacientes en un solo string (ej: "Juan (23 años) | María (19 años)")
            const stringPacientes = pacientes
                .map(p => p.edad ? `${p.nombre} (${p.edad} años)` : p.nombre)
                .join(" | ");

            const datosGuardar = {
                horaEntrada: formData.horaEntrada,
                horaSalida: formData.horaSalida,
                kmEntrada: Number(formData.kmEntrada),
                kmRegreso: Number(formData.kmEntrada),
                kmSalida: Number(formData.kmSalida),
                lugar: formData.destino,
                motorista: formData.motorista,
                pacientes: stringPacientes, // Guardamos el string consolidado
                personal: formData.personalAPH,
                tipoServicio: formData.tipoEmergencia,
                vehiculo: formData.unidad
            };

            if (editandoId) {
                await updateDoc(doc(db, "bitacora_atenciones", editandoId), datosGuardar);
            } else {
                await addDoc(collection(db, "bitacora_atenciones"), {
                    ...datosGuardar,
                    fechaHora: new Date().toLocaleString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                    fecha: new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-"), // Para Cierre de Turno
                    fotoUrl: "",
                    timestamp: Date.now(),
                });
            }

            // Limpiar y regresar a la lista
            setVistaActual("lista");
            setEditandoId(null);
            setAtencionSeleccionada(null);
            setFormData(estadoInicialViaje);
            setPacientes([{ nombre: "", edad: "" }]);
            setCantidadPacientes(1);
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al guardar la atención.");
        }
        setCargando(false);
    };

    // --- OTRAS FUNCIONES ---
    const puedeEditar = rolUsuario === "superadmin" || rolUsuario === "administrador general";

    const eliminarRegistro = async () => {
        if (confirm("¿Estás seguro de que deseas eliminar permanentemente este registro?")) {
            await deleteDoc(doc(db, "bitacora_atenciones", atencionSeleccionada.id));
            setVistaActual("lista");
            setAtencionSeleccionada(null);
        }
    };

    const compartirWhatsApp = () => {
        const texto = `*REPORTE DE ATENCIÓN*\nFecha: ${atencionSeleccionada.fechaHora}\nUnidad: ${atencionSeleccionada.vehiculo}\nEmergencia: ${atencionSeleccionada.tipoServicio}\nPersonal: ${atencionSeleccionada.personal}\nPaciente: ${atencionSeleccionada.pacientes}\nLugar: ${atencionSeleccionada.lugar}\nKm Total: ${Number(atencionSeleccionada.kmEntrada) - Number(atencionSeleccionada.kmSalida)}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
    };

    const exportarPDF = () => window.print();

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans print:bg-white">
            <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10 print:hidden">
                <button
                    onClick={() => {
                        if (vistaActual !== "lista") {
                            setVistaActual("lista");
                            setEditandoId(null);
                        } else {
                            router.push("/dashboard");
                        }
                    }}
                    className="text-[#C62828] font-bold text-xl"
                >
                    ←
                </button>
                <h1 className="text-[#C62828] font-bold text-lg tracking-wide uppercase">
                    {vistaActual === "lista" ? "HISTORIAL DE ATENCIONES" : vistaActual === "formulario" ? (editandoId ? "EDITAR ATENCIÓN" : "NUEVA ATENCIÓN") : "DETALLE DE REPORTE"}
                </h1>
            </header>

            <main className="p-4 max-w-2xl mx-auto">
                {/* VISTA 1: LISTA DE HISTORIAL */}
                {vistaActual === "lista" && (
                    <div className="flex flex-col gap-4">
                        {atenciones.length === 0 ? (
                            <p className="text-center text-gray-500 mt-10">Cargando atenciones...</p>
                        ) : (
                            atenciones.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => { setAtencionSeleccionada(item); setVistaActual("detalle"); }}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[#C62828] font-bold text-sm">{item.fechaHora || "Fecha reciente"}</span>
                                        <span className="text-black font-bold text-sm">{item.vehiculo || "Sin unidad"}</span>
                                    </div>
                                    <h3 className="font-bold text-black text-md mb-1">{item.tipoServicio || "Atención"}</h3>
                                    <p className="text-gray-600 text-sm truncate">Paciente: {item.pacientes || "No especificado"}</p>
                                    <p className="text-gray-600 text-sm truncate">Destino: {item.lugar || "No especificado"}</p>
                                </div>
                            ))
                        )}

                        <button
                            onClick={() => {
                                setEditandoId(null);
                                setFormData(estadoInicialViaje);
                                setPacientes([{ nombre: "", edad: "" }]);
                                setCantidadPacientes(1);
                                setVistaActual("formulario");
                            }}
                            className="fixed bottom-6 right-6 bg-[#C62828] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-red-800 transition z-20"
                        >
                            +
                        </button>
                    </div>
                )}

                {/* VISTA 2: DETALLE DEL REPORTE */}
                {vistaActual === "detalle" && atencionSeleccionada && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:border-none print:shadow-none">
                        <div className="p-4 border-b border-gray-200 flex justify-between">
                            <div>
                                <p className="text-[10px] text-[#C62828] font-bold uppercase tracking-wider">Fecha</p>
                                <p className="font-bold text-gray-800">{atencionSeleccionada.fechaHora}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-[#C62828] font-bold uppercase tracking-wider">Unidad</p>
                                <p className="font-bold text-gray-800">{atencionSeleccionada.vehiculo}</p>
                            </div>
                        </div>
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <p className="text-[10px] text-[#C62828] font-bold uppercase tracking-wider">Tipo de Emergencia:</p>
                            <p className="font-bold text-gray-800 text-lg">{atencionSeleccionada.tipoServicio}</p>
                        </div>

                        <div className="p-4">
                            <h3 className="bg-gray-100 text-gray-500 text-xs font-bold p-2 mb-3">PERSONAL A CARGO</h3>
                            <div className="border border-gray-200 rounded p-3 mb-4">
                                <p className="text-[10px] font-bold text-gray-800 mb-1">MOTORISTA:</p>
                                <p className="text-gray-600 text-sm mb-3">{atencionSeleccionada.motorista}</p>
                                <p className="text-[10px] font-bold text-gray-800 mb-1">PERSONAL APH:</p>
                                <p className="text-gray-600 text-sm">{atencionSeleccionada.personal}</p>
                            </div>

                            <h3 className="bg-gray-100 text-gray-500 text-xs font-bold p-2 mb-3">DATOS DEL PACIENTE</h3>
                            <div className="border border-gray-200 rounded p-3 mb-4">
                                <p className="text-[10px] font-bold text-gray-800 mb-1">NOMBRE(S) Y EDAD:</p>
                                <p className="text-gray-600 text-sm mb-3">{atencionSeleccionada.pacientes}</p>
                            </div>

                            <h3 className="bg-gray-100 text-gray-500 text-xs font-bold p-2 mb-3">LUGAR / DESTINO</h3>
                            <div className="border border-gray-200 rounded p-3 mb-4">
                                <p className="text-gray-600 text-sm">{atencionSeleccionada.lugar}</p>
                            </div>

                            <h3 className="bg-gray-100 text-[#C62828] text-xs font-bold p-2 mb-3">TIEMPOS Y KILOMETRAJE</h3>
                            <div className="border border-gray-200 rounded p-3 mb-6">
                                <div className="flex justify-between mb-3 border-b pb-2">
                                    <div><p className="text-[10px] text-gray-500">Hora Salida</p><p className="font-bold text-sm">{atencionSeleccionada.horaSalida}</p></div>
                                    <div className="text-right"><p className="text-[10px] text-gray-500">Km Salida</p><p className="font-bold text-sm">{atencionSeleccionada.kmSalida}</p></div>
                                </div>
                                <div className="flex justify-between mb-4">
                                    <div><p className="text-[10px] text-gray-500">Hora Entrada</p><p className="font-bold text-sm">{atencionSeleccionada.horaEntrada}</p></div>
                                    <div className="text-right"><p className="text-[10px] text-gray-500">Km Entrada</p><p className="font-bold text-sm">{atencionSeleccionada.kmEntrada}</p></div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 print:hidden">
                                <div className="flex gap-2">
                                    <button onClick={exportarPDF} className="flex-1 bg-gray-800 text-white py-3 rounded font-bold text-xs hover:bg-gray-900 transition shadow">PDF</button>
                                    <button onClick={compartirWhatsApp} className="flex-1 bg-[#25D366] text-white py-3 rounded font-bold text-xs hover:bg-green-600 transition shadow">WHATSAPP</button>
                                </div>
                                {puedeEditar && (
                                    <>
                                        <button onClick={habilitarEdicion} className="w-full bg-[#1976D2] text-white py-4 rounded font-bold text-sm hover:bg-blue-800 transition shadow mt-2">HABILITAR EDICIÓN</button>
                                        <button onClick={eliminarRegistro} className="w-full bg-[#D32F2F] text-white py-4 rounded font-bold text-sm hover:bg-red-800 transition shadow">ELIMINAR REGISTRO</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA 3: FORMULARIO */}
                {vistaActual === "formulario" && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="font-bold text-sm block mb-1">Unidad / Vehículo:</label>
                                <select name="unidad" value={formData.unidad} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg bg-transparent">
                                    <option value="CR-237">CR-237</option>
                                    <option value="CR-55">CR-55</option>
                                    <option value="CR-4">CR-4</option>
                                    <option value="Vehículo Particular">Vehículo Particular</option>
                                    <option value="Ninguno (En Seccional)">Ninguno (En Seccional)</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-bold text-sm block mb-1">Tipo de Emergencia:</label>
                                <select name="tipoEmergencia" value={formData.tipoEmergencia} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg">
                                    <option value="">Seleccione el tipo...</option>
                                    <option value="Accidente de Tránsito">Accidente de Tránsito</option>
                                    <option value="Enfermedad Común">Enfermedad Común</option>
                                    <option value="Herida por Arma / Cortante">Herida por Arma / Cortante</option>
                                    <option value="Quemaduras">Quemaduras</option>
                                    <option value="Traumatismo / Fractura">Traumatismo / Fractura</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-bold text-sm block mb-1">Cantidad de Pacientes:</label>
                                <select value={`${cantidadPacientes} Pacientes`} onChange={handleCantidadChange} className="w-full p-3 border border-gray-300 rounded-lg">
                                    <option value="1 Pacientes">1 Paciente</option>
                                    <option value="2 Pacientes">2 Pacientes</option>
                                    <option value="3 Pacientes">3 Pacientes</option>
                                    <option value="4 Pacientes">4 Pacientes</option>
                                    <option value="5 Pacientes">5 Pacientes</option>
                                </select>
                            </div>
                        </div>

                        {/* RENDERIZADO DINÁMICO DE PACIENTES */}
                        {pacientes.map((paciente, index) => (
                            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                <h3 className="font-bold text-[#C62828] text-sm mb-3 uppercase">Paciente {index + 1}</h3>
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nombre Completo"
                                        value={paciente.nombre}
                                        onChange={(e) => {
                                            const nuevos = [...pacientes];
                                            nuevos[index].nombre = e.target.value;
                                            setPacientes(nuevos);
                                        }}
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Edad"
                                        value={paciente.edad}
                                        onChange={(e) => {
                                            const nuevos = [...pacientes];
                                            nuevos[index].edad = e.target.value;
                                            setPacientes(nuevos);
                                        }}
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="flex flex-col gap-3">
                            <input type="text" name="destino" placeholder="Lugar / Destino" value={formData.destino} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" name="horaSalida" placeholder="Hora Salida (Ej: 14:00)" value={formData.horaSalida} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
                                <input type="text" name="horaEntrada" placeholder="Hora Entrada (Ej: 15:30)" value={formData.horaEntrada} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <span className="absolute -top-2 left-3 bg-[#F8F9FA] px-1 text-[10px] text-[#C62828]">Km Salida</span>
                                    <input type="number" step="0.1" name="kmSalida" value={formData.kmSalida} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
                                </div>
                                <div className="relative">
                                    <span className="absolute -top-2 left-3 bg-[#F8F9FA] px-1 text-[10px] text-[#C62828]">Km Entrada</span>
                                    <input type="number" step="0.1" name="kmEntrada" value={formData.kmEntrada} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="font-bold text-sm block mb-1">Motorista:</label>
                                <input type="text" name="motorista" placeholder="Nombre del motorista" value={formData.motorista} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="font-bold text-sm block mb-1">Personal APH:</label>
                                <input type="text" name="personalAPH" placeholder="Separe con comas (Ej: Kevin, Henry)" value={formData.personalAPH} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                        </div>

                        <button type="submit" disabled={cargando} className="w-full bg-[#1976D2] text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-800 transition mt-4 shadow-md">
                            {cargando ? "GUARDANDO..." : (editandoId ? "ACTUALIZAR REGISTRO" : "GUARDAR ATENCIÓN")}
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}