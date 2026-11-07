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

export default function GestionarEquipoScreen() {
    const [cargando, setCargando] = useState(false);

    // Estados del formulario
    const [categoria, setCategoria] = useState('');
    const [nombre, setNombre] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [numSerie, setNumSerie] = useState('');
    const [color, setColor] = useState('');
    const [estado, setEstado] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaRevision, setFechaRevision] = useState('');
    const [fotoUri, setFotoUri] = useState<string | null>(null);

    // Modales
    const [modalVisible, setModalVisible] = useState<{ visible: boolean, tipo: string }>({ visible: false, tipo: '' });

    const opcionesCategoria = ['Ambulancia CR-237', 'Ambulancia CR-55', 'Ambulancia CR-4', 'Equipo de Rescate', 'Clínica', 'Bodega'];
    const opcionesEstado = ['Excelente Estado', 'Buen Estado', 'Regular', 'Mal Estado (Dañado)'];

    useEffect(() => {
        const hoy = new Date();
        setFechaRevision(hoy.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    }, []);

    const mostrarAlerta = (mensaje: string) => {
        if (Platform.OS === 'web') window.alert(mensaje);
        else Alert.alert('Aviso', mensaje);
    };

    async function seleccionarFoto() {
        let resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!resultado.canceled) {
            setFotoUri(resultado.assets[0].uri);
        }
    }

    async function guardarEquipo() {
        if (!categoria || !nombre || !estado || !cantidad) {
            mostrarAlerta('Por favor llena la ubicación, nombre, estado y cantidad.');
            return;
        }

        setCargando(true);
        try {
            let urlDescarga = '';

            if (fotoUri) {
                try {
                    const response = await fetch(fotoUri);
                    const blob = await response.blob();
                    const storage = getStorage();
                    const archivoRef = ref(storage, `inventario_aph/foto_${Date.now()}`);
                    await uploadBytes(archivoRef, blob);
                    urlDescarga = await getDownloadURL(archivoRef);
                } catch (errorStorage) {
                    console.error("Error al subir imagen:", errorStorage);
                    mostrarAlerta('Problema subiendo la foto, se guardará sin imagen.');
                }
            }

            const nuevoEquipo = {
                categoria,
                nombre,
                cantidad: String(cantidad),
                numSerie,
                color,
                estado,
                descripcion,
                fechaRevision,
                fotoUrl: urlDescarga,
                id: ''
            };

            await addDoc(collection(db, 'inventario_aph'), nuevoEquipo);

            mostrarAlerta('¡Equipo agregado al inventario con éxito!');

            // Limpiar formulario
            setCategoria(''); setNombre(''); setCantidad(''); setNumSerie('');
            setColor(''); setEstado(''); setDescripcion(''); setFotoUri(null);

        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarAlerta('Hubo un error al guardar el equipo.');
        } finally {
            setCargando(false);
        }
    }

    const renderModalSelector = () => {
        let titulo = ''; let opciones: any[] = [];
        if (modalVisible.tipo === 'categoria') { titulo = 'Ubicación / Unidad'; opciones = opcionesCategoria; }
        else if (modalVisible.tipo === 'estado') { titulo = 'Estado'; opciones = opcionesEstado; }

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
                                        if (modalVisible.tipo === 'categoria') setCategoria(item as string);
                                        if (modalVisible.tipo === 'estado') setEstado(item as string);
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

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.botonRegresar}>
                    <Text style={styles.textoRegresar}>←</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.tituloPrincipal}>REGISTRO DE EQUIPO APH</Text>

                <Text style={styles.etiqueta}>Ubicación / Unidad:</Text>
                <Pressable style={styles.inputBox} onPress={() => setModalVisible({ visible: true, tipo: 'categoria' })}>
                    <Text style={[styles.inputText, !categoria && styles.placeholderText]}>
                        {categoria || 'Seleccione ubicación...'}
                    </Text>
                </Pressable>

                <TextInput
                    style={styles.inputBox}
                    placeholder="Nombre del Equipo"
                    placeholderTextColor="#9E9E9E"
                    value={nombre}
                    onChangeText={setNombre}
                />

                <View style={styles.filaMitad}>
                    <TextInput
                        style={[styles.inputBox, { flex: 1, marginRight: 10 }]}
                        placeholder="Cantidad"
                        placeholderTextColor="#9E9E9E"
                        value={cantidad}
                        onChangeText={setCantidad}
                        keyboardType="numeric"
                    />
                    <TextInput
                        style={[styles.inputBox, { flex: 1 }]}
                        placeholder="N° Serie (ID)"
                        placeholderTextColor="#9E9E9E"
                        value={numSerie}
                        onChangeText={setNumSerie}
                    />
                </View>

                <Text style={styles.etiqueta}>Color:</Text>
                <TextInput
                    style={styles.inputBox}
                    placeholder="Color del equipo"
                    placeholderTextColor="#9E9E9E"
                    value={color}
                    onChangeText={setColor}
                />

                <Text style={styles.etiqueta}>Estado:</Text>
                <Pressable style={styles.inputBox} onPress={() => setModalVisible({ visible: true, tipo: 'estado' })}>
                    <Text style={[styles.inputText, !estado && styles.placeholderText]}>
                        {estado || 'Seleccione el estado...'}
                    </Text>
                </Pressable>

                <TextInput
                    style={[styles.inputBox, { height: 90, paddingTop: 12 }]}
                    placeholder="Descripción / Observaciones"
                    placeholderTextColor="#9E9E9E"
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    textAlignVertical="top"
                />

                <Pressable style={styles.botonFoto} onPress={seleccionarFoto}>
                    <MaterialIcons name="photo-camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.textoBotonFoto}>TOMAR / SUBIR FOTO</Text>
                </Pressable>

                <View style={styles.cajaPreviaFoto}>
                    {fotoUri ? (
                        <>
                            <Image source={{ uri: fotoUri }} style={styles.imagenPrevia} resizeMode="contain" />
                            <Pressable style={styles.botonQuitarFoto} onPress={() => setFotoUri(null)}>
                                <Text style={styles.textoQuitarFoto}>Quitar Imagen</Text>
                            </Pressable>
                        </>
                    ) : (
                        <Text style={styles.textoSinFoto}>Sin imagen seleccionada</Text>
                    )}
                </View>

                <Pressable style={styles.botonGuardar} onPress={guardarEquipo} disabled={cargando}>
                    {cargando ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.textoBotonGuardar}>GUARDAR EN INVENTARIO</Text>
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

    tituloPrincipal: { fontSize: 18, fontWeight: 'bold', color: '#B71C1C', textAlign: 'center', marginBottom: 25 },

    etiqueta: { fontSize: 13, fontWeight: 'bold', color: '#212121', marginBottom: 5 },

    inputBox: { borderWidth: 1, borderColor: '#9E9E9E', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#212121', marginBottom: 15, backgroundColor: '#FFF' },
    inputText: { fontSize: 15, color: '#212121' },
    placeholderText: { color: '#9E9E9E' },

    filaMitad: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },

    botonFoto: { flexDirection: 'row', backgroundColor: '#455A64', paddingVertical: 14, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
    textoBotonFoto: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },

    cajaPreviaFoto: { backgroundColor: '#EEEEEE', height: 200, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
    imagenPrevia: { width: '100%', height: '100%' },
    textoSinFoto: { color: '#9E9E9E', fontSize: 14 },
    botonQuitarFoto: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
    textoQuitarFoto: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    botonGuardar: { backgroundColor: '#C8102E', paddingVertical: 16, borderRadius: 4, alignItems: 'center', elevation: 3 },
    textoBotonGuardar: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },

    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCaja: { width: '100%', backgroundColor: '#FFF', borderRadius: 8, maxHeight: '80%', paddingVertical: 10 },
    modalTitulo: { fontSize: 16, fontWeight: 'bold', color: '#C8102E', textAlign: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
    modalOpcion: { paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    modalTextoOpcion: { fontSize: 16, color: '#212121' }
});