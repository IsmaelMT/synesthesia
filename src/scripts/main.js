import AudioHandler from 'sound/AudioHandler'
import KinectServer from 'gestures/KinectServer'
import OSCHandler from 'sound/OSCHandler'
import Cubes from 'visuals/Cubes'
import AudioCloud from 'visuals/AudioCloud'
import AudioCloudTHREE from 'visuals/AudioCloudTHREE'

class Main  {

    constructor() {
        // this.audioHandler = new AudioHandler;
        this.OSCHandler = new OSCHandler;
        // this.visual = new Cubes(this.OSCHandler);
        // this.visual = new AudioCloudTHREE(this.OSCHandler);
        this.visual = new AudioCloud(this.OSCHandler);
        this.visual.init()
    }

}
export default Main;
