import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    ScrollView, Platform, Alert, FlatList, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '@/lib/firebase';

export default function HistorialFirmasScreen() {
    const [cargando, setCargando] = useState(true);
    const [vistaActual, setVistaActual] = useState<'lista' | 'detalle'>('lista');

    const [historial, setHistorial] = useState<any[]>([]);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState<any>(null);
    const [detallesTurno, setDetallesTurno] = useState<any[]>([]);

    useEffect(() => {
        cargarHistorial();
    }, []);

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };


    async function cargarHistorial() {
        setCargando(true);
        try {
            const snap = await getDocs(collection(db, 'asistencias'));
            const lista = snap.docs.map(doc => {
                const data = doc.data();

                const asistieron = [];
                if (data.detalles) {
                    for (const [carnet, estado] of Object.entries(data.detalles)) {

                        if (estado === 'ASISTENCIA' || estado === 'ASISTE') {
                            asistieron.push(carnet);
                        }
                    }
                }


                let nombreBrigada = data.brigada || data.turno || 'Sin Asignar';

                return {
                    id: doc.id,
                    fecha: data.fecha || '',
                    brigada: nombreBrigada,
                    asistieron: asistieron
                };
            });


            lista.sort((a, b) => {
                const parseFecha = (fechaStr: string) => {
                    if (!fechaStr) return 0;
                    const partes = fechaStr.split('-');
                    if (partes.length === 3) {

                        return parseInt(`${partes[2]}${partes[1]}${partes[0]}`);
                    }
                    return 0;
                };


                return parseFecha(b.fecha) - parseFecha(a.fecha);
            });

            setHistorial(lista);
        } catch (error) {
            console.error(error);
            mostrarAlerta('Error al cargar el historial.');
        } finally {
            setCargando(false);
        }
    }


    async function abrirDetalle(turno: any) {
        setTurnoSeleccionado(turno);
        setVistaActual('detalle');
        setCargando(true);

        try {

            const q = query(collection(db, 'registro_horas'), where('fechaExacta', '==', turno.fecha));
            const snap = await getDocs(q);

            const detalles = snap.docs
                .map(doc => doc.data())

                .filter(d => turno.asistieron.includes(d.carnet) || d.brigada === turno.brigada || d.brigada === 'Apoyo');

            detalles.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            setDetallesTurno(detalles);
        } catch (error) {
            console.error(error);
            mostrarAlerta('Error al cargar los detalles del turno.');
        } finally {
            setCargando(false);
        }
    }


    async function compartirWhatsApp() {
        if (detallesTurno.length === 0) {
            mostrarAlerta('No hay detalles para compartir.');
            return;
        }

        let mensaje = `*REPORTE DE TURNO - ${turnoSeleccionado.brigada.toUpperCase()}*\n`;
        mensaje += `📅 Fecha: ${turnoSeleccionado.fecha}\n`;
        mensaje += `👥 Total Voluntarios: ${detallesTurno.length}\n\n`;
        mensaje += `*DETALLE DE ASISTENCIA:*\n`;

        detallesTurno.forEach(d => {
            mensaje += `\n👤 ${d.nombre} (${d.carnet})\n`;
            mensaje += `⏱ Entrada: ${d.horaEntrada} | Salida: ${d.horaSalida}\n`;
            mensaje += `🔥 Horas trabajadas: ${d.horasTrabajadas} hrs\n`;
        });

        const url = `whatsapp://send?text=${encodeURIComponent(mensaje)}`;

        try {
            const soportado = await Linking.canOpenURL(url);
            if (soportado) {
                await Linking.openURL(url);
            } else {
                mostrarAlerta('No se pudo abrir WhatsApp. Asegúrate de tenerlo instalado.');
            }
        } catch (error) {
            mostrarAlerta('Error al intentar abrir WhatsApp.');
        }
    }


    async function exportarPDF() {
        if (detallesTurno.length === 0) {
            mostrarAlerta('No hay detalles para exportar.');
            return;
        }

        let html = `
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                .header { border-bottom: 2px solid #C8102E; padding-bottom: 10px; margin-bottom: 20px; }
                h1 { color: #C8102E; margin: 0; font-size: 24px; text-transform: uppercase; }
                .sub { color: #7F8C8D; font-size: 14px; margin-top: 5px; }
                .badge { display: inline-block; background: #F2F3F4; padding: 5px 10px; border-radius: 4px; font-weight: bold; margin-top: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th { background-color: #F8F9FA; color: #7F8C8D; text-align: left; padding: 12px; border-bottom: 2px solid #EAEDED; font-size: 12px; }
                td { padding: 12px; border-bottom: 1px solid #EAEDED; }
                .horas { color: #C8102E; font-weight: bold; font-size: 16px; }
                .carnet { color: #95A5A6; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${turnoSeleccionado.brigada}</h1>
                <div class="sub">Reporte de Asistencia Diaria</div>
                <div class="badge">Fecha: ${turnoSeleccionado.fecha} | Total de Voluntarios: ${detallesTurno.length}</div>
            </div>
            <table>
                <tr>
                    <th>VOLUNTARIO / CARNET</th>
                    <th>ENTRADA</th>
                    <th>SALIDA</th>
                    <th>HORAS</th>
                </tr>
        `;

        detallesTurno.forEach(d => {
            html += `
                <tr>
                    <td><strong>${d.nombre}</strong><br><span class="carnet">${d.carnet}</span></td>
                    <td>${d.horaEntrada}</td>
                    <td>${d.horaSalida}</td>
                    <td class="horas">${d.horasTrabajadas}</td>
                </tr>
            `;
        });

        html += `</table></body></html>`;

        try {
            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Detalle_${turnoSeleccionado.fecha}` });
                }
            }
        } catch (error) {
            mostrarAlerta('Error al generar PDF.');
        }
    }


    return (
        <SafeAreaView style={styles.pantalla}>
            {/* CABECERA ROJA */}
            <View style={styles.headerBar}>
                <Pressable onPress={() => vistaActual === 'lista' ? router.back() : setVistaActual('lista')} style={styles.botonRegresar}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.tituloHeader}>
                    {vistaActual === 'lista' ? 'HISTORIAL DE ASISTENCIAS' : 'DETALLE DE TURNO'}
                </Text>
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#C8102E" style={{ marginTop: 50 }} />
            ) : (
                <View style={{ flex: 1 }}>

                    {vistaActual === 'lista' && (
                        <FlatList
                            data={historial}
                            contentContainerStyle={styles.scrollContainer}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <Pressable style={styles.tarjetaLista} onPress={() => abrirDetalle(item)}>
                                    <Text style={styles.tituloTarjetaLista}>CIERRE DE TURNO</Text>

                                    <View style={styles.filaAsistieron}>
                                        <MaterialIcons name="check-box" size={20} color="#27AE60" />
                                        <Text style={styles.textoAsistieron}>
                                            <Text style={{ fontWeight: 'bold' }}>ASISTIERON ({item.asistieron.length}): </Text>
                                            {item.asistieron.join(', ')}
                                        </Text>
                                    </View>

                                    <View style={styles.separador} />

                                    <View style={styles.filaFooterLista}>
                                        <View style={styles.filaFecha}>
                                            <MaterialIcons name="calendar-today" size={14} color="#7F8C8D" />
                                            <Text style={styles.textoFecha}>{item.fecha}</Text>
                                        </View>
                                        <View style={styles.badgeBrigada}>
                                            <Text style={styles.textoBadgeBrigada}>{item.brigada.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            )}
                        />
                    )}


                    {vistaActual === 'detalle' && turnoSeleccionado && (
                        <View style={{ flex: 1 }}>
                            <ScrollView contentContainerStyle={styles.scrollContainer}>


                                <View style={styles.tarjetaCabeceraDetalle}>
                                    <View style={styles.filaCabeceraArriba}>
                                        <Text style={styles.tituloBrigadaRojo}>{turnoSeleccionado.brigada.toUpperCase()}</Text>
                                        <View style={styles.filaFecha}>
                                            <MaterialIcons name="calendar-today" size={14} color="#7F8C8D" />
                                            <Text style={styles.textoFecha}>{turnoSeleccionado.fecha}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.badgeVoluntarios}>
                                        <Text style={styles.textoBadgeVoluntarios}>Total de Voluntarios: {detallesTurno.length}</Text>
                                    </View>
                                </View>


                                <View style={styles.contenedorTabla}>
                                    <View style={styles.cabeceraTabla}>
                                        <Text style={[styles.textoCabeceraTabla, { flex: 2 }]}>VOLUNTARIO / CARNET</Text>
                                        <Text style={[styles.textoCabeceraTabla, { flex: 1, textAlign: 'center' }]}>ENTRADA</Text>
                                        <Text style={[styles.textoCabeceraTabla, { flex: 1, textAlign: 'center' }]}>SALIDA</Text>
                                        <Text style={[styles.textoCabeceraTabla, { flex: 1, textAlign: 'center' }]}>HORAS</Text>
                                    </View>

                                    {detallesTurno.map((d, index) => (
                                        <View key={index} style={styles.filaTabla}>
                                            <View style={{ flex: 2 }}>
                                                <Text style={styles.textoNombreTabla}>{d.nombre}</Text>
                                                <Text style={styles.textoCarnetTabla}>{d.carnet}</Text>
                                            </View>
                                            <Text style={[styles.textoDatoTabla, { flex: 1, textAlign: 'center' }]}>{d.horaEntrada}</Text>
                                            <Text style={[styles.textoDatoTabla, { flex: 1, textAlign: 'center' }]}>{d.horaSalida}</Text>
                                            <Text style={[styles.textoHorasTabla, { flex: 1, textAlign: 'center' }]}>{d.horasTrabajadas}</Text>
                                        </View>
                                    ))}
                                </View>

                            </ScrollView>

                            {/* Botones Fijos Abajo */}
                            <View style={styles.contenedorBotonesFijos}>
                                <Pressable style={[styles.botonAccion, { backgroundColor: '#2ECC71', marginRight: 10 }]} onPress={compartirWhatsApp}>
                                    <Text style={styles.textoBotonAccion}>COMPARTIR WHATSAPP</Text>
                                </Pressable>
                                <Pressable style={[styles.botonAccion, { backgroundColor: '#C8102E' }]} onPress={exportarPDF}>
                                    <Text style={styles.textoBotonAccion}>EXPORTAR PDF</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F4F6F8' },

    // Header
    headerBar: { backgroundColor: '#C8102E', flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'center' },
    botonRegresar: { position: 'absolute', left: 15, zIndex: 1 },
    tituloHeader: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },

    scrollContainer: { padding: 15, paddingBottom: 40 },

    // VISTA LISTA
    tarjetaLista: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EAEDED', padding: 15, marginBottom: 15 },
    tituloTarjetaLista: { fontSize: 15, fontWeight: 'bold', color: '#C8102E', marginBottom: 10 },
    filaAsistieron: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15, paddingRight: 10 },
    textoAsistieron: { fontSize: 13, color: '#5D6D7E', marginLeft: 8, lineHeight: 20 },
    separador: { height: 1, backgroundColor: '#333', marginBottom: 15 }, // Línea oscura como en el diseño
    filaFooterLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    filaFecha: { flexDirection: 'row', alignItems: 'center' },
    textoFecha: { fontSize: 13, color: '#5D6D7E', marginLeft: 5, fontWeight: 'bold' },
    badgeBrigada: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 },
    textoBadgeBrigada: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    // VISTA DETALLE - Cabecera
    tarjetaCabeceraDetalle: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EAEDED', padding: 15, marginBottom: 20 },
    filaCabeceraArriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    tituloBrigadaRojo: { fontSize: 18, fontWeight: 'bold', color: '#C8102E' },
    badgeVoluntarios: { backgroundColor: '#F2F4F4', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
    textoBadgeVoluntarios: { fontSize: 13, fontWeight: 'bold', color: '#34495E' },

    // VISTA DETALLE - Tabla
    contenedorTabla: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EAEDED', overflow: 'hidden' },
    cabeceraTabla: { flexDirection: 'row', backgroundColor: '#F8F9FA', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EAEDED' },
    textoCabeceraTabla: { fontSize: 10, fontWeight: 'bold', color: '#7F8C8D' },
    filaTabla: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F4', alignItems: 'center' },
    textoNombreTabla: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50' },
    textoCarnetTabla: { fontSize: 11, color: '#95A5A6', marginTop: 2 },
    textoDatoTabla: { fontSize: 12, color: '#2C3E50', fontWeight: 'bold' },
    textoHorasTabla: { fontSize: 14, color: '#C8102E', fontWeight: 'bold' },

    // VISTA DETALLE - Botones Fijos
    contenedorBotonesFijos: { flexDirection: 'row', padding: 15, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EAEDED' },
    botonAccion: { flex: 1, paddingVertical: 14, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    textoBotonAccion: { color: '#FFF', fontWeight: 'bold', fontSize: 13 }
});