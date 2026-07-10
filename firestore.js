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

import { prepareMediaForSave, deleteMemoryMedia, formatSaveError } from "./storage.js";

const memoriesRef = collection(db, "memories");

export function escucharMemorias(callback, onError) {
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
            onError?.(formatSaveError(error));
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
    const mediaItems = media || [];

    if (!mediaItems.length) {
        try {
            const docRef = await addDoc(memoriesRef, { ...metadata, media: [] });
            return docRef.id;
        } catch (error) {
            error.userMessage = formatSaveError(error);
            throw error;
        }
    }

    let docRef;
    try {
        docRef = await addDoc(memoriesRef, {
            ...metadata,
            media: []
        });

        const preparedMedia = await prepareMediaForSave(mediaItems, docRef.id);
        await updateDoc(docRef, { media: preparedMedia });

        return docRef.id;
    } catch (error) {
        if (docRef?.id) {
            try {
                await deleteDoc(doc(db, "memories", docRef.id));
            } catch {
                // ignore cleanup errors
            }
        }
        error.userMessage = formatSaveError(error);
        throw error;
    }
}

export async function actualizarMemoria(memory) {
    const firebaseId = memory.firebaseId || memory.id;
    const { firebaseId: _fid, id: _id, media, ...metadata } = memory;
    const reference = doc(db, "memories", firebaseId);

    try {
        const preparedMedia = await prepareMediaForSave(media || [], firebaseId);
        await updateDoc(reference, { ...metadata, media: preparedMedia });
    } catch (error) {
        error.userMessage = formatSaveError(error);
        throw error;
    }
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
