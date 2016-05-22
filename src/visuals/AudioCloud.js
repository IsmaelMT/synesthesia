import "pixi"
import dat from "dat-gui"
import $ from "jquery"

class AudioCloud {

    constructor(OSCHandler) {
        let k 
        let v


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
            numParticles: 5500,
            maxExtraParticles: 500,
            sizeW: 1,
            sizeH: 1,
            radiusParticle: 60,
            themeArr: this.themes[this.theme]
        };

        this.TOTAL_BANDS = 256;

        this.cp = new PIXI.Point();

        this.mouseX = 0;

        this.mouseY = 0;

        this.mousePt = new PIXI.Point();

        this.windowW = 0;

        this.windowH = 0;

        this.stage = null;

        this.renderer = null;

        this.texCircle = null;

        this.circlesContainer = null;

        this.arrCircles = [];

        this.audio = null;

        this.analyser = null;

        this.analiserDataArray = null;

        this.gui = null;
        this.OSCHandler = OSCHandler;
    }

    init() {
        this.initGestures();
        // this.initAudio();
        this.resize();
        this.build();
        this.resize();
        this.mousePt.x = this.cp.x;
        this.mousePt.y = this.cp.y;
        $(window).resize(this.resize);
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
        
        return sizeController.onChange(function(value) {
            return this.resize(value);
        }.bind(this));
    };

    initAudio() {
        let context, source;
        context = new webkitAudioContext();
        this.analyser = context.createAnalyser();
        source = null;
        this.audio = new Audio();
        this.audio.src = this.AUDIO_URL;
        this.audio.controls = true;
        this.audio.addEventListener('canplay', function() {
            let bufferLength;
            console.log('audio canplay');
            source = context.createMediaElementSource(this.audio);
            source.connect(this.analyser);
            source.connect(context.destination);
            this.analyser.fftSize = this.TOTAL_BANDS * 2;
            bufferLength = this.analyser.frequencyBinCount;
            console.log('bufferLength', bufferLength);
            return this.analiserDataArray = new Uint8Array(bufferLength);
        });
        return this.audio.play();
    }

    startAnimation() {
        return requestAnimationFrame(this.update.bind(this));
    }

    initGestures() {
        return $(window).on('mousemove', function(e) {
            this.mouseX = e.clientX;
            return this.mouseY = e.clientY;
        });
    }

    build() {
        this.stage = new PIXI.Stage(0x000000);
        this.renderer = PIXI.autoDetectRenderer(
            $(window).width(), $(window).height());
        $(document.body).append(this.renderer.view);
        this.texCircle = this.createCircleTex();
        return this.buildCircles();
    }

    buildCircles() {
        let circle, i, _i, _ref;
        this.circlesContainer = new PIXI.DisplayObjectContainer();
        this.stage.addChild(this.circlesContainer);
        for (i = _i = 0, _ref = this.params.numParticles - 1; 
                0 <= _ref ? _i <= _ref : _i >= _ref; 
                i = 0 <= _ref ? ++_i : --_i) {

            circle = new PIXI.Sprite(this.texCircle);
            circle.anchor.x = 0.5;
            circle.anchor.y = 0.5;
            circle.position.x = circle.xInit = this.cp.x;
            circle.position.y = circle.yInit = this.cp.y;
            circle.mouseRad = Math.random();
            circle.scale = new PIXI.Point(0, 0);
            this.circlesContainer.addChild(circle);
            this.arrCircles.push(circle);
        }

        return this.changeTheme(this.params.theme);
    }

    createCircleTex() {
        let gCircle;
            

        gCircle = new PIXI.Graphics();
        gCircle.beginFill(0xFFFFFF);
        gCircle.drawCircle(0, 0, this.params.radiusParticle);
        gCircle.endFill();
 
        return gCircle.generateTexture();
    }

    resize() {
        this.windowW = $(window).width();
        this.windowH = $(window).height();
        this.cp.x = this.windowW * .5;
        this.cp.y = this.windowH * .5;
        this.params.sizeW = this.windowH * this.params.size;
        this.params.sizeH = this.windowH * this.params.size;
        this.changeMode(this.params.mode);
        if (this.renderer) {
            return this.renderer.resize(this.windowW, this.windowH);
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
            circle.blendMode = this.params.theme === "blackWhite" ? 
                PIXI.blendModes.NORMAL : PIXI.blendModes.ADD;
            circle.indexBand = Math.round(group * (this.TOTAL_BANDS - 56)) - 1;
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
                    circle.xInit = this.cp.x + (Math.random() * this.params.sizeW - 
                                                this.params.sizeW / 2);
                    _results.push(circle.yInit = this.cp.y + 
                        (Math.random() * this.params.sizeH - this.params.sizeH / 2));
                    break;
                case this.modes[1]:
                    angle = Math.random() * (Math.PI * 2);
            
                    circle.xInit = this.cp.x + (Math.cos(angle) * this.params.sizeW);
                    _results.push(circle.yInit = this.cp.y + 
                          (Math.sin(angle) * this.params.sizeH));
                    break;
                default:
                    _results.push(void 0);
            }
        }

        return _results;
    }

    update() {
        let angle, circle, dist, dx, dy, i, n, r, scale, xpos, ypos, _i, _ref, band;
        requestAnimationFrame(this.update.bind(this));
        
        // Get radius from amplitude  
        let OSCscale = this.OSCHandler.getScale();

        // Loudness particles
        let extra_particles = this.OSCHandler.getParticles() || 0;
        let particles_to_draw = this.params.numParticles - this.params.maxExtraParticles;
        let OSCdistance = this.OSCHandler.getDistance();
        let bandsArray = this.OSCHandler.getBandviz();
        let color = this.OSCHandler.getColor();
        console.log("color: " + color);


        // if (OSCscale) {
        //     this.params.radius = OSCscale;
        // }

        if (OSCdistance) {
            this.params.distance = OSCdistance;
        }


        // if (this.analiserDataArray) {
        //     this.analyser.getByteFrequencyData(this.analiserDataArray);
        // }

        if (this.mouseX > 0 && this.mouseY > 0) {
            this.mousePt.x += (this.mouseX - this.mousePt.x) * 0.03;
            this.mousePt.y += (this.mouseY - this.mousePt.y) * 0.03;
        }

        for (i = _i = 0, _ref = particles_to_draw + extra_particles - 1; 
                0 <= _ref ? _i <= _ref : _i >= _ref; 
                i = 0 <= _ref ? ++_i : --_i) {

            circle = this.arrCircles[i];
            
            
            if (color) {
                circle.tint = color;
            }

            if (bandsArray) {
                scale = circle.s * .1;
                // scale = bandsArray[i % 25];
                // console.log("band " + circle.indexBand);
                // console.log("mod " +circle.indexBand % 25);
                //
                // // scale = (n / 256) * circle.s * 2;
                // // console.log(bandsArray);
                // // console.log(n);
                // console.log("scale: "+scale);
                
                band = bandsArray[i % 18]
            }
            else {
                scale = circle.s * .1;
                band = 2;
            }
            
            // if (this.analiserDataArray) {
            //     n = this.analiserDataArray[circle.indexBand];
            //     scale = (n / 256) * circle.s * 2;
            // } else {
            //     scale = circle.s * .1;
            // }
            
            // For guitar the first 18 bands are the relevant ones.
            
            scale *= bandsArray[i % 18];
            // console.log("scake: " + scale);
            circle.scale.x += (scale - circle.scale.x) * 0.3;
            circle.scale.y = circle.scale.x;
            // console.log(circle.scale.x);
            // console.log(circle.scale.y);
            dx = this.mousePt.x - circle.xInit;
            dy = this.mousePt.y - circle.yInit;
            dist = Math.sqrt(dx * dx + dy * dy);
            angle = Math.atan2(dy, dx);
            r = circle.mouseRad * this.params.distance + 30;
            xpos = circle.xInit - Math.cos(angle) * r;
            ypos = circle.yInit - Math.sin(angle) * r;
            circle.position.x += (xpos - circle.position.x) * 0.1;
            circle.position.y += (ypos - circle.position.y) * 0.1;
        }

        return this.renderer.render(this.stage);
    }
}

export default AudioCloud;
