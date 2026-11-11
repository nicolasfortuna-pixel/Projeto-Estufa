#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

// ---------- PINOS ----------
#define DHTPIN 4
#define DHTTYPE DHT11
#define PIN_SOLO 35
#define PIN_LUZ 34
#define TFT_CS 5
#define TFT_DC 16
#define TFT_RST 17

// ---------- EDITE AQUI ----------
const char* WIFI_SSID  = "Gabriel";
const char* WIFI_SENHA = "Gabriel19";
const String DB_URL = "https://projeto-sensor---dados-default-rtdb.firebaseio.com";

// calibre vendo o valor "raw" no serial: sensor seco e dentro d'água
const int SOLO_SECO = 3200;
const int SOLO_MOLHADO = 1400;
// --------------------------------

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);

float temp = 0, umidAr = 0;
int solo = 0, luz = 0;   // solo e luz em %
unsigned long ultimaLeitura = 0, ultimoAtual = 0, ultimoHistorico = 0;

bool enviarFirebase(const String& caminho, const String& json, bool sobrescrever) {
  WiFiClientSecure client;
  client.setInsecure();   // ok para o projeto; não valida o certificado
  HTTPClient http;
  http.begin(client, DB_URL + caminho + ".json");
  http.addHeader("Content-Type", "application/json");
  int code = sobrescrever ? http.PUT(json) : http.POST(json);
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

void desenhaFixo(String ip) {
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(10, 8);   tft.print("ESTUFA  "); tft.print(ip);
  tft.setTextColor(ILI9341_YELLOW);
  tft.setCursor(10, 44);  tft.print("Temp.");
  tft.setCursor(10, 84);  tft.print("Umid. ar");
  tft.setCursor(10, 124); tft.print("Solo");
  tft.setCursor(10, 164); tft.print("Luz");
}

void desenhaTela() {
  tft.fillRect(150, 40, 170, 160, ILI9341_BLACK);  // limpa só os valores
  tft.setTextSize(3);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(150, 40);  tft.print(temp, 0);   tft.print(" C");
  tft.setCursor(150, 80);  tft.print(umidAr, 0); tft.print(" %");
  tft.setCursor(150, 120); tft.print(solo);      tft.print(" %");
  tft.setCursor(150, 160); tft.print(luz);       tft.print(" %");
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  tft.begin();
  tft.setRotation(1);  // paisagem 320x240

  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  while (WiFi.status() != WL_CONNECTED) delay(300);
  Serial.println(WiFi.localIP());

  desenhaFixo(WiFi.localIP().toString());
}

void loop() {
  // leitura dos sensores a cada 2 s
  if (millis() - ultimaLeitura >= 2000) {
    ultimaLeitura = millis();

    float t = dht.readTemperature();
    float u = dht.readHumidity();
    if (isnan(t) || isnan(u)) {
  Serial.println("DHT11: falha na leitura (confira os fios)");
} else {
  temp = t; umidAr = u;
}

    int rawSolo = analogRead(PIN_SOLO);
    int rawLuz  = analogRead(PIN_LUZ);
    solo = constrain(map(rawSolo, SOLO_SECO, SOLO_MOLHADO, 0, 100), 0, 100);
    luz  = map(rawLuz, 0, 4095, 0, 100);   // troque para (0, 4095, 100, 0) se o módulo for invertido

    Serial.printf("T:%.0f U:%.0f Solo:%d (raw %d) Luz:%d (raw %d)\n",
                  temp, umidAr, solo, rawSolo, luz, rawLuz);
    desenhaTela();
  }

  // última leitura no Firebase a cada 10 s
  if (millis() - ultimoAtual >= 10000) {
    ultimoAtual = millis();
    Serial.println(enviarFirebase("/estufa/atual", montaJson(), true) ? "Firebase OK" : "Falha Firebase");
  }

  // histórico a cada 60 s
  if (millis() - ultimoHistorico >= 60000) {
    ultimoHistorico = millis();
    enviarFirebase("/estufa/historico", montaJson(), false);
  }
}