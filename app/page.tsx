"use client";

import { useState } from "react";
// 1. Importamos las funciones de Firebase
import { signInWithEmailAndPassword } from "firebase/auth";
// Asegúrate de que la ruta apunte correctamente a donde creaste tu archivo firebase.ts
// Si lo creaste fuera de la carpeta app, usa "../firebase". Si está adentro, usa "./firebase"
import { auth } from "../firebase";

export default function Login() {
  const [carnet, setCarnet] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 2. Función que se ejecuta al presionar el botón
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Limpiamos errores previos

    try {
      // Transformamos el carnet en un formato de correo válido para Firebase
      const emailFormateado = `${carnet.toLowerCase()}@cruzroja.sv`;

      // Intentamos iniciar sesión
      await signInWithEmailAndPassword(auth, emailFormateado, password);

      // Si funciona, mostramos una alerta temporal (luego haremos que cambie de página)
      alert("¡Inicio de sesión exitoso! Bienvenido al sistema.");

    } catch (error: any) {
      // Si falla, mostramos el error en pantalla
      setError("Credenciales incorrectas. Verifique su carnet y contraseña.");
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans">

      {/* --- COLUMNA IZQUIERDA (Fondo Rojo) --- */}
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

      {/* --- COLUMNA DERECHA (Formulario Blanco) --- */}
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

          {/* 3. Conectamos el formulario con la función handleLogin */}
          <form className="space-y-8" onSubmit={handleLogin}>

            {/* Mensaje de Error dinámico */}
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
                className="w-full border-b border-gray-300 px-1 py-2 text-gray-700 focus:outline-none focus:border-[#C62828] transition-colors bg-transparent placeholder-gray-300 uppercase"
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