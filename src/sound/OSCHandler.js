import "osc-browser"
import colors from "musical-scale-colors"
import tonal from "tonal"

class OSCHandler {

    constructor() {
        this.port = new osc.WebSocketPort({
            url: "ws://localhost:8081"
        });
        
        this.port.on("message", (oscMessage) => {
            let handler;  
            // Parse and route messages
            handler = this._OSCUrlParser(oscMessage.address);       
           

            if (handler != null) {
                handler(oscMessage);
            }
            else {
                // console.log("No handler found");
            }

        });
        
        this.port.open();
    
    }

    
    _handleColor(oscMessage) {
        console.log("color");

        let pitch = oscMessage.args[0];
        let note = tonal.fromFreq(pitch);
        let chroma = tonal.chroma(note);

        // this.color = colors.louisBertrandCastel[chroma];
        this.color = colors.aScriabin[chroma];
    }


    _handleParticles(oscMessage) {
        let particlesPromise = new Promise((resolve, reject) => {
            if (!isNaN(oscMessage.args[0])) {
                resolve(oscMessage.args[0]);
            }
            else {
                reject(0);
            }
        })

        particlesPromise.then(
            (val) => { this.particles = val },
            (val) => { this.particles = val }
        )

    }

    _handleScale(oscMessage) {

        let scalePromise = new Promise((resolve, reject) => {
            if (!isNaN(oscMessage.args[0])) {
                resolve(oscMessage.args[0]);
            }
            else {
                reject(1);
            }
        })
        
        scalePromise.then(
            (val) => { this.scale = val },
            (val) => { this.scale = val }
        )
    }

    _handleDistance(oscMessage) {
        this.distance = oscMessage.args[0];
    }

    _handleBandviz(oscMessage) {
        this.bandviz = oscMessage.args;
    }


    _OSCUrlParser(address) {
        let urls = {
            "visuals": {
                "color": this._handleColor.bind(this),
                "scale": this._handleScale.bind(this),
                "particles": this._handleParticles.bind(this),
                "distance": this._handleDistance.bind(this),
                "bandviz": this._handleBandviz.bind(this)
            }
        };

        // Slices the path and remove the first empty element
        let path = address.split("/").slice(1, address.length);
        let handler = urls;

        for (let p of path) {
            if (p in handler) {
                handler = handler[p];
            }
            else {
                return null;
            }   
        
        }

        return handler;
    }    

    getColor() {
        // console.log("returning color"+ this.scale);
        return this.color;
    }

    getScale() {
        // console.log("returning scale" + parseInt(this.scale));
        return this.scale;
    }

    getParticles() {
        // console.log("oartic " + this.particles);
        return this.particles;
    }

    getDistance() {
        // console.log("distance " + this.distance);
        return this.distance;
    }

    getBandviz() {
        // console.log(this.bandviz);
        return this.bandviz;
    }

}

export default OSCHandler