import THREE from "three"

class Utils {


    constructor() {}


    _3DCoordTo2D(x, y, z, camera, width, height) {
        let p = new THREE.Vector3(x, y, z);
        let vector = p.project(camera);

        vector.x = (vector.x + 1) / 2 * width;
        vector.y = -(vector.y - 1) / 2 * height;

        return {
            x: vector.x,
            y: vector.y
        }
    }
}

export default Utils
