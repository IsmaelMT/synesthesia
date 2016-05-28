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

'use strict'

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
            maxExtraParticles: 500,
            sizeW: 1,
            sizeH: 1,
            radiusParticle: 60,
            themeArr: this.themes[this.theme],
            usePostProcessing: true,
            useFXAA: true,
            useBlur: false,
            useBloom: true

        };

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

        this.mousePt = new THREE.Vector3();

        this.windowW = 0;

        this.windowH = 0;

        this.circlesContainer = null;

        this.arrCircles = [];

        this.gui = null;
        
        this.OSCHandler = OSCHandler;

        this.clock = new THREE.Clock();
        
        this.engine = new ParticleEngine(this._scene);
        
        this.engine.setValues(Examples.fireball);
    }

    init() {

        this.initGestures();
        this.initPostprocessing();
        this.resize();

        this.engine.initialize();
        // this.buildStars();
        // this.buildCircles();
        // this.buildFlares();
        this.resize();
        this.mousePt.setX(0);
        this.mousePt.setY(0);
        this.mousePt.setZ(0);
        $(window).resize(this.r);

        this.startAnimation();
        return this.initGUI();
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
        this.gui.add( this.particleParameters, 'clouds'     ).name("Clouds");
        this.gui.add( this.particleParameters, 'smoke'      ).name("Smoke");
        this.gui.add( this.particleParameters, 'fireball'   ).name("Fireball");
        this.gui.add( this.particleParameters, 'candle'     ).name("Candle");
        this.gui.add( this.particleParameters, 'rain'       ).name("Rain");
        this.gui.add( this.particleParameters, 'snow'       ).name("Snow");
        this.gui.add( this.particleParameters, 'firework'   ).name("Firework");
        
        return sizeController.onChange(function(value) {
            return this.resize(value);
        }.bind(this));
    }

    restartEngine(parameters) {
        // resetCamera();
        
        this.engine.destroy();
        this.engine = new ParticleEngine(this._scene);
        this.engine.setValues( parameters );
        this.engine.initialize();
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
            this.camX = (e.detail.x * TRANSLATION_SPEED);
            this.camZ = (e.detail.z * TRANSLATION_SPEED) * -1;
            return this.camY = (e.detail.y * TRANSLATION_SPEED);
        }.bind(this), false);
    }



    startAnimation() {
        return requestAnimationFrame(this.animate.bind(this));
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
        // let particles_to_draw = this.params.numParticles - this.params.maxExtraParticles;
        let OSCdistance = this.OSCHandler.getDistance();
        let bandsArray = this.OSCHandler.getBandviz();
        let color = this.OSCHandler.getColor();
        let new_size = 0;
        // console.log("color: " + color);
        
        // if (OSCscale) {
        //     this.params.radius = OSCscale;
        // }

        if (OSCdistance) {
            this.params.distance = OSCdistance;
        }


        // if (this.analiserDataArray) {
        //     this.analyser.getByteFrequencyData(this.analiserDataArray);
        // }

        if (this.camX && this.camY) {
            this.mousePt.setX(this.mousePt.x + (this.camX - this.mousePt.x) * 0.03);
            this.mousePt.setY(this.mousePt.y + (this.camY - this.mousePt.y) * 0.03);
            this.mousePt.setZ(this.mousePt.z + (this.camZ - this.mousePt.z) * 0.03);
        }

        for (i = _i = 0, _ref = this.params.numParticles - 1; 
                0 <= _ref ? _i <= _ref : _i >= _ref; 
                i = 0 <= _ref ? ++_i : --_i) {

            circle = this.arrCircles[i];
            // new_size = circle.scale.x;

            if (color) {
                // circle.material.color = new THREE.Color(color);
            }


            if (bandsArray) {
                // scale = (bandsArray[i % 18]) * circle.s * 2;
                // band = bandsArray[i % 18]
            }
            else {
                // scale = circle.s * .1;
                band = 2;
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
            // // zpos = circle.zInit - angle * r;
            // circle.position.setX(circle.position.x + (xpos - circle.position.x) * 0.2);
            // circle.position.setY(circle.position.y + (ypos - circle.position.y) * 0.2);
            // // circle.position.setZ(circle.position.z + (zpos - circle.position.z) * 0.2);
        }
        this.engine.update( dt * 0.5, color.values.rgb, bandsArray);   


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
