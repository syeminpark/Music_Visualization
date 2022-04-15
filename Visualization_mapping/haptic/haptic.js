'use strict';

// Create an instance
const sending_delay = 0.20
var wavesurfer;
var ch0_data;
var ch1_data;
var ch0_haptic;
var ch1_haptic;
var freq = 11;
var amp = 50;
let last_time = 0;
let freqPanner = document.querySelector('[data-action="frequency"]');
freqPanner.addEventListener('input', event => {
    freq = Number(freqPanner.value);
});

let ampPanner = document.querySelector('[data-action="amplitude"]');
ampPanner.addEventListener('input', event => {
    amp = Number(ampPanner.value);
});

class HapticArray{
    constructor() {
        this.devices = []
      }
    
    add(hapticdevice){
        this.devices.push(hapticdevice);
    }
    del(id){
        let index = this.find_index(id)
        if (index != -1){
            this.devices[index].disconnect(haptic_listener)
            this.devices.splice(index, 1);
            console.log("device successfully disconneted" );
        }
    }
    send(data){
        this.devices.forEach(device => {
            device.write(data);
        });
    }
    find_index(id){
        let fin = -1;
        let index = 0;
        this.devices.forEach(device => {
            if (device.device.id == id){
                console.log("found the device", index);
                fin = index
            }
            index = index + 1;
        });
        if (fin == -1){
            console.log("there is no device in the list");
        }
        return fin;
    }
}

var haptic_devices = new HapticArray();
class HapticDevice {

    constructor() {
      this.device = null;
      this.onDisconnected = this.onDisconnected.bind(this);
    }
    
    async request() {
      let options = {
        "filters": [{
          "namePrefix": "Haptic"
        }],
        "optionalServices": ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"]
      };
      this.device = await navigator.bluetooth.requestDevice(options);
      if (!this.device) {
        throw "No device selected";
      }
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
    }
    
    async connect() {
      if (!this.device) {
          Promise.reject('Device is not connected.');
        return 0
      }
      await this.device.gatt.connect();
      return 1
    }
    
    write(data) {
      // RX Characteristic (6E400002-B5A3-F393-E0A9-E50E24DCCA9E)
      // Write or Write Without Response
      // Write data to the RX Characteristic to send it on to the UART interface.
      return this.device.gatt.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e")
      .then(service => service.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e"))
      .then(characteristic => characteristic.writeValue(data))
      .catch(error => {
        console.log('Argh! ' + error);
      });
    }
  
    async startNotifications(listener) {
      // TX Characteristic (6E400003-B5A3-F393-E0A9-E50E24DCCA9E)
      // Notify
      // Enable notifications for the TX Characteristic to receive data from the application. The application transmits all data that is received over UART as notifications.
      const service = await this.device.gatt.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
      const characteristic = await service.getCharacteristic("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', listener);
    }
  
    async stopNotifications(listener) {
        const service = await this.device.gatt.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
        const characteristic = await service.getCharacteristic("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
        await characteristic.stopNotifications();
        characteristic.removeEventListener('characteristicvaluechanged', listener);
    }
  
    async disconnect(listener) {
      if (!this.device) {
        return Promise.reject('Device is not connected.');
      }
      await this.stopNotifications(listener);
      this.device.gatt.disconnect();

    }
  
    onDisconnected() {
      console.log('Device is disconnected.');
      console.log('> Name:             ' + this.device.name);
      console.log('> Id:               ' + this.device.id);
      console.log('> Connected:        ' + this.device.gatt.connected);


    }
  }
function onebyte_to_twobyte_int(high, low){
    let tmp = (((high & 0xff) << 8) | (low & 0xff));
    return tmp;
}

function twobyte_int_to_onebyte(origin){
    let high = ((origin >> 8) & 0xff);
    let low = origin & 0xff;
    return [high, low];
}

function onebyte_to_fourbyte_float(origin){
    let buf = new ArrayBuffer(4);
    let view = new DataView(buf);
    origin.forEach(function (b, i) {
        view.setInt8(i, b);
    });
    return view.getFloat32(0);
}

function fourbyte_float_to_onebyte(origin){
    let high = ((origin >> 8) & 0xff);
    let low = origin & 0xff;
    return high, low;
}
function haptic_pattern_gen(){
    var fftsize = wavesurfer.backend.analyser.frequencyBinCount
    let dataArray = new Float32Array(fftsize);
    const _HzIndex =  new Int16Array([0, 23, 46, 70, 93, 117, 140, 164, 187, 210, 234, 257, 281,
                                        304, 328, 351, 375, 398, 421, 445, 468, 492, 500]);
    wavesurfer.backend.analyser.getFloatTimeDomainData(dataArray);
    for (var i = 0;i < fftsize; i++){
        dataArray[i] = Math.abs(dataArray[i]);
    }
    var _amp = parseInt(Math.max(...dataArray)* 2 * amp);
    if (_amp >= 100){
        _amp = 100;
    }
    return [_HzIndex[freq], _amp]

}

function SendHapticData(frequency, amplitude){
    let data_buffer = new ArrayBuffer(19);
    let view = new Int8Array(data_buffer);
    view[0] = 36; // STX 0x24
    view[1] = 2; // TYPE 0x02
    
    var tmp = twobyte_int_to_onebyte(frequency);
    view[2] = tmp[0];
    view[3] = tmp[1];
    tmp = twobyte_int_to_onebyte(amplitude);
    view[4] = tmp[0];
    view[5] = tmp[1];
    
    view[17] = 13; // ETX 0x0D
    view[18] = 10; // ETX 0x0A
    console.log();
    console.log(view);
    haptic_devices.send(view);
}


function haptic_listener(event){
    let data_buffer = new ArrayBuffer(19);
    let view = new Uint8Array(data_buffer);

    for (var i = 0; i<19;i++){
        view[i] = event.currentTarget.value.getInt8(i);
    }
    console.log(view);
    console.log(data_buffer);
    // 0xF1 : battery info
    // 4byte float
    if (view[1]==-15){
        console.log("current battery" + onebyte_to_fourbyte_float([view[2],view[3],view[4],view[5]])/4.2);
    }
    // 0xF2 : echo [freq] [amp]
    // 2byte, 2byte
    if (view[1]==-14){
        console.log("WOW");
    }
    // 0xF3 : Device info [BLE Connection Interval MIN] [BLE Connection Interval MAX] [Freq MIN] [Freq MAX]
    // 2byte, 2byte, 2byte, 2byte
    if (view[1]==-13){
        console.log("WOW");
        console.log("BLE Connection Interval MIN from" + onebyte_to_twobyte_int(view[2],view[3]));
        console.log("BLE Connection Interval MAX from" + onebyte_to_twobyte_int(0,view[4],view[5]));
        console.log("Freq MIN" + onebyte_to_twobyte_int(view[6],view[7]));
        console.log("Freq MAX" + onebyte_to_twobyte_int(view[8],view[9]));
    }
    // 0xF4 : Device info2 [firmware version] [hardmware version] [MAC Address]
    // 2byte, 2byte, 6byte
    if (view[1]==-12){
        console.log("WOW");
    }
}

// Init & load audio file
document.addEventListener('DOMContentLoaded', function() {
    // Init
    wavesurfer = WaveSurfer.create({
        container: document.querySelector('#waveform'),
        waveColor: '#A8DBA8',
        progressColor: '#3B8686',
        normalize: true
    });

    // Load audio from URL
    wavesurfer.load('./assets/beat.mp3');

    // Log errors
    wavesurfer.on('error', function(msg) {
        console.log(msg);
    });
    document
    .querySelector('[data-action="SendHapticPattern"]')
    .addEventListener('click', function(event) {
        // TODO : real time send
        wavesurfer.on('audioprocess', function() {
            var current_time = wavesurfer.getCurrentTime()
            var difference_time = current_time - last_time
            if (difference_time > sending_delay || difference_time < 0){
                var freq_amp = haptic_pattern_gen();
                
                SendHapticData(freq_amp[0], freq_amp[1]);

                last_time = current_time;
            }
        });
    });
    document
    .querySelector('[data-action="DisconnectHapticDevice"]')
    .addEventListener('click', async event => {
        SendHapticData(0, 0);
        let device = new HapticDevice();
        await device.request();
        haptic_devices.del(device.device.id);
    });

    document
    .querySelector('[data-action="SearchHapticDevice"]')
    .addEventListener('click', async event => {
        let device = new HapticDevice();
        await device.request();
        let flag = await device.connect();
        if (flag){
            await device.startNotifications(haptic_listener);
            var tmp = haptic_devices.find_index(device.device.id)
            if (tmp==-1){
                haptic_devices.add(device);
            }else{
                console.log('the device is already connected')
            }
        }
        console.log('> Name:             ' + device.device.name);
        console.log('> Id:               ' + device.device.id);
        console.log('> Connected:        ' + device.device.gatt.connected);
        });

    // Bind play/pause button
    document
        .querySelector('[data-action="play"]')
        .addEventListener('click', wavesurfer.playPause.bind(wavesurfer));

    // document
    // .querySelector('[data-action="lowPassFilter"]')
    // .addEventListener('click', function() {
    //     // load peaks from JSON file. See https://wavesurfer-js.org/faq/
    //     // for instructions on how to generate peaks
    //     // TODO: Change it to bandpass filter
    //         var lowwpass = wavesurfer.backend.ac.createBiquadFilter();
    //         console.log('lowpass-filter');
    //         lowwpass.frequency.value = 100;
    //         console.log(lowwpass);
    //         console.log(wavesurfer.backend.buffer);
    //         wavesurfer.backend.setFilter(lowwpass);
    //         console.log(wavesurfer.backend.buffer);
    //     });

    document
    .querySelector('[data-action="toHaptic"]')
    .addEventListener('click', async event => {
        // console.log(wavesurfer.backend.mergedPeaks);
        // vocal, drum, guit, bass, inst
        
        //TODO: fix to sync
        wavesurfer.load('./assets/bass.mp3')

        console.log(wavesurfer.getDuration());
        console.log(wavesurfer.backend.buffer.sampleRate);
        console.log(wavesurfer.backend.buffer.length);
        console.log(wavesurfer.backend.buffer.numberOfChannels);

        ch0_data = wavesurfer.backend.buffer.getChannelData(0);
        ch1_data = wavesurfer.backend.buffer.getChannelData(1);
    
        const hz = 100;
        const volume = 1.0;
        const sineWaveArray = new Float32Array(wavesurfer.backend.buffer.length);
        var i;
        var sampleTime;
    
        for (i = 0; i < sineWaveArray.length; i++) {
            sampleTime = i / wavesurfer.backend.buffer.sampleRate;
            // sineWaveArray[i] = Math.sin(Math.asin(ch0_data[i])* hz) * volume;
            // sineWaveArray[i] = Math.sin(Math.asin(ch0_data[i])* Math.PI * 2) * volume;
            sineWaveArray[i] = Math.sin(sampleTime * Math.PI * 2 * hz) * volume;
        }
        
        ch0_haptic = new Float32Array(wavesurfer.backend.buffer.length);
        ch1_haptic = new Float32Array(wavesurfer.backend.buffer.length);
    
        for (i = 0; i < sineWaveArray.length; i++) {
            var tmp = 0.5 * (sineWaveArray[i]*Math.abs(ch0_data[i]) + sineWaveArray[i]*Math.abs(ch1_data[i]));
            ch0_haptic[i] = tmp;
            ch1_haptic[i] = tmp;
            // ch0_haptic[i] = sineWaveArray[i];
            // ch1_haptic[i] = sineWaveArray[i];
        }
    
        console.log(ch1_haptic)
        wavesurfer.backend.buffer.copyToChannel(ch0_haptic, 0);
        wavesurfer.backend.buffer.copyToChannel(ch1_haptic, 1);
        
        wavesurfer.loadDecodedBuffer(wavesurfer.backend.buffer);
    
        // console.log(wavesurfer.backend.data);
        // wavesurfer.load(osc)
    });

    // Progress bar
    (function() {
        const progressDiv = document.querySelector('#progress-bar');
        const progressBar = progressDiv.querySelector('.progress-bar');

        let showProgress = function(percent) {
            progressDiv.style.display = 'block';
            progressBar.style.width = percent + '%';
        };

        let hideProgress = function() {
            progressDiv.style.display = 'none';
        };

        wavesurfer.on('loading', showProgress);
        wavesurfer.on('ready', hideProgress);
        wavesurfer.on('destroy', hideProgress);
        wavesurfer.on('error', hideProgress);
    })();
});