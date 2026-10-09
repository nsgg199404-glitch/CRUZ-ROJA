import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    TextInput, ScrollView, Modal, Platform, Alert, Image, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '@/lib/firebase';

export default function CombustibleScreen() {
    const [cargando, setCargando] = useState(false);
    const [usuario, setUsuario] = useState<any>(null);

    // Estados del formulario
    const [unidad, setUnidad] = useState('');
    const [kilometraje, setKilometraje] = useState('');
    const [monto, setMonto] = useState('');
    const [fotoUri, setFotoUri] = useState<string | null>(null);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const opcionesUnidad = ['CR-237', 'CR-55', 'CR-4', 'Vehículo Particular', 'Ninguno (En Seccional)'];

    useEffect(() => {
        cargarSesion();
    }, []);

    async function cargarSesion() {
        const sesionString = await AsyncStorage.getItem('usuarioSesion');
        if (sesionString) setUsuario(JSON.parse(sesionString));
    }

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };

    async function tomarFoto() {
        let resultado = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });
        if (!resultado.canceled) setFotoUri(resultado.assets[0].uri);
    }

    async function seleccionarFotoGaleria() {
        let resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });
        if (!resultado.canceled) setFotoUri(resultado.assets[0].uri);
    }

    const mostrarOpcionesFoto = () => {
        if (Platform.OS === 'web') {
            seleccionarFotoGaleria();
        } else {
            Alert.alert("Evidencia Obligatoria", "¿Qué deseas hacer?", [
                { text: "Cámara", onPress: tomarFoto },
                { text: "Galería", onPress: seleccionarFotoGaleria },
                { text: "Cancelar", style: "cancel" }
            ]);
        }
    };

    async function guardarCarga() {
        // 1. Validaciones
        if (!unidad || !kilometraje || !monto) {
            mostrarAlerta('Por favor completa la unidad, el kilometraje y el monto.');
            return;
        }

        // BLOQUEO DE SEGURIDAD: Foto obligatoria
        if (!fotoUri) {
            mostrarAlerta('⛔ Es obligatorio subir la foto del ticket o bomba para justificar la carga.');
            return;
        }

        setCargando(true);
        try {
            let urlDescarga = '';

            // 2. Subir imagen a Storage
            try {
                const response = await fetch(fotoUri);
                const blob = await response.blob();
                const storage = getStorage();
                const archivoRef = ref(storage, `control_combustible/ticket_${Date.now()}`);
                await uploadBytes(archivoRef, blob);
                urlDescarga = await getDownloadURL(archivoRef);
            } catch (errorStorage) {
                console.error("Error al subir imagen:", errorStorage);
                mostrarAlerta('Problema subiendo la foto. Intenta de nuevo.');
                setCargando(false);
                return; // Cortamos el proceso si falla la foto, porque es obligatoria
            }

            const ahora = new Date();
            const fechaFormateada = ahora.toLocaleDateString('es-SV', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) + ' ' + ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

            const montoNumerico = parseFloat(monto) || 0;

            // 3. Guardar en 'control_combustible' exactamente como pide tu base de datos
            const nuevoControl = {
                fechaHora: fechaFormateada,
                fotoUrl: urlDescarga,
                id: '',
                kilometraje,
                monto: montoNumerico, // Guardado como Número
                timestamp: ahora.getTime(),
                unidad,
                usuario: usuario?.carnet || '000000'
            };
            await addDoc(collection(db, 'control_combustible'), nuevoControl);

            // 4. Publicar automáticamente en Novedades
            const descripcionMuro = `⛽ Se ha realizado un abastecimiento de Diésel.\n\nUnidad: ${unidad}\nMonto: $${montoNumerico.toFixed(2)}\nKilometraje: ${kilometraje} km`;

            const nuevaNovedad = {
                titulo: `CARGA DE COMBUSTIBLE`,
                descripcion: descripcionMuro,
                autor: usuario?.carnet || '000000',
                autorNombre: usuario?.nombre || 'Sistema',
                carnetAutor: usuario?.carnet || '000000',
                fecha: fechaFormateada,
                timestamp: ahora.getTime(),
                fotoUrl: urlDescarga,
                id: ''
            };
            await addDoc(collection(db, 'novedades'), nuevaNovedad);

            mostrarAlerta('¡Registro de combustible guardado y reportado en Novedades!');

            // 5. Limpiar formulario
            setUnidad(''); setKilometraje(''); setMonto(''); setFotoUri(null);

        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarAlerta('Hubo un error al registrar la carga.');
        } finally {
            setCargando(false);
        }
    }

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.tituloPrincipal}>CONTROL DE COMBUSTIBLE</Text>

                <Text style={styles.etiqueta}>Unidad Abastecida:</Text>
                <Pressable style={styles.inputBox} onPress={() => setModalVisible(true)}>
                    <Text style={styles.inputText}>{unidad || ''}</Text>
                </Pressable>

                <TextInput
                    style={[styles.inputBoxSolo, { marginTop: 10 }]}
                    placeholder="Kilometraje Actual"
                    placeholderTextColor="#9E9E9E"
                    value={kilometraje}
                    onChangeText={setKilometraje}
                    keyboardType="numeric"
                />

                <View style={styles.inputConIcono}>
                    <View style={styles.circuloIcono}>
                        <MaterialIcons name="local-gas-station" size={20} color="#757575" />
                    </View>
                    <TextInput
                        style={styles.inputTextIcono}
                        placeholder="Monto de Diesel ($)"
                        placeholderTextColor="#C8102E"
                        value={monto}
                        onChangeText={setMonto}
                        keyboardType="numeric"
                    />
                </View>

                {fotoUri && (
                    <View style={styles.cajaPreviaFoto}>
                        <Image source={{ uri: fotoUri }} style={styles.imagenPrevia} resizeMode="cover" />
                        <Pressable style={styles.botonQuitarFoto} onPress={() => setFotoUri(null)}>
                            <Text style={styles.textoQuitarFoto}>Quitar Foto</Text>
                        </Pressable>
                    </View>
                )}

                <Pressable style={styles.botonGrisOscuro} onPress={mostrarOpcionesFoto}>
                    <MaterialIcons name="camera-alt" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.textoBotonBlanco}>FOTO DEL TICKET / BOMBA</Text>
                </Pressable>

                <Pressable style={styles.botonRojo} onPress={guardarCarga} disabled={cargando}>
                    {cargando ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.textoBotonBlanco}>REGISTRAR CARGA</Text>
                    )}
                </Pressable>

            </ScrollView>

            {/* Modal para Unidad */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <Pressable style={styles.modalFondo} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalCaja}>
                        <FlatList
                            data={opcionesUnidad}
                            keyExtractor={(item) => item.toString()}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.modalOpcion}
                                    onPress={() => { setUnidad(item); setModalVisible(false); }}
                                >
                                    <Text style={styles.modalTextoOpcion}>{item}</Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#FFF' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFF' },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#212121', fontSize: 24, fontWeight: 'bold' },

    scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },

    tituloPrincipal: { fontSize: 20, fontWeight: 'bold', color: '#B71C1C', textAlign: 'center', marginBottom: 25 },

    etiqueta: { fontSize: 13, fontWeight: 'bold', color: '#000', marginBottom: 5 },

    inputBox: { borderWidth: 1, borderColor: '#757575', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 14, backgroundColor: '#FFF', marginBottom: 15 },
    inputBoxSolo: { borderWidth: 1, borderColor: '#757575', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, color: '#212121', backgroundColor: '#FFF', marginBottom: 15 },
    inputText: { fontSize: 16, color: '#212121' },

    inputConIcono: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#757575', borderRadius: 8, paddingHorizontal: 15, backgroundColor: '#FFF', marginBottom: 25 },
    circuloIcono: { marginRight: 10 },
    inputTextIcono: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#C8102E' },

    botonGrisOscuro: { flexDirection: 'row', backgroundColor: '#455A64', paddingVertical: 16, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2 },
    botonRojo: { backgroundColor: '#C8102E', paddingVertical: 16, borderRadius: 4, alignItems: 'center', elevation: 3 },
    textoBotonBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },

    cajaPreviaFoto: { height: 200, borderRadius: 8, marginBottom: 15, overflow: 'hidden' },
    imagenPrevia: { width: '100%', height: '100%' },
    botonQuitarFoto: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
    textoQuitarFoto: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCaja: { width: '90%', backgroundColor: '#FFF', borderRadius: 8, paddingVertical: 10, elevation: 5 },
    modalOpcion: { paddingVertical: 15, paddingHorizontal: 20 },
    modalTextoOpcion: { fontSize: 16, color: '#212121' }
});