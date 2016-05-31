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

    rotateCamera(cx, cy){
        let dx;
        let dy;

        console.log(cx);
        console.log(cy);

        // this._camera.position.setX(this._camera.position.x + 
        //                            ( cx - this._camera.position.x ) * 0.03);

        // this._camera.position.setY(this._camera.position.y + 
        //                            ( -cy - this._camera.position.y ) * 0.03);
        
        console.log(this._camera.position);
        //
        // dx = this.mousePt.x - circle.xInit;
        // dy = this.mousePt.y - circle.yInit;
        // dist = Math.sqrt(dx * dx + dy * dy);
        // angle = Math.an2(dy, dx);
        // r = circle.camRad * this.params.distance + 30;
        // xpos = circle.xInit - Math.cos(angle) * r;
        // ypos = circle.yInit - Math.sin(angle) * r;
        // circle.position.setX(circle.position.x + (xpos - circle.position.x) * 0.2);
        // circle.position.setY(circle.position.y + (ypos - circle.position.y) * 0.2);
        //



        this._camera.lookAt( this._scene.position );


        // this._camera.position.x = Math.sin(.5 * Math.PI * (cx - .5)) * 1000;
        // this._camera.position.y = Math.sin(.25 * Math.PI * (cy - .5)) * 1000;
        // this._camera.position.z = Math.cos(.5 * Math.PI * (cx - .5)) * 1000;
        //
        // this._camera.lookAt(this._scene.position);

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
