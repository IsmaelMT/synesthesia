import osc from "osc"
import WebSocket from "ws"    

console.log("File imported");

let getIPAddresses = () => {
    let os = require("os"),
    interfaces = os.networkInterfaces(),
    ipAddresses = [];

    for (let deviceName in interfaces){
        let addresses = interfaces[deviceName];

        for (let i = 0; i < addresses.length; i++) {
            let addressInfo = addresses[i];

            if (addressInfo.family === "IPv4" && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address);
            }
        }
    }

    return ipAddresses;
};

let udp = new osc.UDPPort({
    localAddress: "127.0.0.1",
    localPort: 7400,
    remoteAddress: "127.0.0.1",
    remotePort: 7500
});

udp.on("ready", function () {
    let ipAddresses = getIPAddresses();
    console.log("Listening for OSC over UDP.");
    ipAddresses.forEach(function (address) {
        console.log(" Host:", address + ", Port:", udp.options.localPort);
    });
    console.log("Broadcasting OSC over UDP to", 
                udp.options.remoteAddress + ", Port:", udp.options.remotePort);
});

udp.open();

let wss = new WebSocket.Server({
    port: 8081
});

wss.on("connection", function (socket) {
    console.log("A Web Socket connection has been established!");
    
    let socketPort = new osc.WebSocketPort({
        socket: socket
    });

    socketPort.on("error", (e) => {console.log("error " + e); });

    let relay = new osc.Relay(udp, socketPort, {
        raw: true
    });
    
    socketPort.on("close", () => {
        console.log("close"); 
        relay.close();
    });

});
