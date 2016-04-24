import p5 from "p5"
import "p5/lib/addons/p5.sound"
import PitchDetect from "pitch-detect"

let MTRACK_ID = "3be538a133136bbe24c9362d1e7533f41dca2835b79caf26e975ac5879e6bff5"


class AudioHandler {


    constructor() {
        this.input = this.getInputSource("guitar");
        
        let micInit = new Promise((resolve, reject) => { this.input.start(resolve, reject) });

        micInit.then(
            (result) => { this.pitchDetect = new PitchDetect(this.input.stream) },
            (err) => { console.log(err)}
        );

        this.amplitude = new p5.Amplitude();
        this.amplitude.setInput(this.input);
        
        this.fft = new p5.FFT();
        this.fft.setInput(this.input);
     
        // this.peakDetect = new p5.PeakDetect(20, 20000, 0.01);
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
    getFrequency() {
        let spectrum = this.fft.analyze();

        return spectrum;
    }

    // Returns a smoothed volume so it eases over time
    smoothedVolume(last_volume) {
        return (last_volume + (this.getAmplitude() - last_volume) * 0.1);
    }

    // Performs simple peak detection
    peakDetected() {
        let spectrum = this.getFrequency();

        this.peakDetect.update(this.fft);
        return this.peakDetect.isDetected;
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
