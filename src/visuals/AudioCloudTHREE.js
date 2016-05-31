import $ from "jquery"
import dat from "dat-gui"
import AbstractApplication from "../scripts/views/AbstractApplication"
import BoxBlurPass from '@superguigui/wagner/src/passes/box-blur/BoxBlurPass'
import FXAAPass from '@superguigui/wagner/src/passes/fxaa/FXAAPass'
import MultiPassBloomPass from '@superguigui/wagner/src/passes/bloom/MultiPassBloomPass'
import ParticleEngine from "./engines/ParticleEngine"
import Examples from "./engines/ParticleEngineExamples"
import THREE from "three"
import Utils from "../utils/Utils"
import WAGNER from '@superguigui/wagner/'
import ZoomBlurPassfrom from '@superguigui/wagner/src/passes/zoom-blur/ZoomBlurPass'


let vertexShader = 
    ["uniform float time;",
     "attribute vec3 customColor;",
     "varying vec3 vColor;",
     "void main()",
     "{",
	 "vColor = customColor;", 
     // set color associated to vertex; use later in fragment shader.",
     "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
     // option (1): draw particles at constant size on screen
	 // gl_PointSize = size;
     // option (2): scale particles as objects in 3D space"
	 "gl_PointSize = 40.0 * ( 300.0 / length( mvPosition.xyz ) );",
	 "gl_Position = projectionMatrix * mvPosition;",
     "}"
].join("\n");

let fragmentShader = [
     "uniform sampler2D texture;",
     "varying vec3 vColor;", // colors associated to vertices, assigned by vertex shader
     "void main()",
     "{",
	    // calculates a color for the particle
	    "gl_FragColor = vec4( vColor, 1.0 );",
	    // sets a white particle texture to desired color
	    "gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );",
     "}"
].join("\n");


class AudioCloud extends AbstractApplication{

    constructor(OSCHandler) {
        super();
        
        let k 
        let v
 
        this.utils = new Utils();

        this.modes = ["cubic", "conic"];

        this.themes = {
            pinkBlue: [0xFF0032, 0xFF5C00, 0x00FFB8, 0x53FF00],
            yellowGreen: [0xF7F6AF, 0x9BD6A3, 0x4E8264, 0x1C2124, 0xD62822],
            yellowRed: [0xECD078, 0xD95B43, 0xC02942, 0x542437, 0x53777A],
            blueGray: [0x343838, 0x005F6B, 0x008C9E, 0x00B4CC, 0x00DFFC],
            blackWhite: [0xFFFFFF, 0x000000, 0xFFFFFF, 0x000000, 0xFFFFFF],
        };

        this.themesNames = [];

        for (k in this.themes) {
            v = this.themes[k];
            this.themesNames.push(k);
        }

        this.params = {
            mode: this.modes[0],
            theme: this.themesNames[0],
            radius: 3,
            distance: 600,
            size: .5,
            numParticles: 600,
            scale: 1, // Scale of size updating for the shinny group
            numShinnyParticles: 50,
            sizeW: 1,
            sizeH: 1,
            radiusParticle: 60,
            themeArr: this.themes[this.theme],
            usePostProcessing: true,
            useFXAA: true,
            useBlur: false,
            useBloom: true

        };

        this.shinnyParticleGroupShapes = [2.0, 3.0, 7.0, 10.0, 20.0]

        this.particleParameters = {
            fountain:   () => { this.restartEngine( Examples.fountain   ); },
            startunnel: () => { this.restartEngine( Examples.startunnel ); },		
            starfield:  () => { this.restartEngine( Examples.starfield  ); },		
            fireflies:  () => { this.restartEngine( Examples.fireflies  ); },		
            clouds:     () => { this.restartEngine( Examples.clouds     ); },		
            smoke:      () => { this.restartEngine( Examples.smoke      ); },		
            fireball:   () => { this.restartEngine( Examples.fireball   ); },		
            candle:     () => { this.restartEngine( Examples.candle     ); },		
            rain:       () => { this.restartEngine( Examples.rain       ); },		
            snow:       () => { this.restartEngine( Examples.snow       ); },		
            firework:   () => { this.restartEngine( Examples.firework   ); }		
        };

        this.camX = 0;

        this.camY = 0;
        
        this.camZ = 0;
        
        this.camXinit = this._camera.position.x;
        
        this.camYinit = this._camera.position.y;
        
        this.camZinit = this._camera.position.z;

        this.mousePt = new THREE.Vector3();

        this.windowW = 0;

        this.windowH = 0;

        this.circlesContainer = null;

        this.arrCircles = [];

        this.arrShinny = [];

        this.gui = null;
        
        this.OSCHandler = OSCHandler;

        this.clock = new THREE.Clock();
        
        this.engine = new ParticleEngine(this._scene);
 
        this.visual1 = false;
     
        this.visual2 = false;

        this.visualIndex = 0;

        this.frameCount = 0;

        this.activateFrameCount = false;


        this.vizFrameCount = 0;
        
        this.changeViz = false

        this.activateVizframeCount = false;

        this.vizIndex = 0;
    }

    init() {

        this.initGestures();
        this.initPostprocessing();
        this.resize();

        this.vizArray = [this.buildVisual1.bind(this), this.buildVisual2.bind(this)];
        // this.buildFireflies();
        // this.buildStarTunnel();
        // this.buildStars();
        // this.buildCircles();
        // this.buildFlares();
        // this.buildShinnyParticlesPath();
        // this.buildShinnyParticlesGroup();
        this.buildVisual2();
        this.resize();
        this.mousePt.setX(0);
        this.mousePt.setY(0);
        this.mousePt.setZ(0);
        $(window).resize(this.r);

        this.startAnimation();
        return this.initGUI();
    }


    initPostprocessing() {
        this._renderer.autoClearColor = true;
        this.composer = new WAGNER.Composer(this._renderer);
        this.fxaaPass = new FXAAPass();
        this.boxBlurPass = new BoxBlurPass(3, 3);
        this.bloomPass = new MultiPassBloomPass({
            blurAmount: 2,
            applyZoomBlur: true
        });
    }

    initGestures() {

        let TRANSLATION_SPEED = 300;

        return window.addEventListener('usertrack', function(e) {
            
            // let cameraPosition = this.utils._3DCoordTo2D(e.detail.x, e.detail.y, 
            //         e.detail.z, this._camera, this.windowW, this.windowH);
            //
            // this.cameraPosX = cameraPosition.x;
            // this.cameraPosY = cameraPosition.y;

            this.camX = (e.detail.x * TRANSLATION_SPEED);
            this.camZ = (e.detail.z * TRANSLATION_SPEED);
            return this.camY = (e.detail.y * TRANSLATION_SPEED);
        }.bind(this), false);
    }


    buildFireflies() {
        this.firefliesEngine.setValues(Examples.fireflies);
        this.fireflies = this.firefliesEngine.initialize();
        this._scene.add(this.fireflies);
    }

    buildStarTunnel() {
        this.starTunnelEngine.setValues(Examples.startunnel);
        this.starTunnel = this.starTunnelEngine.initialize();
        this._scene.add(this.starTunnel);
    }

    buildVisual1() {
        if (this.visual2) {
            this.destroyVisual2();
        }

        this.arrShinny = [];
        this.firefliesEngine = new ParticleEngine(this._scene);
        this.visual1 = true;
        this.buildFireflies();
        this.buildShinnyParticlesGroup();
    }

    destroyVisual1() {
        this.visual1 = false;
        this.firefliesEngine.destroy();
        this.destroyShinnyParticleGroup();

    }

    destroyShinnyParticleGroup() {
        for (let i = 0; i < this.arrShinny.length; i++) {
            this._scene.remove(this.arrShinny[i]);
            delete this.arrShinny[i];
        }
    }

    buildVisual2() {
        if (this.visual1) {
            this.destroyVisual1();
        }

        this.starTunnelEngine = new ParticleEngine(this._scene);
        this.visual2 = true;
        this.buildStarTunnel();
    }

    destroyVisual2() {
        this.visual2 = false;
        this.starTunnelEngine.destroy();
    }

    position(t, distance, value) {
        // x(t) = cos(2t)�(3+cos(3t))
        // y(t) = sin(2t)�(3+cos(3t))
        // z(t) = sin(3t)
        
        // This is the speed of updating the distance element each iteration
        
        this.params.scale = this.params.scale + (distance - this.params.scale) * 0.6;
        return new THREE.Vector3(
            this.params.scale * 20.0 * Math.cos(value * t) * (3.0 + Math.cos(3.0 * t)),
            this.params.scale * 20.0 * Math.sin(value * t) * (3.0 + Math.cos(3.0 * t)),
            this.params.scale * 50.0 * Math.sin(3.0 * t) );
    }
    //
    // updateShinnyParticlesPath () {
    //     let t0 = this.clock.getElapsedTime();
    //     let timeOffset = null;
    //
    //     this.pathShaderMaterial.uniforms.time.value = 0.125 * t0;
    //
    //     let vertices = this.pathParticleGeometry.attributes.position.array;
    //     let position;
    //
    //     for( let v = 0, i = 0; v < this.pathParticleCount; v++, i+=3) {
    //
    //         timeOffset = this.pathShaderMaterial.uniforms.time.value + 
    //             this.pathParticleGeometry.attributes.customOffset.array[v];
    //
    //         position = this.position(timeOffset);
    //
    //         vertices[i] = position.x;	
    //         vertices[i + 1] = position.y
    //         vertices[i + 2] = position.z;
    //     }
    //
    //     this.pathParticleGeometry.addAttribute("position",
    //         new THREE.BufferAttribute(vertices, 3));
    //
    // }


    buildShinnyParticlesGroup() {
                
        let shinnyParticle = null;

        for (let i = 0; i < this.params.numShinnyParticles; i++) {
            shinnyParticle = this.buildShinnyParticle();
            shinnyParticle.offset = 6.282 * (i / this.params.numShinnyParticles); 
            this._scene.add(shinnyParticle);
            this.arrShinny.push(shinnyParticle);
        }
    }


    buildShinnyParticle() {
	
        let particleTexture = new THREE.TextureLoader().load( 'images/spark.png' );

        let particleGroup = new THREE.Object3D();
        this.particleAttributes = { startSize: [], startPosition: [], randomness: [] };
        
        let totalParticles = 20;
        let radiusRange = 8;
        let spriteMaterial = null;
        let sprite = null;
        let shellRadio = null;
        for( let i = 0; i < totalParticles; i++ ) {
            spriteMaterial = new THREE.SpriteMaterial( 
                { map: particleTexture, useScreenCoordinates: false, 
                    color: 0xffffff } );
            
            sprite = new THREE.Sprite( spriteMaterial );
            
            sprite.scale.set( 5, 5, 1.0 ); // imageWidth, imageHeight
            sprite.position.set( Math.random() - 0.5, Math.random() - 0.5, 
                                Math.random() - 0.5 );
            
            // for a cube:
            // sprite.position.multiplyScalar( radiusRange );
            // for a solid sphere:
            // sprite.position.setLength( radiusRange * Math.random() );
            
            // for a spherical shell:
            shellRadio = radiusRange * (Math.random() * 0.1 + 0.9); 
            sprite.position.setLength(shellRadio);
            sprite.shellRadio = shellRadio;
            
            // sprite.color.setRGB( Math.random(),  Math.random(),  Math.random() ); 
            sprite.material.color.setHSL( Math.random(), 0.9, 0.7 ); 
            
            // sprite.opacity = 0.80; // translucent particles
            sprite.material.blending = THREE.AdditiveBlending; // "glowing" particles
            
            particleGroup.add( sprite );
            // add variable qualities to arrays, if they need to be accessed later
            this.particleAttributes.startPosition.push( sprite.position.clone() );
            this.particleAttributes.randomness.push( Math.random() );
        }

        particleGroup.position.y = 50;
        
        return particleGroup;

        //this._scene.add( this.particleGroup );
    }

    updateInnerShinnyParticle(particleGroup, color, bandsArray) {
    	let time = 4 * this.clock.getElapsedTime();
	    let sprite = null;
        let randomness = null;
        let pulseFactor = null;

        let delta = null;
        let shellRadio = null;
        for ( let c = 0; c < particleGroup.children.length; c++ ) 
        {
            sprite = particleGroup.children[ c ];

            // particle wiggle
            // var wiggleScale = 10;
            // sprite.position.x += wiggleScale * (Math.random() - 0.5);
            // sprite.position.y += wiggleScale * (Math.random() - 0.5);
            // sprite.position.z += wiggleScale * (Math.random() - 0.5);
            
            // pulse away/towards center
            // individual rates of movement
            randomness = this.particleAttributes.randomness[c] + 1;
            
            pulseFactor = Math.sin(randomness * time) * 0.1 + 0.9;



            sprite.material.color.setHSL(color[0] / 360, color[1] / 100, 
                                         color[2] / 100);

            sprite.position.x = this.particleAttributes.startPosition[c].x * 
                pulseFactor;
            sprite.position.y = this.particleAttributes.startPosition[c].y * 
                pulseFactor;
            sprite.position.z = this.particleAttributes.startPosition[c].z * 
                pulseFactor;
            
            // Activate sphere rotations with bandsArray
            //
            // shellRadio = sprite.shellRadio + bandsArray[c % 18] * 5;
            //
            // delta = sprite.shellRadio + (shellRadio - sprite.shellRadio) * 0.5;
            // sprite.position.setLength(delta);

        }
        particleGroup.rotation.y = time * 0.5;
        // rotate the entire group
        // particleGroup.rotation.x = time * 0.5;
        // particleGroup.rotation.z = time * 1.0;
    }

    updateAllShinnyParticles(color, distance, bandsArray, shouldChange) {
        
        let t0 = this.clock.getElapsedTime();
        let timeOffset = null;

        let time = 0.125 * t0;

        let position = null;
        let shinnyParticle = null


        let value;
        
        if (shouldChange) {
            this.visualIndex++;
        }

        value = this.shinnyParticleGroupShapes[this.visualIndex % 
            this.shinnyParticleGroupShapes.length]

        for( let i = 0; i < this.params.numShinnyParticles; i++) {
            shinnyParticle = this.arrShinny[i];

            this.updateInnerShinnyParticle(shinnyParticle, color, bandsArray);
            timeOffset = time + shinnyParticle.offset;

            position = this.position(timeOffset, distance + 1, value);

            shinnyParticle.position.setX(position.x);
            shinnyParticle.position.setY(position.y);           
            shinnyParticle.position.setZ(position.z);
        }

    }


    buildStars() {
        
        let starQty = 10000;
        let starVertex;
        let geometry = new THREE.SphereGeometry(2000, 100, 50);

        let materialOptions = {
            size: 0.5,             
            transparency: true, 
            opacity: 0.7
        };

        let starStuff = new THREE.PointCloudMaterial(materialOptions);

        // The wizard gaze became stern, his jaw set, 
        // he creates the cosmos with a wave of his arms
        for (var i = 0; i < starQty; i++) {

            starVertex = new THREE.Vector3();
            starVertex.x = Math.random() * 2000 - 1000;
            starVertex.y = Math.random() * 2000 - 1000;
            starVertex.z = Math.random() * 2000 - 1000;

            geometry.vertices.push(starVertex);

        }


        let stars = new THREE.PointCloud(geometry, starStuff);
        this._scene.add(stars);
    }


    buildFlares() {
    
        // this._scene.add(this._addLensFlare(0,0,0, 16000));
        // this._addLensFlare2();
    
    }

    _addLensFlare2() {
        // lights
        var dirLight = new THREE.DirectionalLight( 0xffffff, 0.05 );
        dirLight.position.set( 0, -1, 0 ).normalize();
        this._scene.add( dirLight );

        dirLight.color.setHSL( 0.1, 0.7, 0.5 );

        // lens flares
        let textureLoader = new THREE.TextureLoader();

        this.textureFlare0 = textureLoader.load( "textures/lensflare/lensflare0.png" );
        this.textureFlare2 = textureLoader.load( "textures/lensflare/lensflare2.png" );
        this.textureFlare3 = textureLoader.load( "textures/lensflare/lensflare3.png" );

        // this.addLight( 0.55, 0.9, 0.5, 0, 0, 0 );
        this.addLight( 1, 1, 1, 0, 0, 0 );
        // this._scene.add(this.addLight( 0.08, 0.8, 0.5,    0, 0, -1000 ));
        // this._scene.add(this.addLight( 0.995, 0.5, 0.9, 5000, 5000, -1000 ));

    }

    addLight( h, s, l, x, y, z ) {

        let light = new THREE.PointLight( 0xffffff, 1.5, 2000 );
        light.color.setHSL( h, s, l );
        light.position.set( x, y, z );
        this._scene.add( light );

        let flareColor = new THREE.Color( 0xffffff );
        flareColor.setHSL( h, s, l + 0.5 );

        let lensFlare = new THREE.LensFlare( this.textureFlare0, 700, 0.0, 
                                            THREE.AdditiveBlending, flareColor );

        lensFlare.add( this.textureFlare2, 512, 0.0, THREE.AdditiveBlending );
        lensFlare.add( this.textureFlare2, 512, 0.0, THREE.AdditiveBlending );
        lensFlare.add( this.textureFlare2, 512, 0.0, THREE.AdditiveBlending );

        lensFlare.add( this.textureFlare3, 60, 0.6, THREE.AdditiveBlending );
        lensFlare.add( this.textureFlare3, 70, 0.7, THREE.AdditiveBlending );
        lensFlare.add( this.textureFlare3, 120, 0.9, THREE.AdditiveBlending );
        lensFlare.add( this.textureFlare3, 70, 1.0, THREE.AdditiveBlending );

        lensFlare.customUpdateCallback = this._lensFlareUpdateCallback;
        lensFlare.position.copy( light.position );

        return this._scene.add(lensFlare);
    }
    
    _lensFlareUpdateCallback( object ) {

        let f, fl = object.lensFlares.length;
        let flare;
        let vecX = -object.positionScreen.x * 2;
        let vecY = -object.positionScreen.y * 2;


        for( f = 0; f < fl; f++ ) {

            flare = object.lensFlares[ f ];

            flare.x = object.positionScreen.x + vecX * flare.distance;
            flare.y = object.positionScreen.y + vecY * flare.distance;

            flare.rotation = 0;

        }
        object.lensFlares[ 2 ].y += 0.025;
        object.lensFlares[ 3 ].rotation = object.positionScreen.x * 0.5 + 
            THREE.Math.degToRad( 45 );

    }

    buildCircles() {
        let circle, i, _i, _ref;
        let geometry, material;
        const light = new THREE.PointLight(0xFFFFFF, 1);
        light.position.copy(this._camera.position);
        
        this._scene.add(light);
    
        // geometry = new THREE.CircleGeometry( 5, 32 );
        geometry = new THREE.SphereGeometry( 5, 32, 32 );
        material = new THREE.MeshPhongMaterial( { color: 0xffffff } );
       
        
        for (i = _i = 0, _ref = this.params.numParticles - 1; 
                0 <= _ref ? _i <= _ref : _i >= _ref; 
                i = 0 <= _ref ? ++_i : --_i) {

            circle = new THREE.Mesh( geometry, material );

            circle.position.set(
                Math.random() * this.windowW - (this.windowW * 0.4),
                Math.random() * this.windowH - (this.windowH * 0.4),
                Math.random() * 500
            );

            circle.camRad = Math.random();
            this._scene.add(circle);
            this.arrCircles.push(circle);
        }

        return this.changeTheme(this.params.theme);
    }


    initGUI() {
        let modeController, sizeController, themeController;
        this.gui = new dat.GUI();
        modeController = this.gui.add(this.params, 'mode', this.modes);
        modeController.onChange(function(value) {
            return this.changeMode(value);
        }.bind(this));
        themeController = this.gui.add(this.params, 'theme', this.themesNames);
        themeController.onChange(function(value) {
            return this.changeTheme(this.params.theme);
        }.bind(this));
        
        this.gui.add(this.params, 'radius', 1, 10);
        this.gui.add(this.params, 'distance', 100, 1000).listen();
        sizeController = this.gui.add(this.params, 'size', 0, 1);
        
        this.gui.add(this.params, 'usePostProcessing');
        this.gui.add(this.params, 'useFXAA');
        this.gui.add(this.params, 'useBlur');
        this.gui.add(this.params, 'useBloom');

        this.gui.add( this.particleParameters, 'fountain'   ).name("Star Fountain");
        this.gui.add( this.particleParameters, 'startunnel' ).name("Star Tunnel");
        this.gui.add( this.particleParameters, 'starfield'  ).name("Star Field");
        this.gui.add( this.particleParameters, 'fireflies'  ).name("Fireflies");
        this.gui.add( this.particleParameters, 'fireball'   ).name("Fireball");
        this.gui.add( this.particleParameters, 'rain'       ).name("Rain");
        this.gui.add( this.particleParameters, 'snow'       ).name("Snow");
        
        return sizeController.onChange(function(value) {
            return this.resize(value);
        }.bind(this));
    }

    restartEngine(parameters) {
        // resetCamera();
     
        if (this.starTunnelEngine) {
            this.starTunnelEngine.destroy();
            this.starTunnelEngine = new ParticleEngine(this._scene);
            this.starTunnelEngine.setValues( parameters );
            this.engine.initialize();
        }

        

    }
    startAnimation() {
        return requestAnimationFrame(this.animate.bind(this));
    }


    resize() {
        this.windowW = $(window).width();
        this.windowH = $(window).height();
        this.params.sizeW = this.windowW * this.params.size;
        this.params.sizeH = this.windowH * this.params.size;
        this.changeMode(this.params.mode);

        if (this._renderer) {
            return this._renderer.setSize(this.windowW, this.windowH);
        }
    }

    changeTheme(name) {
        let circle, group, i, indexColor, padColor, _i, _ref, _results;
        
        this.params.themeArr = this.themes[name];
        
        indexColor = 0;
        padColor = Math.ceil(this.params.numParticles / this.params.themeArr.length);
        _results = [];
        
        for (i = _i = 0, _ref = this.params.numParticles - 1; 
                0 <= _ref ? _i <= _ref : _i >= _ref; 
                i = 0 <= _ref ? ++_i : --_i) {

            circle = this.arrCircles[i];
            group = indexColor * padColor / this.params.numParticles;
            // circle.blendMode = this.params.theme === "blackWhite" ? 
            //     PIXI.blendModes.NORMAL : PIXI.blendModes.ADD;
            // circle.indexBand = Math.round(group * (this.TOTAL_BANDS - 56)) - 1;
            // circle.s = (Math.random() + (this.params.themeArr.length - indexColor) 
            //             * 0.2) * 0.1;
  
            circle.s = (Math.random() + (this.params.themeArr.length - indexColor) 
                        * 0.2) * 0.1;
           
            if (i % padColor === 0) {
                indexColor++;
            }
            
            _results.push(circle.tint = this.params.themeArr[indexColor - 1]);
        }
        return _results;
    }

    changeMode(value) {
        let angle, circle, i, _i, _ref, _results;
        
        if (!this.arrCircles || this.arrCircles.length === 0) {
            return;
        }

        if (!value) {
            value = this.modes[Math.floor(Math.random() * this.modes.length)];
        }

        this.params.mode = value;
        _results = [];
        
        for (i = _i = 0, _ref = this.params.numParticles - 1; 
                0 <= _ref ? _i <= _ref : _i >= _ref; 
                i = 0 <= _ref ? ++_i : --_i) {
            
            circle = this.arrCircles[i];
            switch (this.params.mode) {
                case this.modes[0]:
                    circle.xInit = (Math.random() * this.params.sizeW - 
                                                this.params.sizeW / 2);

                    circle.zInit = (Math.random() * -500);
                    _results.push(circle.yInit = (Math.random() * this.params.sizeH - 
                                                  this.params.sizeH / 2));
                    break;
                case this.modes[1]:
                    angle = Math.random() * (Math.PI * 2);
            
                    circle.xInit = (Math.cos(angle) * this.params.sizeW);
                    circle.zInit = (Math.random() * -500);
                    _results.push(circle.yInit = (Math.sin(angle) * this.params.sizeH));
                    break;
                default:
                    _results.push(void 0);
            }
        }

        return _results;
    }

    animate() {
        super.animate();
        
	    let dt = this.clock.getDelta();
        
        let angle, circle, dist, dx, dy, i, n, r, scale, xpos, ypos, _i, _ref, band, zpos;
        // requestAnimationFrame(this.animate.bind(this));
        
        // Get radius from amplitude  
        let OSCscale = this.OSCHandler.getScale();

        // Loudness particles
        // let extra_particles = this.OSCHandler.getParticles() || 0;
        // let particles_to_draw = this.params.numParticles - 
        // this.params.maxExtraParticles;
        let OSCdistance = this.OSCHandler.getDistance();
        let bandsArray = this.OSCHandler.getBandviz();
        let color = this.OSCHandler.getColor();
        let brightness = this.OSCHandler.getBrightness();
        let new_size = 0;

        let rightFoot = this.OSCHandler.getSwitch();
        let rightHand = this.OSCHandler.getChangeViz();
        let camera = this.OSCHandler.getCameraPosition();
        
        let shouldChange = false;
        let vizShouldChange = false;

        // Activate the visual change for visual1
        if ((rightFoot.y > -0.55) && (this.frameCount == 0)) {
            shouldChange = true;
            this.activateFrameCount = true;
        }
        else {
            shouldChange = false;
        }
    
        // Frame count is activated so the gesture doesn't 
        // execute many times
        if (this.activateFrameCount) {
            this.frameCount++;
        }
        
        // After 20 frames you can make the gesture again
        if (this.frameCount >= 20) {
            this.frameCount = 0;
            this.activateFrameCount = false;
        }
        

        if ((rightHand.y > camera.y) && (this.vizFrameCount == 0)) {
            vizShouldChange = true;
            this.activateVizframeCount = true
        }
        else {
            vizShouldChange = false
        }

        if (this.activateVizframeCount) {
            this.vizFrameCount++
        }

        if (this.vizFrameCount >= 80) {
            this.vizFrameCount = 0;
            this.activateVizframeCount = false;
        }

        if (vizShouldChange) {
            console.log("change viz");
            this.vizArray[this.vizIndex++ % 2]();
        }


        // Change distance parameter (Amplitude)
        if (OSCdistance) {
            this.params.distance = OSCdistance;
        }

        if (this.camX && this.camY) {
            this.mousePt.setX(this.mousePt.x + (this.camX - this.mousePt.x) * 0.03);
            this.mousePt.setY(this.mousePt.y + (this.camY - this.mousePt.y) * 0.03);
            this.mousePt.setZ(this.mousePt.z + (this.camZ - this.mousePt.z) * 0.03);
        }
        

        // Visual 1 is activated
        if (this.visual1) {
            this.updateAllShinnyParticles(color.values.hsl, OSCdistance, bandsArray,
                                         shouldChange);
            
            if (this.fireflies) {
                this.firefliesEngine.update(dt * 0.5, brightness, bandsArray);
            }
        }

        // Visual 2 is activated
        if (this.visual2) {
            if (this.starTunnel) {
                this.starTunnelEngine.update(dt * 0.5, brightness, bandsArray, 
                                             color.values.hsl, OSCdistance);
            }
        
        }


        for (i = _i = 0, _ref = this.params.numParticles - 1; 
                0 <= _ref ? _i <= _ref : _i >= _ref; 
                i = 0 <= _ref ? ++_i : --_i) {

            circle = this.arrCircles[i];

            if (color) {
                // circle.material.color = new THREE.Color().setHSL(
                //     color.values.hsl[0] / 360, color.values.hsl[1] / 100, 
                //     color.values.hsl[2] / 100);
            }

            if (bandsArray) {
                // scale = (bandsArray[i % 18]) * circle.s * 2;
                // band = bandsArray[i % 18]
            }
            else {
                // scale = circle.s * .1;
                // band = 2;
            }
            
            // For guitar the first 18 bands are the relevant ones.
            // circle.scale.x += (scale - circle.scale.x) * 0.5 + 1;
            // circle.scale.y = circle.scale.x;
            // circle.scale.z = circle.scale.x;
            //
            // circle.scale.set(circle.scale.x, circle.scale.x, circle.scale.x);
            //
            // dx = this.mousePt.x - circle.xInit;
            // dy = this.mousePt.y - circle.yInit;
            // dist = Math.sqrt(dx * dx + dy * dy);
            // angle = Math.atan2(dy, dx);
            // r = circle.camRad * this.params.distance + 30;
            // xpos = circle.xInit - Math.cos(angle) * r;
            // ypos = circle.yInit - Math.sin(angle) * r;
            // circle.position.setX(circle.position.x + (xpos - circle.position.x) * 0.2);
            // circle.position.setY(circle.position.y + (ypos - circle.position.y) * 0.2);
        }


        
        // if (this.starTunnel) {
        //     this.starTunnelEngine.update( dt * 0.5, color.values.hsl, bandsArray);   
        // }

        if (this.params.usePostProcessing) {
            this.composer.reset();
            this.composer.render(this._scene, this._camera);
            if (this.params.useFXAA) this.composer.pass(this.fxaaPass);
            if (this.params.useBlur) this.composer.pass(this.boxBlurPass);
            if (this.params.useBloom) this.composer.pass(this.bloomPass);
            this.composer.toScreen();
        }
        else {
            this._renderer.render(this._scene, this._camera);
        }
    }
}

export default AudioCloud;
