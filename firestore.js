import {
    db,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    orderBy
} from "./firebase.js";

const memoriesRef = collection(db, "memories");

export function escucharMemorias(callback){

    const q=query(
        memoriesRef,
        orderBy("createdAt","desc")
    );

    return onSnapshot(q,(snapshot)=>{

        const memories=[];

        snapshot.forEach((documento)=>{

            memories.push(documento.data());

        });

        callback(memories);

    });

}

export async function guardarMemoria(memory){

    await addDoc(memoriesRef,memory);

}

export async function actualizarMemoria(memory){

    const reference=doc(db,"memories",memory.firebaseId);

    await updateDoc(reference,memory);

}

export async function borrarMemoria(firebaseId){

    await deleteDoc(

        doc(db,"memories",firebaseId)

    );

}

export async function cargarInicial(){

    const snapshot=await getDocs(memoriesRef);

    const memories=[];

    snapshot.forEach(doc=>{

        memories.push(doc.data());

    });

    return memories;

}