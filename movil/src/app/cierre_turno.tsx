import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    TextInput, ScrollView, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '@/lib/firebase';

export default function CierreTurnoScreen() {
    const [cargando, setCargando] = useState(false);
    const [usuario, setUsuario] = useState<any>(null);
    const [fechaCierre, setFechaCierre] = useState('');
    const [novedades, setNovedades] = useState('');

    useEffect(() => {
        cargarSesion();

        const hoy = new Date();
        const dd = String(hoy.getDate()).padStart(2, '0');
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const yyyy = hoy.getFullYear();
        setFechaCierre(`${dd}-${mm}-${yyyy}`);
    }, []);

    async function cargarSesion() {
        const sesionString = await AsyncStorage.getItem('usuarioSesion');
        if (sesionString) setUsuario(JSON.parse(sesionString));
    }

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };


    async function generarYEnviarPDF() {
        if (!fechaCierre) {
            mostrarAlerta('Por favor ingrese la fecha de cierre.');
            return;
        }

        setCargando(true);
        try {

            const qAsistencias = query(collection(db, 'registro_horas'), where('fechaExacta', '==', fechaCierre));
            const snapAsistencias = await getDocs(qAsistencias);
            const asistencias = snapAsistencias.docs.map(doc => doc.data());


            const fechaSlashes = fechaCierre.replace(/-/g, '/');
            const qEmergencias = query(collection(db, 'bitacora_atenciones'));
            const snapEmergencias = await getDocs(qEmergencias);


            const emergencias = snapEmergencias.docs
                .map(doc => doc.data())
                .filter(ata => ata.fechaHora && ata.fechaHora.includes(fechaSlashes));


            const nombreGenerador = usuario?.nombre ? usuario.nombre.toUpperCase() : 'SISTEMA APH';

            let htmlContent = `
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #111; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 15px; margin-bottom: 30px; }
                    .titulo-pdf { font-size: 26px; font-weight: 900; margin: 0; line-height: 1.2; text-transform: uppercase; }
                    .subtitulo-pdf { font-size: 16px; font-weight: bold; color: #3b4252; margin-top: 5px; }
                    .info-derecha { text-align: right; }
                    .fecha-text { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
                    .generado-text { font-size: 12px; color: #4c566a; text-transform: uppercase; }
                    
                    .seccion-titulo { border: 1px solid #ccc; padding: 12px 15px; font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; background-color: #fcfcfc; }
                    .mensaje-vacio { font-style: italic; color: #4c566a; font-size: 14px; margin-left: 5px; }
                    
                    .caja-novedades { border: 1px solid #a3b8cc; padding: 20px; min-height: 100px; font-size: 14px; color: #2e3440; white-space: pre-wrap; line-height: 1.5; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                    th, td { border: 1px solid #d8dee9; padding: 10px; text-align: left; }
                    th { background-color: #eceff4; font-weight: bold; color: #2e3440; }
                    
                    .firmas { display: flex; justify-content: space-around; margin-top: 80px; text-align: center; }
                    .linea-firma { border-top: 1px solid #111; width: 220px; padding-top: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; }
                    .rol-firma { font-size: 12px; color: #4c566a; font-weight: normal; margin-top: 3px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="titulo-pdf">REPORTE DE CIERRE<br>DE TURNO</h1>
                        <div class="subtitulo-pdf">Cruz Roja Salvadoreña - Seccional<br>Guazapa</div>
                    </div>
                    <div class="info-derecha">
                        <div class="fecha-text">Fecha: ${fechaCierre}</div>
                        <div class="generado-text">Generado por: ${nombreGenerador}</div>
                    </div>
                </div>

                <!-- 1. ASISTENCIA -->
                <div class="seccion-titulo">1. CONTROL DE ASISTENCIA</div>
            `;

            if (asistencias.length > 0) {
                htmlContent += `<table><tr><th>Carnet</th><th>Nombre del Voluntario</th><th>Hora Llegada</th></tr>`;
                asistencias.forEach(asist => {
                    htmlContent += `<tr><td>${asist.carnet || '--'}</td><td>${asist.nombre || '--'}</td><td>${asist.horaEntrada || '--'}</td></tr>`;
                });
                htmlContent += `</table>`;
            } else {
                htmlContent += `<p class="mensaje-vacio">No se encontraron registros de asistencia para esta fecha.</p>`;
            }

            // 2. EMERGENCIAS
            htmlContent += `<div class="seccion-titulo">2. BITÁCORA DE EMERGENCIAS</div>`;
            if (emergencias.length > 0) {
                htmlContent += `<table><tr><th>Hora</th><th>Unidad</th><th>Emergencia</th><th>Lugar / Destino</th></tr>`;
                emergencias.forEach(em => {
                    htmlContent += `<tr><td>${em.horaSalida || '--'}</td><td>${em.vehiculo || '--'}</td><td>${em.tipoServicio || '--'}</td><td>${em.lugar || '--'}</td></tr>`;
                });
                htmlContent += `</table>`;
            } else {
                htmlContent += `<p class="mensaje-vacio">No se reportaron atenciones en esta fecha.</p>`;
            }

            // 3. NOVEDADES
            htmlContent += `
                <div class="seccion-titulo">3. NOVEDADES Y OBSERVACIONES DEL TURNO</div>
                <div class="caja-novedades">${novedades.trim() !== '' ? novedades : '<span class="mensaje-vacio">Sin observaciones reportadas.</span>'}</div>
                
                <div class="firmas">
                    <div>
                        <div class="linea-firma">${nombreGenerador}</div>
                        <div class="rol-firma">Jefe de Turno / Despacho</div>
                    </div>
                    <div>
                        <div class="linea-firma">ADMINISTRACIÓN LOCAL</div>
                        <div class="rol-firma">Vo. Bo.</div>
                    </div>
                </div>
            </body>
            </html>
            `;


            if (Platform.OS === 'web') {

                await Print.printAsync({ html: htmlContent });
            } else {

                const { uri } = await Print.printToFileAsync({
                    html: htmlContent,
                    base64: false
                });

                const puedeCompartir = await Sharing.isAvailableAsync();
                if (puedeCompartir) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Compartir Cierre de Turno',
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    mostrarAlerta('La opción de compartir no está disponible en este dispositivo.');
                }
            }

        } catch (error) {
            console.error(error);
            mostrarAlerta('Hubo un error al generar el PDF.');
        } finally {
            setCargando(false);
        }
    }

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>

                <View style={styles.headerCentral}>
                    <Text style={styles.tituloRojo}>CIERRE DE TURNO</Text>
                    <Text style={styles.subtituloGris}>Generación automática de reporte</Text>
                </View>


                <View style={styles.cajaInfo}>
                    <View style={styles.filaInfo}>
                        <MaterialIcons name="info" size={18} color="#7F8C8D" />
                        <Text style={styles.textoInfoBold}>El sistema incluirá automáticamente:</Text>
                    </View>
                    <View style={styles.filaCheck}>
                        <MaterialIcons name="check-box" size={20} color="#2ECC71" />
                        <Text style={styles.textoCheck}>Lista de asistencia de hoy.</Text>
                    </View>
                    <View style={styles.filaCheck}>
                        <MaterialIcons name="check-box" size={20} color="#2ECC71" />
                        <Text style={styles.textoCheck}>Bitácora de emergencias de hoy.</Text>
                    </View>
                </View>

                <Text style={styles.etiqueta}>Fecha de Cierre (DD-MM-YYYY):</Text>
                <TextInput
                    style={styles.inputBox}
                    value={fechaCierre}
                    onChangeText={setFechaCierre}
                />

                <Text style={styles.etiqueta}>Novedades / Observaciones:</Text>
                <TextInput
                    style={styles.inputArea}
                    placeholder="Ej: Unidad 123 queda con tanque lleno. Camilla auxiliar dañada..."
                    placeholderTextColor="#95A5A6"
                    value={novedades}
                    onChangeText={setNovedades}
                    multiline
                    textAlignVertical="top"
                />

                <Pressable style={styles.botonRojo} onPress={generarYEnviarPDF} disabled={cargando}>
                    {cargando ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.textoBotonBlanco}>GENERAR Y ENVIAR PDF</Text>
                    )}
                </Pressable>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F4F6F8' },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#2C3E50', fontSize: 24, fontWeight: 'bold' },

    scrollContainer: { paddingHorizontal: 25, paddingBottom: 40 },

    headerCentral: { alignItems: 'center', marginBottom: 25 },
    tituloRojo: { fontSize: 20, fontWeight: 'bold', color: '#C8102E' },
    subtituloGris: { fontSize: 14, color: '#7F8C8D', marginTop: 4 },

    cajaInfo: { backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E1E8ED', padding: 20, marginBottom: 25 },
    filaInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    textoInfoBold: { fontSize: 14, fontWeight: 'bold', color: '#5D6D7E', marginLeft: 8 },
    filaCheck: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 5 },
    textoCheck: { fontSize: 14, color: '#34495E', marginLeft: 8 },

    etiqueta: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
    inputBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 6, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: '#2C3E50', marginBottom: 20 },

    inputArea: { backgroundColor: '#F9FAFC', borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 6, paddingHorizontal: 15, paddingVertical: 15, fontSize: 15, color: '#2C3E50', height: 120, marginBottom: 30 },

    botonRojo: { backgroundColor: '#D32F2F', paddingVertical: 16, borderRadius: 6, alignItems: 'center', elevation: 2 },
    textoBotonBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});