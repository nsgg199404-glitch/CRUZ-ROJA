"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GuiaMedicaPage() {
    const router = useRouter();
    const [guiaSeleccionada, setGuiaSeleccionada] = useState<string | null>(null);

    const protocolos: Record<string, any> = {
        abcde: {
            titulo: "PROTOCOLO DE ATENCIÓN PREHOSPITALARIA (ABCDE)",
            contenido: (
                <div className="flex flex-col gap-8 text-gray-800">
                    <section>
                        <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-[#8B0000]">OBJETIVO DEL PROTOCOLO</h2>
                        <p className="text-sm leading-relaxed text-gray-700">
                            Establecer una evaluación primaria sistemática para identificar y tratar lesiones que amenazan la vida de forma inmediata. Todo el personal APH debe seguir esta secuencia sin omitir pasos.
                        </p>
                    </section>

                    <section className="flex flex-col gap-6">
                        {/* A. VÍA AÉREA */}
                        <div className="bg-gray-50 border-l-4 border-[#8B0000] p-5">
                            <h3 className="font-bold text-lg mb-2">A. Vía Aérea con Control Cervical</h3>
                            <p className="text-sm text-gray-700 mb-4">
                                <strong>Paso 1:</strong> El rescatista 1 (cabeza) estabiliza la columna cervical manualmente en posición neutra. <br />
                                <strong>Paso 2:</strong> Evaluar permeabilidad de la vía aérea (¿El paciente habla?). <br />
                                <strong>Paso 3:</strong> Maniobra de tracción mandibular o elevación del mentón (según sospecha de trauma).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="flex flex-col items-center bg-white p-2 border border-gray-200 shadow-sm rounded">
                                    <img src="/CERVICAL1.jpeg" alt="Estabilización Cervical Prona" className="w-full h-48 object-cover rounded" />
                                    <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center mt-2 font-semibold">
                                        Fig 1. Estabilización cervical manual (Posición Prona). Rescatista 1 en cabeza.
                                    </span>
                                </div>
                                <div className="flex flex-col items-center bg-white p-2 border border-gray-200 shadow-sm rounded">
                                    <img src="/CERVICAL 2.jpeg" alt="Estabilización Cervical Arrodillado" className="w-full h-48 object-cover rounded" />
                                    <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center mt-2 font-semibold">
                                        Fig 2. Estabilización cervical manual (Arrodillado). Abordaje con equipo de apoyo.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* B. VENTILACIÓN */}
                        <div className="bg-gray-50 border-l-4 border-blue-800 p-5">
                            <h3 className="font-bold text-lg mb-2">B. Ventilación y Oxigenación (Breathing)</h3>
                            <p className="text-sm text-gray-700 mb-4">
                                <strong>Paso 1:</strong> Exponer el tórax para observar expansión bilateral. <br />
                                <strong>Paso 2:</strong> Auscultar campos pulmonares (ápices y bases). <br />
                                <strong>Paso 3:</strong> Administrar oxigenoterapia suplementaria si SpO2 es menor al 94% o hay signos de dificultad respiratoria.
                            </p>

                            <div className="flex flex-col items-center bg-white p-2 border border-gray-200 shadow-sm rounded mt-4 w-full md:w-2/3 mx-auto">
                                <img src="/B.jpg" alt="Ventilación BVM" className="w-full h-auto object-cover rounded" />
                                <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center mt-2 font-semibold">
                                    Fig 3. Técnica de ventilación a presión positiva con dispositivo BVM (Bolsa-Válvula-Mascarilla).
                                </span>
                            </div>
                        </div>

                        {/* C. CIRCULACIÓN */}
                        <div className="bg-gray-50 border-l-4 border-red-600 p-5">
                            <h3 className="font-bold text-lg mb-2">C. Circulación y Control de Hemorragias</h3>
                            <p className="text-sm text-gray-700 mb-4">
                                <strong>Paso 1:</strong> Identificar y controlar hemorragias exanguinantes (uso de torniquete o empaquetamiento). <br />
                                <strong>Paso 2:</strong> Evaluar pulsos periféricos y centrales (frecuencia, amplitud, ritmo). <br />
                                <strong>Paso 3:</strong> Evaluar perfusión (llenado capilar menor a 2 segundos, coloración y temperatura de la piel).
                            </p>
                        </div>

                        {/* D. DÉFICIT NEUROLÓGICO */}
                        <div className="bg-gray-50 border-l-4 border-yellow-600 p-5">
                            <h3 className="font-bold text-lg mb-2">D. Déficit Neurológico</h3>
                            <p className="text-sm text-gray-700 mb-4">
                                <strong>Paso 1:</strong> Evaluar nivel de consciencia mediante escala A.V.D.I. (Alerta, Verbal, Dolor, Inconsciente). <br />
                                <strong>Paso 2:</strong> Evaluación pupilar (PIRRL: Pupilas Iguales, Redondas, Reactivas a la Luz). <br />
                                <strong>Paso 3:</strong> Evaluar función motora y sensitiva en extremidades.
                            </p>
                        </div>

                        {/* E. EXPOSICIÓN */}
                        <div className="bg-gray-50 border-l-4 border-gray-600 p-5">
                            <h3 className="font-bold text-lg mb-2">E. Exposición y Control Ambiental</h3>
                            <p className="text-sm text-gray-700 mb-4">
                                <strong>Paso 1:</strong> Cortar prendas según necesidad para buscar lesiones ocultas. <br />
                                <strong>Paso 2:</strong> Cubrir inmediatamente al paciente con manta térmica para prevenir hipotermia.
                            </p>
                        </div>
                    </section>
                </div>
            )
        },
        vitales: {
            titulo: "PARÁMETROS FISIOLÓGICOS (SIGNOS VITALES)",
            contenido: (
                <div className="flex flex-col gap-6 text-gray-800">
                    <p className="text-sm text-gray-700 mb-2">Tablas de referencia clínica para la evaluación prehospitalaria, categorizadas por grupo etario.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse border border-gray-300">
                            <thead className="bg-gray-100 font-bold uppercase text-xs text-gray-700">
                                <tr>
                                    <th className="px-4 py-3 border border-gray-300">Signo Vital</th>
                                    <th className="px-4 py-3 border border-gray-300">Adulto (12+ años)</th>
                                    <th className="px-4 py-3 border border-gray-300">Niño (1 a 11 años)</th>
                                    <th className="px-4 py-3 border border-gray-300">Lactante (&lt; 1 año)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 border border-gray-300 font-semibold">Frecuencia Cardíaca (lpm)</td>
                                    <td className="px-4 py-3 border border-gray-300">60 - 100</td>
                                    <td className="px-4 py-3 border border-gray-300">80 - 120</td>
                                    <td className="px-4 py-3 border border-gray-300">100 - 160</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-4 py-3 border border-gray-300 font-semibold">Frecuencia Respiratoria (rpm)</td>
                                    <td className="px-4 py-3 border border-gray-300">12 - 20</td>
                                    <td className="px-4 py-3 border border-gray-300">20 - 30</td>
                                    <td className="px-4 py-3 border border-gray-300">30 - 60</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 border border-gray-300 font-semibold">Tensión Arterial Sistólica (mmHg)</td>
                                    <td className="px-4 py-3 border border-gray-300">90 - 120</td>
                                    <td className="px-4 py-3 border border-gray-300">80 - 110</td>
                                    <td className="px-4 py-3 border border-gray-300">70 - 90</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-4 py-3 border border-gray-300 font-semibold">Tensión Arterial Diastólica (mmHg)</td>
                                    <td className="px-4 py-3 border border-gray-300">60 - 80</td>
                                    <td className="px-4 py-3 border border-gray-300">50 - 80</td>
                                    <td className="px-4 py-3 border border-gray-300">50 - 70</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 border border-gray-300 font-semibold">Saturación Oxígeno (SpO2)</td>
                                    <td className="px-4 py-3 border border-gray-300">&gt; 94%</td>
                                    <td className="px-4 py-3 border border-gray-300">&gt; 94%</td>
                                    <td className="px-4 py-3 border border-gray-300">&gt; 94%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        },
        glasgow: {
            titulo: "ESCALA DE COMA DE GLASGOW (GCS)",
            contenido: (
                <div className="flex flex-col gap-6 text-gray-800">
                    <p className="text-sm text-gray-700">Herramienta estandarizada para la evaluación del nivel de consciencia. Puntaje máximo: 15. Puntaje mínimo: 3. Un puntaje ≤ 8 indica necesidad de intubación.</p>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="border border-gray-300 rounded shadow-sm">
                            <h3 className="bg-gray-100 font-bold p-3 border-b border-gray-300">A. APERTURA OCULAR</h3>
                            <ul className="text-sm divide-y divide-gray-200">
                                <li className="flex justify-between p-3"><span className="text-gray-700">Espontánea</span> <span className="font-bold">4</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">A la orden verbal</span> <span className="font-bold">3</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Al estímulo doloroso</span> <span className="font-bold">2</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Sin respuesta</span> <span className="font-bold">1</span></li>
                            </ul>
                        </div>
                        <div className="border border-gray-300 rounded shadow-sm">
                            <h3 className="bg-gray-100 font-bold p-3 border-b border-gray-300">B. RESPUESTA VERBAL</h3>
                            <ul className="text-sm divide-y divide-gray-200">
                                <li className="flex justify-between p-3"><span className="text-gray-700">Orientado y conversando</span> <span className="font-bold">5</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Desorientado y hablando</span> <span className="font-bold">4</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Palabras inapropiadas</span> <span className="font-bold">3</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Sonidos incomprensibles</span> <span className="font-bold">2</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Sin respuesta</span> <span className="font-bold">1</span></li>
                            </ul>
                        </div>
                        <div className="border border-gray-300 rounded shadow-sm">
                            <h3 className="bg-gray-100 font-bold p-3 border-b border-gray-300">C. RESPUESTA MOTORA</h3>
                            <ul className="text-sm divide-y divide-gray-200">
                                <li className="flex justify-between p-3"><span className="text-gray-700">Obedece órdenes verbales</span> <span className="font-bold">6</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Localiza el dolor</span> <span className="font-bold">5</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Retirada al dolor</span> <span className="font-bold">4</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Flexión anormal (Decorticación)</span> <span className="font-bold">3</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Extensión anormal (Descerebración)</span> <span className="font-bold">2</span></li>
                                <li className="flex justify-between p-3"><span className="text-gray-700">Sin respuesta</span> <span className="font-bold">1</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        quemaduras: {
            titulo: "EVALUACIÓN DE QUEMADURAS (REGLA DE LOS 9)",
            contenido: (
                <div className="flex flex-col gap-6 text-gray-800">
                    <p className="text-sm text-gray-700 mb-4">Método estandarizado para cuantificar la Superficie Corporal Quemada (SCQ) en adultos. Fundamental para el cálculo de reposición de fluidos (Fórmula de Parkland).</p>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-800">
                        <div className="border border-gray-300 p-4 rounded bg-white text-center flex flex-col justify-center shadow-sm">
                            <span className="font-bold text-lg mb-1">9%</span>
                            <span className="text-gray-600">Cabeza y Cuello (Total)</span>
                        </div>
                        <div className="border border-gray-300 p-4 rounded bg-white text-center flex flex-col justify-center shadow-sm">
                            <span className="font-bold text-lg mb-1">9% c/u</span>
                            <span className="text-gray-600">Extremidades Superiores</span>
                        </div>
                        <div className="border border-gray-300 p-4 rounded bg-white text-center flex flex-col justify-center shadow-sm">
                            <span className="font-bold text-lg mb-1">18%</span>
                            <span className="text-gray-600">Torso Anterior</span>
                        </div>
                        <div className="border border-gray-300 p-4 rounded bg-white text-center flex flex-col justify-center shadow-sm">
                            <span className="font-bold text-lg mb-1">18%</span>
                            <span className="text-gray-600">Torso Posterior</span>
                        </div>
                        <div className="border border-gray-300 p-4 rounded bg-white text-center flex flex-col justify-center shadow-sm">
                            <span className="font-bold text-lg mb-1">18% c/u</span>
                            <span className="text-gray-600">Extremidades Inferiores</span>
                        </div>
                        <div className="border border-gray-300 p-4 rounded bg-white text-center flex flex-col justify-center shadow-sm">
                            <span className="font-bold text-lg mb-1">1%</span>
                            <span className="text-gray-600">Zona Genital (Perineo)</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center bg-white p-2 border border-gray-200 shadow-sm rounded mt-6 w-full max-w-md mx-auto">
                        <img src="/REGLA DEL 9.jpg" alt="Regla de los 9 - MINSAL" className="w-full h-auto object-contain rounded" />
                        <span className="text-gray-500 text-[10px] uppercase tracking-wider text-center mt-2 font-semibold">
                            Esquema 1. Cuantificación de SCQ según lineamientos MINSAL.
                        </span>
                    </div>
                </div>
            )
        },
        triage: {
            titulo: "SISTEMA DE CLASIFICACIÓN TRIAGE (START)",
            contenido: (
                <div className="flex flex-col gap-4 text-gray-800">
                    <p className="text-sm text-gray-700 mb-2">Protocolo START (Simple Triage and Rapid Treatment) para incidentes con múltiples víctimas.</p>
                    <div className="border-l-8 border-[#C62828] bg-white p-4 shadow-sm">
                        <h3 className="font-bold text-[#C62828] uppercase">Prioridad I (Rojo) - Atención Inmediata</h3>
                        <p className="text-sm mt-2 text-gray-600">Lesiones que amenazan la vida pero tratables. Alteración de respiración (FR &gt; 30), perfusión (Pulso radial ausente o llenado capilar &gt; 2s), o estado mental (No obedece órdenes simples).</p>
                    </div>
                    <div className="border-l-8 border-yellow-500 bg-white p-4 shadow-sm">
                        <h3 className="font-bold text-yellow-600 uppercase">Prioridad II (Amarillo) - Urgencia Diferida</h3>
                        <p className="text-sm mt-2 text-gray-600">Lesiones severas que no amenazan la vida inmediatamente. El paciente obedece órdenes, tiene pulso radial presente y FR &lt; 30, pero no puede caminar.</p>
                    </div>
                    <div className="border-l-8 border-green-600 bg-white p-4 shadow-sm">
                        <h3 className="font-bold text-green-700 uppercase">Prioridad III (Verde) - Menor</h3>
                        <p className="text-sm mt-2 text-gray-600">Pacientes ambulatorios ("heridos que caminan"). Sus lesiones permiten retrasar la atención clínica sin poner en riesgo su vida.</p>
                    </div>
                    <div className="border-l-8 border-black bg-white p-4 shadow-sm">
                        <h3 className="font-bold text-black uppercase">Prioridad IV (Negro) - Expectante / Éxitus</h3>
                        <p className="text-sm mt-2 text-gray-600">Ausencia de respiración después de reposicionar la vía aérea. Lesiones incompatibles con la vida. Sin recursos de RCP en escenarios de desastre.</p>
                    </div>
                </div>
            )
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] pb-20 font-sans">
            <header className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => { if (guiaSeleccionada) setGuiaSeleccionada(null); else router.push("/dashboard"); }} className="text-[#8B0000] font-bold text-xl">←</button>
                <h1 className="text-[#8B0000] font-bold text-lg tracking-wide uppercase">{guiaSeleccionada ? "MANUAL TÉCNICO" : "MANUAL DE PROTOCOLOS MÉDICOS"}</h1>
            </header>
            <main className="p-4 max-w-3xl mx-auto mt-4">
                {!guiaSeleccionada ? (
                    <div className="flex flex-col gap-4">
                        <div className="bg-white p-5 border border-gray-200 rounded shadow-sm text-sm text-gray-600 mb-2">
                            <strong className="text-gray-900 block mb-1">Directrices Clínicas Oficiales</strong>
                            Seleccione el módulo de consulta técnica. Documentación estructurada para personal prehospitalario.
                        </div>
                        {[
                            { id: "abcde", titulo: "PROTOCOLO ATENCIONES (ABCDE)", desc: "Secuencia de evaluación primaria" },
                            { id: "vitales", titulo: "SIGNOS VITALES (RANGOS)", desc: "Parámetros fisiológicos por edad" },
                            { id: "glasgow", titulo: "ESCALA DE GLASGOW", desc: "Evaluación del estado neurológico" },
                            { id: "quemaduras", titulo: "QUEMADURAS (REGLA 9%)", desc: "Cálculo de superficie corporal afectada" },
                            { id: "triage", titulo: "CÓDIGO TRIAGE (COLORES)", desc: "Clasificación de múltiples víctimas (START)" }
                        ].map((btn) => (
                            <button key={btn.id} onClick={() => setGuiaSeleccionada(btn.id)} className="w-full bg-white border border-gray-300 text-left p-5 rounded hover:bg-gray-50 transition shadow-sm flex flex-col gap-1">
                                <span className="font-bold text-[#8B0000] tracking-wide">{btn.titulo}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">{btn.desc}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-6 border border-gray-200 rounded shadow-md">
                        <h1 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-wide">{protocolos[guiaSeleccionada].titulo}</h1>
                        <div className="w-full border-t border-gray-300 mb-6"></div>
                        {protocolos[guiaSeleccionada].contenido}
                    </div>
                )}
            </main>
        </div>
    );
}