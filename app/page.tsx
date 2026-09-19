"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// Importamos la base de datos (db) que acabamos de exportar en el paso 1
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const [carnet, setCarnet] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // 1. Buscamos el documento en la colección "usuarios" usando el carnet que se escribió
      const docRef = doc(db, "usuarios", carnet.trim());
      const docSnap = await getDoc(docRef);

      // 2. Verificamos si el carnet existe en la base de datos
      if (docSnap.exists()) {
        const userData = docSnap.data();

        // 3. Comparamos la contraseña escrita con la que está guardada en Firestore
        if (userData.password === password) {

          // ---> AQUÍ ESTÁ LA LÍNEA NUEVA <---
          // Guardamos el carnet en la memoria del navegador para que el Dashboard lo lea
          localStorage.setItem("carnetUsuario", carnet.trim());

          // Si es correcta, lo mandamos al panel de control
          router.push("/dashboard");
        } else {
          setError("Contraseña incorrecta.");
        }
      } else {
        setError("El número de carnet no está registrado.");
      }
    } catch (err) {
      console.error(err);
      setError("Error al conectar con la base de datos.");
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans">

      {/* --- COLUMNA IZQUIERDA --- */}
      <div className="hidden md:flex w-1/2 bg-[#C62828] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>

        <div className="relative z-10 w-64 h-64 flex items-center justify-center">
          <img
            src="/logo.jpg"
            alt="Logo Cruz Roja Salvadoreña"
            className="w-full h-full object-contain drop-shadow-2xl rounded-full"
          />
        </div>
      </div>

      {/* --- COLUMNA DERECHA formarto en blanco para manejo de información --- */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">

          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-[#C62828] tracking-[0.2em]">
              CONTROL
            </h1>
            <h2 className="text-2xl font-light text-[#C62828] tracking-[0.1em] mt-1">
              OPERATIVO
            </h2>
            <div className="w-12 h-[2px] bg-red-300 mx-auto mt-6"></div>
          </div>

          <form className="space-y-8" onSubmit={handleLogin}>

            {/* Mensaje de Error (solo aparece si hay error de digitacion por CAPA 8 no por erroes de informacion) */}
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 text-sm" role="alert">
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Número de Carnet
              </label>
              <input
                type="text"
                required
                placeholder="Ej. 133171"
                className="w-full border-b border-gray-300 px-1 py-2 text-gray-700 focus:outline-none focus:border-[#C62828] transition-colors bg-transparent placeholder-gray-300"
                value={carnet}
                onChange={(e) => setCarnet(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full border-b border-gray-300 px-1 py-2 text-gray-700 focus:outline-none focus:border-[#C62828] transition-colors bg-transparent placeholder-gray-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#C62828] text-white font-bold py-4 px-4 hover:bg-red-800 transition-colors tracking-widest text-sm mt-4 shadow-md"
            >
              INICIAR SESIÓN
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}