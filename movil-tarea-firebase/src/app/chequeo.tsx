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

export default function ChequeoAmbulanciaScreen() {
    const [cargando, setCargando] = useState(false);
    const [usuario, setUsuario] = useState<any>(null);

    // Estados del formulario
    const [unidad, setUnidad] = useState('');
    const [aceite, setAceite] = useState('');
    const [agua, setAgua] = useState('');
    const [llantas, setLlantas] = useState('');
    const [luces, setLuces] = useState('');
    const [kilometraje, setKilometraje] = useState('');
    const [fotoUri, setFotoUri] = useState<string | null>(null);

    // Modales
    const [modalVisible, setModalVisible] = useState<{ visible: boolean, tipo: string }>({ visible: false, tipo: '' });

    const opcionesUnidad = ['CR-237', 'CR-55', 'CR-4', 'Vehículo Particular', 'Ninguno (En Seccional)'];
    const opcionesNivel = ['Alto (Correcto)', 'Medio', 'Bajo (Rellenar)', 'Crítico (Vacío)'];
    const opcionesEstado = ['Bueno', 'Regular', 'Malo (Reparar)'];

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

        if (!resultado.canceled) {
            setFotoUri(resultado.assets[0].uri);
        }
    }

    async function seleccionarFotoGaleria() {
        let resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!resultado.canceled) {
            setFotoUri(resultado.assets[0].uri);
        }
    }

    const mostrarOpcionesFoto = () => {
        if (Platform.OS === 'web') {
            seleccionarFotoGaleria();
        } else {
            Alert.alert("Evidencia", "¿Qué deseas hacer?", [
                { text: "Cámara", onPress: tomarFoto },
                { text: "Galería", onPress: seleccionarFotoGaleria },
                { text: "Cancelar", style: "cancel" }
            ]);
        }
    };

    async function guardarChequeo() {
        if (!unidad || !aceite || !agua || !llantas || !luces || !kilometraje) {
            mostrarAlerta('Por favor completa todos los campos del chequeo.');
            return;
        }

        setCargando(true);
        try {
            let urlDescarga = '';

            // 1. Subir la foto a Storage si existe
            if (fotoUri) {
                try {
                    const response = await fetch(fotoUri);
                    const blob = await response.blob();
                    const storage = getStorage();
                    const archivoRef = ref(storage, `checkeo_ambulancias/evidencia_${Date.now()}`);
                    await uploadBytes(archivoRef, blob);
                    urlDescarga = await getDownloadURL(archivoRef);
                } catch (errorStorage) {
                    console.error("Error al subir imagen:", errorStorage);
                    mostrarAlerta('Problema subiendo la foto, se guardará sin imagen.');
                }
            }

            // 2. Lógica del Semáforo y Diagnóstico
            let semaforo = "VERDE";
            let diagnostico = "✅ UNIDAD OPERATIVA - BUEN ESTADO";
            let emojiSemaforo = "🟢";

            if (aceite.includes('Crítico') || agua.includes('Crítico') || llantas.includes('Malo') || luces.includes('Malo')) {
                semaforo = "ROJO";
                diagnostico = "❌ UNIDAD NO OPERATIVA - REQUIERE TALLER";
                emojiSemaforo = "🔴";
            } else if (aceite.includes('Bajo') || aceite.includes('Medio') || agua.includes('Bajo') || agua.includes('Medio') || llantas.includes('Regular') || luces.includes('Regular')) {
                semaforo = "AMARILLO";
                diagnostico = "⚠️ UNIDAD OPERATIVA CON OBSERVACIONES";
                emojiSemaforo = "🟡";
            }

            const ahora = new Date();
            const fechaFormateada = ahora.toLocaleDateString('es-SV', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) + ' ' + ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

            // 3. Guardar el registro técnico en 'checkeo_ambulancias'
            const nuevoChequeo = {
                aceite, agua, diagnostico, fecha: fechaFormateada,
                fotoUrl: urlDescarga, kilometraje, llantas, luces,
                semaforo, timestamp: ahora.getTime(), vehiculo: unidad,
                voluntario: usuario?.carnet || '000000'
            };
            await addDoc(collection(db, 'checkeo_ambulancias'), nuevoChequeo);

            // 4. Publicar automáticamente en el 'Muro de Novedades'
            const descripcionMuro = `${emojiSemaforo} ${diagnostico}\n\nAceite: ${aceite}\nAgua: ${agua}\nLlantas: ${llantas}\nLuces/Sirena: ${luces}\nKilometraje: ${kilometraje} km`;

            const nuevaNovedad = {
                titulo: `REVISIÓN ${unidad}`,
                descripcion: descripcionMuro,
                autor: usuario?.carnet || '000000',
                autorNombre: usuario?.nombre || 'Sistema',
                carnetAutor: usuario?.carnet || '000000',
                fecha: fechaFormateada,
                timestamp: ahora.getTime(),
                fotoUrl: urlDescarga, // Reutilizamos la misma foto de evidencia para el muro
                id: ''
            };
            await addDoc(collection(db, 'novedades'), nuevaNovedad);

            mostrarAlerta('¡Chequeo guardado y notificado en el Muro de Novedades con éxito!');

            // 5. Limpiar el formulario
            setUnidad(''); setAceite(''); setAgua(''); setLlantas('');
            setLuces(''); setKilometraje(''); setFotoUri(null);

        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarAlerta('Hubo un error al guardar el chequeo.');
        } finally {
            setCargando(false);
        }
    }

    const renderModalSelector = () => {
        let titulo = ''; let opciones: any[] = [];
        if (modalVisible.tipo === 'unidad') { titulo = 'Unidad'; opciones = opcionesUnidad; }
        else if (modalVisible.tipo === 'aceite' || modalVisible.tipo === 'agua') { titulo = 'Nivel'; opciones = opcionesNivel; }
        else if (modalVisible.tipo === 'llantas' || modalVisible.tipo === 'luces') { titulo = 'Estado'; opciones = opcionesEstado; }

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
                                        if (modalVisible.tipo === 'aceite') setAceite(item as string);
                                        if (modalVisible.tipo === 'agua') setAgua(item as string);
                                        if (modalVisible.tipo === 'llantas') setLlantas(item as string);
                                        if (modalVisible.tipo === 'luces') setLuces(item as string);
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

    const DropdownField = ({ label, value, tipo }: { label: string, value: string, tipo: string }) => (
        <View style={styles.campoContenedor}>
            <Text style={styles.etiqueta}>{label}</Text>
            <Pressable style={styles.inputBox} onPress={() => setModalVisible({ visible: true, tipo })}>
                <Text style={styles.inputText}>{value || ''}</Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#757575" />
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.tituloPrincipal}>CHEQUEO DE AMBULANCIA</Text>

                <DropdownField label="Unidad:" value={unidad} tipo="unidad" />
                <DropdownField label="Nivel de Aceite:" value={aceite} tipo="aceite" />
                <DropdownField label="Nivel de Agua:" value={agua} tipo="agua" />
                <DropdownField label="Estado Llantas:" value={llantas} tipo="llantas" />
                <DropdownField label="Luces/Sirena:" value={luces} tipo="luces" />

                <View style={styles.campoContenedor}>
                    <Text style={styles.etiqueta}>Kilometraje:</Text>
                    <TextInput
                        style={styles.inputBoxSolo}
                        placeholder="000000"
                        placeholderTextColor="#9E9E9E"
                        value={kilometraje}
                        onChangeText={setKilometraje}
                        keyboardType="numeric"
                    />
                </View>

                {fotoUri && (
                    <View style={styles.cajaPreviaFoto}>
                        <Image source={{ uri: fotoUri }} style={styles.imagenPrevia} resizeMode="cover" />
                        <Pressable style={styles.botonQuitarFoto} onPress={() => setFotoUri(null)}>
                            <Text style={styles.textoQuitarFoto}>Quitar Evidencia</Text>
                        </Pressable>
                    </View>
                )}

                <Pressable style={styles.botonNaranja} onPress={mostrarOpcionesFoto}>
                    <MaterialIcons name="camera-alt" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.textoBotonBlanco}>TOMAR FOTO EVIDENCIA</Text>
                </Pressable>

                <Pressable style={styles.botonRojo} onPress={guardarChequeo} disabled={cargando}>
                    {cargando ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.textoBotonBlanco}>GUARDAR Y PUBLICAR</Text>
                    )}
                </Pressable>

            </ScrollView>

            {renderModalSelector()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: '#FFF' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFF' },
    botonRegresar: { width: 40, height: 40, justifyContent: 'center' },
    textoRegresar: { color: '#212121', fontSize: 24, fontWeight: 'bold' },

    scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },

    tituloPrincipal: { fontSize: 20, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 25 },

    campoContenedor: { marginBottom: 15 },
    etiqueta: { fontSize: 14, fontWeight: 'bold', color: '#000', marginBottom: 5 },

    inputBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0, paddingVertical: 10, fontSize: 16, color: '#212121', backgroundColor: '#FFF' },
    inputBoxSolo: { borderWidth: 1, borderColor: '#757575', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#212121', backgroundColor: '#FFF' },
    inputText: { fontSize: 16, color: '#212121', flex: 1 },

    botonNaranja: { flexDirection: 'row', backgroundColor: '#FF9800', paddingVertical: 16, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 25, elevation: 3 },
    botonRojo: { backgroundColor: '#C8102E', paddingVertical: 16, borderRadius: 4, alignItems: 'center', elevation: 3 },
    textoBotonBlanco: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

    cajaPreviaFoto: { height: 150, borderRadius: 8, marginBottom: 15, overflow: 'hidden' },
    imagenPrevia: { width: '100%', height: '100%' },
    botonQuitarFoto: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
    textoQuitarFoto: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCaja: { width: '90%', backgroundColor: '#FFF', borderRadius: 8, maxHeight: '80%', paddingVertical: 10, elevation: 5 },
    modalTitulo: { fontSize: 16, fontWeight: 'bold', color: '#C8102E', textAlign: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
    modalOpcion: { paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    modalTextoOpcion: { fontSize: 16, color: '#212121' }
});