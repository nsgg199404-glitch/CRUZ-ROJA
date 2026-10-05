import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    ActivityIndicator,
    Image,
    TextInput,
    Platform,
    Alert,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '@/lib/firebase';

export default function NovedadesScreen() {
    const [novedades, setNovedades] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [usuario, setUsuario] = useState<any>(null);

    // Estados para el formulario
    const [tituloNuevo, setTituloNuevo] = useState('');
    const [descripcionNueva, setDescripcionNueva] = useState('');
    const [fotoUri, setFotoUri] = useState<string | null>(null); // Para mostrar la vista previa
    const [publicando, setPublicando] = useState(false);

    useEffect(() => {
        cargarSesion();
        cargarNovedades();
    }, []);

    async function cargarSesion() {
        const sesionString = await AsyncStorage.getItem('usuarioSesion');
        if (sesionString) {
            setUsuario(JSON.parse(sesionString));
        }
    }

    async function cargarNovedades() {
        setCargando(true);
        try {
            const q = query(collection(db, 'novedades'));
            const snapshot = await getDocs(q);

            // Le ponemos "as any" para que TypeScript sepa que trae todos los campos (incluyendo timestamp)
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            // Forzamos el orden por el timestamp más reciente
            lista.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

            setNovedades(lista);
        } catch (error) {
            console.error("Error al cargar novedades:", error);
        } finally {
            setCargando(false);
        }
    }

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };

    // FUNCIÓN PARA SELECCIONAR FOTO DE LA GALERÍA
    async function seleccionarFoto() {
        let resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7, // Comprimimos un poco para que suba rápido
        });

        if (!resultado.canceled) {
            setFotoUri(resultado.assets[0].uri);
        }
    }

    // FUNCIÓN PARA PUBLICAR CON FOTO
    async function publicarNovedad() {
        if (!tituloNuevo || !descripcionNueva) {
            mostrarAlerta('Por favor, llena el título y la descripción.');
            return;
        }

        setPublicando(true);
        try {
            let urlDescarga = '';

            // Si el usuario seleccionó una foto, la subimos a Firebase Storage primero
            if (fotoUri) {
                try {
                    const response = await fetch(fotoUri);
                    const blob = await response.blob();
                    const storage = getStorage();
                    // Creamos una carpeta "novedades" y le damos un nombre único basado en la hora
                    const archivoRef = ref(storage, `novedades/foto_${Date.now()}`);
                    await uploadBytes(archivoRef, blob);
                    urlDescarga = await getDownloadURL(archivoRef);
                } catch (errorStorage) {
                    console.error("Error al subir imagen:", errorStorage);
                    mostrarAlerta('Hubo un problema subiendo la foto, pero se publicará el texto.');
                }
            }

            const ahora = new Date();
            const fechaFormateada = ahora.toLocaleDateString('es-SV', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) + ' ' + ahora.toLocaleTimeString('es-SV', {
                hour: '2-digit', minute: '2-digit'
            });

            const nuevaPublicacion = {
                titulo: tituloNuevo,
                descripcion: descripcionNueva,
                autor: usuario?.carnet || 'Desconocido',
                autorNombre: usuario?.nombre || 'Voluntario',
                carnetAutor: usuario?.carnet || '000000',
                fecha: fechaFormateada,
                timestamp: ahora.getTime(),
                fotoUrl: urlDescarga, // Guardamos el link de la imagen de Firebase
                id: ''
            };

            await addDoc(collection(db, 'novedades'), nuevaPublicacion);

            // Limpiamos el formulario
            setTituloNuevo('');
            setDescripcionNueva('');
            setFotoUri(null);
            cargarNovedades(); // Recargamos para ver la nueva publicación de primero
            mostrarAlerta('¡Novedad publicada con éxito!');

        } catch (error) {
            console.error("Error al publicar:", error);
            mostrarAlerta('Hubo un error al publicar la novedad.');
        } finally {
            setPublicando(false);
        }
    }

    async function confirmarEliminar(id: string) {
        if (Platform.OS === 'web') {
            if (window.confirm('¿Estás seguro que deseas borrar esta publicación? Esta acción no se puede deshacer.')) {
                ejecutarEliminacion(id);
            }
        } else {
            Alert.alert(
                "Confirmar Eliminación",
                "¿Estás seguro que deseas borrar esta publicación? Esta acción no se puede deshacer.",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Eliminar", onPress: () => ejecutarEliminacion(id), style: "destructive" }
                ]
            );
        }
    }

    async function ejecutarEliminacion(id: string) {
        try {
            await deleteDoc(doc(db, 'novedades', id));
            cargarNovedades();
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarAlerta('Hubo un error al intentar eliminar la publicación.');
        }
    }

    async function compartirNovedad(item: any) {
        const mensaje = `*Novedad en Cruz Roja Guazapa*\n\n*${item.titulo}*\n${item.descripcion}\n\n_Por: ${item.autorNombre || item.autor || item.carnetAutor} el ${item.fecha}_`;
        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                mostrarAlerta('No se pudo abrir la aplicación para compartir.');
            }
        } catch (error) {
            mostrarAlerta('Error al intentar compartir la publicación.');
        }
    }

    const FormularioHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.topBar}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
                <Text style={styles.tituloPagina}></Text>
            </View>

            <Text style={styles.tituloMuro}>MURO DE NOVEDADES</Text>

            <View style={styles.cajaFormulario}>
                <TextInput
                    style={styles.inputTitulo}
                    placeholder="Título / Asunto"
                    value={tituloNuevo}
                    onChangeText={setTituloNuevo}
                    editable={!publicando}
                />
                <TextInput
                    style={styles.inputDescripcion}
                    placeholder="¿Qué está pasando?"
                    value={descripcionNueva}
                    onChangeText={setDescripcionNueva}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!publicando}
                />

                {/* VISTA PREVIA DE LA FOTO ANTES DE PUBLICAR */}
                {fotoUri && (
                    <View style={styles.contenedorVistaPrevia}>
                        <Image source={{ uri: fotoUri }} style={styles.vistaPreviaImagen} />
                        <Pressable style={styles.botonQuitarFoto} onPress={() => setFotoUri(null)}>
                            <Text style={styles.textoQuitarFoto}>❌ Quitar</Text>
                        </Pressable>
                    </View>
                )}

                <View style={styles.filaBotones}>
                    <Pressable style={styles.botonFoto} onPress={seleccionarFoto} disabled={publicando}>
                        <Text style={styles.textoBotonFoto}>📸 FOTO</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.botonPublicar, publicando && { opacity: 0.7 }]}
                        onPress={publicarNovedad}
                        disabled={publicando}
                    >
                        <Text style={styles.textoBotonPublicar}>
                            {publicando ? 'PUBLICANDO...' : 'PUBLICAR'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.pantalla}>
            {cargando && novedades.length === 0 ? (
                <View style={styles.centrado}>
                    <ActivityIndicator size="large" color="#C8102E" />
                </View>
            ) : (
                <FlatList
                    data={novedades}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    ListHeaderComponent={FormularioHeader}
                    contentContainerStyle={styles.listaScroll}
                    renderItem={({ item }) => {
                        const rolUsuario = usuario?.rol ? String(usuario.rol).toLowerCase() : '';
                        const esSuperAdmin = rolUsuario === 'superadmin';
                        const esAutor = String(usuario?.carnet) === String(item.autor) || String(usuario?.carnet) === String(item.carnetAutor);
                        const puedeBorrar = esSuperAdmin || esAutor;

                        return (
                            <View style={styles.tarjeta}>
                                <Text style={styles.tarjetaTitulo}>{item.titulo}</Text>
                                <Text style={styles.tarjetaDescripcion}>{item.descripcion}</Text>

                                {item.fotoUrl ? (
                                    <Image source={{ uri: item.fotoUrl }} style={styles.imagenPublicacion} resizeMode="cover" />
                                ) : (
                                    <View style={styles.placeholderImagen}>
                                        <MaterialIcons name="image" size={50} color="#CFD8DC" />
                                    </View>
                                )}

                                <View style={styles.tarjetaFooter}>
                                    <Text style={styles.textoFooter}>
                                        Por: {item.autor || item.carnetAutor} | {item.fecha}
                                    </Text>

                                    <View style={styles.accionesFooter}>
                                        {puedeBorrar && (
                                            <Pressable onPress={() => confirmarEliminar(item.id)} style={styles.botonIcono}>
                                                <MaterialIcons name="delete-outline" size={24} color="#D32F2F" />
                                            </Pressable>
                                        )}

                                        {/* ÍCONO CLÁSICO DE COMPARTIR */}
                                        <Pressable onPress={() => compartirNovedad(item)} style={styles.botonIcono}>
                                            <MaterialIcons name="share" size={24} color="#455A64" />
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#F8F9FA' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listaScroll: { paddingBottom: 20 },

    headerContainer: { paddingBottom: 10 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 10 },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#212121', fontSize: 24, fontWeight: 'bold' },
    tituloPagina: { flex: 1 },
    tituloMuro: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#C8102E', marginTop: -10, marginBottom: 15 },

    cajaFormulario: { backgroundColor: '#FFF', marginHorizontal: 15, borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#C8102E', elevation: 2 },
    inputTitulo: { borderWidth: 1, borderColor: '#B0BEC5', borderRadius: 4, padding: 10, fontSize: 14, marginBottom: 10, backgroundColor: '#FFF' },
    inputDescripcion: { borderWidth: 1, borderColor: '#B0BEC5', borderRadius: 4, padding: 10, fontSize: 14, minHeight: 80, marginBottom: 15, backgroundColor: '#FFF' },

    contenedorVistaPrevia: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#F5F5F5', padding: 5, borderRadius: 4 },
    vistaPreviaImagen: { width: 60, height: 60, borderRadius: 4, marginRight: 10 },
    botonQuitarFoto: { padding: 5 },
    textoQuitarFoto: { color: '#D32F2F', fontWeight: 'bold', fontSize: 12 },

    filaBotones: { flexDirection: 'row', justifyContent: 'space-between' },
    botonFoto: { backgroundColor: '#455A64', width: '28%', borderRadius: 4, paddingVertical: 12, alignItems: 'center' },
    textoBotonFoto: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    botonPublicar: { backgroundColor: '#C8102E', width: '68%', borderRadius: 4, paddingVertical: 12, alignItems: 'center' },
    textoBotonPublicar: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

    tarjeta: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 8, padding: 15, elevation: 3, borderWidth: 1, borderColor: '#EAEAEA' },
    tarjetaTitulo: { color: '#C8102E', fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
    tarjetaDescripcion: { color: '#212121', fontSize: 14, lineHeight: 20, marginBottom: 15 },

    imagenPublicacion: { width: '100%', height: 200, borderRadius: 4, backgroundColor: '#EEEEEE' },
    placeholderImagen: { width: '100%', height: 150, borderWidth: 1, borderColor: '#CFD8DC', borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },

    tarjetaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 10 },
    textoFooter: { color: '#757575', fontSize: 11, flex: 1 },
    accionesFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    botonIcono: { padding: 5 }
});