import THREE from 'three'
import 'scripts/controls/OrbitControls'

class AbstractApplication{

    constructor(){
        
        // Scene
        this._scene = new THREE.Scene({ antialias: true });
        this._scene.fog = new THREE.FogExp2( 0x000000, 0.0003 );
		this._scene.fog.color.setHSL( 0.51, 0.4, 0.01 );


        // Camera
        this._camera = new THREE.PerspectiveCamera(45, 
                                                window.innerWidth / window.innerHeight, 
                                                1, 
                                                5000);

        this._camera.position.set(0,200,400);
        // this._camera.position.z = 800;
        
        // Renderer
        this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this._renderer.setPixelRatio( window.devicePixelRatio );
        this._renderer.setSize( window.innerWidth, window.innerHeight );
        this._renderer.setClearColor( this._scene.fog.color );

        document.body.appendChild(this._renderer.domElement );

        this._controls = new THREE.OrbitControls( this._camera, 
                                                 this._renderer.domElement );
        this._controls.enableDamping = true;
        this._controls.dampingFactor = 0.25;
        this._controls.enableZoom = false;

        window.addEventListener( 'resize', this.onWindowResize.bind(this), false );
    }

    get renderer(){
        return this._renderer;
    }

    get camera(){
        return this._camera;
    }

    get scene(){
        return this._scene;
    }

    onWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();

        this._renderer.setSize( window.innerWidth, window.innerHeight );
    }

    animate(timestamp) {
        requestAnimationFrame( this.animate.bind(this) );

        this._controls.update();
        this._renderer.render( this._scene, this._camera );
    }

}

export default AbstractApplication;
