import * as firestore from "./firestore.js";
const STORAGE_KEY = "our-memory-garden-v3";
const STORAGE_MIGRATION_KEY = "our-memory-garden";
const STORAGE_BACKUP_KEY = "our-memory-garden-backup-v3";
const DB_NAME = "our-memory-garden-db";
const DB_STORE = "memories";


const ACCESS_QUESTIONS = [
  {
    question: "¿Cual fue la primera película que vimos juntos el 31 de Mayo en casa de Olivia?",
    answers: ["Teen Beach Movie"],
    looseAnswers: ["teenbeachmovie", "teenbeach"],
  },
  {
    question: "¿De qué color fue el primer ramo de flores que te dí el 6 de Junio?",
    answers: ["Rosa"],
    looseAnswers: ["rosa"],
  },
  {
    question: "¿Para qué me escribiste la primera vez que empezamos a hablar?",
    answers: ["El trabajo de lógica", "El trabajo de lógica borrosa", "El trabajo de Arturo"],
    looseAnswers: ["trabajodelogica", "trabajodelogicaborrosa", "trabajodearturo"],
    customCheck: (answer) =>
      answer.includes("trabajo") && (answer.includes("logica") || answer.includes("arturo")),
  },
  {
    question: "¿Cuál es nuestro parque de confianza?",
    answers: ["Parque Juan Carlos I"],
    looseAnswers: [
      "parquejuancarlosi",
      "parquejuancarlos1",
      "parquejuancarlosprimero",
      "juancarlosi",
      "juancarlos1",
      "juancarlos",
    ],
    customCheck: (answer, looseAnswer) =>
      answer.includes("parque") && looseAnswer.includes("juancarlos"),
  },
  {
    question: "¿Cómo se llama nuestro sushi?",
    answers: ["Sushi Tao", "Tao", "Buffet Tao"],
    looseAnswers: ["sushitao", "tao", "buffettao"],
    customCheck: (answer) => answer.includes("tao"),
  },
  {
    question: '¿Cómo se llama la doctora en "A dos metros de ti"?',
    answers: ["Bárbara"],
    looseAnswers: ["barbara"],
  },
  {
    question: "¿Qué dia empezamos a salir?",
    answers: ["El 12 de Julio"],
    looseAnswers: ["12dejulio", "el12dejulio", "1207", "127"],
    customCheck: (answer, looseAnswer) =>
      (answer.includes("12") && answer.includes("julio")) ||
      looseAnswer.includes("1207") ||
      looseAnswer.includes("127"),
  },
  {
    question: "¿A dónde fue nuestro primer viaje juntos?",
    answers: ["A Valencia"],
    looseAnswers: ["valencia", "avalencia"],
    customCheck: (answer) => answer.includes("valencia"),
  },
];

const accessGate = document.querySelector("#accessGate");
const accessForm = document.querySelector("#accessForm");
const accessQuestions = document.querySelector("#accessQuestions");
const accessProgress = document.querySelector("#accessProgress");
const accessError = document.querySelector("#accessError");
const form = document.querySelector("#memoryForm");
const grid = document.querySelector("#memoryGrid");
const template = document.querySelector("#memoryTemplate");
const emptyState = document.querySelector("#emptyState");
const photoInput = document.querySelector("#photoInput");
const previewWrap = document.querySelector("#previewWrap");
const clearPhotoButton = document.querySelector("#clearPhotoButton");
const searchInput = document.querySelector("#searchInput");
const filterInput = document.querySelector("#filterInput");

const startDateInput = document.querySelector("#startDateInput");
const endDateInput = document.querySelector("#endDateInput");
let editingMemoryId = null;

// Modal elements
const memoryModal = document.querySelector("#memoryModal");
const modalClose = document.querySelector("#modalClose");
const carouselContainer = document.querySelector("#carouselContainer");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const indicatorsContainer = document.querySelector("#indicators");
const modalTitle = document.querySelector("#modalTitle");
const modalDate = document.querySelector("#modalDate");
const modalMood = document.querySelector("#modalMood");
const modalNote = document.querySelector("#modalNote");
const modalFavoriteBtn = document.querySelector("#modalFavoriteBtn");
const modalDownloadBtn = document.querySelector("#modalDownloadBtn");
const modalDeleteBtn = document.querySelector("#modalDeleteBtn");
const modalEditBtn = document.querySelector("#modalEditBtn");

let memories = [];
let localMigrationDone = false;

firestore.escucharMemorias(async (items) => {

    memories = items;

    if (!localMigrationDone && items.length === 0) {
        localMigrationDone = true;
        await migrateLocalMemoriesToFirestore();
    }

    render();

    updateStats();

});

render();

let selectedPhotos = [];
let currentAccessQuestion = 0;
let currentMemoryId = null;
let currentCarouselIndex = 0;

renderAccessQuestion();
startDateInput.value = "";
endDateInput.value = "";
render();


accessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(accessForm);
  const question = ACCESS_QUESTIONS[currentAccessQuestion];
  const isCorrect = isAccessAnswerCorrect(question, data.get("access-answer"));

  if (!isCorrect) {
    accessError.textContent = "Alguna respuesta no es correcta. Inténtalo otra vez.";
    accessForm.classList.add("has-error");
    setTimeout(() => accessForm.classList.remove("has-error"), 280);
    return;
  }

  currentAccessQuestion += 1;
  accessError.textContent = "";
  accessForm.reset();

  if (currentAccessQuestion < ACCESS_QUESTIONS.length) {
    renderAccessQuestion();
    return;
  }

  document.body.classList.remove("is-locked");
  accessGate.classList.add("is-hidden");
});

photoInput.addEventListener("change", async (event) => {
  const files = event.target.files;
  if (!files) return;

  selectedPhotos = [];
  for (const file of files) {
    const dataUrl = await readFileAsDataUrl(file);
    selectedPhotos.push({
      type: file.type.startsWith('video/') ? 'video' : 'image',
      data: dataUrl,
      name: file.name
    });
  }
  renderPreview();
});

function renderPreview() {
  const previewList = document.querySelector("#previewList");
  previewList.innerHTML = "";
  
  selectedPhotos.forEach((media, index) => {
    const div = document.createElement("div");
    div.className = "preview-item";
    
    if (media.type === 'video') {
      const video = document.createElement("video");
      video.src = media.data;
      video.style.maxWidth = "150px";
      video.style.maxHeight = "150px";
      video.controls = true;
      div.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = media.data;
      img.alt = `Vista previa ${index + 1}`;
      img.style.maxWidth = "150px";
      img.style.maxHeight = "150px";
      div.appendChild(img);
    }
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-media-btn";
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.onclick = () => {
      selectedPhotos.splice(index, 1);
      renderPreview();
    };
    div.appendChild(removeBtn);
    previewList.appendChild(div);
  });
  
  previewWrap.classList.toggle("is-hidden", selectedPhotos.length === 0);
}

clearPhotoButton.addEventListener("click", () => {
  selectedPhotos = [];
  photoInput.value = "";
  previewWrap.classList.add("is-hidden");
  document.querySelector("#previewList").innerHTML = "";
});

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const data = new FormData(form);

    let startDate = normalizeDDMMYYYYToISO(data.get("startDate"));
    let endDate = normalizeDDMMYYYYToISO(data.get("endDate"));

    const memory = {

        title: data.get("title").trim(),

        startDate,

        endDate,

        note: data.get("note").trim(),

        media: [...selectedPhotos],

        favorite: false,

        createdAt: Date.now()

    };

    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'script.js:formSubmit',message:'Form submit started',data:{editingMemoryId,title:memory.title,mediaCount:memory.media.length},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    try {
        if (editingMemoryId) {
            memory.firebaseId = editingMemoryId;
            await firestore.actualizarMemoria(memory);
        } else {
            await firestore.guardarMemoria(memory);
        }

        // #region agent log
        fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'script.js:formSubmit:success',message:'Form submit succeeded',data:{editingMemoryId},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // #endregion
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'script.js:formSubmit:error',message:'Form submit failed',data:{code:error?.code,message:error?.message},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error("Error guardando momento:", error);
        alert("No se pudo guardar el momento. Revisa la conexión o las reglas de Firebase.");
        return;
    }

    editingMemoryId = null;

    const submitBtn = document.querySelector("#memoryForm .primary-button");
    if (submitBtn) submitBtn.textContent = "Guardar recuerdo";

    form.reset();

    selectedPhotos = [];

    renderPreview();

});

searchInput.addEventListener("input", render);
filterInput.addEventListener("change", render);

// Modal handlers
modalClose.addEventListener("click", closeModal);
memoryModal.addEventListener("click", (e) => {
  if (e.target === memoryModal) closeModal();
});

prevBtn.addEventListener("click", () => navigateCarousel(-1));
nextBtn.addEventListener("click", () => navigateCarousel(1));

modalFavoriteBtn.addEventListener("click", async () => {
  const memory = memories.find((m) => m.id === currentMemoryId);
  if (!memory) return;
  memory.favorite = !memory.favorite;
  try {
    await firestore.actualizarMemoria(memory);
    updateModalUI();
    render();
  } catch (error) {
    memory.favorite = !memory.favorite;
    console.error("Error actualizando favorito:", error);
    alert("No se pudo actualizar el favorito.");
  }
});

modalDeleteBtn.addEventListener("click", async () => {
  if (!confirm("¿Estás seguro de que quieres eliminar este momento?")) return;
  const memory = memories.find((m) => m.id === currentMemoryId);
  if (!memory) return;
  try {
    await firestore.borrarMemoria(memory.firebaseId || memory.id);
    closeModal();
  } catch (error) {
    console.error("Error eliminando momento:", error);
    alert("No se pudo eliminar el momento.");
  }
});

modalDownloadBtn.addEventListener("click", downloadMemoryMedia);

modalEditBtn.addEventListener("click", () => {
  const memory = memories.find((m) => m.id === currentMemoryId);
  if (!memory) return;
  editingMemoryId = memory.id;
  fillFormForEdit(memory);
  closeModal();
  document.querySelector("#memoryForm").scrollIntoView({ behavior: "smooth", block: "start" });
});


grid.addEventListener("click", (event) => {
  const card = event.target.closest(".memory-card");
  if (!card) return;

  const memory = memories.find((item) => item.id === card.dataset.id);
  if (!memory) return;

  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    openMemoryModal(memory);
    return;
  }

  const action = actionButton.getAttribute("data-action");

  if (action === "favorite") {
    memory.favorite = !memory.favorite;
    firestore.actualizarMemoria(memory).catch((error) => {
      memory.favorite = !memory.favorite;
      console.error("Error actualizando favorito:", error);
      alert("No se pudo actualizar el favorito.");
      render();
    });
    updateStats();
    render();
    return;
  }

  if (action === "delete") {
    if (confirm("¿Estás seguro de que quieres eliminar este momento?")) {
      firestore.borrarMemoria(memory.firebaseId || memory.id).catch((error) => {
        console.error("Error eliminando momento:", error);
        alert("No se pudo eliminar el momento.");
      });
    }
    return;
  }

  if (action === "edit") {
    // abrir modal para que se vea la info/carrusel
    openMemoryModal(memory);
    // activar edición en el formulario y conservar media existente
    fillFormForEdit(memory);
    return;
  }

  // fallback
  openMemoryModal(memory);
});

function fillFormForEdit(memory) {
  editingMemoryId = memory.id;

  // Mantener media existente y permitir añadir más
  selectedPhotos = getMemoryMedia(memory).map((m) => ({
    type: m.type,
    data: m.data,
    name: m.name || ""
  }));

  renderPreview();
  previewWrap.classList.toggle("is-hidden", selectedPhotos.length === 0);

  // Prefill texto/fechas
  document.querySelector("#titleInput").value = memory.title || "";

  // Los inputs type="date" muestran el formato según el navegador.
  // Para que se vea dd-mm-aa en la UI de forma consistente, los mostramos como texto
  // usando auxiliares y sincronizamos el valor real (YYYY-MM-DD) al guardar.
  startDateInput.value = memory.startDate || "";
  endDateInput.value = memory.endDate || "";

  document.querySelector("#noteInput").value = memory.note || "";

  // Importante: no seteamos photoInput.value (está restringido por el navegador).
  // Si el usuario selecciona más archivos, se añadirán a selectedPhotos.

  const submitBtn = document.querySelector("#memoryForm .primary-button");
  if (submitBtn) submitBtn.textContent = "Guardar cambios";
}


function render() {
  const visibleMemories = getVisibleMemories();
  grid.replaceChildren();

  visibleMemories.forEach((memory) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = memory.id;

    const photo = node.querySelector(".card-photo");
    
    // Manejar tanto el formato antiguo (photo) como el nuevo (media array)
    const media = memory.media || (memory.photo ? [{type: 'image', data: memory.photo}] : []);
    
    if (media && media.length > 0) {
      const mediaContainer = document.createElement("div");
      mediaContainer.className = "media-container";
      
      media.forEach((item) => {
        if (item.type === 'video') {
    const video = document.createElement("video");
          video.src = item.data;
          video.controls = true;
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";
          mediaContainer.appendChild(video);
        } else {
          const image = document.createElement("img");
          image.src = item.data;
          image.alt = memory.title;
          mediaContainer.appendChild(image);
        }
      });
      
      photo.replaceChildren(mediaContainer);

      // Click en imágenes/videos abre interfaz aparte
      mediaContainer.addEventListener("click", (evt) => {
        const target = evt.target;
        if (!(target instanceof HTMLImageElement) && !(target instanceof HTMLVideoElement)) return;
        openPhotoView(memory);
      });
    } else {
      photo.textContent = "Sin fotos o videos";
    }

    node.querySelector(".memory-date").textContent = formatDateRange(memory.startDate, memory.endDate);
    node.querySelector("h3").textContent = memory.title;
    node.querySelector(".memory-note").textContent = memory.note;
// No hay sección de sentimiento/mood
    const moodEl = node.querySelector(".memory-mood");
    if (moodEl) moodEl.textContent = "";


    const favoriteButton = node.querySelector(".favorite-button");
    favoriteButton.classList.toggle("is-favorite", memory.favorite);
    favoriteButton.setAttribute(
      "aria-label",
      memory.favorite ? "Quitar de favoritos" : "Añadir a favoritos"
    );

    grid.appendChild(node);
  });

  emptyState.classList.toggle("is-hidden", visibleMemories.length > 0);
  grid.classList.toggle("is-hidden", visibleMemories.length === 0);
  updateStats();
}

function formatDateRange(start, end) {
  if (!start && !end) return "Sin fecha";
  if (start && !end) return `${formatDate(start)}`;
  if (!start && end) return `${formatDate(end)}`;
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getVisibleMemories() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = filterInput.value;

  return memories.filter((memory) => {
    const matchesQuery = [
      memory.title,
      memory.note,
      memory.startDate,
      memory.endDate,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
    
    const hasMedia = memory.photo || (memory.media && memory.media.length > 0);

    
    const matchesFilter =
      filter === "all" ||
      (filter === "favorites" && memory.favorite) ||
      (filter === "photos" && hasMedia);

    return matchesQuery && matchesFilter;
  });
}

function updateStats() {
  document.querySelector("#memoryCount").textContent = memories.length;
  const photoCount = memories.filter((item) => item.photo || (item.media && item.media.length > 0)).length;
  document.querySelector("#photoCount").textContent = photoCount;
  document.querySelector("#favoriteCount").textContent = memories.filter((item) => item.favorite).length;
}

function renderAccessQuestion() {
  accessQuestions.replaceChildren();
  const item = ACCESS_QUESTIONS[currentAccessQuestion];
  const label = document.createElement("label");
  const span = document.createElement("span");
  const input = document.createElement("input");

  accessProgress.textContent = `Pregunta ${currentAccessQuestion + 1} de ${ACCESS_QUESTIONS.length}`;
  span.textContent = item.question;
  input.name = "access-answer";
  input.type = "text";
  input.autocomplete = "off";
  input.required = true;

  label.append(span, input);
  accessQuestions.appendChild(label);
  input.focus();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexedDB no disponible'));
      return;
    }

    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll() {
  return openDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.getAll ? store.getAll() : store.openCursor();

      if (store.getAll) {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
        return;
      }

      const out = [];
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          out.push(cursor.value);
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    })
  );
}

function dbPutAll(items) {
  // Evitar errores: el store no tiene key generator, así que definimos clave por id.
  return openDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);

      store.clear().onsuccess = () => {
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          if (typeof item.id === 'string') {
            store.put(item, item.id);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    })
  );
}


async function loadMemoriesAsync() {
  // Intentar cargar desde IndexedDB; si falla, fallback a localStorage.
  try {
    const dbItems = await dbGetAll();
    if (Array.isArray(dbItems) && dbItems.length) return dbItems;
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return Object.values(parsed);
    }

    const rawV1 = localStorage.getItem(STORAGE_MIGRATION_KEY);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1);
      if (Array.isArray(parsedV1)) return parsedV1;
      if (parsedV1 && typeof parsedV1 === 'object') return Object.values(parsedV1);
    }
  } catch {
    // ignore
  }

  return [];
}

async function migrateLocalMemoriesToFirestore() {
  const localItems = await loadMemoriesAsync();
  if (!localItems.length) return;

  // #region agent log
  fetch('http://127.0.0.1:7282/ingest/6feb4a61-b90d-4c63-8df7-7b0843eead95',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'00c629'},body:JSON.stringify({sessionId:'00c629',location:'script.js:migrateLocal',message:'Migrating local memories to Firestore',data:{count:localItems.length},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  for (const item of localItems) {
    const { id, firebaseId, ...data } = item;
    try {
      await firestore.guardarMemoria({
        ...data,
        createdAt: data.createdAt || Date.now(),
        favorite: Boolean(data.favorite),
      });
    } catch (error) {
      console.error("Error migrando momento local:", error);
    }
  }
}

function loadMemories() {
  // Carga robusta desde localStorage (garantiza que al refrescar no se quede vacío)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
  // IMPORTANTE: si no hay localStorage, intentamos IndexedDB (cargando de forma async y degradando a [])
    if (!raw) {
      // Como esta función es síncrona, no podemos esperar IndexedDB aquí.
      // Devolvemos [] y dejamos que la carga async se haga en el init (más abajo).
      return [];
    }



    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;

    // Si se guardó accidentalmente como objeto/otro formato, convertir a array
    if (parsed && typeof parsed === "object") {
      const asArray = Object.values(parsed);
      return Array.isArray(asArray) ? asArray : [];
    }

    return [];
  } catch {
    try {
      const rawBackup = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (!rawBackup) return [];
      const parsedBackup = JSON.parse(rawBackup);
      if (Array.isArray(parsedBackup)) return parsedBackup;
      if (parsedBackup && typeof parsedBackup === "object") {
        const asArray = Object.values(parsedBackup);
        return Array.isArray(asArray) ? asArray : [];
      }
      return [];
    } catch {
      return [];
    }
  }
}



function saveMemories() {
  // Guardar en paralelo en IndexedDB y localStorage.
  const payload = Array.isArray(memories) ? memories : [];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }

  dbPutAll(payload).catch(() => {
    // ignore
  });
}




function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeLooseAnswer(value) {
  return normalizeAnswer(value).replace(/[^a-z0-9]/g, "");
}

function isAccessAnswerCorrect(question, value) {
  const answer = normalizeAnswer(value);
  const looseAnswer = normalizeLooseAnswer(value);
  const matchesExact = question.answers.some((validAnswer) => normalizeAnswer(validAnswer) === answer);
  const matchesLoose = (question.looseAnswers || []).some((validAnswer) => {
    const normalizedValidAnswer = normalizeLooseAnswer(validAnswer);
    return (
      looseAnswer === normalizedValidAnswer ||
      looseAnswer.includes(normalizedValidAnswer) ||
      normalizedValidAnswer.includes(looseAnswer)
    );
  });
  const matchesCustom = question.customCheck ? question.customCheck(answer, looseAnswer) : false;

  return matchesExact || matchesLoose || matchesCustom;
}

function isMemory(item) {
  // Compatibilidad hacia atrás con el formato antiguo (date/photo/mood)
  // y compatibilidad con el formato nuevo (startDate/endDate/media).
  if (!item || typeof item.id !== "string" || typeof item.title !== "string") return false;

  if (typeof item.note !== "string") return false;

  // Nuevo formato
  if (
    typeof item.startDate === "string" &&
    typeof item.endDate === "string" &&
    Array.isArray(item.media)
  ) {
    return true;
  }

  // Formato antiguo
  if (typeof item.date === "string") {
    return true;
  }

  return false;
}



function formatDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}


function normalizeDDMMYYYYToISO(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  // Si ya viene como YYYY-MM-DD (inputs type="date")
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;


  // Acepta dd-mm-yy, dd-mm-yyyy, dd/mm/yy, dd/mm/yyyy
  const m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (!m) return raw;

  let dd = m[1];
  let mm = m[2];
  let yyyy = m[3];

  dd = String(dd).padStart(2, "0");
  mm = String(mm).padStart(2, "0");

  if (yyyy.length === 2) {
    // aa -> 19aa / 20aa (heurística)
    const yyNum = Number(yyyy);
    yyyy = yyNum >= 70 ? `19${yyyy}` : `20${yyyy}`;
  }

  return `${yyyy}-${mm}-${dd}`;
}


function openMemoryModal(memory) {
  currentMemoryId = memory.id;
  currentCarouselIndex = 0;
  
  modalTitle.textContent = memory.title;
  modalDate.textContent = formatDateRange(memory.startDate, memory.endDate);
  modalMood.textContent = memory.mood || "";

  modalNote.textContent = memory.note;
  
  updateModalUI();
  renderCarousel(memory);
  
  memoryModal.classList.remove("is-hidden");
  memoryModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  memoryModal.classList.add("is-hidden");
  memoryModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  currentMemoryId = null;
  currentCarouselIndex = 0;
}

function renderCarousel(memory) {
  const media = memory.media || (memory.photo ? [{type: 'image', data: memory.photo}] : []);
  
  carouselContainer.innerHTML = "";
  indicatorsContainer.innerHTML = "";
  
  media.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "carousel-slide";
    div.style.display = index === 0 ? "flex" : "none";
    
    if (item.type === 'video') {
      const video = document.createElement("video");
      video.src = item.data;
      video.controls = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "contain";
      div.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.data;
      img.alt = "Moment media";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      div.appendChild(img);
    }
    
    carouselContainer.appendChild(div);
    
    // Indicator
    const indicator = document.createElement("button");
    indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
    indicator.type = "button";
    indicator.setAttribute("aria-label", `Slide ${index + 1}`);
    indicator.onclick = () => goToSlide(index);
    indicatorsContainer.appendChild(indicator);
  });
  
  prevBtn.style.display = media.length > 1 ? "block" : "none";
  nextBtn.style.display = media.length > 1 ? "block" : "none";
}

function navigateCarousel(direction) {
  const memory = memories.find((m) => m.id === currentMemoryId);
  if (!memory) return;
  
  const media = memory.media || (memory.photo ? [{type: 'image', data: memory.photo}] : []);
  currentCarouselIndex = (currentCarouselIndex + direction + media.length) % media.length;
  goToSlide(currentCarouselIndex);
}

function goToSlide(index) {
  currentCarouselIndex = index;
  const slides = carouselContainer.querySelectorAll(".carousel-slide");
  const indicators = indicatorsContainer.querySelectorAll(".carousel-indicator");
  
  slides.forEach((slide, i) => {
    slide.style.display = i === index ? "flex" : "none";
  });
  
  indicators.forEach((indicator, i) => {
    indicator.classList.toggle("active", i === index);
  });
}

function updateModalUI() {
  const memory = memories.find((m) => m.id === currentMemoryId);
  if (!memory) return;
  
modalFavoriteBtn.classList.toggle("is-favorite", memory.favorite);
  modalFavoriteBtn.textContent = memory.favorite ? "Favorito" : "Añadir a favoritos";
}

function getMemoryMedia(memory) {
  return memory.media || (memory.photo ? [{ type: "image", data: memory.photo }] : []);
}

function openPhotoView(memory) {
  const VIEW_KEY = "photo-view-state";
  const media = getMemoryMedia(memory);
  if (!media.length) return;

  const payload = {
    title: memory.title,
    startDate: memory.startDate,
    endDate: memory.endDate,
    media,
    currentIndex: 0,
  };
  localStorage.setItem(VIEW_KEY, JSON.stringify(payload));
  window.location.href = "photos-view.html";
}

function downloadMemoryMedia() {
  const memory = memories.find((m) => m.id === currentMemoryId);
  if (!memory) return;
  
  const media = memory.media || (memory.photo ? [{type: 'image', data: memory.photo}] : []);
  
  media.forEach((item, index) => {
    const link = document.createElement("a");
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    link.href = item.data;
    link.download = `${memory.title}-${index + 1}.${ext}`;
    link.click();
  });
}
