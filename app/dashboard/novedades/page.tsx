"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NovedadesPage() {
    const router = useRouter();
    const [novedades, setNovedades] = useState<any[]>([]);
    const [cargando, setCargando] = useState(false);

    // Usuario activo
    const [usuarioActivo, setUsuarioActivo] = useState<any>(null);

    // Formulario
    const [titulo, setTitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [foto, setFoto] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Referencia para evitar notificaciones al cargar la página por primera vez
    const cargaInicial = useRef(true);

    // 1. Cargar datos del usuario logueado
    useEffect(() => {
        const carnetGuardado = localStorage.getItem("carnetUsuario");
        if (carnetGuardado) {
            getDoc(doc(db, "usuarios", carnetGuardado)).then(snap => {
                if (snap.exists()) {
                    setUsuarioActivo({ carnet: carnetGuardado, ...snap.data() });
                }
            });
        }

        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    // 2. Cargar novedades 
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "novedades"), (snapshot) => {

            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    if (!cargaInicial.current && Notification.permission === "granted") {
                        const data = change.doc.data();
                        if (usuarioActivo && data.autor !== usuarioActivo.carnet && data.carnetAutor !== usuarioActivo.carnet) {
                            new Notification("Nueva Novedad 🚨", {
                                body: data.titulo,
                                icon: "/logo.jpg"
                            });
                        }
                    }
                }
            });

            // CORRECCIÓN CLAVE: El id real de Firebase se pone AL FINAL para que no sea sobreescrito por el id: "" de la base de datos
            const listaCompleta = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            // ORDENAMIENTO ESTRICTO CON JAVASCRIPT
            listaCompleta.sort((a, b) => {
                let timeA = a.timestamp || 0;
                let timeB = b.timestamp || 0;

                if (!timeA && a.fecha) {
                    const partes = a.fecha.split(/[\s/:]+/);
                    if (partes.length >= 5) {
                        timeA = new Date(partes[2], partes[1] - 1, partes[0], partes[3], partes[4]).getTime();
                    }
                }

                if (!timeB && b.fecha) {
                    const partes = b.fecha.split(/[\s/:]+/);
                    if (partes.length >= 5) {
                        timeB = new Date(partes[2], partes[1] - 1, partes[0], partes[3], partes[4]).getTime();
                    }
                }

                return timeB - timeA;
            });

            setNovedades(listaCompleta);
            cargaInicial.current = false;
        });

        return () => unsubscribe();
    }, [usuarioActivo]);

    // 3. Función para publicar
    const handlePublicar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo || !descripcion || !usuarioActivo) return;

        setCargando(true);
        try {
            let fotoUrl = "";

            if (foto) {
                const storage = getStorage();
                const nombreArchivo = `${Date.now()}_${foto.name}`;
                const storageRef = ref(storage, `novedades/${nombreArchivo}`);
                await uploadBytes(storageRef, foto);
                fotoUrl = await getDownloadURL(storageRef);
            }

            await addDoc(collection(db, "novedades"), {
                autor: usuarioActivo.carnet,
                autorNombre: usuarioActivo.nombre,
                carnetAutor: usuarioActivo.carnet,
                descripcion: descripcion,
                fecha: new Date().toLocaleString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                fotoUrl: fotoUrl,
                id: "",
                timestamp: Date.now(),
                titulo: titulo
            });

            setTitulo("");
            setDescripcion("");
            setFoto(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

        } catch (error) {
            console.error("Error al publicar:", error);
            alert("Error al subir la novedad. Verifica tu conexión.");
        }
        setCargando(false);
    };

    // 4. Función para eliminar 
    const eliminarNovedad = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar esta publicación?")) {
            await deleteDoc(doc(db, "novedades", id));
        }
    };

    const compartirNovedad = (post: any) => {
        const texto = `*${post.titulo}*\n${post.descripcion}`;
        if (navigator.share) {
            navigator.share({ title: post.titulo, text: texto }).catch(console.error);
        } else {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans">
            <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => router.push("/dashboard")} className="text-[#C62828] font-bold text-xl">
                    ←
                </button>
                <h1 className="text-[#C62828] font-bold text-lg tracking-wide uppercase">
                    MURO DE NOVEDADES
                </h1>
            </header>

            <main className="p-4 max-w-xl mx-auto flex flex-col gap-6">

                <form onSubmit={handlePublicar} className="bg-white border-2 border-[#C62828] rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <input
                        type="text"
                        placeholder="Título / Asunto"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C62828]"
                    />
                    <textarea
                        placeholder="¿Qué está pasando?"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        required
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-[#C62828]"
                    />

                    {foto && <p className="text-xs text-green-600 font-bold">📷 Imagen seleccionada: {foto.name}</p>}

                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => setFoto(e.target.files ? e.target.files[0] : null)}
                        className="hidden"
                    />

                    <div className="flex gap-3 mt-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#546E7A] text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-gray-700 transition"
                        >
                            FOTO
                        </button>
                        <button
                            type="submit"
                            disabled={cargando}
                            className="flex-1 bg-[#C62828] text-white py-3 rounded-lg font-bold text-sm hover:bg-red-800 transition shadow"
                        >
                            {cargando ? "PUBLICANDO..." : "PUBLICAR"}
                        </button>
                    </div>
                </form>

                <div className="flex flex-col gap-4">
                    {novedades.length === 0 ? (
                        <p className="text-center text-gray-500 mt-4">No hay novedades aún.</p>
                    ) : (
                        // CORRECCIÓN CLAVE 2: Agregamos index como plan B de seguridad para la llave (key)
                        novedades.map((post, index) => {
                            const rol = usuarioActivo?.rol?.toLowerCase() || "";
                            const esDueño = usuarioActivo?.carnet === post.carnetAutor || usuarioActivo?.carnet === post.autor;
                            const puedeBorrar = rol === "superadmin" || esDueño;

                            return (
                                <div key={post.id || index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                                    <div className="p-4">
                                        <h3 className="font-bold text-[#C62828] text-lg uppercase mb-2">{post.titulo}</h3>
                                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{post.descripcion}</p>
                                    </div>

                                    {post.fotoUrl && (
                                        <div className="w-full bg-gray-100 border-y border-gray-200 flex justify-center p-2">
                                            <img src={post.fotoUrl} alt="Novedad" className="max-h-64 object-contain rounded" />
                                        </div>
                                    )}

                                    <div className="p-4 flex items-center justify-between text-[11px] text-gray-500 bg-gray-50">
                                        <p>Por: {post.autorNombre || post.autor || post.carnetAutor || "Sistema"} | {post.fecha}</p>

                                        <div className="flex gap-4 items-center">
                                            {puedeBorrar && (
                                                <button onClick={() => eliminarNovedad(post.id)} className="text-gray-400 hover:text-red-600 transition" title="Eliminar">
                                                    🗑️
                                                </button>
                                            )}
                                            <button onClick={() => compartirNovedad(post)} className="text-gray-400 hover:text-blue-600 transition" title="Compartir">
                                                🔗
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}