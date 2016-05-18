import "osc-browser"

class OSCHandler {

    constructor() {
        this.port = new osc.WebSocketPort({
            url: "ws://localhost:8081"
        });
        
        this.port.on("message", (oscMessage) => {
            let handler;  
            // console.log("message", oscMessage);
            // Parse and route messages
            handler = this._OSCUrlParser(oscMessage.address);       
           

            if (handler != null) {
                handler(oscMessage);
            }
            else {
                console.log("No handler found");
            }

        });
        
        this.port.open();
    
    }

    
    _handleColor(oscMessage) {
        this.color = oscMessage.args[0];
        console.log("Color: " + this.color);
    }


    _OSCUrlParser(address) {
        let urls = {
            "visuals": {
                "color": this._handleColor.bind(this)
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
        return this.color;
    }



}

export default OSCHandler
