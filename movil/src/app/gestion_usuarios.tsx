import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    TextInput, ScrollView, Platform, Alert, FlatList, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '@/lib/firebase';

export default function GestionUsuariosScreen() {
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [usuarioSesion, setUsuarioSesion] = useState<any>(null);


    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [usuariosFiltrados, setUsuariosFiltrados] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroFilial, setFiltroFilial] = useState('VER TODOS');


    const [stats, setStats] = useState({ total: 0, socorrismo: 0, juventud: 0, otros: 0 });


    const [modalVisible, setModalVisible] = useState(false);
    const [esEdicion, setEsEdicion] = useState(false);

    const [form, setForm] = useState({
        nombre: '', filial: '', carnet: '', password: '', brigada: 'Sin Asignar', rol: 'Voluntario'
    });


    const [selector, setSelector] = useState<{ visible: boolean, tipo: string }>({ visible: false, tipo: '' });

    const opcionesFilial = ['Socorrismo', 'Juventud', 'Junta Local', 'Guardavidas', 'Damas Voluntarias', 'Servicio Social', 'Sin Asignar'];
    const opcionesFiltro = ['VER TODOS', ...opcionesFilial];
    const opcionesBrigada = ['Sin Asignar', 'Brigada 1', 'Brigada 2', 'Brigada 3', 'Brigada 4', 'Fin de Semana'];


    const esSuperAdminLogueado = usuarioSesion?.tipoMiembro === 'Superadmin' || usuarioSesion?.rol === 'Superadmin';
    const opcionesRol = esSuperAdminLogueado
        ? ['Voluntario', 'Jefe de Brigada', 'Administrador General', 'Superadmin']
        : ['Voluntario', 'Jefe de Brigada', 'Administrador General'];

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        aplicarFiltros();
    }, [busqueda, filtroFilial, usuarios]);

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };

    async function cargarDatos() {
        setCargando(true);
        try {
            const sesionString = await AsyncStorage.getItem('usuarioSesion');
            if (sesionString) setUsuarioSesion(JSON.parse(sesionString));

            const snap = await getDocs(collection(db, 'usuarios'));
            const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));


            lista.sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
            setUsuarios(lista);


            let soc = 0, juv = 0, otr = 0;
            lista.forEach((u: any) => {
                const fil = (u.filial || u.institucion || '').toLowerCase();
                if (fil.includes('socorrismo')) soc++;
                else if (fil.includes('juventud')) juv++;
                else otr++;
            });
            setStats({ total: lista.length, socorrismo: soc, juventud: juv, otros: otr });

        } catch (error) {
            console.error(error);
            mostrarAlerta('Error al cargar usuarios.');
        } finally {
            setCargando(false);
        }
    }

    function aplicarFiltros() {
        let filtrados = usuarios;

        if (filtroFilial !== 'VER TODOS') {
            filtrados = filtrados.filter(u => (u.filial || u.institucion || '').includes(filtroFilial));
        }

        if (busqueda.trim() !== '') {
            const texto = busqueda.toLowerCase();
            filtrados = filtrados.filter(u =>
                (u.nombre || '').toLowerCase().includes(texto) ||
                (u.carnet || '').toLowerCase().includes(texto)
            );
        }

        setUsuariosFiltrados(filtrados);
    }


    async function exportarPDF() {
        if (usuariosFiltrados.length === 0) {
            mostrarAlerta('No hay usuarios para exportar con los filtros actuales.');
            return;
        }

        try {
            let html = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h2 { text-align: center; color: #C8102E; text-transform: uppercase; }
                    .subtitle { text-align: center; color: #555; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                    th { background-color: #f2f2f2; color: #333; }
                </style>
            </head>
            <body>
                <h2>Listado de Personal APH</h2>
                <div class="subtitle">Cruz Roja Salvadoreña - Seccional Guazapa<br>Total Exportado: ${usuariosFiltrados.length}</div>
                <table>
                    <tr><th>N° Carnet</th><th>Nombre Completo</th><th>Filial / Cuerpo</th><th>Brigada / Rol</th></tr>
            `;

            usuariosFiltrados.forEach(u => {
                html += `<tr>
                    <td>${u.carnet || 'N/A'}</td>
                    <td>${u.nombre || 'Sin Nombre'}</td>
                    <td>${u.filial || u.institucion || 'Sin Asignar'}</td>
                    <td>${u.brigada || 'Sin Brigada'} - ${u.rol || u.tipoMiembro || 'Voluntario'}</td>
                </tr>`;
            });

            html += `</table></body></html>`;

            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Usuarios' });
                }
            }
        } catch (error) {
            mostrarAlerta('Error al generar PDF.');
        }
    }


    function abrirModalNuevo() {
        setEsEdicion(false);
        setForm({ nombre: '', filial: '', carnet: '', password: '', brigada: 'Sin Asignar', rol: 'Voluntario' });
        setModalVisible(true);
    }

    function abrirModalEditar(usuario: any) {
        setEsEdicion(true);
        setForm({
            nombre: usuario.nombre || '',
            filial: usuario.filial || usuario.institucion || '',
            carnet: usuario.carnet || '',
            password: usuario.password || '',
            brigada: usuario.brigada || 'Sin Asignar',
            rol: usuario.rol || usuario.tipoMiembro || 'Voluntario'
        });
        setModalVisible(true);
    }

    async function guardarUsuario() {
        if (!form.nombre || !form.carnet || !form.filial) {
            mostrarAlerta('Por favor llene el nombre, filial y carnet como mínimo.');
            return;
        }

        setGuardando(true);
        try {

            const idDoc = form.carnet.trim();
            const userData = {
                nombre: form.nombre,
                carnet: idDoc,
                filial: form.filial,
                password: form.password,
                brigada: form.brigada,
                rol: form.rol,
                tipoMiembro: form.rol
            };

            await setDoc(doc(db, 'usuarios', idDoc), userData, { merge: true });

            mostrarAlerta(`Usuario ${esEdicion ? 'actualizado' : 'creado'} exitosamente.`);
            setModalVisible(false);
            cargarDatos();
        } catch (error) {
            mostrarAlerta('Error al guardar el usuario.');
        } finally {
            setGuardando(false);
        }
    }

    function confirmarEliminar(id: string, nombre: string) {
        if (Platform.OS === 'web') {
            if (window.confirm(`¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
                eliminarUsuario(id);
            }
        } else {
            Alert.alert("Eliminar Usuario", `¿Estás seguro de eliminar a ${nombre}?`, [
                { text: "Cancelar", style: "cancel" },
                { text: "Eliminar", style: "destructive", onPress: () => eliminarUsuario(id) }
            ]);
        }
    }

    async function eliminarUsuario(id: string) {
        try {
            await deleteDoc(doc(db, 'usuarios', id));
            mostrarAlerta('Usuario eliminado.');
            cargarDatos();
        } catch (error) {
            mostrarAlerta('Error al eliminar.');
        }
    }


    const renderDropdownModal = () => {
        let opciones: string[] = [];
        if (selector.tipo === 'filtro') opciones = opcionesFiltro;
        else if (selector.tipo === 'filial') opciones = opcionesFilial;
        else if (selector.tipo === 'brigada') opciones = opcionesBrigada;
        else if (selector.tipo === 'rol') opciones = opcionesRol;

        return (
            <Modal visible={selector.visible} transparent animationType="fade">
                <Pressable style={styles.modalFondoDropdown} onPress={() => setSelector({ visible: false, tipo: '' })}>
                    <View style={styles.cajaDropdown}>
                        <FlatList
                            data={opciones}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <Pressable style={styles.opcionDropdown} onPress={() => {
                                    if (selector.tipo === 'filtro') setFiltroFilial(item);
                                    else setForm({ ...form, [selector.tipo]: item });
                                    setSelector({ visible: false, tipo: '' });
                                }}>
                                    <Text style={styles.textoOpcionDropdown}>{item}</Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.pantalla}>

            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
                <Text style={styles.tituloHeader}>GESTIÓN DE USUARIOS</Text>
            </View>


            <View style={styles.cajaRoja}>
                <Text style={styles.tituloCajaRoja}>FUERZA OPERATIVA</Text>
                <Text style={styles.textoTotal}>TOTAL PERSONAL: {stats.total}</Text>
                <Text style={styles.textoDesglose}>Socorrismo: {stats.socorrismo}   Juventud: {stats.juventud}   Otros: {stats.otros}</Text>
            </View>


            <View style={styles.cajaFiltros}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={styles.labelFiltro}>Filtrar por:  </Text>
                    <Pressable style={styles.selectorFiltro} onPress={() => setSelector({ visible: true, tipo: 'filtro' })}>
                        <Text style={styles.textoSelectorFiltro}>{filtroFilial}</Text>
                        <MaterialIcons name="arrow-drop-down" size={20} color="#333" />
                    </Pressable>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TextInput
                        style={styles.inputBusqueda}
                        placeholder="Buscar nombre o carnet..."
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />
                    <Pressable style={styles.botonExportar} onPress={exportarPDF}>
                        <Text style={styles.textoExportar}>EXPORTAR A PDF</Text>
                    </Pressable>
                </View>
            </View>


            {cargando ? (
                <ActivityIndicator size="large" color="#C8102E" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={usuariosFiltrados}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.tarjetaUsuario}>
                            <View style={styles.avatar}>
                                <MaterialIcons name="person" size={30} color="#5C5C5C" />
                            </View>
                            <View style={styles.infoUsuario}>
                                <Text style={styles.nombreUsuario}>{item.nombre}</Text>
                                <Text style={styles.filialUsuario}>{(item.brigada || 'SIN ASIGNAR').toUpperCase()} - {(item.filial || item.institucion || 'SIN FILIAL').toUpperCase()}</Text>
                                <Text style={styles.carnetUsuario}>Carnet: {item.carnet} | Rol: {item.rol || item.tipoMiembro || 'Voluntario'}</Text>
                            </View>
                            <View style={styles.accionesUsuario}>
                                <Pressable onPress={() => abrirModalEditar(item)} style={{ marginRight: 15 }}>
                                    <MaterialIcons name="edit" size={22} color="#E67E22" />
                                </Pressable>
                                <Pressable onPress={() => confirmarEliminar(item.id, item.nombre)}>
                                    <MaterialIcons name="delete" size={22} color="#95A5A6" />
                                </Pressable>
                            </View>
                        </View>
                    )}
                />
            )}


            <Pressable style={styles.fab} onPress={abrirModalNuevo}>
                <MaterialIcons name="add" size={30} color="#FFF" />
            </Pressable>


            <Modal visible={modalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
                    <View style={styles.headerBar}>
                        <Pressable onPress={() => setModalVisible(false)} style={styles.botonRegresar}>
                            <Text style={styles.textoRegresar}>←</Text>
                        </Pressable>
                        <Text style={styles.tituloHeader}>{esEdicion ? 'ACTUALIZAR USUARIO' : 'NUEVO USUARIO'}</Text>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 25 }}>

                        <Text style={styles.labelForm}>Nombre Completo</Text>
                        <TextInput style={styles.inputForm} value={form.nombre} onChangeText={(t) => setForm({ ...form, nombre: t })} />

                        <Text style={styles.labelForm}>Filial / Cuerpo:</Text>
                        <Pressable style={styles.inputForm} onPress={() => setSelector({ visible: true, tipo: 'filial' })}>
                            <Text>{form.filial || 'Seleccione una Filial...'}</Text>
                        </Pressable>

                        <Text style={styles.labelForm}>Número de Carnet</Text>
                        <TextInput
                            style={[styles.inputForm, esEdicion && { backgroundColor: '#EAECEE', color: '#7F8C8D' }]}
                            value={form.carnet}
                            onChangeText={(t) => setForm({ ...form, carnet: t })}
                            editable={!esEdicion} // Bloqueado si está editando
                        />
                        {esEdicion && <Text style={styles.notaForm}>El carnet no se puede modificar una vez registrado.</Text>}

                        <Text style={styles.labelForm}>Asignar Contraseña</Text>
                        <TextInput style={styles.inputForm} value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry />

                        <Text style={styles.labelForm}>Asignar Brigada:</Text>
                        <Pressable style={styles.inputForm} onPress={() => setSelector({ visible: true, tipo: 'brigada' })}>
                            <Text>{form.brigada}</Text>
                        </Pressable>

                        <Text style={styles.labelForm}>Rol / Jerarquía:</Text>
                        <Pressable style={styles.inputForm} onPress={() => setSelector({ visible: true, tipo: 'rol' })}>
                            <Text>{form.rol}</Text>
                        </Pressable>

                        <Pressable style={styles.botonGuardarForm} onPress={guardarUsuario} disabled={guardando}>
                            {guardando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.textoBotonForm}>{esEdicion ? 'ACTUALIZAR USUARIO' : 'CREAR CUENTA'}</Text>}
                        </Pressable>

                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {renderDropdownModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F0F3F4' },

    // Header
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#FFF' },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#C8102E', fontSize: 24, fontWeight: 'bold' },
    tituloHeader: { fontSize: 16, fontWeight: 'bold', color: '#C8102E', marginLeft: 10 },

    // Fuerza Operativa (Roja)
    cajaRoja: { backgroundColor: '#B71C1C', padding: 20, alignItems: 'center' },
    tituloCajaRoja: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
    textoTotal: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
    textoDesglose: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    // Filtros
    cajaFiltros: { backgroundColor: '#FFF', margin: 15, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#D5D8DC' },
    labelFiltro: { fontSize: 13, fontWeight: 'bold', color: '#555' },
    selectorFiltro: { flexDirection: 'row', alignItems: 'center' },
    textoSelectorFiltro: { fontSize: 14, fontWeight: 'bold', color: '#000', marginRight: 5 },
    inputBusqueda: { flex: 1, borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 4, paddingHorizontal: 10, height: 40, marginRight: 10 },
    botonExportar: { backgroundColor: '#1E8449', paddingHorizontal: 15, justifyContent: 'center', borderRadius: 4, height: 40 },
    textoExportar: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },

    // Tarjeta Usuario
    tarjetaUsuario: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#D5D8DC', marginBottom: 10, alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#FDF2E9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    infoUsuario: { flex: 1 },
    nombreUsuario: { fontSize: 15, fontWeight: 'bold', color: '#000', marginBottom: 4 },
    filialUsuario: { fontSize: 11, fontWeight: 'bold', color: '#C8102E', marginBottom: 2 },
    carnetUsuario: { fontSize: 11, color: '#7F8C8D' },
    accionesUsuario: { flexDirection: 'row' },

    // FAB
    fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#C8102E', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },

    // Formulario (Modal)
    labelForm: { fontSize: 13, fontWeight: 'bold', color: '#B71C1C', marginBottom: 5, marginTop: 15 },
    inputForm: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5D8DC', borderRadius: 6, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#2C3E50', justifyContent: 'center' },
    notaForm: { fontSize: 11, color: '#7F8C8D', marginTop: 4 },
    botonGuardarForm: { backgroundColor: '#B71C1C', paddingVertical: 16, borderRadius: 6, alignItems: 'center', marginTop: 30 },
    textoBotonForm: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },

    // Dropdown Modal
    modalFondoDropdown: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    cajaDropdown: { width: '80%', backgroundColor: '#FFF', borderRadius: 8, maxHeight: '60%', elevation: 5 },
    opcionDropdown: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F2F3F4' },
    textoOpcionDropdown: { fontSize: 16, color: '#333' }
});