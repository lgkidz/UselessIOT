const minStep = 1;
var maxStep = 200;
var originalData = [];
var chartData;
var tempChart;
var humiChart;
var presChart;
var dataReady = false;
var loadingTime = 0;
var loadingAnim = setInterval(loadingIndicator, 500);
document.addEventListener('DOMContentLoaded', function() {
  Chart.defaults.global.defaultFontFamily = 'Montserrat';
  firebase.database().ref('/logs').on('value', snapshot => {
    originalData = [];
    snapshot.forEach( child => {
      originalData.push(child.val());
    });
    clearInterval(loadingAnim);
    document.getElementById("splash").style.display = 'none';
    if(!dataReady){
      init();
    } else {
      chartData.update();
      updateChart();
    }
  });
});

function loadingIndicator(){
  loadingTime += 500;
  if(loadingTime < 9 * 500){
    document.getElementById('dots').innerHTML += '.';
  } else {
    if(loadingTime/500 == 30){
      document.getElementById('splash_text').innerHTML = "Cloud is too shy to answer, mustering courage"
    }
    if(loadingTime/500 >= 30){
      document.getElementById('dots').innerHTML = (loadingTime/500 + 1) + ' courage points';
    } else {
      document.getElementById('dots').innerHTML = (loadingTime/500 + 1) + ' loading dots';
    }
    
  }
}

function init(){
  maxStep = originalData.length / 50;
  chartData = new ChartData();
  console.log("init Data size: " + originalData.length);
  drawChart();
  let gui = new dat.GUI();
  gui.add(chartData, 'step', minStep,maxStep,1).onChange(function(){
    chartData.update();
    updateChart();
  });
  gui.add(chartData, 'AcceptFalseData').onChange(function(){
    chartData.update();
    updateChart();
  });
  gui.addColor(chartData, 'DHT22Color').onChange(updateChart);
  gui.addColor(chartData, 'BMP180Color').onChange(updateChart);
  gui.add(chartData, 'downloadCSV');
  dataReady = true;
}

function getOptimalStep(){
  return Math.ceil(Math.min(maxStep, Math.max(minStep, Math.round(originalData.length / 175))));
}

function updateChart(){
  tempChart.destroy();
  humiChart.destroy();
  presChart.destroy();
  drawChart();
}

let ChartData = function(){
  this.step = getOptimalStep();
  this.DHT22Color = "#0000ff"; //Blue
  this.BMP180Color = "#ff0000"; //Red
  this.AcceptFalseData = false;
  this.dataDHT22T = [];
  this.dataBMP180T = [];
  this.dataDHT22H = [];
  this.dataBMP180P = [];
  this.timeStamps = [];
  this.update = function(){
    this.dataDHT22T = [];
    this.dataBMP180T = [];
    this.dataDHT22H = [];
    this.dataBMP180P = [];
    this.timeStamps = [];
    let i = 0;
    while(i < originalData.length){
      let currentData = originalData[i];
      if(!this.AcceptFalseData){
        if(falseData(currentData)){
          i++;
          continue;
        }
      }
      this.timeStamps.push(timeString(currentData.time));
      this.dataDHT22T.push(currentData.DHT22_Temperature);
      this.dataBMP180T.push(currentData.BMP180_Temperature);
      this.dataDHT22H.push(currentData.DHT22_Humidity);
      this.dataBMP180P.push(currentData.BMP180_Pressure);

      i += this.step;
    }
  };
  this.update();
  this.downloadCSV = function(){
    let csv = '';
    for(var i= 0; i < this.dataDHT22T.length;i++){
      csv += this.dataDHT22T[i] + ',';
      csv += this.dataBMP180T[i] + ',';
      csv += this.timeStamps[i] + '\r\n';
    }
    let currentTime = new Date().getTime();
    let fileName = "DHT22Temp-BMP180Temp_" + this.dataDHT22T.length + "_" + currentTime + ".csv";
    let downloadBlob = new Blob([csv],{type: 'text/csv'});
    let url = window.URL.createObjectURL(downloadBlob);
    let tempElement = document.createElement('a');
    tempElement.setAttribute('download', fileName);
    tempElement.setAttribute('href', url);
    tempElement.click();
  }
}

function falseData(data){
  return (data.DHT22_Temperature < 0 || data.DHT22_Temperature > 100
    || data.BMP180_Temperature < 0 || data.BMP180_Temperature > 100
    || data.DHT22_Humidity < 0 || data.DHT22_Humidity > 100
    || data.BMP180_Pressure < 0 || data.BMP180_Pressure > 15);
}

function drawChart(){
  let tempCanvas = document.getElementById('tempChart');
  let humiCanvas = document.getElementById('humiChart');
  let presCanvas = document.getElementById('presChart');
  let ctx = tempCanvas.getContext('2d');
  let ctx2 = humiCanvas.getContext('2d');
  let ctx3 = presCanvas.getContext('2d');
  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.timeStamps,
      datasets: [
        {
          data: chartData.dataDHT22T,
          label: "DHT22",
          borderColor: chartData.DHT22Color,
          fill: false
        },
        {
          data: chartData.dataBMP180T,
          label: "BMP180",
          borderColor: chartData.BMP180Color,
          fill: false
        },
      ]
    },
    options: {
      title: {
        display: true,
        text: 'Temperature data'
      },
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        callbacks: {
          label: (item) => `${item.yLabel} Celcius`,
        },
      },
      animation: {
        duration: 0 // general animation time
      },
      responsiveAnimationDuration: 0
    }
  });

  humiChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: chartData.timeStamps,
      datasets: [
        {
          data: chartData.dataDHT22H,
          label: "DHT22 Humidity",
          borderColor: chartData.DHT22Color,
          fill: false
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: 'Humidity data'
      },
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        callbacks: {
          label: (item) => `${item.yLabel} %`,
        },
      },
      animation: {
        duration: 0 // general animation time
      },
      responsiveAnimationDuration: 0
    }
  });

  presChart = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: chartData.timeStamps,
      datasets: [
        {
          data: chartData.dataBMP180P,
          label: "BMP180 Pressure",
          borderColor: chartData.BMP180Color,
          fill: false
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: 'Air pressure Data'
      },
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        callbacks: {
          label: (item) => `${item.yLabel} Psi`,
        },
      },
      animation: {
        duration: 0 // general animation time
      },
      responsiveAnimationDuration: 0
    }
  });
}

function timeString(unixTime){
  let date = new Date(unixTime);
  let dayOfMonth = "0" +  date.getDate();
  let month = "0" + (date.getMonth() + 1);
  let hours = "0" + date.getHours();
  let minutes = "0" + date.getMinutes();
  let seconds = "0" + date.getSeconds();
  return dayOfMonth.substr(-2) + "/" + month.substr(-2) + " " + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}
