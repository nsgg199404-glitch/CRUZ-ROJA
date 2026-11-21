import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator,
    TextInput, ScrollView, Modal, Platform, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '@/lib/firebase';

export default function BitacoraScreen() {
    const [vista, setVista] = useState<'historial' | 'nueva' | 'detalle'>('historial');
    const [atenciones, setAtenciones] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [usuario, setUsuario] = useState<any>(null);

    // ESTADO PARA EL DETALLE Y EDICIÓN
    const [reporteSeleccionado, setReporteSeleccionado] = useState<any>(null);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [ultimoKmEntrada, setUltimoKmEntrada] = useState('');

    // ESTADOS DEL FORMULARIO
    const [tipoAtencion, setTipoAtencion] = useState<'medica' | 'social'>('medica');
    const [unidad, setUnidad] = useState('');
    const [tipoEmergencia, setTipoEmergencia] = useState('');
    const [cantidadPacientes, setCantidadPacientes] = useState(1);
    const [pacientes, setPacientes] = useState([{ nombre: '', edad: '' }]);
    const [descripcionSocial, setDescripcionSocial] = useState('');
    const [lugarDestino, setLugarDestino] = useState('');
    const [horaSalida, setHoraSalida] = useState('');
    const [horaEntrada, setHoraEntrada] = useState('');
    const [kmSalida, setKmSalida] = useState('');
    const [kmEntrada, setKmEntrada] = useState('');
    const [motorista, setMotorista] = useState('');
    const [personalAPH, setPersonalAPH] = useState('');
    const [ajusteKm, setAjusteKm] = useState('0.0');

    // ESTADOS DE LOS MODALES (Dropdowns)
    const [modalVisible, setModalVisible] = useState<{ visible: boolean, tipo: string }>({ visible: false, tipo: '' });

    // ESTADOS PARA EL NUEVO RELOJ SELECTOR
    const [modalRelojVisible, setModalRelojVisible] = useState<{ visible: boolean, tipo: 'salida' | 'entrada' | '' }>({ visible: false, tipo: '' });
    const [horaSeleccionada, setHoraSeleccionada] = useState('00');
    const [minutoSeleccionado, setMinutoSeleccionado] = useState('00');

    const opcionesUnidad = ['CR-237', 'CR-55', 'CR-4', 'Vehículo Particular', 'Ninguno (En Seccional)'];
    const opcionesEmergencia = [
        'Accidente de Tránsito', 'Enfermedad Común', 'Herida por Arma / Cortante', 'Quemaduras',
        'Traumatismo / Caída / Fractura', 'Ginecobstétrico / Parto', 'Intoxicación',
        'Curación (Solo Seccional)', 'Inyección (Solo Seccional)', 'Rescate Simple',
        'Rescate Vertical', 'Rescate Acuático', 'Rescate Profundo', 'Otro'
    ];
    const opcionesPacientes = [1, 2, 3, 4];

    useEffect(() => {
        cargarSesion();
        cargarAtenciones();
    }, []);

    async function cargarSesion() {
        const sesionString = await AsyncStorage.getItem('usuarioSesion');
        if (sesionString) setUsuario(JSON.parse(sesionString));
    }

    async function cargarAtenciones() {
        setCargando(true);
        try {
            const q = query(collection(db, 'bitacora_atenciones'));
            const snapshot = await getDocs(q);
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            lista.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
            setAtenciones(lista);

            if (lista.length > 0 && lista[0].kmEntrada) {
                setUltimoKmEntrada(String(lista[0].kmEntrada));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCargando(false);
        }
    }

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };

    const limpiarFormulario = () => {
        setUnidad(''); setTipoEmergencia(''); setDescripcionSocial('');
        setLugarDestino(''); setHoraSalida(''); setHoraEntrada('');
        setKmSalida(ultimoKmEntrada);
        setKmEntrada(''); setMotorista(''); setPersonalAPH('');
        setPacientes([{ nombre: '', edad: '' }]);
        setEditandoId(null);
    };

    const abrirNuevoRegistro = () => {
        limpiarFormulario();
        setVista('nueva');
    };

    const cambiarCantidadPacientes = (cant: number) => {
        setCantidadPacientes(cant);
        const nuevos = [...pacientes];
        while (nuevos.length < cant) nuevos.push({ nombre: '', edad: '' });
        setPacientes(nuevos.slice(0, cant));
    };

    const actualizarPaciente = (index: number, campo: 'nombre' | 'edad', valor: string) => {
        const nuevos = [...pacientes];
        nuevos[index][campo] = valor;
        setPacientes(nuevos);
    };

    // FUNCIONES DEL RELOJ SELECTOR
    const abrirReloj = (tipo: 'salida' | 'entrada') => {
        const valorActual = tipo === 'salida' ? horaSalida : horaEntrada;

        if (valorActual && valorActual.includes(':')) {
            // Si ya hay hora guardada, abrimos el reloj en esa hora
            const [h, m] = valorActual.split(':');
            setHoraSeleccionada(h);
            setMinutoSeleccionado(m);
        } else {
            // Si está vacío, le ponemos la hora exacta del sistema (Muy útil para la vida real)
            const ahora = new Date();
            setHoraSeleccionada(ahora.getHours().toString().padStart(2, '0'));
            setMinutoSeleccionado(ahora.getMinutes().toString().padStart(2, '0'));
        }

        setModalRelojVisible({ visible: true, tipo });
    };

    const confirmarReloj = () => {
        const horaFinal = `${horaSeleccionada}:${minutoSeleccionado}`;
        if (modalRelojVisible.tipo === 'salida') setHoraSalida(horaFinal);
        else setHoraEntrada(horaFinal);
        setModalRelojVisible({ visible: false, tipo: '' });
    };

    async function guardarAtencion() {
        if (!unidad || !lugarDestino) {
            mostrarAlerta("Por favor, completa al menos la unidad y el lugar/destino.");
            return;
        }

        setCargando(true);
        try {
            const ahora = new Date();
            const fechaFormateada = ahora.toLocaleDateString('es-SV', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) + ' ' + ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

            let textoPacientes = "";
            if (tipoAtencion === 'medica') {
                textoPacientes = pacientes.filter(p => p.nombre.trim() !== '').map(p => `${p.nombre} (${p.edad} años)`).join(" / ");
            } else {
                textoPacientes = descripcionSocial;
            }

            const datos = {
                fechaHora: editandoId ? reporteSeleccionado.fechaHora : fechaFormateada,
                fotoUrl: "",
                horaEntrada: horaEntrada || "--:--",
                horaSalida: horaSalida || "--:--",
                kmEntrada: Number(kmEntrada) || 0,
                kmRegreso: 0,
                kmSalida: Number(kmSalida) || 0,
                lugar: lugarDestino,
                motorista: motorista,
                pacientes: textoPacientes,
                personal: personalAPH,
                timestamp: editandoId ? reporteSeleccionado.timestamp : ahora.getTime(),
                tipoServicio: tipoAtencion === 'medica' ? tipoEmergencia : 'Servicio Social',
                vehiculo: unidad
            };

            if (editandoId) {
                await updateDoc(doc(db, 'bitacora_atenciones', editandoId), datos);
                mostrarAlerta("¡Atención actualizada exitosamente!");
            } else {
                await addDoc(collection(db, 'bitacora_atenciones'), datos);
                mostrarAlerta("¡Atención guardada exitosamente!");
            }

            limpiarFormulario();
            setVista('historial');
            cargarAtenciones();
        } catch (error) {
            console.error(error);
            mostrarAlerta("Error al guardar la atención.");
        } finally {
            setCargando(false);
        }
    }

    const rolUsuario = usuario?.rol ? String(usuario.rol).toLowerCase() : '';
    const esAdmin = rolUsuario.includes('admin') || rolUsuario.includes('super');

    const habilitarEdicion = () => {
        setEditandoId(reporteSeleccionado.id);
        setTipoAtencion(reporteSeleccionado.tipoServicio === 'Servicio Social' ? 'social' : 'medica');
        setUnidad(reporteSeleccionado.vehiculo);
        setTipoEmergencia(reporteSeleccionado.tipoServicio);
        if (reporteSeleccionado.tipoServicio === 'Servicio Social') {
            setDescripcionSocial(reporteSeleccionado.pacientes);
        } else {
            setPacientes([{ nombre: reporteSeleccionado.pacientes, edad: '' }]);
        }
        setLugarDestino(reporteSeleccionado.lugar);
        setHoraSalida(reporteSeleccionado.horaSalida);
        setHoraEntrada(reporteSeleccionado.horaEntrada);
        setKmSalida(String(reporteSeleccionado.kmSalida));
        setKmEntrada(String(reporteSeleccionado.kmEntrada));
        setMotorista(reporteSeleccionado.motorista);
        setPersonalAPH(reporteSeleccionado.personal);
        setVista('nueva');
    };

    const eliminarRegistro = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm('¿Eliminar este registro definitivamente?')) ejecutarEliminacion();
        } else {
            Alert.alert("Confirmar", "¿Eliminar este registro definitivamente?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Eliminar", onPress: ejecutarEliminacion, style: "destructive" }
            ]);
        }
    };

    const ejecutarEliminacion = async () => {
        try {
            await deleteDoc(doc(db, 'bitacora_atenciones', reporteSeleccionado.id));
            mostrarAlerta("Registro eliminado.");
            setVista('historial');
            cargarAtenciones();
        } catch (error) {
            mostrarAlerta("Error al eliminar.");
        }
    };

    const compartirReporte = async () => {
        const kmsTotales = (Number(reporteSeleccionado.kmEntrada) - Number(reporteSeleccionado.kmSalida)).toFixed(1);
        const mensaje = `*REPORTE DE ATENCIÓN*\n\n*Fecha:* ${reporteSeleccionado.fechaHora}\n*Unidad:* ${reporteSeleccionado.vehiculo}\n*Emergencia:* ${reporteSeleccionado.tipoServicio}\n\n*Personal:*\nMotorista: ${reporteSeleccionado.motorista}\nAPH: ${reporteSeleccionado.personal}\n\n*Paciente/Actividad:*\n${reporteSeleccionado.pacientes}\n*Destino:* ${reporteSeleccionado.lugar}\n\n*Kilometraje Total:* ${kmsTotales} Km`;
        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        try {
            await Linking.openURL(url);
        } catch {
            mostrarAlerta('No se pudo abrir WhatsApp.');
        }
    };

    const renderModalSelector = () => {
        let titulo = ''; let opciones: any[] = [];
        if (modalVisible.tipo === 'unidad') { titulo = 'Unidad / Vehículo'; opciones = opcionesUnidad; }
        else if (modalVisible.tipo === 'emergencia') { titulo = 'Tipo de Emergencia'; opciones = opcionesEmergencia; }
        else if (modalVisible.tipo === 'pacientes') { titulo = 'Cantidad de Pacientes'; opciones = opcionesPacientes; }

        return (
            <Modal visible={modalVisible.visible} transparent animationType="fade">
                <Pressable style={styles.modalFondo} onPress={() => setModalVisible({ visible: false, tipo: '' })}>
                    <View style={styles.modalCaja}>
                        <Text style={styles.modalTitulo}>{titulo}</Text>
                        <FlatList
                            data={opciones}
                            keyExtractor={(item) => item.toString()}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.modalOpcion}
                                    onPress={() => {
                                        if (modalVisible.tipo === 'unidad') setUnidad(item as string);
                                        if (modalVisible.tipo === 'emergencia') setTipoEmergencia(item as string);
                                        if (modalVisible.tipo === 'pacientes') cambiarCantidadPacientes(item as number);
                                        setModalVisible({ visible: false, tipo: '' });
                                    }}
                                >
                                    <Text style={styles.modalTextoOpcion}>{item}</Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        );
    };

    const renderModalReloj = () => {
        const horas = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
        const minutos = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

        return (
            <Modal visible={modalRelojVisible.visible} transparent animationType="slide">
                <View style={styles.modalFondo}>
                    <View style={styles.modalCajaReloj}>
                        <Text style={styles.modalTituloReloj}>Seleccionar Hora (24h)</Text>

                        <View style={styles.contenedorListasReloj}>
                            {/* COLUMNA DE HORAS */}
                            <View style={styles.columnaReloj}>
                                <Text style={styles.etiquetaReloj}>Hora</Text>
                                <FlatList
                                    data={horas}
                                    keyExtractor={item => item}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <Pressable style={[styles.celdaReloj, horaSeleccionada === item && styles.celdaRelojActiva]} onPress={() => setHoraSeleccionada(item)}>
                                            <Text style={[styles.textoReloj, horaSeleccionada === item && styles.textoRelojActiva]}>{item}</Text>
                                        </Pressable>
                                    )}
                                />
                            </View>

                            <Text style={styles.separadorReloj}>:</Text>

                            {/* COLUMNA DE MINUTOS */}
                            <View style={styles.columnaReloj}>
                                <Text style={styles.etiquetaReloj}>Minuto</Text>
                                <FlatList
                                    data={minutos}
                                    keyExtractor={item => item}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <Pressable style={[styles.celdaReloj, minutoSeleccionado === item && styles.celdaRelojActiva]} onPress={() => setMinutoSeleccionado(item)}>
                                            <Text style={[styles.textoReloj, minutoSeleccionado === item && styles.textoRelojActiva]}>{item}</Text>
                                        </Pressable>
                                    )}
                                />
                            </View>
                        </View>

                        <View style={styles.filaBotonesReloj}>
                            <Pressable style={styles.botonCancelarReloj} onPress={() => setModalRelojVisible({ visible: false, tipo: '' })}>
                                <Text style={styles.textoBotonCancelarReloj}>CANCELAR</Text>
                            </Pressable>
                            <Pressable style={styles.botonAceptarReloj} onPress={confirmarReloj}>
                                <Text style={styles.textoBotonAceptarReloj}>ACEPTAR</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    if (vista === 'detalle' && reporteSeleccionado) {
        const kmsCalculados = (Number(reporteSeleccionado.kmEntrada) - Number(reporteSeleccionado.kmSalida)).toFixed(1);

        return (
            <SafeAreaView style={styles.pantalla}>
                <View style={styles.topBar}>
                    <Pressable onPress={() => setVista('historial')} style={styles.botonRegresar}><Text style={styles.textoRegresar}>←</Text></Pressable>
                    <Text style={styles.tituloPagina}>DETALLE DE REPORTE</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
                    <View style={styles.cajaDetalle}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 8, marginBottom: 8 }}>
                            <View>
                                <Text style={styles.labelRojoChico}>FECHA</Text>
                                <Text style={styles.textoNegroFuerte}>{reporteSeleccionado.fechaHora}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.labelRojoChico}>UNIDAD</Text>
                                <Text style={[styles.textoNegroFuerte, { fontSize: 18 }]}>{reporteSeleccionado.vehiculo}</Text>
                            </View>
                        </View>
                        <Text style={styles.labelRojoChico}>TIPO DE EMERGENCIA:</Text>
                        <Text style={styles.textoNegroFuerte}>{reporteSeleccionado.tipoServicio}</Text>
                    </View>

                    <Text style={styles.tituloGris}>PERSONAL A CARGO</Text>
                    <View style={styles.cajaDetalle}>
                        <Text style={styles.labelNegroChico}>MOTORISTA:</Text>
                        <Text style={styles.textoGrisChico}>{reporteSeleccionado.motorista || 'No registrado'}</Text>
                        <View style={styles.lineaDivisoria} />
                        <Text style={styles.labelNegroChico}>PERSONAL APH:</Text>
                        <Text style={styles.textoGrisChico}>{reporteSeleccionado.personal || 'No registrado'}</Text>
                    </View>

                    <Text style={styles.tituloGris}>DATOS DEL PACIENTE</Text>
                    <View style={styles.cajaDetalle}>
                        <Text style={styles.labelNegroChico}>NOMBRE / ACTIVIDAD:</Text>
                        <Text style={styles.textoGrisChico}>{reporteSeleccionado.pacientes}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 10 }}>
                            <View style={{ flex: 1 }}><Text style={styles.labelNegroChico}>EDAD:</Text><Text style={styles.textoGrisChico}>--</Text></View>
                            <View style={{ flex: 1 }}><Text style={styles.labelNegroChico}>CANTIDAD:</Text><Text style={styles.textoGrisChico}>1</Text></View>
                        </View>
                    </View>

                    <Text style={styles.tituloGris}>LUGAR / DESTINO</Text>
                    <View style={styles.cajaDetalle}><Text style={styles.textoGrisChico}>{reporteSeleccionado.lugar}</Text></View>

                    <Text style={styles.tituloRojoGris}>TIEMPOS Y KILOMETRAJE</Text>
                    <View style={styles.cajaDetalle}>
                        <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                            <View style={{ flex: 1 }}><Text style={styles.labelGrisClaro}>Hora Salida</Text><Text style={styles.textoNegroFuerte}>{reporteSeleccionado.horaSalida}</Text></View>
                            <View style={{ flex: 1 }}><Text style={styles.labelGrisClaro}>Km Salida</Text><Text style={styles.textoNegroFuerte}>{reporteSeleccionado.kmSalida}</Text></View>
                        </View>
                        <View style={{ flexDirection: 'row', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
                            <View style={{ flex: 1 }}><Text style={styles.labelGrisClaro}>Hora Entrada</Text><Text style={styles.textoNegroFuerte}>{reporteSeleccionado.horaEntrada}</Text></View>
                            <View style={{ flex: 1 }}><Text style={styles.labelGrisClaro}>Km Entrada</Text><Text style={styles.textoNegroFuerte}>{reporteSeleccionado.kmEntrada}</Text></View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                            <Text style={styles.textoAzulChico}>(+) Ajuste: </Text>
                            <TextInput style={styles.inputAjuste} value={ajusteKm} onChangeText={setAjusteKm} editable={false} />
                            <Text style={styles.textoTotalKm}>TOTAL: <Text style={{ color: '#4CAF50' }}>{kmsCalculados} Km</Text></Text>
                        </View>
                    </View>

                    <Pressable style={styles.botonCompartir} onPress={compartirReporte}>
                        <Text style={styles.textoBotonBlanco}>COMPARTIR REPORTE</Text>
                    </Pressable>

                    {esAdmin && (
                        <>
                            <Pressable style={styles.botonEditar} onPress={habilitarEdicion}>
                                <Text style={styles.textoBotonBlanco}>HABILITAR EDICIÓN</Text>
                            </Pressable>
                            <Pressable style={styles.botonEliminar} onPress={eliminarRegistro}>
                                <Text style={styles.textoBotonBlanco}>ELIMINAR REGISTRO</Text>
                            </Pressable>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (vista === 'nueva') {
        return (
            <SafeAreaView style={styles.pantalla}>
                <View style={styles.topBar}>
                    <Pressable onPress={() => { setVista('historial'); limpiarFormulario(); }} style={styles.botonRegresar}><Text style={styles.textoRegresar}>←</Text></Pressable>
                    <Text style={styles.tituloPagina}>{editandoId ? 'EDITAR ATENCIÓN' : 'NUEVA ATENCIÓN'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.formularioScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                    <Text style={styles.labelFuerte}>SELECCIONE EL TIPO:</Text>
                    <View style={styles.filaRadios}>
                        <Pressable style={styles.radioBtn} onPress={() => setTipoAtencion('medica')}>
                            <View style={styles.circuloExterior}>{tipoAtencion === 'medica' && <View style={styles.circuloInterior} />}</View>
                            <Text style={styles.textoRadio}>Atención Médica</Text>
                        </Pressable>
                        <Pressable style={styles.radioBtn} onPress={() => setTipoAtencion('social')}>
                            <View style={styles.circuloExterior}>{tipoAtencion === 'social' && <View style={styles.circuloInterior} />}</View>
                            <Text style={styles.textoRadio}>Servicio Social</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.labelFuerte}>Unidad / Vehículo:</Text>
                    <Pressable style={styles.selector} onPress={() => setModalVisible({ visible: true, tipo: 'unidad' })}>
                        <Text style={styles.textoSelector}>{unidad || 'Seleccione la unidad...'}</Text>
                    </Pressable>

                    {tipoAtencion === 'medica' ? (
                        <>
                            <Text style={styles.labelFuerte}>Tipo de Emergencia / Servicio:</Text>
                            <Pressable style={styles.selector} onPress={() => setModalVisible({ visible: true, tipo: 'emergencia' })}>
                                <Text style={styles.textoSelector}>{tipoEmergencia || 'Seleccione el tipo...'}</Text>
                            </Pressable>

                            <Text style={styles.labelFuerte}>Cantidad de Pacientes:</Text>
                            <Pressable style={styles.selector} onPress={() => setModalVisible({ visible: true, tipo: 'pacientes' })}>
                                <Text style={styles.textoSelector}>{cantidadPacientes} {cantidadPacientes === 1 ? 'Paciente' : 'Pacientes'}</Text>
                            </Pressable>

                            {pacientes.map((paciente, idx) => (
                                <View key={idx} style={styles.seccionPaciente}>
                                    <Text style={styles.labelRojoFuerte}>PACIENTE {idx + 1}</Text>
                                    <TextInput style={styles.inputBorderRed} placeholder="Nombre Completo" value={paciente.nombre} onChangeText={(txt) => actualizarPaciente(idx, 'nombre', txt)} />
                                    <TextInput style={styles.inputBorderRed} placeholder="Edad" value={paciente.edad} keyboardType="numeric" onChangeText={(txt) => actualizarPaciente(idx, 'edad', txt)} />
                                </View>
                            ))}
                        </>
                    ) : (
                        <View style={styles.seccionPaciente}>
                            <TextInput style={[styles.inputBorderRed, { height: 100 }]} placeholder="Descripción de la Actividad Social" value={descripcionSocial} onChangeText={setDescripcionSocial} multiline textAlignVertical="top" />
                        </View>
                    )}

                    <TextInput style={styles.inputBorderRed} placeholder="Lugar / Destino" value={lugarDestino} onChangeText={setLugarDestino} />

                    {/* NUEVA IMPLEMENTACIÓN DE BOTONES DE HORA */}
                    <View style={styles.filaInputs}>
                        <Pressable
                            style={[styles.inputBorderRed, { flex: 1, marginRight: 10, justifyContent: 'center' }]}
                            onPress={() => abrirReloj('salida')}
                        >
                            <Text style={{ color: horaSalida ? '#000' : '#9E9E9E', fontSize: 15 }}>
                                {horaSalida || 'Hora Salida (24h)'}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.inputBorderRed, { flex: 1, justifyContent: 'center' }]}
                            onPress={() => abrirReloj('entrada')}
                        >
                            <Text style={{ color: horaEntrada ? '#000' : '#9E9E9E', fontSize: 15 }}>
                                {horaEntrada || 'Hora Entrada (24h)'}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.filaInputs}>
                        <TextInput style={[styles.inputBorderRed, { flex: 1, marginRight: 10 }]} placeholder="Km Salida" value={kmSalida} onChangeText={setKmSalida} keyboardType="numeric" />
                        <TextInput style={[styles.inputBorderRed, { flex: 1 }]} placeholder="Km Entrada" value={kmEntrada} onChangeText={setKmEntrada} keyboardType="numeric" />
                    </View>

                    <Text style={styles.labelFuerte}>Motorista:</Text>
                    <TextInput style={styles.inputGris} placeholder="Nombre del motorista" value={motorista} onChangeText={setMotorista} />

                    <Text style={styles.labelFuerte}>Personal APH:</Text>
                    <TextInput style={styles.inputGris} placeholder="Separe con comas (Ej: Kevin, Henry)" value={personalAPH} onChangeText={setPersonalAPH} />

                    <Pressable style={styles.botonGuardar} onPress={guardarAtencion} disabled={cargando}>
                        <Text style={styles.textoBotonGuardar}>{cargando ? 'GUARDANDO...' : (editandoId ? 'ACTUALIZAR ATENCIÓN' : 'GUARDAR ATENCIÓN')}</Text>
                    </Pressable>
                </ScrollView>
                {renderModalSelector()}
                {renderModalReloj()}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.topBar}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}><Text style={styles.textoRegresar}>←</Text></Pressable>
                <Text style={styles.tituloPagina}>HISTORIAL DE ATENCIONES</Text>
                <View style={{ width: 40 }} />
            </View>

            {cargando ? (
                <View style={styles.centrado}><ActivityIndicator size="large" color="#C8102E" /></View>
            ) : (
                <FlatList
                    data={atenciones}
                    contentContainerStyle={{ padding: 15, paddingBottom: 80 }}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.tarjetaHistorial}
                            onPress={() => {
                                setReporteSeleccionado(item);
                                setVista('detalle');
                            }}
                        >
                            <View style={styles.historialHeader}>
                                <Text style={styles.textoFecha}>{item.fechaHora}</Text>
                                <Text style={styles.textoUnidad}>{item.vehiculo}</Text>
                            </View>
                            <Text style={styles.textoEmergencia}>{item.tipoServicio}</Text>
                            <Text style={styles.textoDetalleInfo}>
                                {item.tipoServicio === 'Servicio Social' ? `Actividad: ${item.pacientes}` : `Paciente: ${item.pacientes || 'Sin registrar'}`}
                            </Text>
                            <Text style={styles.textoDetalleInfo}>Destino: {item.lugar}</Text>
                        </Pressable>
                    )}
                />
            )}

            <Pressable style={styles.fab} onPress={abrirNuevoRegistro}>
                <MaterialIcons name="add" size={32} color="#FFF" />
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F0F2F5' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#FFF', elevation: 2 },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#212121', fontSize: 24, fontWeight: 'bold' },
    tituloPagina: { fontSize: 18, fontWeight: 'bold', color: '#C8102E' },

    tarjetaHistorial: { backgroundColor: '#FFF', borderRadius: 8, padding: 15, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
    historialHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    textoFecha: { color: '#C8102E', fontSize: 13, fontWeight: 'bold' },
    textoUnidad: { color: '#212121', fontSize: 14, fontWeight: 'bold' },
    textoEmergencia: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 5 },
    textoDetalleInfo: { fontSize: 13, color: '#424242', marginTop: 2 },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#C8102E', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },

    formularioScroll: { paddingHorizontal: 20, paddingTop: 15 },
    labelFuerte: { fontSize: 14, fontWeight: 'bold', color: '#000', marginTop: 15, marginBottom: 10 },
    labelRojoFuerte: { fontSize: 13, fontWeight: 'bold', color: '#C8102E', marginTop: 10, marginBottom: 10 },

    filaRadios: { flexDirection: 'row', marginBottom: 10 },
    radioBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    circuloExterior: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#C8102E', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    circuloInterior: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C8102E' },
    textoRadio: { fontSize: 14, color: '#212121' },

    selector: { backgroundColor: '#FFF', padding: 15, borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 5 },
    textoSelector: { fontSize: 15, color: '#212121' },
    seccionPaciente: { marginTop: 10 },
    filaInputs: { flexDirection: 'row', marginTop: 10 },

    inputBorderRed: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#B0BEC5', borderRadius: 6, padding: 12, fontSize: 15, marginBottom: 10, minHeight: 50 },
    inputGris: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 6, padding: 12, fontSize: 15, marginBottom: 5 },
    botonGuardar: { backgroundColor: '#C8102E', padding: 16, borderRadius: 6, alignItems: 'center', marginTop: 25 },
    textoBotonGuardar: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCaja: { width: '100%', backgroundColor: '#FFF', borderRadius: 8, maxHeight: '80%', paddingVertical: 10 },
    modalTitulo: { fontSize: 16, fontWeight: 'bold', color: '#C8102E', textAlign: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
    modalOpcion: { paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    modalTextoOpcion: { fontSize: 16, color: '#212121' },

    // ESTILOS DEL RELOJ
    modalCajaReloj: { width: '85%', backgroundColor: '#FFF', borderRadius: 8, paddingVertical: 15, paddingHorizontal: 20 },
    modalTituloReloj: { fontSize: 16, fontWeight: 'bold', color: '#C8102E', textAlign: 'center', marginBottom: 15 },
    contenedorListasReloj: { flexDirection: 'row', height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    columnaReloj: { flex: 1, alignItems: 'center' },
    etiquetaReloj: { fontSize: 12, color: '#757575', marginBottom: 5, fontWeight: 'bold' },
    separadorReloj: { fontSize: 30, fontWeight: 'bold', color: '#212121', paddingHorizontal: 15, marginTop: 15 },
    celdaReloj: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, marginVertical: 2 },
    celdaRelojActiva: { backgroundColor: '#C8102E' },
    textoReloj: { fontSize: 20, color: '#212121' },
    textoRelojActiva: { color: '#FFF', fontWeight: 'bold' },
    filaBotonesReloj: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 15 },
    botonCancelarReloj: { paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
    textoBotonCancelarReloj: { color: '#757575', fontWeight: 'bold', fontSize: 14 },
    botonAceptarReloj: { backgroundColor: '#C8102E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
    textoBotonAceptarReloj: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

    // ESTILOS VISTA DETALLE
    tituloGris: { fontSize: 13, fontWeight: 'bold', color: '#757575', marginTop: 15, marginBottom: 5, marginLeft: 5 },
    tituloRojoGris: { fontSize: 13, fontWeight: 'bold', color: '#C8102E', marginTop: 15, marginBottom: 5, marginLeft: 5 },
    cajaDetalle: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#B0BEC5', padding: 15 },
    labelRojoChico: { color: '#C8102E', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    textoNegroFuerte: { color: '#212121', fontSize: 15, fontWeight: 'bold' },
    labelNegroChico: { color: '#212121', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
    textoGrisChico: { color: '#424242', fontSize: 15 },
    lineaDivisoria: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 10 },
    labelGrisClaro: { color: '#9E9E9E', fontSize: 11, marginBottom: 2 },
    textoAzulChico: { color: '#1976D2', fontSize: 13, fontWeight: 'bold' },
    inputAjuste: { backgroundColor: '#E0E0E0', width: 50, padding: 4, textAlign: 'center', borderRadius: 4, marginRight: 15, color: '#757575' },
    textoTotalKm: { fontSize: 14, fontWeight: 'bold', color: '#212121' },

    botonCompartir: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 6, alignItems: 'center', marginTop: 25, marginBottom: 10 },
    botonEditar: { backgroundColor: '#2196F3', padding: 15, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
    botonEliminar: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
    textoBotonBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});