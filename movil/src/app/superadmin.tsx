import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    TextInput, ScrollView, Platform, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { db } from '@/lib/firebase';

export default function SuperAdminScreen() {
    const [cargando, setCargando] = useState(true);

    // Datos de la tabla
    const [usuariosConTally, setUsuariosConTally] = useState<any[]>([]);
    const [usuariosFiltrados, setUsuariosFiltrados] = useState<any[]>([]);

    // Estadísticas para el gráfico
    const [statsBrigadas, setStatsBrigadas] = useState<any[]>([]);

    // Alertas
    const [alertas, setAlertas] = useState<any[]>([]);

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroBrigada, setFiltroBrigada] = useState('TODAS LAS BRIGADAS');
    const [modalFiltroVisible, setModalFiltroVisible] = useState(false);

    // Modal de Nueva Alerta
    const [modalAlertaVisible, setModalAlertaVisible] = useState(false);
    const [formAlerta, setFormAlerta] = useState({ carnet: '', limite: '3' });
    const [guardandoAlerta, setGuardandoAlerta] = useState(false);

    const opcionesBrigada = ['TODAS LAS BRIGADAS', 'BRIGADA 1', 'BRIGADA 2', 'BRIGADA 3', 'BRIGADA 4', 'FIN DE SEMANA', 'SIN ASIGNAR'];

    useEffect(() => {
        cargarTodo();
    }, []);

    useEffect(() => {
        aplicarFiltros();
    }, [busqueda, filtroBrigada, usuariosConTally]);

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };


    async function cargarTodo() {
        setCargando(true);
        try {

            const snapUsuarios = await getDocs(collection(db, 'usuarios'));
            const mapUsuarios = new Map();
            snapUsuarios.docs.forEach(d => {
                const data = d.data();
                mapUsuarios.set(data.carnet, {
                    carnet: data.carnet,
                    nombre: data.nombre || 'Desconocido',
                    brigada: data.brigada || 'SIN ASIGNAR',
                    asistencias: 0,
                    faltas: 0
                });
            });


            const snapAsistencias = await getDocs(collection(db, 'asistencias'));
            const conteoPorBrigada: any = {
                'BRIGADA 1': 0, 'BRIGADA 2': 0, 'BRIGADA 3': 0, 'BRIGADA 4': 0, 'FIN DE SEMANA': 0
            };

            snapAsistencias.docs.forEach(docA => {
                const dataA = docA.data();
                if (dataA.detalles) {
                    for (const [carnet, estado] of Object.entries(dataA.detalles)) {
                        const estStr = String(estado).toUpperCase();


                        if (mapUsuarios.has(carnet)) {
                            const u = mapUsuarios.get(carnet);
                            if (estStr === 'ASISTE' || estStr === 'ASISTENCIA') u.asistencias++;
                            else if (estStr === 'FALTA') u.faltas++;


                            if (estStr === 'ASISTE' || estStr === 'ASISTENCIA') {
                                const brigadaUsu = String(u.brigada).toUpperCase();
                                if (conteoPorBrigada[brigadaUsu] !== undefined) {
                                    conteoPorBrigada[brigadaUsu]++;
                                }
                            }
                        }
                    }
                }
            });

            const listaUsuarios = Array.from(mapUsuarios.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
            setUsuariosConTally(listaUsuarios);


            const chartData = [
                { id: 'B1', label: 'B1', value: conteoPorBrigada['BRIGADA 1'], color: '#34495E' },
                { id: 'B2', label: 'B2', value: conteoPorBrigada['BRIGADA 2'], color: '#900C3F' },
                { id: 'B3', label: 'B3', value: conteoPorBrigada['BRIGADA 3'], color: '#900C3F' },
                { id: 'B4', label: 'B4', value: conteoPorBrigada['BRIGADA 4'], color: '#34495E' },
                { id: 'FS', label: 'FIN DE SEM...', value: conteoPorBrigada['FIN DE SEMANA'], color: '#900C3F' }
            ].sort((a, b) => b.value - a.value);

            setStatsBrigadas(chartData);


            const snapAlertas = await getDocs(collection(db, 'alertas_monitoreo'));
            const listaAlertas = snapAlertas.docs.map(docA => {
                const dataA = docA.data();
                const u = mapUsuarios.get(dataA.carnet);
                return {
                    id: docA.id,
                    carnet: dataA.carnet,
                    limite: dataA.limite,
                    nombre: u ? u.nombre : 'Usuario no encontrado',
                    faltasActuales: u ? u.faltas : 0
                };
            });
            setAlertas(listaAlertas);

        } catch (error) {
            console.error(error);
            mostrarAlerta('Error al cargar datos del panel maestro.');
        } finally {
            setCargando(false);
        }
    }

    function aplicarFiltros() {
        let filtrados = usuariosConTally;

        if (filtroBrigada !== 'TODAS LAS BRIGADAS') {
            filtrados = filtrados.filter(u => String(u.brigada).toUpperCase() === filtroBrigada);
        }

        if (busqueda.trim() !== '') {
            const txt = busqueda.toLowerCase();
            filtrados = filtrados.filter(u =>
                u.nombre.toLowerCase().includes(txt) || String(u.carnet).toLowerCase().includes(txt)
            );
        }

        setUsuariosFiltrados(filtrados);
    }


    async function activarAlerta() {
        if (!formAlerta.carnet || !formAlerta.limite) {
            mostrarAlerta('Completa todos los campos.');
            return;
        }

        const usuarioExiste = usuariosConTally.find(u => String(u.carnet) === formAlerta.carnet.trim());
        if (!usuarioExiste) {
            mostrarAlerta('El carnet ingresado no pertenece a ningún usuario registrado.');
            return;
        }

        setGuardandoAlerta(true);
        try {
            await setDoc(doc(db, 'alertas_monitoreo', formAlerta.carnet.trim()), {
                carnet: formAlerta.carnet.trim(),
                limite: parseInt(formAlerta.limite) || 3,
                timestamp: new Date().toISOString()
            });

            mostrarAlerta('Alerta configurada exitosamente.');
            setModalAlertaVisible(false);
            setFormAlerta({ carnet: '', limite: '3' });
            cargarTodo();
        } catch (error) {
            mostrarAlerta('Error al guardar la alerta.');
        } finally {
            setGuardandoAlerta(false);
        }
    }


    async function exportarCSV() {
        try {
            let csvContent = "CARNET,NOMBRE DEL VOLUNTARIO,BRIGADA,ASISTENCIAS,FALTAS\n";
            usuariosFiltrados.forEach(u => {
                csvContent += `"${u.carnet}","${u.nombre}","${u.brigada}",${u.asistencias},${u.faltas}\n`;
            });

            if (Platform.OS === 'web') {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "Control_Personal.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {

                const fs: any = FileSystem;
                const uri = fs.documentDirectory + "Control_Personal.csv";
                await fs.writeAsStringAsync(uri, csvContent, { encoding: fs.EncodingType.UTF8 });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Exportar a Excel (CSV)' });
                }
            }
        } catch (error) {
            mostrarAlerta('Error al generar el archivo Excel/CSV.');
        }
    }

    async function exportarPDF() {
        let html = `
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                h2 { color: #C8102E; text-align: center; margin-bottom: 5px; }
                p { text-align: center; color: #555; margin-top: 0; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background-color: #2C3E50; color: #FFF; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #EAEDED; color: #333; }
                .falta { color: #C8102E; font-weight: bold; }
                .ok { color: #27AE60; font-weight: bold; }
            </style>
        </head>
        <body>
            <h2>CONTROL DE PERSONAL REGISTRADO</h2>
            <p>Filtro: ${filtroBrigada}</p>
            <table>
                <tr><th>CARNET</th><th>NOMBRE DEL VOLUNTARIO</th><th>BRIGADA</th><th>ASISTENCIAS</th><th>FALTAS</th></tr>
        `;

        usuariosFiltrados.forEach(u => {
            html += `<tr>
                <td style="color:#7F8C8D;">${u.carnet}</td>
                <td><strong>${u.nombre}</strong></td>
                <td>${u.brigada}</td>
                <td><strong>${u.asistencias}</strong></td>
                <td class="${u.faltas > 0 ? 'falta' : 'ok'}">${u.faltas}</td>
            </tr>`;
        });

        html += `</table></body></html>`;

        try {
            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Reporte de Personal' });
                }
            }
        } catch (error) {
            mostrarAlerta('Error al generar PDF.');
        }
    }


    const maxValChart = Math.max(...statsBrigadas.map(d => d.value), 1); // Evitar div por 0

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.headerRojo}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.tituloHeader}>PANEL SUPER ADMINISTRADOR</Text>
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#C8102E" style={{ marginTop: 50 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContainer}>


                    <View style={styles.tarjetaBlanca}>
                        <Text style={styles.tituloTarjetaRojo}>RENDIMIENTO GLOBAL POR BRIGADAS</Text>
                        <View style={styles.lineaDivisora} />

                        <View style={styles.contenedorGrafico}>
                            {statsBrigadas.map((item, index) => {
                                const altoBarra = Math.max((item.value / maxValChart) * 150, 10); // Altura máx 150px
                                return (
                                    <View key={index} style={styles.columnaBarra}>
                                        <Text style={styles.valorBarra}>{item.value}</Text>
                                        <View style={[styles.barra, { height: altoBarra, backgroundColor: item.color }]} />
                                        <Text style={styles.etiquetaBarra}>{item.label}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={styles.lineaDivisora} />
                        <Text style={styles.leyendaGrafico}>ACUMULADO DE ASISTENCIAS ANUALES POR BRIGADA</Text>
                    </View>


                    <View style={styles.tarjetaBlanca}>
                        <View style={styles.filaCabeceraTarjeta}>
                            <Text style={styles.tituloTarjetaRojo}>SISTEMA DE ALERTAS</Text>
                            <Pressable style={styles.botonOscuro} onPress={() => setModalAlertaVisible(true)}>
                                <Text style={styles.textoBotonBlanco}>+ NUEVA ALERTA</Text>
                            </Pressable>
                        </View>

                        {alertas.length === 0 ? (
                            <Text style={{ color: '#7F8C8D', marginTop: 15 }}>No hay alertas configuradas actualmente.</Text>
                        ) : (
                            alertas.map(al => (
                                <View key={al.id} style={styles.tarjetaAlerta}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.alertaNombre}>{al.nombre.toUpperCase()}</Text>
                                        <Text style={styles.alertaCarnet}>CARNET: {al.carnet}</Text>
                                        <Text style={styles.alertaDetalle}>Monitoreo activo. Faltas actuales: {al.faltasActuales} / {al.limite}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>


                    <View style={styles.tarjetaBlanca}>
                        <View style={styles.filaCabeceraTarjeta}>
                            <Text style={styles.tituloTarjetaRojo}>CONTROL DE PERSONAL REGISTRADO</Text>

                            <View style={styles.controlesTabla}>
                                <Pressable style={styles.selectorDropdown} onPress={() => setModalFiltroVisible(true)}>
                                    <Text style={styles.textoDropdown}>{filtroBrigada}</Text>
                                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#333" />
                                </Pressable>
                                <TextInput
                                    style={styles.inputBusqueda}
                                    placeholder="Buscar nombre o carnet..."
                                    value={busqueda}
                                    onChangeText={setBusqueda}
                                />
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ minWidth: '100%' }}>

                                <View style={styles.cabeceraTabla}>
                                    <Text style={[styles.thTexto, { width: 60 }]}>CARNET</Text>
                                    <Text style={[styles.thTexto, { width: 250 }]}>NOMBRE DEL VOLUNTARIO</Text>
                                    <Text style={[styles.thTexto, { width: 150 }]}>BRIGADA</Text>
                                    <Text style={[styles.thTexto, { width: 100, textAlign: 'center' }]}>ASISTENCIAS</Text>
                                    <Text style={[styles.thTexto, { width: 80, textAlign: 'center' }]}>FALTAS</Text>
                                </View>


                                {usuariosFiltrados.map((u, index) => (
                                    <View key={u.carnet} style={[styles.filaTabla, index % 2 === 0 ? { backgroundColor: '#FFF' } : { backgroundColor: '#F9FAFC' }]}>
                                        <Text style={[styles.tdTexto, { width: 60, color: '#95A5A6' }]}>{u.carnet}</Text>
                                        <Text style={[styles.tdTexto, { width: 250, fontWeight: 'bold' }]}>{u.nombre.toUpperCase()}</Text>
                                        <Text style={[styles.tdTexto, { width: 150, color: '#7F8C8D' }]}>{String(u.brigada).toUpperCase()}</Text>
                                        <Text style={[styles.tdTexto, { width: 100, textAlign: 'center', fontWeight: 'bold' }]}>{u.asistencias}</Text>
                                        <Text style={[styles.tdTexto, { width: 80, textAlign: 'center', fontWeight: 'bold', color: u.faltas > 0 ? '#C8102E' : '#27AE60' }]}>{u.faltas}</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>


                    <View style={styles.filaBotonesExport}>
                        <Pressable style={styles.botonExportarExcel} onPress={exportarCSV}>
                            <Text style={styles.textoExportarBlanco}>EXPORTAR A EXCEL</Text>
                        </Pressable>
                        <Pressable style={styles.botonExportarPDF} onPress={exportarPDF}>
                            <Text style={styles.textoExportarRojo}>GENERAR REPORTE PDF</Text>
                        </Pressable>
                    </View>

                </ScrollView>
            )}


            <Modal visible={modalAlertaVisible} transparent animationType="fade">
                <View style={styles.modalFondo}>
                    <View style={styles.modalTarjeta}>
                        <Text style={styles.tituloModalRojo}>CONFIGURAR ALERTA</Text>
                        <View style={styles.lineaDivisora} />

                        <Text style={styles.labelForm}>CARNET DEL VOLUNTARIO</Text>
                        <TextInput
                            style={styles.inputForm}
                            placeholder="Ej. 133171"
                            value={formAlerta.carnet}
                            onChangeText={(t) => setFormAlerta({ ...formAlerta, carnet: t })}
                            keyboardType="numeric"
                        />

                        <Text style={styles.labelForm}>LÍMITE DE FALTAS PERMITIDAS</Text>
                        <TextInput
                            style={styles.inputForm}
                            value={formAlerta.limite}
                            onChangeText={(t) => setFormAlerta({ ...formAlerta, limite: t })}
                            keyboardType="numeric"
                        />

                        <View style={styles.filaBotonesModal}>
                            <Pressable onPress={() => setModalAlertaVisible(false)} style={{ marginRight: 20 }}>
                                <Text style={styles.textoBotonGrisModal}>CANCELAR</Text>
                            </Pressable>
                            <Pressable onPress={activarAlerta} disabled={guardandoAlerta}>
                                {guardandoAlerta ? <ActivityIndicator size="small" color="#900C3F" /> : <Text style={styles.textoBotonRojoModal}>ACTIVAR ALERTA</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>


            <Modal visible={modalFiltroVisible} transparent animationType="none">
                <Pressable style={styles.modalFondo} onPress={() => setModalFiltroVisible(false)}>
                    <View style={styles.dropdownCaja}>
                        {opcionesBrigada.map(op => (
                            <Pressable key={op} style={[styles.dropdownItem, filtroBrigada === op && { backgroundColor: '#1976D2' }]} onPress={() => { setFiltroBrigada(op); setModalFiltroVisible(false); }}>
                                <Text style={[styles.dropdownTexto, filtroBrigada === op && { color: '#FFF' }]}>{op}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F4F6F8' },

    // Header
    headerRojo: { backgroundColor: '#A91B0D', flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'center' },
    botonRegresar: { position: 'absolute', left: 15, zIndex: 1 },
    tituloHeader: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },

    scrollContainer: { padding: 15, paddingBottom: 40 },

    // Tarjetas Base
    tarjetaBlanca: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EAEDED', padding: 20, marginBottom: 20 },
    tituloTarjetaRojo: { fontSize: 13, fontWeight: 'bold', color: '#900C3F', letterSpacing: 1 },
    lineaDivisora: { height: 1, backgroundColor: '#EAEDED', marginVertical: 15 },

    // Gráfico
    contenedorGrafico: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 200, paddingTop: 20 },
    columnaBarra: { alignItems: 'center', width: 50 },
    valorBarra: { fontSize: 12, fontWeight: 'bold', color: '#34495E', marginBottom: 5 },
    barra: { width: 45, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    etiquetaBarra: { fontSize: 10, fontWeight: 'bold', color: '#7F8C8D', marginTop: 10, textAlign: 'center' },
    leyendaGrafico: { textAlign: 'center', fontSize: 10, color: '#95A5A6', textTransform: 'uppercase', letterSpacing: 1 },

    // Alertas
    filaCabeceraTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
    botonOscuro: { backgroundColor: '#2C3E50', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 4 },
    textoBotonBlanco: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
    tarjetaAlerta: { backgroundColor: '#F8F9FA', borderLeftWidth: 4, borderLeftColor: '#7F8C8D', padding: 15, borderRadius: 4, marginTop: 15, borderWidth: 1, borderColor: '#EAEDED' },
    alertaNombre: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50' },
    alertaCarnet: { fontSize: 11, color: '#95A5A6', marginTop: 2 },
    alertaDetalle: { fontSize: 12, color: '#34495E', marginTop: 8 },

    // Tabla Controles
    controlesTabla: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    selectorDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D5D8DC', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 4, backgroundColor: '#FFF' },
    textoDropdown: { fontSize: 11, color: '#333', marginRight: 5, fontWeight: 'bold' },
    inputBusqueda: { borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, width: 180, backgroundColor: '#FFF' },


    cabeceraTabla: { flexDirection: 'row', backgroundColor: '#2C3E50', paddingVertical: 12, paddingHorizontal: 10, marginTop: 15 },
    thTexto: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    filaTabla: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EAEDED' },
    tdTexto: { fontSize: 11, color: '#2C3E50' },


    filaBotonesExport: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 10 },
    botonExportarExcel: { backgroundColor: '#455A64', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 4, elevation: 2 },
    textoExportarBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },
    botonExportarPDF: { backgroundColor: '#FFF', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 4, borderWidth: 1, borderColor: '#900C3F', elevation: 2 },
    textoExportarRojo: { color: '#900C3F', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },

    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalTarjeta: { width: '85%', backgroundColor: '#FFF', borderRadius: 8, padding: 25, elevation: 5 },
    tituloModalRojo: { fontSize: 16, fontWeight: 'bold', color: '#900C3F', letterSpacing: 1 },
    labelForm: { fontSize: 10, fontWeight: 'bold', color: '#34495E', marginTop: 15, marginBottom: 5 },
    inputForm: { borderBottomWidth: 1, borderBottomColor: '#D5D8DC', paddingVertical: 5, fontSize: 14, color: '#2C3E50' },
    filaBotonesModal: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30 },
    textoBotonGrisModal: { color: '#7F8C8D', fontWeight: 'bold', fontSize: 13 },
    textoBotonRojoModal: { color: '#900C3F', fontWeight: 'bold', fontSize: 13 },


    dropdownCaja: { backgroundColor: '#FFF', width: 200, borderRadius: 4, elevation: 5, position: 'absolute', top: '40%', alignSelf: 'center' },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F4' },
    dropdownTexto: { fontSize: 12, color: '#333' }
});