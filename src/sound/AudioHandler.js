import p5 from "p5"
import "p5/lib/addons/p5.sound"
import PitchDetect from "pitch-detect"

let MTRACK_ID = "3be538a133136bbe24c9362d1e7533f41dca2835b79caf26e975ac5879e6bff5"


class AudioHandler {


    constructor() {
        this.input = this.getInputSource();
        let micInit = new Promise((resolve, reject) => { this.input.start(resolve, reject) });

        micInit.then(
            (result) => { this.pitchDetect = new PitchDetect(this.input.stream) },
            (err) => { console.log(err)}
        );

        //this.backingTrack = p5.prototype.loadSound("/assets/digital.mp3", 
        //    () => { this.backingTrack.play(); } 
        //);
        
        //this.backingTrack = this.setBackingTrackWebApi("/assets/digital.mp3");
        
        this.amplitude = new p5.Amplitude();
        this.amplitude.setInput(this.input);
        
        this.fft = new p5.FFT();
        this.fft.setInput(this.input);
     

        this.backingFFT = new p5.FFT();
        this.peakDetect = new p5.PeakDetect(4000, 12000, 0.2);
        
        // :: Beat Detect Variables
        // how many draw loop frames before the beatCutoff starts to decay
        // so that another beat can be triggered.
        // frameRate() is usually around 60 frames per second,
        // so 20 fps = 3 beats per second, meaning if the song is over 180 BPM,
        // we wont respond to every beat.
        this.beatHoldFrames = 30;
        
        // what amplitude level can trigger a beat?
        this.beatThreshold = 0.33; 

        // Beat detection
        // When we have a beat, beatCutoff will be reset to 1.1*beatThreshold, 
        // and then decay Level must be greater than beatThreshold and 
        // beatCutoff before the next beat can trigger.
        this.beatCutoff = 0;
        
        // how fast does beat cutoff decay?
        this.beatDecayRate = 0.98; 
        
        // Once this equals beatHoldFrames, beatCutoff starts to decay.
        this.framesSinceLastBeat = 0; 
       
    }


    _initSound() {
        this.audioContext = new AudioContext();
        return this.audioContext.createBufferSource(); 
    }
    
    _startSound(source, buffer) {
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.loop = true;
        source.start(0);
    }
    

    setBackingTrackWebApi(path) {

        let request = new XMLHttpRequest();
        let backingTrack = null;
        let backingTrackLoaded;

        let source = this._initSound();


        request.open('GET', path, true);
        request.responseType = 'arraybuffer';
        // Decode asynchronously
        request.onload = () => {
            this.audioContext.decodeAudioData(request.response, (buffer) => {
                    backingTrack = buffer;
                    this._startSound(source, backingTrack);
                }, () => { console.log("Request failed"); }
            );
        };
        request.send();

        return backingTrack;
    }

    getInputSource(type) {
         
        let audioGrab = new p5.AudioIn();
        
        audioGrab.getSources((sourceList) => {
            console.log(sourceList);
            //set the source to the first item in the inputSources array
            if (type == "guitar") {
                for (let i = 0; i < sourceList.length; i++) {
                    if (sourceList[i].id === MTRACK_ID) {
                        console.log("Selected source: " + i);
                        audioGrab.setSource(i);
                    }
                }
            }
            else {
                audioGrab.setSource(0);
            }
        });
        audioGrab.setSource(0);

        return audioGrab;   
    }


    // Returns p5.sound amplitude from audio input
    getAmplitude() {
        return this.amplitude.getLevel();
    }


    // Get frequency spectrum from fft analysis
    getFrequency(fft) {
        let spectrum = fft.analyze();

        return spectrum;
    }

    // Returns a smoothed volume so it eases over time
    smoothedVolume(last_volume) {
        return (last_volume + (this.getAmplitude() - last_volume) * 0.1);
    }

    // Performs simple peak detection
    peakDetected() {
        let spectrum = this.getFrequency(this.backingFFT);

        this.peakDetect.update(this.backingFFT);
        return this.peakDetect.isDetected;
    }

    beatDetected(level) {
        
        // console.log(level);
        // console.log(this.beatCutoff);
        // console.log(this.beatThreshold);
        // console.log(this.framesSinceLastBeat);
        // console.log(this.beatHoldFrames);

        if (level > this.beatCutoff && level > this.beatThreshold){
            this.beatCutoff = level * 1.2;
            this.framesSinceLastBeat = 0;
            return true;
        } else{
            if (this.framesSinceLastBeat <= this.beatHoldFrames) {
                this.framesSinceLastBeat++;
            }
            else{
                this.beatCutoff *= this.beatDecayRate;
                this.beatCutoff = Math.max(this.beatCutoff, this.beatThreshold);
            }
            return false;
        }
        return false
    }


    // Uses pitch-detect library to return the associated pitch of
    // the input stream
    pitchDetection() {
        if (this.pitchDetect != null) {
            return this.pitchDetect.getPitch();
        }
        else {
            return null;
        }
    }



}




export default AudioHandler;
