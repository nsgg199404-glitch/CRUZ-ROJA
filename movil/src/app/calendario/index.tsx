import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalendarioScreen() {
    // Iniciamos en Octubre 2026 para que coincida con tu captura, 
    // pero puedes cambiarlo a `new Date()` para el mes actual
    const [fechaReferencia, setFechaReferencia] = useState(new Date(2026, 9, 1));
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(new Date(2026, 9, 5));

    // Lógica para calcular la brigada de cualquier día
    const obtenerBrigada = (fecha: Date) => {
        if (!fecha) return null;

        // Usamos el 1 de Octubre de 2026 como base matemática (Sabemos que es B3)
        const baseDate = new Date(2026, 9, 1);
        const utcDate = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        const utcBase = Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

        // Diferencia de días entre la fecha base y la fecha a consultar
        const diffDays = Math.floor((utcDate - utcBase) / (1000 * 60 * 60 * 24));

        // Rotación de 4 días. Índice 2 es B3 (porque el arreglo es [B1, B2, B3, B4])
        let brigadeIndex = (2 + diffDays) % 4;
        if (brigadeIndex < 0) brigadeIndex += 4; // Manejo de meses anteriores

        const brigadas = ['B1', 'B2', 'B3', 'B4'];
        const brigadaBase = brigadas[brigadeIndex];

        // B5 entra los fines de semana (Sábado = 6, Domingo = 0) de 6am a 6pm
        const diaSemana = fecha.getDay();
        if (diaSemana === 0 || diaSemana === 6) {
            return { texto: `${brigadaBase} + B5`, principal: brigadaBase };
        }

        return { texto: brigadaBase, principal: brigadaBase };
    };

    // Colores basados en tu diseño de Android Studio
    const coloresBrigada: Record<string, string> = {
        'B1': '#E53935', // Rojo
        'B2': '#1E88E5', // Azul
        'B3': '#43A047', // Verde
        'B4': '#FB8C00', // Naranja
    };

    // Navegación de meses
    const cambiarMes = (incremento: number) => {
        const nuevaFecha = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() + incremento, 1);
        setFechaReferencia(nuevaFecha);
    };

    const mesesNombres = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

    // Generador de la cuadrícula del mes
    const generarDiasDelMes = () => {
        const year = fechaReferencia.getFullYear();
        const month = fechaReferencia.getMonth();
        const primerDiaSemana = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sab)
        const diasEnMes = new Date(year, month + 1, 0).getDate();

        const celdas = [];
        // Espacios vacíos antes del primer día del mes
        for (let i = 0; i < primerDiaSemana; i++) {
            celdas.push(null);
        }
        // Días reales del mes
        for (let i = 1; i <= diasEnMes; i++) {
            celdas.push(new Date(year, month, i));
        }
        return celdas;
    };

    const diasCuadricula = generarDiasDelMes();
    const diasEncabezado = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

    return (
        <SafeAreaView style={styles.pantalla}>
            {/* ENCABEZADO SUPERIOR */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
            </View>

            {/* CONTROLES DEL CALENDARIO */}
            <View style={styles.controlMes}>
                <Pressable style={styles.botonFlecha} onPress={() => cambiarMes(-1)}>
                    <Text style={styles.textoFlecha}>{'<'}</Text>
                </Pressable>

                <Text style={styles.textoMes}>
                    {mesesNombres[fechaReferencia.getMonth()]} {fechaReferencia.getFullYear()}
                </Text>

                <Pressable style={styles.botonFlecha} onPress={() => cambiarMes(1)}>
                    <Text style={styles.textoFlecha}>{'>'}</Text>
                </Pressable>
            </View>

            {/* ENCABEZADO DE DÍAS (DOM - SAB) */}
            <View style={styles.filaDiasSemana}>
                {diasEncabezado.map((dia, idx) => (
                    <Text key={idx} style={styles.textoDiaSemana}>{dia}</Text>
                ))}
            </View>

            {/* CUADRÍCULA DEL CALENDARIO */}
            <ScrollView style={styles.contenedorCuadricula}>
                <View style={styles.cuadricula}>
                    {diasCuadricula.map((fecha, idx) => {
                        if (!fecha) {
                            return <View key={`vacio-${idx}`} style={styles.celdaVacia} />;
                        }

                        const esSeleccionado = fechaSeleccionada?.toDateString() === fecha.toDateString();
                        const datosBrigada = obtenerBrigada(fecha);
                        const colorFondoEtiqueta = datosBrigada ? coloresBrigada[datosBrigada.principal] : '#CCC';

                        return (
                            <Pressable
                                key={`dia-${idx}`}
                                style={[styles.celdaDia, esSeleccionado && styles.celdaSeleccionada]}
                                onPress={() => setFechaSeleccionada(fecha)}
                            >
                                <Text style={styles.numeroDia}>{fecha.getDate()}</Text>
                                {datosBrigada && (
                                    <View style={[styles.etiquetaBrigada, { backgroundColor: colorFondoEtiqueta }]}>
                                        <Text style={styles.textoEtiquetaBrigada}>{datosBrigada.texto}</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 5 },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#212121', fontSize: 24, fontWeight: 'bold' },

    controlMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    botonFlecha: { backgroundColor: '#C8102E', width: 45, height: 35, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
    textoFlecha: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    textoMes: { fontSize: 18, fontWeight: 'bold', color: '#000' },

    filaDiasSemana: { flexDirection: 'row', paddingHorizontal: 5, marginBottom: 5 },
    textoDiaSemana: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#757575' },

    contenedorCuadricula: { flex: 1, paddingHorizontal: 5 },
    cuadricula: { flexDirection: 'row', flexWrap: 'wrap' },

    celdaVacia: { width: '14.28%', height: 80, padding: 2 },
    celdaDia: { width: '14.28%', height: 80, backgroundColor: '#FFF', padding: 4, borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 6, alignItems: 'center', marginVertical: 2 },
    celdaSeleccionada: { backgroundColor: '#E1F5FE', borderColor: '#81D4FA', borderWidth: 2 },

    numeroDia: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
    etiquetaBrigada: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, width: '100%', alignItems: 'center' },
    textoEtiquetaBrigada: { color: '#FFF', fontSize: 9, fontWeight: 'bold', textAlign: 'center' }
});