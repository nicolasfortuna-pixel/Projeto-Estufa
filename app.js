import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUKXBwWRhgZOwI3NTibBzHh3duuDRNSyE",
    authDomain: "projeto-sensor---dados.firebaseapp.com",
    projectId: "projeto-sensor---dados",
    storageBucket: "projeto-sensor---dados.firebasestorage.app",
    messagingSenderId: "643631878953",
    appId: "1:643631878953:web:caf54bceadd37a4c021d38",
    measurementId: "G-CDWQ6E8R22"
};
const db = getDatabase(initializeApp(firebaseConfig));

const faixas = { temp: [20, 28], umid: [50, 80], solo: [30, 70], luz: [30, 100] };
const unid   = { temp: " °C", umid: " %", solo: " %", luz: " %" };

// Leitura atual
onValue(ref(db, "estufa/atual"), snap => {
  const d = snap.val();
  if (!d) return;

  for (const k of ["temp", "umid", "solo", "luz"]) {
    const el = document.getElementById(k);
    el.textContent = d[k] + unid[k];
    const fora = d[k] < faixas[k][0] || d[k] > faixas[k][1];
    el.className = "valor " + (fora ? "ruim" : "ok");
  }

  const atraso = (Date.now() - d.ts) / 1000;
  document.getElementById("status").textContent =
    atraso > 30
      ? "ESP32 offline (última leitura há " + Math.round(atraso) + " s)"
      : "atualizado " + new Date(d.ts).toLocaleTimeString();
});

// Histórico (últimas 10 leituras)
onValue(query(ref(db, "estufa/historico"), limitToLast(10)), snap => {
  const linhas = [];
  snap.forEach(c => {
    const d = c.val();
    linhas.unshift(
      `<tr><td>${new Date(d.ts).toLocaleTimeString()}</td><td>${d.temp}</td><td>${d.umid}</td><td>${d.solo}</td><td>${d.luz}</td></tr>`
    );
  });
  document.getElementById("hist").innerHTML = linhas.join("");
});