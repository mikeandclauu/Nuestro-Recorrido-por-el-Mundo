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

            memories.push({
                ...documento.data(),
                id: documento.id,
                firebaseId: documento.id
            });

        });

        // #region agent log
        fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'firestore.js:escucharMemorias',message:'Firestore snapshot received',data:{count:memories.length,ids:memories.map(m=>m.id)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        callback(memories);

    },(error)=>{

        // #region agent log
        fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'firestore.js:escucharMemorias:error',message:'Firestore listener error',data:{code:error?.code,message:error?.message},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        console.error("Error escuchando memorias:", error);

    });

}

export async function guardarMemoria(memory){

    const { firebaseId, id, ...data } = memory;
    const docRef = await addDoc(memoriesRef, data);

    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'firestore.js:guardarMemoria',message:'Memory saved to Firestore',data:{docId:docRef.id,title:data.title},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return docRef.id;

}

export async function actualizarMemoria(memory){

    const firebaseId = memory.firebaseId || memory.id;
    const { firebaseId: _fid, id: _id, ...data } = memory;
    const reference = doc(db, "memories", firebaseId);

    await updateDoc(reference, data);

    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'firestore.js:actualizarMemoria',message:'Memory updated in Firestore',data:{firebaseId,title:data.title},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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