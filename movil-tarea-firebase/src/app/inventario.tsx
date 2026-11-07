import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator,
    TextInput, ScrollView, Image, Platform, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '@/lib/firebase';

export default function InventarioScreen() {
    const [vista, setVista] = useState<'ubicaciones' | 'lista' | 'detalle'>('ubicaciones');
    const [inventarioGlobal, setInventarioGlobal] = useState<any[]>([]);
    const [inventarioFiltrado, setInventarioFiltrado] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [usuario, setUsuario] = useState<any>(null);

    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('TODO');
    const [busqueda, setBusqueda] = useState('');
    const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);

    useEffect(() => {
        cargarSesion();
        cargarInventario();
    }, []);

    // Filtrado en tiempo real al escribir en la barra de búsqueda o cambiar categoría
    useEffect(() => {
        let filtrado = inventarioGlobal;

        if (categoriaSeleccionada !== 'TODO') {
            filtrado = filtrado.filter(item => item.categoria === categoriaSeleccionada);
        }

        if (busqueda.trim() !== '') {
            const textoBusqueda = busqueda.toLowerCase();
            filtrado = filtrado.filter(item =>
                (item.nombre && item.nombre.toLowerCase().includes(textoBusqueda)) ||
                (item.numSerie && item.numSerie.toLowerCase().includes(textoBusqueda))
            );
        }

        setInventarioFiltrado(filtrado);
    }, [busqueda, categoriaSeleccionada, inventarioGlobal]);

    async function cargarSesion() {
        const sesionString = await AsyncStorage.getItem('usuarioSesion');
        if (sesionString) setUsuario(JSON.parse(sesionString));
    }

    async function cargarInventario() {
        setCargando(true);
        try {
            const q = query(collection(db, 'inventario_aph'));
            const snapshot = await getDocs(q);
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setInventarioGlobal(lista);
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

    // Helper para dar color al texto de estado
    const getColorEstado = (estado: string) => {
        const est = estado?.toLowerCase() || '';
        if (est.includes('buen') || est.includes('excelente')) return '#4CAF50'; // Verde
        if (est.includes('mal') || est.includes('dañado')) return '#D32F2F'; // Rojo
        return '#757575'; // Gris por defecto
    };

    const abrirCategoria = (cat: string) => {
        setCategoriaSeleccionada(cat);
        setBusqueda('');
        setVista('lista');
    };

    // Funciones de Detalle
    const rolUsuario = usuario?.rol ? String(usuario.rol).toLowerCase() : '';
    const esAdmin = rolUsuario.includes('admin') || rolUsuario.includes('super');

    const compartirWhatsApp = async () => {
        const mensaje = `*REPORTE DE INVENTARIO*\n\n*Artículo:* ${itemSeleccionado.nombre}\n*Serie/ID:* ${itemSeleccionado.numSerie}\n*Estado:* ${itemSeleccionado.estado}\n*Cantidad:* ${itemSeleccionado.cantidad}\n*Ubicación:* ${itemSeleccionado.categoria}\n\n*Descripción:*\n${itemSeleccionado.descripcion}`;
        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        try {
            await Linking.openURL(url);
        } catch {
            mostrarAlerta('No se pudo abrir WhatsApp.');
        }
    };

    const eliminarItem = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm('¿Eliminar este artículo definitivamente?')) ejecutarEliminacion();
        } else {
            Alert.alert("Confirmar", "¿Eliminar este artículo definitivamente?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Eliminar", onPress: ejecutarEliminacion, style: "destructive" }
            ]);
        }
    };

    const ejecutarEliminacion = async () => {
        try {
            await deleteDoc(doc(db, 'inventario_aph', itemSeleccionado.id));
            mostrarAlerta("Artículo eliminado.");
            setVista('lista');
            cargarInventario();
        } catch (error) {
            mostrarAlerta("Error al eliminar el artículo.");
        }
    };

    // PANTALLA 1  SELECCIÓN DE UBICACIÓN
    if (vista === 'ubicaciones') {
        return (
            <SafeAreaView style={styles.pantalla}>
                <View style={styles.topBar}>
                    <Pressable onPress={() => router.back()} style={styles.botonRegresar}><Text style={styles.textoRegresar}>←</Text></Pressable>
                    <View style={{ flex: 1 }} />
                </View>
                <View style={styles.contenedorCentral}>
                    <Text style={styles.tituloUbicacion}>SELECCIONE UBICACIÓN</Text>

                    <Pressable style={styles.botonUbicacionRojo} onPress={() => abrirCategoria('Ambulancia CR-237')}>
                        <Text style={styles.textoUbicacionBlanco}>🚑 AMBULANCIA CR-237</Text>
                    </Pressable>
                    <Pressable style={styles.botonUbicacionRojo} onPress={() => abrirCategoria('Ambulancia CR-55')}>
                        <Text style={styles.textoUbicacionBlanco}>🚑 AMBULANCIA CR-55</Text>
                    </Pressable>
                    <Pressable style={styles.botonUbicacionRojo} onPress={() => abrirCategoria('Ambulancia CR-4')}>
                        <Text style={styles.textoUbicacionBlanco}>🚑 AMBULANCIA CR-4</Text>
                    </Pressable>
                    <Pressable style={styles.botonUbicacionRojo} onPress={() => abrirCategoria('Equipo de Rescate')}>
                        <Text style={styles.textoUbicacionBlanco}>🩸 EQUIPO DE RESCATE</Text>
                    </Pressable>
                    <Pressable style={styles.botonUbicacionRojo} onPress={() => abrirCategoria('Clínica')}>
                        <Text style={styles.textoUbicacionBlanco}>🏥 CLÍNICA</Text>
                    </Pressable>
                    <Pressable style={styles.botonUbicacionRojo} onPress={() => abrirCategoria('Bodega')}>
                        <Text style={styles.textoUbicacionBlanco}>📦 BODEGA</Text>
                    </Pressable>

                    <Pressable style={styles.botonUbicacionGris} onPress={() => abrirCategoria('TODO')}>
                        <Text style={styles.textoUbicacionBlanco}>VER TODO EL INVENTARIO</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // PANTALLA 2 LISTA CON BÚSQUEDA
    if (vista === 'lista') {
        return (
            <SafeAreaView style={styles.pantalla}>
                <View style={styles.headerLista}>
                    <View style={styles.topBarLista}>
                        <Pressable onPress={() => setVista('ubicaciones')} style={styles.botonRegresar}><Text style={styles.textoRegresar}>←</Text></Pressable>
                        <Text style={styles.tituloListaRojo}>
                            {categoriaSeleccionada === 'TODO' ? 'TODO EL INVENTARIO' : `INVENTARIO: ${categoriaSeleccionada.toUpperCase()}`}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.cajaBusqueda}>
                        <MaterialIcons name="search" size={24} color="#757575" style={styles.iconoBuscar} />
                        <TextInput
                            style={styles.inputBuscar}
                            placeholder="Buscar por Nombre o ID"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                    </View>
                </View>

                {cargando ? (
                    <View style={styles.centrado}><ActivityIndicator size="large" color="#C8102E" /></View>
                ) : (
                    <FlatList
                        data={inventarioFiltrado}
                        contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
                        keyExtractor={(item) => item.id || Math.random().toString()}
                        renderItem={({ item }) => (
                            <Pressable
                                style={styles.tarjetaLista}
                                onPress={() => { setItemSeleccionado(item); setVista('detalle'); }}
                            >
                                {item.fotoUrl ? (
                                    <Image source={{ uri: item.fotoUrl }} style={styles.imagenMiniatura} />
                                ) : (
                                    <View style={styles.placeholderMiniatura}>
                                        <MaterialIcons name="image" size={40} color="#CFD8DC" />
                                    </View>
                                )}
                                <View style={styles.infoTarjetaLista}>
                                    <Text style={styles.textoNombreTarjeta}>{item.nombre}</Text>
                                    <Text style={[styles.textoEstadoTarjeta, { color: getColorEstado(item.estado) }]}>
                                        {item.estado}
                                    </Text>
                                    <Text style={styles.textoCantTarjeta}>Cant: {item.cantidad} | {item.color}</Text>
                                </View>
                            </Pressable>
                        )}
                        ListEmptyComponent={<Text style={styles.textoVacio}>No se encontraron artículos.</Text>}
                    />
                )}
            </SafeAreaView>
        );
    }

    // PANTALLA 3DETALLE DEL ARTÍCULO
    if (vista === 'detalle' && itemSeleccionado) {
        return (
            <SafeAreaView style={styles.pantallaBlanca}>
                <View style={styles.topBar}>
                    <Pressable onPress={() => setVista('lista')} style={styles.botonRegresar}><Text style={styles.textoRegresar}>←</Text></Pressable>
                </View>
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

                    {/* Imagen principal */}
                    {itemSeleccionado.fotoUrl ? (
                        <Image source={{ uri: itemSeleccionado.fotoUrl }} style={styles.imagenDetalle} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderDetalle}>
                            <MaterialIcons name="image" size={80} color="#CFD8DC" />
                        </View>
                    )}

                    <View style={styles.contenedorInfoDetalle}>
                        <Text style={styles.tituloDetalleRojo}>{itemSeleccionado.nombre}</Text>
                        <View style={styles.lineaDivisoria} />

                        <Text style={styles.textoDetalleGris}>Serie/ID: {itemSeleccionado.numSerie || 'N/A'}</Text>
                        <Text style={styles.textoDetalleGris}>Revisión: {itemSeleccionado.fechaRevision || 'N/A'}</Text>

                        <View style={{ flexDirection: 'row' }}>
                            <Text style={styles.textoDetalleGris}>Estado: </Text>
                            <Text style={[styles.textoDetalleGris, { color: getColorEstado(itemSeleccionado.estado) }]}>
                                {itemSeleccionado.estado}
                            </Text>
                        </View>
                        <Text style={styles.textoDetalleGris}>Color: {itemSeleccionado.color || 'N/A'}</Text>

                        <Text style={styles.labelDetalleGrisOscuro}>Descripción:</Text>
                        <View style={styles.cajaDescripcion}>
                            <Text style={styles.textoDescripcion}>{itemSeleccionado.descripcion || 'Sin descripción'}</Text>
                        </View>

                        <Text style={styles.textoCantidadAzul}>Cantidad: {itemSeleccionado.cantidad}</Text>

                        {/* Botones de Acción */}
                        <View style={styles.filaBotonesAccion}>
                            <Pressable style={styles.botonWhatsApp} onPress={compartirWhatsApp}>
                                <Text style={styles.textoBotonAccion}>WHATSAPP</Text>
                            </Pressable>

                            {esAdmin && (
                                <>
                                    <Pressable style={styles.botonEditar} onPress={() => mostrarAlerta('Edición en construcción')}>
                                        <Text style={styles.textoBotonAccion}>EDITAR</Text>
                                    </Pressable>
                                    <Pressable style={styles.botonEliminar} onPress={eliminarItem}>
                                        <Text style={styles.textoBotonAccion}>ELIMINAR</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F8F9FA' },
    pantallaBlanca: { flex: 1, backgroundColor: '#FFF' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Top Bar General
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFF' },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#212121', fontSize: 24, fontWeight: 'bold' },

    // PANTALLA 1: UBICACIONES
    contenedorCentral: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
    tituloUbicacion: { textAlign: 'center', color: '#C8102E', fontSize: 18, fontWeight: 'bold', marginBottom: 30 },
    botonUbicacionRojo: { backgroundColor: '#C8102E', paddingVertical: 18, borderRadius: 6, marginBottom: 15, elevation: 2 },
    botonUbicacionGris: { backgroundColor: '#616161', paddingVertical: 18, borderRadius: 6, marginTop: 15, elevation: 2 },
    textoUbicacionBlanco: { color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 15 },

    // PANTALLA 2: LISTA
    headerLista: { backgroundColor: '#FFF', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
    topBarLista: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 10, marginBottom: 15 },
    tituloListaRojo: { color: '#C8102E', fontSize: 16, fontWeight: 'bold' },
    cajaBusqueda: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', marginHorizontal: 15, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E0E0E0' },
    iconoBuscar: { marginRight: 10 },
    inputBuscar: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#212121' },

    tarjetaLista: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0', alignItems: 'center' },
    imagenMiniatura: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#EEEEEE' },
    placeholderMiniatura: { width: 80, height: 80, borderRadius: 6, borderWidth: 2, borderColor: '#CFD8DC', borderStyle: 'solid', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
    infoTarjetaLista: { flex: 1, marginLeft: 15 },
    textoNombreTarjeta: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
    textoEstadoTarjeta: { fontSize: 13, marginBottom: 4 },
    textoCantTarjeta: { fontSize: 12, color: '#9E9E9E' },
    textoVacio: { textAlign: 'center', marginTop: 30, color: '#757575', fontSize: 15 },

    // PANTALLA 3: DETALLE
    imagenDetalle: { width: '100%', height: 350, backgroundColor: '#EEEEEE' },
    placeholderDetalle: { width: '100%', height: 350, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
    contenedorInfoDetalle: { padding: 20 },
    tituloDetalleRojo: { fontSize: 22, fontWeight: 'bold', color: '#C8102E' },
    lineaDivisoria: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 15 },
    textoDetalleGris: { fontSize: 15, color: '#757575', marginBottom: 8 },
    labelDetalleGrisOscuro: { fontSize: 14, fontWeight: 'bold', color: '#424242', marginTop: 15, marginBottom: 8 },
    cajaDescripcion: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 6, padding: 12, backgroundColor: '#FAFAFA', minHeight: 60, marginBottom: 15 },
    textoDescripcion: { fontSize: 14, color: '#424242' },
    textoCantidadAzul: { fontSize: 16, fontWeight: 'bold', color: '#1976D2', marginBottom: 25 },

    filaBotonesAccion: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    botonWhatsApp: { flex: 1, backgroundColor: '#25D366', paddingVertical: 12, borderRadius: 4, alignItems: 'center' },
    botonEditar: { flex: 1, backgroundColor: '#D32F2F', paddingVertical: 12, borderRadius: 4, alignItems: 'center' },
    botonEliminar: { flex: 1, backgroundColor: '#FF0000', paddingVertical: 12, borderRadius: 4, alignItems: 'center' },
    textoBotonAccion: { color: '#FFF', fontWeight: 'bold', fontSize: 12 }
});