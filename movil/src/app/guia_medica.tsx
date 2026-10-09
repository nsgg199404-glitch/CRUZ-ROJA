import { router } from 'expo-router';
import { useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GuiaMedicaScreen() {
    const [vista, setVista] = useState<'menu' | 'abcde' | 'signos' | 'glasgow' | 'quemaduras' | 'triage'>('menu');

    const HeaderSecundario = () => (
        <View style={styles.header}>
            <Pressable onPress={() => setVista('menu')} style={styles.botonRegresar}>
                <Text style={styles.textoRegresar}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
        </View>
    );

    const TableRow = ({ items, isHeader = false }: { items: string[], isHeader?: boolean }) => (
        <View style={[styles.tablaFila, isHeader && styles.tablaFilaHeader]}>
            {items.map((item, index) => (
                <View key={index} style={[styles.tablaCelda, { flex: index === 0 ? 2 : 1 }]}>
                    <Text style={[styles.textoCelda, isHeader && styles.textoHeaderCelda]}>{item}</Text>
                </View>
            ))}
        </View>
    );

    if (vista === 'menu') {
        return (
            <SafeAreaView style={styles.pantalla}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                        <Text style={styles.textoRegresar}>←</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.tarjetaIntro}>
                        <Text style={styles.tituloIntro}>Directrices Clínicas Oficiales</Text>
                        <Text style={styles.textoIntro}>Seleccione el módulo de consulta técnica. Documentación estructurada para personal prehospitalario.</Text>
                    </View>

                    <Pressable style={styles.tarjetaMenu} onPress={() => setVista('abcde')}>
                        <Text style={styles.tituloTarjetaMenu}>PROTOCOLO ATENCIONES (ABCDE)</Text>
                        <Text style={styles.subtituloTarjetaMenu}>SECUENCIA DE EVALUACIÓN PRIMARIA</Text>
                    </Pressable>

                    <Pressable style={styles.tarjetaMenu} onPress={() => setVista('signos')}>
                        <Text style={styles.tituloTarjetaMenu}>SIGNOS VITALES (RANGOS)</Text>
                        <Text style={styles.subtituloTarjetaMenu}>PARÁMETROS FISIOLÓGICOS POR EDAD</Text>
                    </Pressable>

                    <Pressable style={styles.tarjetaMenu} onPress={() => setVista('glasgow')}>
                        <Text style={styles.tituloTarjetaMenu}>ESCALA DE GLASGOW</Text>
                        <Text style={styles.subtituloTarjetaMenu}>EVALUACIÓN DEL ESTADO NEUROLÓGICO</Text>
                    </Pressable>

                    <Pressable style={styles.tarjetaMenu} onPress={() => setVista('quemaduras')}>
                        <Text style={styles.tituloTarjetaMenu}>QUEMADURAS (REGLA 9%)</Text>
                        <Text style={styles.subtituloTarjetaMenu}>CÁLCULO DE SUPERFICIE CORPORAL AFECTADA</Text>
                    </Pressable>

                    <Pressable style={styles.tarjetaMenu} onPress={() => setVista('triage')}>
                        <Text style={styles.tituloTarjetaMenu}>CÓDIGO TRIAGE (COLORES)</Text>
                        <Text style={styles.subtituloTarjetaMenu}>CLASIFICACIÓN DE MÚLTIPLES VÍCTIMAS (START)</Text>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (vista === 'abcde') {
        return (
            <SafeAreaView style={styles.pantallaBlanca}>
                <HeaderSecundario />
                <ScrollView contentContainerStyle={styles.scrollSeccion}>
                    <Text style={styles.tituloSeccion}>PROTOCOLO DE ATENCIÓN PREHOSPITALARIA (ABCDE)</Text>
                    <View style={styles.divisor} />

                    <Text style={styles.subtituloRojo}>OBJETIVO DEL PROTOCOLO</Text>
                    <Text style={styles.textoParrafo}>Establecer una evaluación primaria sistemática para identificar y tratar lesiones que amenazan la vida de forma inmediata. Todo el personal APH debe seguir esta secuencia sin omitir pasos.</Text>

                    <View style={styles.cajaPaso}>
                        <Text style={styles.tituloPaso}>A. Vía Aérea con Control Cervical</Text>
                        <Text style={styles.textoPaso}><Text style={styles.negrita}>Paso 1:</Text> El rescatista 1 (cabeza) estabiliza la columna cervical manualmente en posición neutra.</Text>
                        <Text style={styles.textoPaso}><Text style={styles.negrita}>Paso 2:</Text> Evaluar permeabilidad de la vía aérea (¿El paciente habla?).</Text>
                        <Text style={styles.textoPaso}><Text style={styles.negrita}>Paso 3:</Text> Maniobra de tracción mandibular o elevación del mentón (según sospecha de trauma).</Text>

                        <View style={styles.filaImagenes}>
                            <View style={styles.cajaImagenWrapper}>
                                <View style={styles.placeholderImagen} />
                                <Text style={styles.pieFoto}>FIG 1. ESTABILIZACIÓN CERVICAL MANUAL (POSICIÓN PRONA). RESCATISTA 1 EN CABEZA.</Text>
                            </View>
                            <View style={styles.cajaImagenWrapper}>
                                <View style={styles.placeholderImagen} />
                                <Text style={styles.pieFoto}>FIG 2. ESTABILIZACIÓN CERVICAL MANUAL (ARRODILLADO). ABORDAJE CON EQUIPO DE APOYO.</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cajaPaso}>
                        <Text style={styles.tituloPaso}>B. Ventilación y Oxigenación (Breathing)</Text>
                        <Text style={styles.textoPaso}><Text style={styles.negrita}>Paso 1:</Text> Exponer el tórax para observar expansión bilateral.</Text>
                        <Text style={styles.textoPaso}><Text style={styles.negrita}>Paso 2:</Text> Auscultar campos pulmonares (ápices y bases).</Text>
                        <Text style={styles.textoPaso}><Text style={styles.negrita}>Paso 3:</Text> Administrar oxigenoterapia suplementaria si SpO2 es menor al 94% o hay signos de dificultad respiratoria.</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (vista === 'signos') {
        return (
            <SafeAreaView style={styles.pantallaBlanca}>
                <HeaderSecundario />
                <ScrollView contentContainerStyle={styles.scrollSeccion}>
                    <Text style={styles.tituloSeccion}>PARÁMETROS FISIOLÓGICOS (SIGNOS VITALES)</Text>
                    <View style={styles.divisor} />
                    <Text style={styles.textoParrafo}>Tablas de referencia clínica para la evaluación prehospitalaria, categorizadas por grupo etario.</Text>

                    <View style={styles.tabla}>
                        <TableRow items={['SIGNO VITAL', 'ADULTO (12+ AÑOS)', 'NIÑO (1 A 11 AÑOS)', 'LACTANTE (< 1 AÑO)']} isHeader />
                        <TableRow items={['Frecuencia Cardíaca (lpm)', '60 - 100', '80 - 120', '100 - 160']} />
                        <TableRow items={['Frecuencia Respiratoria (rpm)', '12 - 20', '20 - 30', '30 - 60']} />
                        <TableRow items={['Tensión Arterial Sistólica (mmHg)', '90 - 120', '80 - 110', '70 - 90']} />
                        <TableRow items={['Tensión Arterial Diastólica (mmHg)', '60 - 80', '50 - 80', '50 - 70']} />
                        <TableRow items={['Saturación Oxígeno (SpO2)', '&gt; 94%', '&gt; 94%', '&gt; 94%']} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (vista === 'glasgow') {
        return (
            <SafeAreaView style={styles.pantallaBlanca}>
                <HeaderSecundario />
                <ScrollView contentContainerStyle={styles.scrollSeccion}>
                    <Text style={styles.tituloSeccion}>ESCALA DE COMA DE GLASGOW (GCS)</Text>
                    <View style={styles.divisor} />
                    <Text style={styles.textoParrafo}>Herramienta estandarizada para la evaluación del nivel de consciencia. Puntaje máximo: 15. Puntaje mínimo: 3. Un puntaje &le; 8 indica necesidad de intubación.</Text>

                    <View style={styles.glasgowSeccion}>
                        <Text style={styles.glasgowHeader}>A. APERTURA OCULAR</Text>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Espontánea</Text><Text style={styles.glasgowPuntos}>4</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>A la orden verbal</Text><Text style={styles.glasgowPuntos}>3</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Al estímulo doloroso</Text><Text style={styles.glasgowPuntos}>2</Text></View>
                        <View style={[styles.glasgowFila, { borderBottomWidth: 0 }]}><Text style={styles.glasgowTexto}>Sin respuesta</Text><Text style={styles.glasgowPuntos}>1</Text></View>
                    </View>

                    <View style={styles.glasgowSeccion}>
                        <Text style={styles.glasgowHeader}>B. RESPUESTA VERBAL</Text>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Orientado y conversando</Text><Text style={styles.glasgowPuntos}>5</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Desorientado y hablando</Text><Text style={styles.glasgowPuntos}>4</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Palabras inapropiadas</Text><Text style={styles.glasgowPuntos}>3</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Sonidos incomprensibles</Text><Text style={styles.glasgowPuntos}>2</Text></View>
                        <View style={[styles.glasgowFila, { borderBottomWidth: 0 }]}><Text style={styles.glasgowTexto}>Sin respuesta</Text><Text style={styles.glasgowPuntos}>1</Text></View>
                    </View>

                    <View style={styles.glasgowSeccion}>
                        <Text style={styles.glasgowHeader}>C. RESPUESTA MOTORA</Text>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Obedece órdenes verbales</Text><Text style={styles.glasgowPuntos}>6</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Localiza el dolor</Text><Text style={styles.glasgowPuntos}>5</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Retirada al dolor</Text><Text style={styles.glasgowPuntos}>4</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Flexión anormal (Decorticación)</Text><Text style={styles.glasgowPuntos}>3</Text></View>
                        <View style={styles.glasgowFila}><Text style={styles.glasgowTexto}>Extensión anormal (Descerebración)</Text><Text style={styles.glasgowPuntos}>2</Text></View>
                        <View style={[styles.glasgowFila, { borderBottomWidth: 0 }]}><Text style={styles.glasgowTexto}>Sin respuesta</Text><Text style={styles.glasgowPuntos}>1</Text></View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (vista === 'quemaduras') {
        return (
            <SafeAreaView style={styles.pantallaBlanca}>
                <HeaderSecundario />
                <ScrollView contentContainerStyle={styles.scrollSeccion}>
                    <Text style={styles.tituloSeccion}>EVALUACIÓN DE QUEMADURAS (REGLA DE LOS 9)</Text>
                    <View style={styles.divisor} />
                    <Text style={styles.textoParrafo}>Método estandarizado para cuantificar la Superficie Corporal Quemada (SCQ) en adultos. Fundamental para el cálculo de reposición de fluidos (Fórmula de Parkland).</Text>

                    <View style={styles.gridQuemaduras}>
                        <View style={styles.cajaQuemadura}><Text style={styles.valorQuemadura}>9%</Text><Text style={styles.textoQuemadura}>Cabeza y Cuello (Total)</Text></View>
                        <View style={styles.cajaQuemadura}><Text style={styles.valorQuemadura}>9% c/u</Text><Text style={styles.textoQuemadura}>Extremidades Superiores</Text></View>
                        <View style={styles.cajaQuemadura}><Text style={styles.valorQuemadura}>18%</Text><Text style={styles.textoQuemadura}>Torso Anterior</Text></View>
                        <View style={styles.cajaQuemadura}><Text style={styles.valorQuemadura}>18%</Text><Text style={styles.textoQuemadura}>Torso Posterior</Text></View>
                        <View style={styles.cajaQuemadura}><Text style={styles.valorQuemadura}>18% c/u</Text><Text style={styles.textoQuemadura}>Extremidades Inferiores</Text></View>
                        <View style={styles.cajaQuemadura}><Text style={styles.valorQuemadura}>1%</Text><Text style={styles.textoQuemadura}>Zona Genital (Perineo)</Text></View>
                    </View>

                    <View style={styles.diagramaQuemaduras}>
                        <Text style={styles.negritaCentro}>Figura 1: "Regla de los nueve"</Text>
                        <View style={[styles.placeholderImagen, { height: 250, marginTop: 10 }]} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (vista === 'triage') {
        return (
            <SafeAreaView style={styles.pantallaBlanca}>
                <HeaderSecundario />
                <ScrollView contentContainerStyle={styles.scrollSeccion}>
                    <Text style={styles.tituloSeccion}>SISTEMA DE CLASIFICACIÓN TRIAGE (START)</Text>
                    <View style={styles.divisor} />
                    <Text style={styles.textoParrafo}>Protocolo START (Simple Triage and Rapid Treatment) para incidentes con múltiples víctimas.</Text>

                    <View style={[styles.tarjetaTriage, { borderLeftColor: '#D32F2F' }]}>
                        <Text style={[styles.tituloTriage, { color: '#D32F2F' }]}>PRIORIDAD I (ROJO) - ATENCIÓN INMEDIATA</Text>
                        <Text style={styles.textoTriage}>Lesiones que amenazan la vida pero tratables. Alteración de respiración (FR &gt; 30), perfusión (Pulso radial ausente o llenado capilar &gt; 2s), o estado mental (No obedece órdenes simples).</Text>
                    </View>

                    <View style={[styles.tarjetaTriage, { borderLeftColor: '#FBC02D' }]}>
                        <Text style={[styles.tituloTriage, { color: '#F57F17' }]}>PRIORIDAD II (AMARILLO) - URGENCIA DIFERIDA</Text>
                        <Text style={styles.textoTriage}>Lesiones severas que no amenazan la vida inmediatamente. El paciente obedece órdenes, tiene pulso radial presente y FR &lt; 30, pero no puede caminar.</Text>
                    </View>

                    <View style={[styles.tarjetaTriage, { borderLeftColor: '#388E3C' }]}>
                        <Text style={[styles.tituloTriage, { color: '#388E3C' }]}>PRIORIDAD III (VERDE) - MENOR</Text>
                        <Text style={styles.textoTriage}>Pacientes ambulatorios ("heridos que caminan"). Sus lesiones permiten retrasar la atención clínica sin poner en riesgo su vida.</Text>
                    </View>

                    <View style={[styles.tarjetaTriage, { borderLeftColor: '#000000' }]}>
                        <Text style={[styles.tituloTriage, { color: '#000000' }]}>PRIORIDAD IV (NEGRO) - EXPECTANTE / ÉXITUS</Text>
                        <Text style={styles.textoTriage}>Ausencia de respiración después de reposicionar la vía aérea. Lesiones incompatibles con la vida. Sin recursos de RCP en escenarios de desastre.</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F4F6F8' },
    pantallaBlanca: { flex: 1, backgroundColor: '#F9FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#2C3E50', fontSize: 24, fontWeight: 'bold' },

    scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
    scrollSeccion: { paddingHorizontal: 30, paddingBottom: 50, paddingTop: 10 },

    tarjetaIntro: { backgroundColor: '#FFF', padding: 20, borderRadius: 4, borderWidth: 1, borderColor: '#E1E8ED', marginBottom: 20 },
    tituloIntro: { fontSize: 15, fontWeight: 'bold', color: '#1A252F', marginBottom: 8 },
    textoIntro: { fontSize: 13, color: '#5D6D7E', lineHeight: 20 },

    tarjetaMenu: { backgroundColor: '#FFF', padding: 20, borderRadius: 4, borderWidth: 1, borderColor: '#E1E8ED', marginBottom: 15 },
    tituloTarjetaMenu: { fontSize: 15, fontWeight: 'bold', color: '#8B0000', marginBottom: 6 },
    subtituloTarjetaMenu: { fontSize: 12, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 0.5 },

    tituloSeccion: { fontSize: 22, fontWeight: 'bold', color: '#1A252F', marginBottom: 15, textTransform: 'uppercase' },
    divisor: { height: 1, backgroundColor: '#D5D8DC', marginBottom: 20 },
    subtituloRojo: { fontSize: 16, fontWeight: 'bold', color: '#8B0000', marginBottom: 10 },
    textoParrafo: { fontSize: 14, color: '#4A4A4A', lineHeight: 22, marginBottom: 25 },
    negrita: { fontWeight: 'bold', color: '#2C3E50' },
    negritaCentro: { fontWeight: 'bold', color: '#2C3E50', textAlign: 'center' },

    cajaPaso: { backgroundColor: '#FFF', padding: 20, borderRadius: 4, borderWidth: 1, borderColor: '#E1E8ED', borderLeftWidth: 4, borderLeftColor: '#0D47A1', marginBottom: 20 },
    tituloPaso: { fontSize: 16, fontWeight: 'bold', color: '#1A252F', marginBottom: 12 },
    textoPaso: { fontSize: 14, color: '#4A4A4A', marginBottom: 8, lineHeight: 20 },
    filaImagenes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    cajaImagenWrapper: { flex: 1, marginHorizontal: 5 },
    placeholderImagen: { height: 120, backgroundColor: '#EBEDEF', borderRadius: 4, borderWidth: 1, borderColor: '#D5D8DC' },
    pieFoto: { fontSize: 9, color: '#7F8C8D', textAlign: 'center', marginTop: 8, textTransform: 'uppercase' },

    tabla: { borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 4, backgroundColor: '#FFF', overflow: 'hidden' },
    tablaFila: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#D5D8DC' },
    tablaFilaHeader: { backgroundColor: '#F2F4F4' },
    tablaCelda: { padding: 12, borderRightWidth: 1, borderRightColor: '#D5D8DC', justifyContent: 'center' },
    textoCelda: { fontSize: 12, color: '#2C3E50' },
    textoHeaderCelda: { fontWeight: 'bold', fontSize: 11 },

    glasgowSeccion: { borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 4, backgroundColor: '#FFF', marginBottom: 20, overflow: 'hidden' },
    glasgowHeader: { backgroundColor: '#F2F4F4', padding: 12, fontWeight: 'bold', fontSize: 13, color: '#2C3E50', borderBottomWidth: 1, borderBottomColor: '#D5D8DC' },
    glasgowFila: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EAEDED' },
    glasgowTexto: { fontSize: 13, color: '#4A4A4A' },
    glasgowPuntos: { fontSize: 14, fontWeight: 'bold', color: '#1A252F' },

    gridQuemaduras: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    cajaQuemadura: { width: '48%', backgroundColor: '#FFF', padding: 15, borderRadius: 4, borderWidth: 1, borderColor: '#D5D8DC', marginBottom: 15, alignItems: 'center' },
    valorQuemadura: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 5 },
    textoQuemadura: { fontSize: 12, color: '#7F8C8D', textAlign: 'center' },
    diagramaQuemaduras: { marginTop: 10, padding: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 4 },

    tarjetaTriage: { backgroundColor: '#FFF', padding: 20, borderRadius: 4, borderWidth: 1, borderColor: '#E1E8ED', borderLeftWidth: 6, marginBottom: 15 },
    tituloTriage: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
    textoTriage: { fontSize: 14, color: '#4A4A4A', lineHeight: 22 }
});