const VIEW_KEY = "photo-view-state";

function loadState() {
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
  const state = loadState();
  if (!state || !Array.isArray(state.media) || !state.media.length) return;

  const slides = document.querySelectorAll("#photoCarouselContainer .carousel-slide");
  const indicators = document.querySelectorAll("#photoIndicators .carousel-indicator");
  if (!slides.length) return;

  const total = slides.length;
  const nextIndex = (index + total) % total;

  slides.forEach((slide, i) => {
    slide.style.display = i === nextIndex ? "flex" : "none";
  });

  indicators.forEach((indicator, i) => {
    indicator.classList.toggle("active", i === nextIndex);
  });

  state.currentIndex = nextIndex;
  localStorage.setItem(VIEW_KEY, JSON.stringify(state));
}

function init() {
  const state = loadState();
  if (!state || !Array.isArray(state.media) || !state.media.length) {
    document.body.innerHTML =
      '<p style="padding:24px;font-family:Inter;">No hay contenido para mostrar.</p>';
    return;
  }

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

    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.data;
      video.controls = true;
      video.style.objectFit = "contain";
      div.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.data;
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

  const prevBtn = document.getElementById("photoPrevBtn");
  const nextBtn = document.getElementById("photoNextBtn");

  prevBtn.addEventListener("click", () => {
    const st = loadState();
    if (!st) return;
    setSlide(st.currentIndex - 1);
  });

  nextBtn.addEventListener("click", () => {
    const st = loadState();
    if (!st) return;
    setSlide(st.currentIndex + 1);
  });

  document.getElementById("photoViewClose").addEventListener("click", () => {
    localStorage.removeItem(VIEW_KEY);
    window.location.href = "index.html";
  });

  document.getElementById("photoViewBackdrop").addEventListener("click", () => {
    localStorage.removeItem(VIEW_KEY);
    window.location.href = "index.html";
  });

  // Restaurar slide guardado
  if (typeof state.currentIndex === "number") {
    setSlide(state.currentIndex);
  }
}

document.addEventListener("DOMContentLoaded", init);

