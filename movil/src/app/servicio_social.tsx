import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    TextInput, ScrollView, Platform, Alert, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '@/lib/firebase';

export default function ServicioSocialScreen() {
    const [vistaActual, setVistaActual] = useState<'menu' | 'gestion' | 'asistencia' | 'historial' | 'reportes'>('menu');
    const [cargando, setCargando] = useState(false);

    const [estudiantes, setEstudiantes] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);


    const [modalVisible, setModalVisible] = useState(false);
    const [formEst, setFormEst] = useState({ carnet: '', nombre: '', edad: '', institucion: '', metaHoras: '150' });


    const [asistenciaData, setAsistenciaData] = useState<any>({});


    const [seleccionReporte, setSeleccionReporte] = useState<any>({});

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };


    async function cargarEstudiantes() {
        setCargando(true);
        try {
            const q = query(collection(db, 'usuarios'), where('rol', '==', 'estudiante'));
            const snap = await getDocs(q);
            const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            lista.sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
            setEstudiantes(lista);
        } catch (error) {
            mostrarAlerta('Error al cargar estudiantes.');
        } finally {
            setCargando(false);
        }
    }

    async function cargarHistorial() {
        setCargando(true);
        try {
            const snap = await getDocs(collection(db, 'historial_servicio_social'));
            const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            lista.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setHistorial(lista);
        } catch (error) {
            mostrarAlerta('Error al cargar el historial.');
        } finally {
            setCargando(false);
        }
    }


    async function guardarNuevoEstudiante() {
        if (!formEst.carnet || !formEst.nombre || !formEst.institucion) {
            mostrarAlerta('Llene los campos obligatorios.');
            return;
        }
        setCargando(true);
        try {
            const newDoc = {
                carnet: formEst.carnet,
                nombre: formEst.nombre,
                edad: formEst.edad,
                institucion: formEst.institucion,
                metaHoras: parseInt(formEst.metaHoras) || 150,
                horasAcumuladas: 0,
                rol: 'estudiante',
                filial: 'SERVICIO SOCIAL',
                tipoMiembro: 'estudiante'
            };
            await setDoc(doc(db, 'usuarios', formEst.carnet), newDoc);
            mostrarAlerta('Estudiante registrado exitosamente.');
            setModalVisible(false);
            cargarEstudiantes();
        } catch (error) {
            mostrarAlerta('Error al guardar el estudiante.');
        } finally {
            setCargando(false);
        }
    }


    function iniciarAsistencia() {
        const dataInicial: any = {};
        estudiantes.forEach(est => {
            dataInicial[est.carnet] = { seleccionado: false, horas: '' };
        });
        setAsistenciaData(dataInicial);
        setVistaActual('asistencia');
    }

    function toggleAsistencia(carnet: string) {
        setAsistenciaData((prev: any) => ({
            ...prev,
            [carnet]: { ...prev[carnet], seleccionado: !prev[carnet].seleccionado }
        }));
    }

    function cambiarHoras(carnet: string, horas: string) {
        setAsistenciaData((prev: any) => ({
            ...prev,
            [carnet]: { ...prev[carnet], horas: horas }
        }));
    }

    async function guardarHorasAsistencia() {
        const seleccionados = estudiantes.filter(est => asistenciaData[est.carnet]?.seleccionado);

        if (seleccionados.length === 0) {
            mostrarAlerta('Selecciona al menos un estudiante.');
            return;
        }


        for (let est of seleccionados) {
            const hrs = parseFloat(asistenciaData[est.carnet].horas);
            if (isNaN(hrs) || hrs <= 0) {
                mostrarAlerta(`Ingresa una cantidad de horas válida para ${est.nombre}.`);
                return;
            }
        }

        setCargando(true);
        try {
            const hoy = new Date();
            const dd = String(hoy.getDate()).padStart(2, '0');
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const yyyy = hoy.getFullYear();
            const fechaStr = `${dd}/${mm}/${yyyy}`;
            const timestamp = hoy.getTime();

            const promesas = seleccionados.map(async (est) => {
                const horasSumar = parseFloat(asistenciaData[est.carnet].horas);


                const idHistorial = `${est.carnet}_${timestamp}`;
                await setDoc(doc(db, 'historial_servicio_social', idHistorial), {
                    brigada: "SERVICIO SOCIAL",
                    carnet: est.carnet,
                    fecha: fechaStr,
                    horas: horasSumar,
                    nombre: est.nombre,
                    timestamp: timestamp
                });


                const horasActuales = est.horasAcumuladas ? parseFloat(est.horasAcumuladas) : 0;
                await updateDoc(doc(db, 'usuarios', est.carnet), {
                    horasAcumuladas: horasActuales + horasSumar
                });
            });

            await Promise.all(promesas);
            mostrarAlerta('Horas guardadas correctamente.');
            cargarEstudiantes();
            setVistaActual('menu');

        } catch (error) {
            mostrarAlerta('Error al guardar asistencias.');
        } finally {
            setCargando(false);
        }
    }


    function iniciarReportes() {
        const seleccionInicial: any = {};
        estudiantes.forEach(est => seleccionInicial[est.carnet] = true);
        setSeleccionReporte(seleccionInicial);
        setVistaActual('reportes');
    }

    function toggleReporte(carnet: string) {
        setSeleccionReporte((prev: any) => ({ ...prev, [carnet]: !prev[carnet] }));
    }

    function marcarTodos(marcar: boolean) {
        const nuevaSeleccion: any = {};
        estudiantes.forEach(est => nuevaSeleccion[est.carnet] = marcar);
        setSeleccionReporte(nuevaSeleccion);
    }

    async function generarPDF() {
        const exportar = estudiantes.filter(e => seleccionReporte[e.carnet]);
        if (exportar.length === 0) {
            mostrarAlerta('Selecciona al menos un estudiante para el reporte.');
            return;
        }

        let html = `
        <html><head><style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; color: #C8102E; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
            .completado { color: #27AE60; font-weight: bold; }
        </style></head>
        <body>
            <h2>REPORTE DE SERVICIO SOCIAL</h2>
            <p>Total de estudiantes exportados: ${exportar.length}</p>
            <table>
                <tr><th>Carnet</th><th>Nombre</th><th>Institución</th><th>Horas Acumuladas</th><th>Estado</th></tr>
        `;

        exportar.forEach(e => {
            const acumuladas = e.horasAcumuladas || 0;
            const meta = e.metaHoras || 150;
            const completado = acumuladas >= meta;
            html += `
            <tr>
                <td>${e.carnet}</td>
                <td>${e.nombre}</td>
                <td>${e.institucion || 'N/A'}</td>
                <td>${acumuladas} / ${meta} hrs</td>
                <td class="${completado ? 'completado' : ''}">${completado ? '¡COMPLETADO!' : 'En Progreso'}</td>
            </tr>`;
        });

        html += `</table></body></html>`;

        try {
            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Reporte Servicio Social' });
                }
            }
        } catch (error) {
            mostrarAlerta('Error generando PDF');
        }
    }



    const renderMenu = () => (
        <View style={styles.menuContainer}>
            <Text style={styles.menuLabel}>Gestión y Control</Text>
            <Pressable style={[styles.menuBoton, { backgroundColor: '#1976D2' }]} onPress={() => { cargarEstudiantes(); setVistaActual('gestion'); }}>
                <Text style={styles.menuTexto}>GESTIÓN DE ESTUDIANTES</Text>
            </Pressable>

            <Text style={styles.menuLabel}>Operaciones Diarias</Text>
            <Pressable style={[styles.menuBoton, { backgroundColor: '#388E3C' }]} onPress={() => { cargarEstudiantes().then(iniciarAsistencia); }}>
                <Text style={styles.menuTexto}>TOMA DE ASISTENCIA</Text>
            </Pressable>

            <Pressable style={[styles.menuBoton, { backgroundColor: '#512DA8' }]} onPress={() => { cargarHistorial(); setVistaActual('historial'); }}>
                <Text style={styles.menuTexto}>HISTORIAL DE ASISTENCIAS</Text>
            </Pressable>

            <Pressable style={[styles.menuBoton, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5D8DC' }]} onPress={() => { cargarEstudiantes().then(iniciarReportes); }}>
                <Text style={[styles.menuTexto, { color: '#2C3E50' }]}>GENERAR REPORTE PDF / EXCEL</Text>
            </Pressable>
        </View>
    );

    const renderTarjetaEstudiante = (est: any) => {
        const acumuladas = est.horasAcumuladas || 0;
        const meta = est.metaHoras || 150;
        const completado = acumuladas >= meta;

        return (
            <View key={est.id} style={styles.tarjeta}>
                <Text style={styles.tarjetaNombre}>{est.nombre}</Text>
                <Text style={styles.tarjetaSub}>Carnet: {est.carnet} | Inst: {est.institucion || 'Sin asignar'}</Text>
                <Text style={[styles.tarjetaEstado, completado ? { color: '#27AE60' } : { color: '#E67E22' }]}>
                    {completado ? '¡COMPLETADO!' : 'En progreso'} ({acumuladas} / {meta} hrs)
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.pantalla}>

            {/* CABECERA DINÁMICA */}
            <View style={styles.headerRojo}>
                <Pressable onPress={() => vistaActual === 'menu' ? router.back() : setVistaActual('menu')} style={styles.botonRegresar}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.tituloHeader}>
                    {vistaActual === 'menu' && 'CENTRO DE SERVICIO SOCIAL'}
                    {vistaActual === 'gestion' && 'GESTIÓN DE ESTUDIANTES'}
                    {vistaActual === 'asistencia' && 'ASISTENCIA SERVICIO SOCIAL'}
                    {vistaActual === 'historial' && 'HISTORIAL DE ASISTENCIAS'}
                    {vistaActual === 'reportes' && 'GENERAR REPORTE'}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>

                {cargando && vistaActual !== 'menu' && <ActivityIndicator size="large" color="#C8102E" style={{ margin: 20 }} />}

                {/* 1. VISTA MENÚ PRINCIPAL */}
                {vistaActual === 'menu' && renderMenu()}

                {/* 2. VISTA GESTIÓN DE ESTUDIANTES */}
                {!cargando && vistaActual === 'gestion' && (
                    <View>
                        <Pressable style={styles.botonNegro} onPress={() => setModalVisible(true)}>
                            <Text style={styles.textoBotonNegro}>+ REGISTRAR NUEVO ESTUDIANTE</Text>
                        </Pressable>
                        {estudiantes.map(renderTarjetaEstudiante)}
                    </View>
                )}

                {/* 3. VISTA TOMA DE ASISTENCIA */}
                {!cargando && vistaActual === 'asistencia' && (
                    <View>
                        <Text style={styles.instruccionText}>Marca a los estudiantes presentes y asigna sus horas de hoy.</Text>
                        {estudiantes.map(est => {
                            const acumuladas = est.horasAcumuladas || 0;
                            const meta = est.metaHoras || 150;
                            const completado = acumuladas >= meta;
                            const seleccionado = asistenciaData[est.carnet]?.seleccionado || false;

                            return (
                                <View key={est.id} style={styles.tarjetaFila}>
                                    <Pressable style={styles.checkboxContainer} onPress={() => toggleAsistencia(est.carnet)}>
                                        <MaterialIcons name={seleccionado ? "check-box" : "check-box-outline-blank"} size={28} color={seleccionado ? "#1976D2" : "#95A5A6"} />
                                    </Pressable>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.tarjetaNombre}>{est.nombre}</Text>
                                        <Text style={styles.tarjetaSub}>{est.institucion} - Carnet: {est.carnet}</Text>
                                        <Text style={[styles.tarjetaEstado, completado ? { color: '#27AE60' } : { color: '#E67E22' }]}>
                                            {completado ? '¡COMPLETADO!' : 'En progreso'} ({acumuladas} / {meta} hrs)
                                        </Text>
                                    </View>
                                    <View style={styles.cajaInputHoras}>
                                        <Text style={styles.labelHorasHoy}>Horas Hoy</Text>
                                        <TextInput
                                            style={[styles.inputHorasHoy, !seleccionado && { backgroundColor: '#F2F3F4', color: '#BDC3C7' }]}
                                            keyboardType="numeric"
                                            editable={seleccionado}
                                            value={asistenciaData[est.carnet]?.horas}
                                            onChangeText={(t) => cambiarHoras(est.carnet, t)}
                                        />
                                    </View>
                                </View>
                            );
                        })}

                        <Pressable style={styles.botonRojoAbajo} onPress={guardarHorasAsistencia}>
                            <Text style={styles.textoBotonBlanco}>GUARDAR HORAS</Text>
                        </Pressable>
                    </View>
                )}

                {/* 4. VISTA HISTORIAL */}
                {!cargando && vistaActual === 'historial' && (
                    <View>
                        {historial.map(hist => (
                            <View key={hist.id} style={styles.tarjetaHistorial}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.tarjetaNombre}>{hist.nombre}</Text>
                                    <Text style={styles.tarjetaBrigadaMorada}>BRIGADA: {hist.brigada}</Text>
                                    <Text style={styles.tarjetaFechaGris}>Fecha: {hist.fecha}</Text>
                                </View>
                                <View style={styles.cajaHorasVerdes}>
                                    <Text style={styles.textoEtiquetaHoras}>HORAS</Text>
                                    <Text style={styles.textoHorasVerdes}>+{hist.horas}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}


                {!cargando && vistaActual === 'reportes' && (
                    <View>
                        <Text style={{ marginBottom: 15, color: '#555' }}>Selecciona los estudiantes que deseas incluir en el reporte.</Text>
                        <View style={styles.filaBotonesTop}>
                            <Pressable style={styles.botonOutlineAzul} onPress={() => marcarTodos(true)}>
                                <Text style={styles.textoOutlineAzul}>Marcar Todos</Text>
                            </Pressable>
                            <Pressable style={styles.botonOutlineGris} onPress={() => marcarTodos(false)}>
                                <Text style={styles.textoOutlineGris}>Desmarcar Todos</Text>
                            </Pressable>
                        </View>

                        {estudiantes.map(est => (
                            <View key={est.id} style={styles.tarjetaReporte}>
                                <Pressable style={styles.checkboxContainer} onPress={() => toggleReporte(est.carnet)}>
                                    <MaterialIcons name={seleccionReporte[est.carnet] ? "check-box" : "check-box-outline-blank"} size={26} color={seleccionReporte[est.carnet] ? "#1976D2" : "#95A5A6"} />
                                </Pressable>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.tarjetaNombre}>{est.nombre}</Text>
                                    <Text style={styles.tarjetaSub}>Carnet: {est.carnet} | Horas: {est.horasAcumuladas || 0}/{est.metaHoras || 150}</Text>
                                </View>
                            </View>
                        ))}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                            <Pressable style={[styles.botonRojoAbajo, { flex: 1, backgroundColor: '#27AE60', marginRight: 10 }]} onPress={() => mostrarAlerta('Función de Excel en desarrollo. Usa PDF.')}>
                                <Text style={styles.textoBotonBlanco}>EXPORTAR EXCEL</Text>
                            </Pressable>
                            <Pressable style={[styles.botonRojoAbajo, { flex: 1, marginTop: 0 }]} onPress={generarPDF}>
                                <Text style={styles.textoBotonBlanco}>IMPRIMIR PDF</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

            </ScrollView>


            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
                    <View style={styles.headerModal}>
                        <Text style={styles.tituloModal}>Nuevo Estudiante</Text>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 25 }}>

                        <Text style={styles.labelForm}>CARNET / ID</Text>
                        <TextInput style={styles.inputForm} value={formEst.carnet} onChangeText={(t) => setFormEst({ ...formEst, carnet: t })} />

                        <Text style={styles.labelForm}>NOMBRE COMPLETO</Text>
                        <TextInput style={styles.inputForm} value={formEst.nombre} onChangeText={(t) => setFormEst({ ...formEst, nombre: t })} />

                        <Text style={styles.labelForm}>EDAD</Text>
                        <TextInput style={styles.inputForm} keyboardType="numeric" value={formEst.edad} onChangeText={(t) => setFormEst({ ...formEst, edad: t })} />

                        <Text style={styles.labelForm}>INSTITUCIÓN DE PROCEDENCIA</Text>
                        <TextInput style={styles.inputForm} placeholder="Ej: Complejo Educativo..." value={formEst.institucion} onChangeText={(t) => setFormEst({ ...formEst, institucion: t })} />

                        <Text style={styles.labelForm}>HORAS SOLICITADAS (META)</Text>
                        <TextInput style={[styles.inputForm, { fontSize: 18, fontWeight: 'bold' }]} keyboardType="numeric" value={formEst.metaHoras} onChangeText={(t) => setFormEst({ ...formEst, metaHoras: t })} />

                        <View style={styles.filaBotonesModal}>
                            <Pressable onPress={() => setModalVisible(false)}><Text style={styles.textoBotonRojoModal}>CANCELAR</Text></Pressable>
                            <Pressable onPress={guardarNuevoEstudiante}><Text style={styles.textoBotonRojoModal}>GUARDAR</Text></Pressable>
                        </View>

                    </ScrollView>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F4F6F8' },
    headerRojo: { backgroundColor: '#C8102E', flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'center' },
    botonRegresar: { position: 'absolute', left: 15, zIndex: 1 },
    tituloHeader: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },

    scrollContainer: { padding: 15, paddingBottom: 40 },

    // MENÚ PRINCIPAL
    menuContainer: { marginTop: 10 },
    menuLabel: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15, marginTop: 15 },
    menuBoton: { paddingVertical: 18, borderRadius: 6, alignItems: 'center', marginBottom: 15, elevation: 2 },
    menuTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

    // GESTIÓN
    botonNegro: { backgroundColor: '#000', paddingVertical: 15, borderRadius: 6, alignItems: 'center', marginBottom: 20 },
    textoBotonNegro: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    tarjeta: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#D5D8DC', marginBottom: 10 },
    tarjetaNombre: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 4 },
    tarjetaSub: { fontSize: 12, color: '#7F8C8D', marginBottom: 8 },
    tarjetaEstado: { fontSize: 12, fontWeight: 'bold' },

    // ASISTENCIA
    instruccionText: { textAlign: 'center', color: '#7F8C8D', marginBottom: 15 },
    tarjetaFila: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#D5D8DC', marginBottom: 10, alignItems: 'center' },
    checkboxContainer: { marginRight: 15 },
    cajaInputHoras: { alignItems: 'center' },
    labelHorasHoy: { fontSize: 10, color: '#95A5A6', marginBottom: 5 },
    inputHorasHoy: { borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 4, width: 50, height: 40, textAlign: 'center', fontSize: 16, fontWeight: 'bold', backgroundColor: '#FFF' },
    botonRojoAbajo: { backgroundColor: '#C8102E', paddingVertical: 16, borderRadius: 6, alignItems: 'center', marginTop: 15 },
    textoBotonBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

    // HISTORIAL
    tarjetaHistorial: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#D5D8DC', marginBottom: 10, alignItems: 'center', justifyContent: 'space-between' },
    tarjetaBrigadaMorada: { fontSize: 11, fontWeight: 'bold', color: '#8E44AD', marginTop: 5, marginBottom: 2 },
    tarjetaFechaGris: { fontSize: 11, color: '#7F8C8D' },
    cajaHorasVerdes: { backgroundColor: '#EAFDF2', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#D4EFDF' },
    textoEtiquetaHoras: { fontSize: 9, fontWeight: 'bold', color: '#27AE60', marginBottom: 2 },
    textoHorasVerdes: { fontSize: 18, fontWeight: 'bold', color: '#27AE60' },

    // REPORTES
    filaBotonesTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    botonOutlineAzul: { borderWidth: 1, borderColor: '#1976D2', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 4 },
    textoOutlineAzul: { color: '#1976D2', fontWeight: 'bold', fontSize: 12 },
    botonOutlineGris: { borderWidth: 1, borderColor: '#7F8C8D', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 4 },
    textoOutlineGris: { color: '#7F8C8D', fontWeight: 'bold', fontSize: 12 },
    tarjetaReporte: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#D5D8DC', marginBottom: 10, alignItems: 'center' },

    // MODAL
    headerModal: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 10 },
    tituloModal: { fontSize: 20, fontWeight: 'bold', color: '#000' },
    labelForm: { fontSize: 12, fontWeight: 'bold', color: '#7F8C8D', marginBottom: 5, marginTop: 15 },
    inputForm: { borderBottomWidth: 1, borderBottomColor: '#BDC3C7', paddingVertical: 8, fontSize: 16, color: '#2C3E50' },
    filaBotonesModal: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 40, gap: 20 },
    textoBotonRojoModal: { color: '#C8102E', fontWeight: 'bold', fontSize: 16 }
});