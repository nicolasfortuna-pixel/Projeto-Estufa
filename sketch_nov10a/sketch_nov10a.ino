#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const  String DB_URL = "https://projeto-sensor---dados-default-rtdb.firebaseio.com/"
unsigned long ultimoAtual = 0, ultimoHistorico = 0;

bool enviarFirebase(const String& caminho, const String& json, bool sobrescrever) {
  WiFiClientSecure client;
  client.setInsecure();   // ok para o projeto; não valida o certificado
  HTTPClient http;
  http.begin(client, DB_URL + caminho + ".json");
  http.addHeader("Content-Type", "application/json");
  int code = sobrescrever ? http.PUT(json) : http.POST(json);.........
  http.end();
  return code == 200;
}

String montaJson() {
  return "{\"temp\":" + String(temp, 0) +
         ",\"umid\":" + String(umidAr, 0) +
         ",\"solo\":" + String(solo) +
         ",\"luz\":" + String(luz) +
         ",\"ts\":{\".sv\":\"timestamp\"}}";
}

  if (millis() - ultimoAtual >= 10000) {
    ultimoAtual = millis();
    Serial.println(enviarFirebase("/estufa/atual", montaJson(), true) ? "Firebase OK" : "Falha Firebase");
  }
  if (millis() - ultimoHistorico >= 60000) {
    ultimoHistorico = millis();
    enviarFirebase("/estufa/historico", montaJson(), false);
  }