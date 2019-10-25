const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const gmailEmail = "thefirstclone01@gmail.com";
const gmailPassword = "dnwxylfovesmqjye";
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

const StatusCode = {
  OK: {
    code : 0,
    message: "OK"
  },
  E_DHT22_T: {
    code: 1,
    message: "ERROR: No data from DHT22 temperature sensor."
  },
  E_DHT22_H: {
    code: 2,
    message: "ERROR: No data from DHT22 humidity sensor."
  },
  E_BMP180_T: {
    code: 3,
    message: "ERROR: No data from BMP180 temperature sensor."
  },
  E_BMP180_P: {
    code: 4,
    message: "ERROR: No data from BMP180 pressure sensor."
  },
  E_DHT22: {
    code: 5,
    message: "ERROR: No data from DHT22 sensor."
  },
  E_BMP180: {
    code: 6,
    message: "ERROR: No data from BMP180 sensor."
  },
  W_ABNORMAL_TEMP: {
    code: 7,
    message: "WARNING: Abnormal temperature."
  },
  W_TEMP_DIFF: {
    code: 8,
    message: "WARNING: Abnormal temperature difference between sensors."
  }
};

exports.pushLog = functions.database.ref('/logs/{logID}')
.onCreate((snapshot, context) => {
    // Grab the current value of what was written to the Realtime Database.
    let data = snapshot.val();
    let currentTime = new Date().getTime();
    data.time = currentTime;

    //Handle mail alert
    let status = dataStatusCode(data);
    if(status.code !== 0){

      admin.database().ref("/lastEmailTime").once("value", (snapshot) => {
        if(isTimeToSendMail(currentTime, snapshot.val())){
          admin.database().ref("/lastEmailTime").set(currentTime);
          sendMail(status.message, data);
        }
      });
    }

    //update realTimeData
    admin.database().ref('/realtimeData').set(data);

    //update time in log
    return snapshot.ref.update({time: currentTime});
  });

  function sendMail(message, data){
    let dht22Temp = data.DHT22_Temperature;
    let dht22Humi = data.DHT22_Humidity;
    let bmp180Temp = data.BMP180_Temperature;
    let bmp180Pres = data.BMP180_Pressure;
    let html = '<h1 style="color:red;">' + message + "</h1>"
    html += "<fieldset>";
    html += "<legend><h2>Data snapshot:</h2></legend>";
    html += "<h3>DHT22 Temperature: " + dht22Temp + " Celcius<h3>";
    html += "<h3>DHT22 Humidity: " + dht22Humi + " %<h3>";
    html += "<h3>BMP180 Temperature: " + bmp180Temp + " Celcius<h3>";
    html += "<h3>BMP180 Pressure: " + bmp180Pres + " Psi<h3>";
    html += "</fieldset>";
    const mailOptions = {
      from: "uselessiot_noreply@firebase.com",
      to: "lgkidz1@gmail.com",
    }

    mailOptions.subject = "UselessIOT Alert";
    mailOptions.html = html;

    try {
      mailTransport.sendMail(mailOptions);
    } catch(error) {
      console.error('There was an error while sending the email:', error);
    }
  }

  function dataStatusCode(data){
    let dht22Temp = data.DHT22_Temperature;
    let dht22Humi = data.DHT22_Humidity;
    let bmp180Temp = data.BMP180_Temperature;
    let bmp180Pres = data.BMP180_Pressure;

    if(dht22Temp === -1 && dht22Humi === -1){
      return StatusCode.E_DHT22;
    }

    if(bmp180Temp === -1 && bmp180Pres === -1){
      return StatusCode.E_BMP180;
    }

    if(dht22Temp === -1){
      return StatusCode.E_DHT22_T;
    }

    if(dht22Humi === -1){
      return StatusCode.E_DHT22_H;
    }

    if(bmp180Temp === -1){
      return StatusCode.E_BMP180_T;
    }

    if(bmp180Pres === -1){
      return StatusCode.E_BMP180_P;
    }

    let tempDiff = Math.abs(dht22Temp - bmp180Temp);

    if(tempDiff <= 1.5 && (Math.max(dht22Temp, bmp180Temp) < 10 || Math.min(dht22Temp, bmp180Temp) > 40)){
      return StatusCode.W_ABNORMAL_TEMP;
    }

    if( tempDiff > 1.5){
      return StatusCode.W_TEMP_DIFF;
    }

    return StatusCode.OK;
  }

  function isTimeToSendMail(currentTime, lastMailTime){
    let miliDiff = currentTime - lastMailTime;
    let minuDiff = miliDiff/60000;
    return (minuDiff > 5);
  }
