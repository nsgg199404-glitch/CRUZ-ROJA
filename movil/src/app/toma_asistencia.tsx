import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    TextInput, ScrollView, Platform, Alert, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '@/lib/firebase';

export default function TomaAsistenciaScreen() {
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [fechaHoyStr, setFechaHoyStr] = useState('');
    const [fechaExacta, setFechaExacta] = useState('');
    const [brigadaTurno, setBrigadaTurno] = useState('Sin Asignar');


    const [asistencias, setAsistencias] = useState<any[]>([]);


    const [modalBusquedaVisible, setModalBusquedaVisible] = useState(false);
    const [textoBusqueda, setTextoBusqueda] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
    const [buscandoApoyo, setBuscandoApoyo] = useState(false);

    useEffect(() => {
        inicializarPantalla();
    }, []);

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };





    async function inicializarPantalla() {
        setCargando(true);
        try {

            const hoy = new Date();
            const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
            const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

            const diaSemana = dias[hoy.getDay()];
            const diaNumero = hoy.getDate();
            const mesNombre = meses[hoy.getMonth()];
            const anio = hoy.getFullYear();

            setFechaHoyStr(`${diaSemana}, ${diaNumero} DE ${mesNombre} DE ${anio}`);

            const mmF = String(hoy.getMonth() + 1).padStart(2, '0');
            const ddF = String(hoy.getDate()).padStart(2, '0');
            setFechaExacta(`${ddF}-${mmF}-${anio}`);


            let brigada = 'Sin Asignar';


            if (hoy.getDay() === 0 || hoy.getDay() === 6) {
                brigada = 'Fin de Semana';
            } else {

                const fechaAncla = new Date(2026, 9, 12);
                fechaAncla.setHours(0, 0, 0, 0);

                const fechaActual = new Date(hoy);
                fechaActual.setHours(0, 0, 0, 0);

                let diasDiferencia = 0;


                if (fechaActual >= fechaAncla) {
                    let temp = new Date(fechaAncla);
                    while (temp < fechaActual) {
                        temp.setDate(temp.getDate() + 1);
                        if (temp.getDay() !== 0 && temp.getDay() !== 6) diasDiferencia++;
                    }
                } else {
                    let temp = new Date(fechaActual);
                    while (temp < fechaAncla) {
                        temp.setDate(temp.getDate() + 1);
                        if (temp.getDay() !== 0 && temp.getDay() !== 6) diasDiferencia--;
                    }
                }


                const indiceAncla = 1;
                let indiceFinal = (indiceAncla + diasDiferencia) % 4;


                if (indiceFinal < 0) indiceFinal += 4;

                const brigadasSemana = ['Brigada 1', 'Brigada 2', 'Brigada 3', 'Brigada 4'];
                brigada = brigadasSemana[indiceFinal];
            }

            setBrigadaTurno(brigada);

            // 3. Cargar Voluntarios de esa Brigada
            await cargarVoluntariosBrigada(brigada);

        } catch (error) {
            console.error(error);
            mostrarAlerta('Error al inicializar la pantalla.');
        } finally {
            setCargando(false);
        }
    }

    async function cargarVoluntariosBrigada(brigada: string) {
        try {
            const q = query(collection(db, 'usuarios'), where('brigada', '==', brigada));
            const snap = await getDocs(q);

            const listaBase = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    carnet: data.carnet,
                    nombre: data.nombre,
                    estado: 'Falta',
                    horaEntrada: '--:--',
                    horaSalida: '--:--',
                    horasCalculadas: 0,
                    esApoyo: false
                };
            });


            listaBase.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setAsistencias(listaBase);
        } catch (error) {
            console.error("Error cargando voluntarios de la brigada:", error);
        }
    }



    const actualizarAsistencia = (index: number, campo: string, valor: any) => {
        const nuevasAsistencias = [...asistencias];
        nuevasAsistencias[index][campo] = valor;


        if (campo === 'estado' && valor === 'Asiste') {
            if (nuevasAsistencias[index].horaEntrada === '--:--' && nuevasAsistencias[index].horaSalida === '--:--') {
                nuevasAsistencias[index].horaEntrada = '06:00 PM';
                nuevasAsistencias[index].horaSalida = '06:00 AM';
                nuevasAsistencias[index].horasCalculadas = 12;
            }
        }

        else if (campo === 'estado' && valor !== 'Asiste') {
            nuevasAsistencias[index].horaEntrada = '--:--';
            nuevasAsistencias[index].horaSalida = '--:--';
            nuevasAsistencias[index].horasCalculadas = 0;
        }


        if (campo === 'horaEntrada' || campo === 'horaSalida') {

        }

        setAsistencias(nuevasAsistencias);
    };


    async function guardarAsistencias() {
        setGuardando(true);
        try {

            const lotePromesas = asistencias.map(async (asist) => {
                if (asist.estado === 'Asiste') {

                    const idRegistro = `${fechaExacta}_${asist.carnet}`;
                    const [dd, mm, yyyy] = fechaExacta.split('-');
                    const fechaMesAnio = `${mm}/${yyyy}`;

                    await setDoc(doc(db, 'registro_horas', idRegistro), {
                        carnet: asist.carnet,
                        nombre: asist.nombre,
                        brigada: asist.esApoyo ? 'Apoyo' : brigadaTurno,
                        fechaExacta: fechaExacta,
                        fecha: fechaMesAnio,
                        horaEntrada: asist.horaEntrada,
                        horaSalida: asist.horaSalida,
                        horasTrabajadas: asist.horasCalculadas,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            await Promise.all(lotePromesas);


            const idResumen = `${fechaExacta}_${brigadaTurno.replace(/\s/g, '').toUpperCase()}`;
            const detallesResumen: any = {};
            asistencias.forEach(a => {
                detallesResumen[a.carnet] = a.estado.toUpperCase();
            });

            await setDoc(doc(db, 'asistencias', idResumen), {
                fecha: fechaExacta,
                brigada: brigadaTurno,
                totalVoluntarios: asistencias.length,
                detalles: detallesResumen,
                timestamp: new Date().toISOString()
            });

            mostrarAlerta('Asistencias guardadas correctamente.');
            router.back();

        } catch (error) {
            console.error(error);
            mostrarAlerta('Error al guardar asistencias.');
        } finally {
            setGuardando(false);
        }
    }




    async function buscarVoluntarioApoyo() {
        if (textoBusqueda.trim() === '') return;

        setBuscandoApoyo(true);
        try {
            const snap = await getDocs(collection(db, 'usuarios'));
            const textoLimpio = textoBusqueda.toLowerCase().trim();

            const filtrados = snap.docs
                .map(doc => doc.data())
                .filter(u =>
                    (u.nombre && u.nombre.toLowerCase().includes(textoLimpio)) ||
                    (u.carnet && u.carnet.toString().includes(textoLimpio))
                );

            setResultadosBusqueda(filtrados);
        } catch (error) {
            console.error(error);
        } finally {
            setBuscandoApoyo(false);
        }
    }

    function agregarVoluntarioApoyo(voluntario: any) {
        // Verificar si ya está en la lista
        if (asistencias.find(a => a.carnet === voluntario.carnet)) {
            mostrarAlerta('Este voluntario ya está en la lista de hoy.');
            return;
        }

        const nuevoRegistro = {
            carnet: voluntario.carnet,
            nombre: voluntario.nombre,
            estado: 'Asiste',
            horaEntrada: '06:00 PM',
            horaSalida: '06:00 AM',
            horasCalculadas: 12,
            esApoyo: true
        };

        setAsistencias([nuevoRegistro, ...asistencias]);
        setModalBusquedaVisible(false);
        setTextoBusqueda('');
        setResultadosBusqueda([]);
    }



    return (
        <SafeAreaView style={styles.pantalla}>


            <View style={styles.headerRojo}>
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                        <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                    </Pressable>
                    <View>
                        <Text style={styles.textoFechaCabecera}>{fechaHoyStr}</Text>
                        <Text style={styles.textoBrigadaCabecera}>TURNO AUTOMÁTICO: <Text style={{ fontWeight: 'bold' }}>{brigadaTurno.toUpperCase()}</Text></Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>


                <Pressable style={styles.botonAzul} onPress={() => setModalBusquedaVisible(true)}>
                    <Text style={styles.textoBotonAzul}>+ AGREGAR VOLUNTARIO DE APOYO</Text>
                </Pressable>

                {cargando ? (
                    <ActivityIndicator size="large" color="#C8102E" style={{ marginTop: 50 }} />
                ) : (
                    <View style={styles.listaTarjetas}>
                        {asistencias.map((item, index) => (
                            <View key={item.carnet} style={styles.tarjetaAsistencia}>
                                <Text style={styles.nombreVoluntario}>{item.nombre} {item.esApoyo && <Text style={{ color: '#3498DB', fontSize: 12 }}>(Apoyo)</Text>}</Text>
                                <Text style={styles.carnetVoluntario}>Carnet: {item.carnet}</Text>


                                <View style={styles.filaRadios}>
                                    <Pressable style={styles.radioContainer} onPress={() => actualizarAsistencia(index, 'estado', 'Asiste')}>
                                        <MaterialIcons name={item.estado === 'Asiste' ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={item.estado === 'Asiste' ? "#C8102E" : "#BDC3C7"} />
                                        <Text style={styles.textoRadio}>Asiste</Text>
                                    </Pressable>
                                    <Pressable style={styles.radioContainer} onPress={() => actualizarAsistencia(index, 'estado', 'Permiso')}>
                                        <MaterialIcons name={item.estado === 'Permiso' ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={item.estado === 'Permiso' ? "#C8102E" : "#BDC3C7"} />
                                        <Text style={styles.textoRadio}>Permiso</Text>
                                    </Pressable>
                                    <Pressable style={styles.radioContainer} onPress={() => actualizarAsistencia(index, 'estado', 'Falta')}>
                                        <MaterialIcons name={item.estado === 'Falta' ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={item.estado === 'Falta' ? "#C8102E" : "#BDC3C7"} />
                                        <Text style={styles.textoRadio}>Falta</Text>
                                    </Pressable>
                                </View>


                                <View style={styles.filaHoras}>
                                    <View style={styles.cajaHora}>
                                        <Text style={styles.labelHora}>ENTRADA</Text>
                                        <TextInput
                                            style={[styles.inputHora, item.estado !== 'Asiste' && { backgroundColor: '#F2F4F4', color: '#BDC3C7' }]}
                                            value={item.horaEntrada}
                                            onChangeText={(t) => actualizarAsistencia(index, 'horaEntrada', t)}
                                            editable={item.estado === 'Asiste'}
                                        />
                                    </View>
                                    <View style={styles.cajaHora}>
                                        <Text style={styles.labelHora}>SALIDA</Text>
                                        <TextInput
                                            style={[styles.inputHora, item.estado !== 'Asiste' && { backgroundColor: '#F2F4F4', color: '#BDC3C7' }]}
                                            value={item.horaSalida}
                                            onChangeText={(t) => actualizarAsistencia(index, 'horaSalida', t)}
                                            editable={item.estado === 'Asiste'}
                                        />
                                    </View>
                                    <View style={styles.cajaCalculoHoras}>
                                        <Text style={styles.textoHorasCalculadas}>{item.horasCalculadas} hrs</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}


                {!cargando && asistencias.length > 0 && (
                    <Pressable style={styles.botonRojoGuardar} onPress={guardarAsistencias} disabled={guardando}>
                        {guardando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.textoBotonBlanco}>GUARDAR ASISTENCIA</Text>}
                    </Pressable>
                )}

            </ScrollView>


            <Modal visible={modalBusquedaVisible} transparent animationType="fade">
                <View style={styles.modalFondo}>
                    <View style={styles.modalBusquedaContainer}>

                        <View style={styles.modalBusquedaHeader}>
                            <Text style={styles.modalBusquedaTitulo}>BUSCAR VOLUNTARIO</Text>
                            <Pressable onPress={() => setModalBusquedaVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#FFF" />
                            </Pressable>
                        </View>

                        <View style={styles.modalBusquedaBody}>
                            <View style={styles.filaBusqueda}>
                                <TextInput
                                    style={styles.inputModalBusqueda}
                                    placeholder="Nombre o Carnet..."
                                    value={textoBusqueda}
                                    onChangeText={setTextoBusqueda}
                                    onSubmitEditing={buscarVoluntarioApoyo}
                                />
                                <Pressable style={styles.botonModalBuscar} onPress={buscarVoluntarioApoyo}>
                                    {buscandoApoyo ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name="search" size={24} color="#9B59B6" />}
                                </Pressable>
                            </View>

                            {resultadosBusqueda.length === 0 ? (
                                <Text style={styles.textoModalVacio}>Ingresa un nombre o carnet para buscar.</Text>
                            ) : (
                                <FlatList
                                    data={resultadosBusqueda}
                                    keyExtractor={(item) => item.carnet}
                                    style={{ maxHeight: 200, marginTop: 15 }}
                                    renderItem={({ item }) => (
                                        <Pressable style={styles.itemResultadoBusqueda} onPress={() => agregarVoluntarioApoyo(item)}>
                                            <Text style={styles.textoItemNombre}>{item.nombre}</Text>
                                            <Text style={styles.textoItemCarnet}>Carnet: {item.carnet}</Text>
                                        </Pressable>
                                    )}
                                />
                            )}
                        </View>

                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F4F6F7' },


    headerRojo: { backgroundColor: '#B71C1C', paddingVertical: 15, paddingHorizontal: 15 },
    headerBar: { flexDirection: 'row', alignItems: 'center' },
    botonRegresar: { marginRight: 15 },
    textoFechaCabecera: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    textoBrigadaCabecera: { color: '#FFF', fontSize: 13, marginTop: 2 },

    scrollContainer: { padding: 15, paddingBottom: 40 },


    botonAzul: { backgroundColor: '#218838', paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginBottom: 20 }, // Changed to green to stand out more, or you can keep it blue like the web image #3498DB
    textoBotonAzul: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },


    listaTarjetas: { marginBottom: 20 },
    tarjetaAsistencia: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#D5D8DC', padding: 15, marginBottom: 15 },
    nombreVoluntario: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
    carnetVoluntario: { fontSize: 12, color: '#7F8C8D', marginBottom: 15 },


    filaRadios: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
    radioContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15 },
    textoRadio: { marginLeft: 5, fontSize: 14, color: '#2C3E50' },


    filaHoras: { flexDirection: 'row', alignItems: 'flex-end' },
    cajaHora: { flex: 1, marginRight: 10 },
    labelHora: { fontSize: 10, fontWeight: 'bold', color: '#7F8C8D', marginBottom: -8, zIndex: 1, marginLeft: 10, backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 4 },
    inputHora: { borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: '#2C3E50', backgroundColor: '#F9FAFC' },
    cajaCalculoHoras: { width: 60, alignItems: 'center', paddingBottom: 10 },
    textoHorasCalculadas: { fontSize: 16, fontWeight: 'bold', color: '#B71C1C' },


    botonRojoGuardar: { backgroundColor: '#C8102E', paddingVertical: 16, borderRadius: 6, alignItems: 'center' },
    textoBotonBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },


    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalBusquedaContainer: { width: '90%', backgroundColor: '#FFF', borderRadius: 8, overflow: 'hidden' },
    modalBusquedaHeader: { backgroundColor: '#3498DB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
    modalBusquedaTitulo: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    modalBusquedaBody: { padding: 20 },
    filaBusqueda: { flexDirection: 'row', alignItems: 'center' },
    inputModalBusqueda: { flex: 1, borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 6, paddingHorizontal: 15, height: 45, fontSize: 15 },
    botonModalBuscar: { backgroundColor: '#3498DB', width: 45, height: 45, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    textoModalVacio: { textAlign: 'center', color: '#7F8C8D', marginTop: 20 },

    // Resultados Búsqueda
    itemResultadoBusqueda: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EAEDED' },
    textoItemNombre: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50' },
    textoItemCarnet: { fontSize: 12, color: '#7F8C8D' }
});