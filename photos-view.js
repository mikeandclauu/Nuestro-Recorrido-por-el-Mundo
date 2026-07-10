import { obtenerMemoria } from "./firestore.js";
import { getMediaSrc } from "./storage.js";

const VIEW_KEY = "photo-view-state";
let currentIndex = 0;
let viewState = null;

function loadLegacyState() {
  try {
    return JSON.parse(localStorage.getItem(VIEW_KEY) || "null");
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatDateRange(start, end) {
  if (!start && !end) return "Sin fecha";
  if (start && !end) return `${formatDate(start)}`;
  if (!start && end) return `${formatDate(end)}`;
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function setSlide(index) {
  if (!viewState || !Array.isArray(viewState.media) || !viewState.media.length) return;

  const slides = document.querySelectorAll("#photoCarouselContainer .carousel-slide");
  const indicators = document.querySelectorAll("#photoIndicators .carousel-indicator");
  if (!slides.length) return;

  const total = slides.length;
  currentIndex = (index + total) % total;

  slides.forEach((slide, i) => {
    slide.style.display = i === currentIndex ? "flex" : "none";
  });

  indicators.forEach((indicator, i) => {
    indicator.classList.toggle("active", i === currentIndex);
  });
}

function renderView(state) {
  viewState = state;

  document.getElementById("photoViewTitle").textContent = state.title || "";
  document.getElementById("photoViewDate").textContent = formatDateRange(
    state.startDate,
    state.endDate
  );

  const carouselContainer = document.getElementById("photoCarouselContainer");
  const indicatorsContainer = document.getElementById("photoIndicators");
  carouselContainer.innerHTML = "";
  indicatorsContainer.innerHTML = "";

  state.media.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "carousel-slide";
    div.style.display = index === 0 ? "flex" : "none";

    const src = getMediaSrc(item);
    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.style.objectFit = "contain";
      div.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Media";
      img.style.objectFit = "contain";
      div.appendChild(img);
    }

    carouselContainer.appendChild(div);

    const indicator = document.createElement("button");
    indicator.type = "button";
    indicator.className = `carousel-indicator ${index === 0 ? "active" : ""}`;
    indicator.setAttribute("aria-label", `Slide ${index + 1}`);
    indicator.onclick = () => setSlide(index);
    indicatorsContainer.appendChild(indicator);
  });

  currentIndex = 0;
  if (typeof state.currentIndex === "number") {
    setSlide(state.currentIndex);
  }
}

function showEmptyMessage() {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:Inter;">No hay contenido para mostrar.</p>';
}

async function loadStateFromFirestore(memoryId) {
  const memory = await obtenerMemoria(memoryId);
  if (!memory) return null;

  const media = memory.media || (memory.photo ? [{ type: "image", data: memory.photo }] : []);
  if (!media.length) return null;

  return {
    title: memory.title,
    startDate: memory.startDate,
    endDate: memory.endDate,
    media,
    currentIndex: 0
  };
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const memoryId = params.get("id");

  let state = null;

  if (memoryId) {
    try {
      state = await loadStateFromFirestore(memoryId);
    } catch (error) {
      console.error("Error cargando momento:", error);
    }
  }

  if (!state) {
    state = loadLegacyState();
  }

  if (!state || !Array.isArray(state.media) || !state.media.length) {
    showEmptyMessage();
    return;
  }

  renderView(state);

  document.getElementById("photoPrevBtn").addEventListener("click", () => {
    setSlide(currentIndex - 1);
  });

  document.getElementById("photoNextBtn").addEventListener("click", () => {
    setSlide(currentIndex + 1);
  });

  const goBack = () => {
    localStorage.removeItem(VIEW_KEY);
    window.location.href = "index.html";
  };

  document.getElementById("photoViewClose").addEventListener("click", goBack);
  document.getElementById("photoViewBackdrop").addEventListener("click", goBack);
}

document.addEventListener("DOMContentLoaded", init);
