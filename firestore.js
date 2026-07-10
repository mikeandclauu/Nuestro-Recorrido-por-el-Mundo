import {
    db,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    orderBy
} from "./firebase.js";

import { prepareMediaForSave, deleteMemoryMedia } from "./storage.js";

const memoriesRef = collection(db, "memories");

export function escucharMemorias(callback) {
    const q = query(memoriesRef, orderBy("createdAt", "desc"));

    return onSnapshot(
        q,
        (snapshot) => {
            const memories = [];

            snapshot.forEach((documento) => {
                memories.push({
                    ...documento.data(),
                    id: documento.id,
                    firebaseId: documento.id
                });
            });

            callback(memories);
        },
        (error) => {
            console.error("Error escuchando memorias:", error);
        }
    );
}

export async function obtenerMemoria(memoryId) {
    const snapshot = await getDoc(doc(db, "memories", memoryId));
    if (!snapshot.exists()) return null;

    return {
        ...snapshot.data(),
        id: snapshot.id,
        firebaseId: snapshot.id
    };
}

export async function guardarMemoria(memory) {
    const { firebaseId, id, media, ...metadata } = memory;

    const docRef = await addDoc(memoriesRef, {
        ...metadata,
        media: []
    });

    const preparedMedia = await prepareMediaForSave(media || [], docRef.id);
    await updateDoc(docRef, { media: preparedMedia });

    return docRef.id;
}

export async function actualizarMemoria(memory) {
    const firebaseId = memory.firebaseId || memory.id;
    const { firebaseId: _fid, id: _id, media, ...metadata } = memory;
    const reference = doc(db, "memories", firebaseId);

    const preparedMedia = await prepareMediaForSave(media || [], firebaseId);
    await updateDoc(reference, { ...metadata, media: preparedMedia });
}

export async function borrarMemoria(firebaseId) {
    await deleteMemoryMedia(firebaseId);
    await deleteDoc(doc(db, "memories", firebaseId));
}

export async function cargarInicial() {
    const snapshot = await getDocs(memoriesRef);
    const memories = [];

    snapshot.forEach((documento) => {
        memories.push({
            ...documento.data(),
            id: documento.id,
            firebaseId: documento.id
        });
    });

    return memories;
}
