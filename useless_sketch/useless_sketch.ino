#include <WiFiManager.h>
#include <ArduinoJson.h>
#include <FirebaseArduino.h>
#include <DHTesp.h>
#include <Adafruit_BMP085.h>
#include <Wire.h>
#include <DHT.h>
#include <DHT_U.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h> 

DHTesp dht;
Adafruit_BMP085 bmp;

#define FIREBASE_HOST "uselessiot.firebaseio.com"
#define FIREBASE_AUTH "4dxOgj1lMX9uiqyFjMpaLzTCW7Y1Qil1NHsukxfs"

int delayInterval = 20000;
void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  WiFiManager wifiManager;
  wifiManager.autoConnect("BlueAndUseless");
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);

  int remoteDelayInterval = Firebase.getInt("/delayInterval");
  if (Firebase.failed()) {
      Serial.println("Firebase get remote delay interval failed");
      Serial.println(Firebase.error());
  } else {
    delayInterval = remoteDelayInterval;
  }
  
  dht.setup(D6, DHTesp::AUTO_DETECT);
  bmp.begin();
  Serial.print("Start doing work with delay interval of ");
  Serial.print(delayInterval);
  Serial.println(" miliseconds");
}

void loop() {
  // put your main code here, to run repeatedly:
    printSensorData();
    
    float dhtTemp = dht.getTemperature();
    float dhtHumi = dht.getHumidity();
    float bmpTemp = bmp.readTemperature();
    float bmpPres = bmp.readPressure() * 0.0001450377; // Convert to PSI
    
    pushDweetIO(dhtTemp, dhtHumi, bmpTemp, bmpPres);
    pushFirebase(dhtTemp, dhtHumi, bmpTemp, bmpPres);
    
    delay(delayInterval);
}

void pushDweetIO(float dhtTemp, float dhtHumi, float bmpTemp, float bmpPres){
  // Use WiFiClient class to create TCP connections
  WiFiClient client;
  const int httpPort = 80;
  const String host = "dweet.io";
  if (!client.connect(host, httpPort)) {
    Serial.println("connection failed");
    return;
  }
  client.print(String("GET /dweet/for/blue_and_utterly_useless")
               + "?DHT22_Temperature=" + String(dhtTemp)
               + "&DHT22_Humidity=" + String(dhtHumi)
               + "&BMP180_Temperature=" + String(bmpTemp)
               + "&BMP180_Pressure=" + String(bmpPres)
               + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" +
               "Connection: close\r\n\r\n");
    delay(10);

    // Read all the lines of the reply from server and print them to Serial
    while(client.available()){
      String line = client.readStringUntil('\r');
      Serial.print(line);
    }
    Serial.println();
}


void pushFirebase(float dhtTemp, float dhtHumi, float bmpTemp, float bmpPres){
  //Push to logs
  const int capacity = JSON_OBJECT_SIZE(5);
  StaticJsonBuffer<capacity> jb;
  JsonObject& data = jb.createObject();
  data.set("time","");

  if(String(dhtTemp) == "nan"){
     data.set("DHT22_Temperature", -1);
  } else {
    data.set("DHT22_Temperature", dhtTemp);
  }

  if(String(dhtHumi) == "nan"){
     data.set("DHT22_Humidity", -1);
  } else {
    data.set("DHT22_Humidity", dhtHumi);
  }

  if(String(bmpTemp) == "nan"){
     data.set("BMP180_Temperature", -1);
  } else {
    data.set("BMP180_Temperature", bmpTemp);
  }

  if(String(bmpPres) == "nan"){
     data.set("BMP180_Pressure", -1);
  } else {
    data.set("BMP180_Pressure", bmpPres);
  }

  String name = Firebase.push("logs",data);
//  Firebase.set("realtimeData",data);
  if (Firebase.failed()) {
      Serial.print("pushing /logs failed:");
      Serial.println(Firebase.error());  
      return;
  }

}

void printSensorData(){
  Serial.println("*****************DHT22***************");
    Serial.print("Humidity: ");
    Serial.print(dht.getHumidity());
    Serial.println(" %");
    Serial.print("Temp: ");
    Serial.print(dht.getTemperature());
    Serial.println(" Celsius");
    Serial.println("*****************BMP180***************");
    Serial.print("Temp: ");
    Serial.print(bmp.readTemperature());
    Serial.println(" Celsius");
    Serial.print("Pressure: ");
    Serial.print(bmp.readPressure());
    Serial.println(" Pascal");
    Serial.println("**************************************");
    Serial.println("");
}
