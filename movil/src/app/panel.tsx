import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Image,
    FlatList,
    Modal,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/lib/firebase';

export default function PanelScreen() {
    const [usuario, setUsuario] = useState<any>(null);
    const [cargando, setCargando] = useState(true);

    // Estados para Firebase
    const [banners, setBanners] = useState<any[]>([]);
    const [lideres, setLideres] = useState<any[]>([]);

    // Estados para el visor de imágenes y diseño
    const [modalVisible, setModalVisible] = useState(false);
    const [imagenSeleccionada, setImagenSeleccionada] = useState('');
    const [anchoBanner, setAnchoBanner] = useState(400); // Valor por defecto

    useEffect(() => {
        async function cargarDatos() {
            try {
                // 1. Cargar datos de la sesión
                const sesionString = await AsyncStorage.getItem('usuarioSesion');
                if (sesionString) {
                    setUsuario(JSON.parse(sesionString));
                } else {
                    router.replace('/');
                    return;
                }

                // 2. Cargar los últimos 5 Banners
                const qBanners = query(collection(db, 'banners_actividades'), orderBy('timestamp', 'desc'), limit(5));
                const bannersSnapshot = await getDocs(qBanners);
                const listaBanners = bannersSnapshot.docs.map(doc => doc.data());
                setBanners(listaBanners);

                // 3. Cargar Tabla de Líderes
                const qLideres = query(collection(db, 'usuarios'), orderBy('turnosAsistidos', 'desc'), limit(10));
                const lideresSnapshot = await getDocs(qLideres);
                const listaLideres = lideresSnapshot.docs.map(doc => doc.data());
                setLideres(listaLideres);

            } catch (e) {
                console.error("Error al cargar datos dinámicos:", e);
            } finally {
                setCargando(false);
            }
        }
        cargarDatos();
    }, []);

    async function cerrarSesion() {
        await AsyncStorage.removeItem('usuarioSesion');
        router.replace('/');
    }

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else alert(mensaje);
    };

    if (cargando || !usuario) {
        return (
            <SafeAreaView style={styles.cargandoPantalla}>
                <ActivityIndicator size="large" color="#C8102E" />
            </SafeAreaView>
        );
    }

    const rol = usuario.rol ? String(usuario.rol).toLowerCase() : '';
    const esAdmin = rol === 'administrador' || rol === 'superadmin';
    const esSuperAdmin = rol === 'superadmin';

    const obtenerMedalla = (index: number) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}`;
    };

    return (
        <SafeAreaView style={styles.pantalla}>
            <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>

                {/* ENCABEZADO Y PERFIL */}
                <View style={styles.header}>
                    <Text style={styles.saludo}>¡Hola, {usuario.nombre || 'Voluntario'}!</Text>
                    <Text style={styles.infoPersonal}>Carnet: {usuario.carnet}</Text>
                    <Text style={styles.infoPersonal}>🏆 Mis Turnos: {usuario.turnosAsistidos || usuario.asistencias || 0}</Text>
                </View>


                <View
                    style={styles.contenedorBanner}
                    onLayout={(event) => setAnchoBanner(event.nativeEvent.layout.width)}
                >
                    {banners.length > 0 ? (
                        <FlatList
                            data={banners}
                            horizontal
                            pagingEnabled // Hace que se mueva de imagen en imagen (tipo slider)
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={{ width: anchoBanner }}
                                    onPress={() => {
                                        setImagenSeleccionada(item.url);
                                        setModalVisible(true);
                                    }}
                                >
                                    <Image source={{ uri: item.url }} style={styles.bannerImg} resizeMode="cover" />
                                    <View style={styles.capaTituloBanner}>
                                        <Text style={styles.textoTituloBanner}>{item.titulo}</Text>
                                    </View>
                                </Pressable>
                            )}
                        />
                    ) : (
                        <View style={[styles.bannerImg, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' }]}>
                            <Text style={{ color: '#64748b' }}>Sin avisos recientes</Text>
                        </View>
                    )}

                    {/* Botón flotante de editar (Solo para Admins) */}
                    {esAdmin && (
                        <Pressable
                            style={styles.botonEditarBanner}
                            onPress={() => mostrarAlerta("Para editar, ve al Panel Super Admin y sube un nuevo banner.")}
                        >
                            <Text style={styles.textoEditarBanner}>✏️ Editar</Text>
                        </Pressable>
                    )}
                </View>

                {/* MODAL PARA AGRANDAR IMAGEN */}
                <Modal visible={modalVisible} transparent={true} animationType="fade">
                    <View style={styles.modalFondo}>
                        <Pressable style={styles.modalBotonCerrar} onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalTextoCerrar}>❌ CERRAR</Text>
                        </Pressable>
                        {imagenSeleccionada ? (
                            <Image source={{ uri: imagenSeleccionada }} style={styles.imagenGigante} resizeMode="contain" />
                        ) : null}
                    </View>
                </Modal>

                {/* BOTÓN CALENDARIO GIGANTE */}
                <Pressable style={styles.botonCalendario} onPress={() => router.push('/calendario' as any)}>
                    <Text style={styles.textoBotonCalendario}>📅 VER CALENDARIO DE TURNOS</Text>
                </Pressable>

                <Text style={styles.tituloSeccion}>MENÚ OPERATIVO</Text>

                {/* GRID DE BOTONES */}
                <View style={styles.gridModulos}>
                    <Pressable
                        style={styles.tarjetaGrid}
                        onPress={() => router.push('/novedades' as any)}>
                        <Text style={styles.iconoGrid}>≡</Text>
                        <Text style={styles.textoGrid}>MURO DE{'\n'}NOVEDADES</Text>
                    </Pressable>
                    <Pressable
                        style={styles.tarjetaGrid}
                        onPress={() => router.push('/bitacora' as any)}
                    >
                        <Text style={styles.iconoGrid}>𖣠</Text>
                        <Text style={styles.textoGrid}>BITÁCORA DE{'\n'}ATENCIONES</Text>
                    </Pressable>
                    <Pressable style={styles.tarjetaGrid}>
                        <Text style={styles.iconoGrid}>𓃮</Text>
                        <Text style={styles.textoGrid}>VER{'\n'}INVENTARIO</Text>
                    </Pressable>
                    <Pressable style={styles.tarjetaGrid}>
                        <Text style={styles.iconoGrid}>𓃠</Text>
                        <Text style={styles.textoGrid}>GESTIONAR{'\n'}EQUIPO APH</Text>
                    </Pressable>
                    <Pressable style={styles.tarjetaGrid}>
                        <Text style={styles.iconoGrid}>࿊</Text>
                        <Text style={styles.textoGrid}>CHEQUEO DE{'\n'}AMBULANCIA</Text>
                    </Pressable>
                    <Pressable style={styles.tarjetaGrid}>
                        <Text style={styles.iconoGrid}>࿆</Text>
                        <Text style={styles.textoGrid}>CONTROL DE{'\n'}COMBUSTIBLE</Text>
                    </Pressable>
                    <Pressable style={styles.tarjetaGrid}>
                        <Text style={styles.iconoGrid}>≡</Text>
                        <Text style={styles.textoGrid}>GUÍA{'\n'}MÉDICA</Text>
                    </Pressable>
                    <Pressable style={styles.tarjetaGrid}>
                        <Text style={styles.iconoGrid}>≡</Text>
                        <Text style={styles.textoGrid}>CIERRE{'\n'}TURNO</Text>
                    </Pressable>
                </View>

                {/* BOTONES ADMINISTRACIÓN */}
                {esAdmin && (
                    <View style={styles.listaAdmin}>
                        <Pressable style={styles.botonLargo}>
                            <Text style={styles.textoBotonLargo}>𓃗 GENERAR REPORTES (PDF)</Text>
                        </Pressable>
                        <Pressable style={styles.botonLargo}>
                            <Text style={styles.textoBotonLargo}>☕︎ GESTIONAR USUARIOS</Text>
                        </Pressable>
                        <Pressable style={styles.botonLargo}>
                            <Text style={styles.textoBotonLargo}>𖦹 TOMAR ASISTENCIA</Text>
                        </Pressable>
                        <Pressable style={styles.botonLargo}>
                            <Text style={styles.textoBotonLargo}>𓆣 PANEL SERVICIO SOCIAL</Text>
                        </Pressable>
                        <Pressable style={styles.botonLargo}>
                            <Text style={styles.textoBotonLargo}>☁︎ VER HISTORIAL DE FIRMAS</Text>
                        </Pressable>

                        {esSuperAdmin && (
                            <Pressable style={styles.botonLargo} onPress={() => router.push('/superadmin' as any)}>
                                <Text style={styles.textoBotonLargo}>𓅨 PANEL SUPER ADMIN</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                <View style={styles.listaAdmin}>
                    <Pressable style={styles.botonLargo} onPress={cerrarSesion}>
                        <Text style={styles.textoBotonLargo}>CERRAR SESIÓN</Text>
                    </Pressable>
                </View>

                {/* TABLA DE LÍDERES DINÁMICA */}
                <View style={styles.seccionLideres}>
                    <Text style={styles.tituloLideres}>🏆 TABLA DE LÍDERES</Text>
                    <Text style={styles.subtituloLideres}>Ordenado por cantidad de turnos</Text>

                    <View style={styles.contenedorTabla}>
                        {lideres.map((lider, index) => (
                            <View key={index} style={styles.filaLider}>
                                <View style={styles.infoLider}>
                                    <Text style={styles.medalla}>{obtenerMedalla(index)}</Text>
                                    <View>
                                        <Text style={styles.nombreLider}>{lider.nombre || 'Voluntario'}</Text>
                                        <Text style={styles.brigadaLider}>{lider.brigada || 'Sin brigada asignada'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.turnosLider}>{lider.turnosAsistidos || 0}</Text>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    cargandoPantalla: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    pantalla: { flex: 1, backgroundColor: '#F8F9FA' },
    contenido: { paddingHorizontal: 16, paddingBottom: 40 },
    header: { alignItems: 'center', marginTop: 30, marginBottom: 15 },
    saludo: { fontSize: 20, fontWeight: 'bold', color: '#C8102E' },
    infoPersonal: { fontSize: 14, color: '#424242', marginTop: 2 },

    /* Estilos del Carrusel y Banner */
    contenedorBanner: { borderRadius: 12, overflow: 'hidden', marginBottom: 20, elevation: 4, backgroundColor: '#fff', position: 'relative' },
    bannerImg: { width: '100%', height: 160 },
    capaTituloBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8 },
    textoTituloBanner: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
    botonEditarBanner: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, elevation: 2 },
    textoEditarBanner: { fontSize: 12, fontWeight: 'bold', color: '#C8102E' },

    /* Estilos del Modal (Visor de imagen) */
    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalBotonCerrar: { position: 'absolute', top: 50, right: 20, backgroundColor: '#FFF', padding: 10, borderRadius: 8, zIndex: 10 },
    modalTextoCerrar: { color: '#C8102E', fontWeight: 'bold' },
    imagenGigante: { width: '95%', height: '80%' },

    botonCalendario: { backgroundColor: '#E31837', padding: 18, borderRadius: 8, alignItems: 'center', marginBottom: 25 },
    textoBotonCalendario: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 },
    tituloSeccion: { fontSize: 14, fontWeight: 'bold', color: '#424242', marginBottom: 15 },
    gridModulos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    tarjetaGrid: { width: '48%', backgroundColor: '#E31837', borderRadius: 8, paddingVertical: 20, paddingHorizontal: 10, alignItems: 'center', marginBottom: 12 },
    iconoGrid: { color: '#FFF', fontSize: 24, marginBottom: 8 },
    textoGrid: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
    listaAdmin: { gap: 12, marginBottom: 12 },
    botonLargo: { backgroundColor: '#E31837', padding: 16, borderRadius: 8, alignItems: 'center' },
    textoBotonLargo: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

    /* Estilos Tabla de Líderes */
    seccionLideres: { marginTop: 30, alignItems: 'center', width: '100%' },
    tituloLideres: { color: '#C8102E', fontSize: 18, fontWeight: 'bold' },
    subtituloLideres: { color: '#757575', fontSize: 12, marginBottom: 15 },
    contenedorTabla: { width: '100%' },
    filaLider: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
    infoLider: { flexDirection: 'row', alignItems: 'center' },
    medalla: { fontSize: 20, fontWeight: 'bold', width: 35, textAlign: 'center' },
    nombreLider: { fontSize: 15, fontWeight: 'bold', color: '#212121' },
    brigadaLider: { fontSize: 12, color: '#757575' },
    turnosLider: { fontSize: 18, fontWeight: 'bold', color: '#C8102E' }
});