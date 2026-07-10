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

let currentAccessQuestion = 0;

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

function renderAccessQuestion() {
  const accessProgress = document.querySelector("#accessProgress");
  const accessQuestionText = document.querySelector("#accessQuestionText");
  const accessAnswerInput = document.querySelector("#accessAnswerInput");
  const item = ACCESS_QUESTIONS[currentAccessQuestion];

  if (!item) return;

  if (accessProgress) {
    accessProgress.textContent = `Pregunta ${currentAccessQuestion + 1} de ${ACCESS_QUESTIONS.length}`;
  }

  if (accessQuestionText) {
    accessQuestionText.textContent = item.question;
  }

  if (accessAnswerInput) {
    accessAnswerInput.value = "";
    accessAnswerInput.placeholder = "Escribe tu respuesta...";
  }
}

const ACCESS_UNLOCK_KEY = "our-memory-garden-access";

function unlockAccess() {
  document.body.classList.remove("is-locked");
  const accessGate = document.querySelector("#accessGate");
  if (accessGate) accessGate.classList.add("is-hidden");
  try {
    sessionStorage.setItem(ACCESS_UNLOCK_KEY, "1");
  } catch {
    // ignore
  }
}

function restoreAccessIfUnlocked() {
  try {
    if (sessionStorage.getItem(ACCESS_UNLOCK_KEY) === "1") {
      unlockAccess();
    }
  } catch {
    // ignore
  }
}

function initAccessGate() {
  const accessGate = document.querySelector("#accessGate");
  const accessForm = document.querySelector("#accessForm");
  const accessError = document.querySelector("#accessError");

  if (!accessForm) return;

  restoreAccessIfUnlocked();
  renderAccessQuestion();

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
      const input = document.querySelector("#accessAnswerInput");
      if (input) input.focus();
      return;
    }

    unlockAccess();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccessGate);
} else {
  initAccessGate();
}
