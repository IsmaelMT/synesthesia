import BufferLoader from './BufferLoader'
import p5 from 'p5'
import p5Sound from 'p5/lib/addons/p5.sound'


class AudioHandler {
    
    constructor() {
        var context;

        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            console.log("Audio context init");


            this.bufferLoader = new BufferLoader(
                this.context,
                ["assets/sound/sound1.mp3", "assets/sound/sound2.mp3"],
                this.bufferLoaded
            );

            // this.bufferLoader.load();
        }
        catch(e) {
            alert("Audio context not suported " + e);
        }
    }


    bufferLoaded(bufferList) {
        var source1 = this.context.createBufferSource() 
        var source2 = this.context.createBufferSource() 
    
        source1.buffer = bufferList[0];
        source2.buffer = bufferList[1];

        source1.connect(this.context.destination);
        source2.connect(this.context.destination);

        source1.start(0);
        source2.start(0);
    }


    soundAnalysis() {
        this.processor = this.context.createScriptProcessor(1024);
        this.analyser = this.context.createAnalyser();
        this.processor.connect(this.context.destination);
        this.analyser.connect(this.processor);

        var data = new Uint8Array(this.analyser.frequencyBinCount);
    }




}

// export default AudioHandler;
