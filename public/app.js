
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  query,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUKXBwWRhgZOwI3NTibBzHh3duuDRNSyE",
  authDomain: "projeto-sensor---dados.firebaseapp.com",
  databaseURL: "https://projeto-sensor---dados-default-rtdb.firebaseio.com",
  projectId: "projeto-sensor---dados",
  storageBucket: "projeto-sensor---dados.firebasestorage.app",
  messagingSenderId: "643631878953",
  appId: "1:643631878953:web:caf54bceadd37a4c021d38",
  measurementId: "G-CDWQ6E8R22"
};

const db = getDatabase(initializeApp(firebaseConfig));

const $ = id => document.getElementById(id);
const entre01 = n => Math.max(0, Math.min(1, n));

// Faixas ideais e escalas
const cfg = {
  temp: { min: 0, max: 50, faixa: [20, 28], un: "°C", baixo: "Frio", alto: "Quente" },
  umid: { min: 0, max: 100, faixa: [50, 80], un: "%", baixo: "Baixa", alto: "Alta" },
  solo: { min: 0, max: 100, faixa: [30, 70], un: "%", baixo: "Seco", alto: "Encharcado" },
  luz: { min: 0, max: 100, faixa: [30, 100], un: "%", baixo: "Fraca", alto: "Intensa" }
};

// Ilustrações SVG
const artes = {
  temp(n) {
    const topo = 46 - n * 30;
    $("merc").setAttribute("y", topo);
    $("merc").setAttribute("height", 48 - topo);
  },

  umid(n) {
    $("agua").setAttribute("y", 56 - n * 50);
  },

  luz(n) {
    const s = 0.7 + n * 0.4;
    $("raios").setAttribute(
      "transform",
      `translate(32 32) scale(${s}) translate(-32 -32)`
    );
    $("halo").setAttribute("fill-opacity", 0.08 + n * 0.35);
  },

  solo(n) {
    const s = 0.45 + n * 0.55;
    $("planta").setAttribute(
      "transform",
      `translate(32 52) scale(${s}) translate(-32 -52)`
    );
    $("solo-umido").setAttribute("fill-opacity", n);
  }
};

// Faixas ideais nas barras
for (const k in cfg) {
  const c = cfg[k];
  const esc = c.max - c.min;
  const zona = $("zona-" + k);

  zona.style.left = ((c.faixa[0] - c.min) / esc) * 100 + "%";
  zona.style.width =
    ((Math.min(c.faixa[1], c.max) - c.faixa[0]) / esc) * 100 + "%";

  $("faixa-" + k).textContent =
    "ideal " + c.faixa[0] + "–" + c.faixa[1] + " " + c.un;

  artes[k](0);
}

// Modo da tela
function ajustarModo() {
  const mini =
    new URLSearchParams(location.search).has("mini") ||
    window.innerWidth <= 340;

  document.body.classList.toggle("mini", mini);
}

ajustarModo();
window.addEventListener("resize", ajustarModo);

// Relógio no topo
function atualizarRelogio() {
  $("relogio").textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

atualizarRelogio();
setInterval(atualizarRelogio, 1000);

// Última leitura recebida
let ultimoTs = 0;

function atualizarConexao() {
  if (!ultimoTs) return;

  const atraso = (Date.now() - ultimoTs) / 1000;

  // Tolerância para a diferença de horário do PC
  const offline = atraso > 180;

  document.body.dataset.conn = offline ? "off" : "on";

  $("status").textContent = offline
    ? "ESP32 offline (última leitura há " + Math.round(atraso) + " s)"
    : "atualizado " + new Date(ultimoTs).toLocaleTimeString();
}

// Verifica a conexão a cada segundo
setInterval(atualizarConexao, 1000);

// Leitura atual do Firebase
onValue(ref(db, "estufa/atual"), snap => {
  const d = snap.val();

  if (!d) return;

  for (const k in cfg) {
    const c = cfg[k];
    const v = d[k];

    const n = entre01((v - c.min) / (c.max - c.min));
    const abaixo = v < c.faixa[0];
    const acima = v > c.faixa[1];

    $(k).innerHTML = `${v}<small>${c.un}</small>`;

    $("card-" + k).classList.toggle("ruim", abaixo || acima);

    $("estado-" + k).textContent =
      abaixo ? c.baixo : acima ? c.alto : "Ideal";

    $("marca-" + k).style.left = n * 100 + "%";

    artes[k](n);
  }

  // Atualiza o horário da última leitura
  ultimoTs = d.ts;

  atualizarConexao();
});

// Histórico: últimas 10 leituras
const celula = (k, d) => {
  const c = cfg[k];
  const fora = d[k] < c.faixa[0] || d[k] > c.faixa[1];

  return `<td${fora ? ' class="ruim"' : ""}>${d[k]}</td>`;
};

onValue(
  query(ref(db, "estufa/historico"), limitToLast(10)),
  snap => {
    const linhas = [];

    snap.forEach(c => {
      const d = c.val();

      linhas.unshift(
        `<tr><td>${new Date(d.ts).toLocaleTimeString()}</td>${celula("temp", d)}${celula("umid", d)}${celula("solo", d)}${celula("luz", d)}</tr>`
      );
    });

    $("hist").innerHTML = linhas.join("");
  }
);
