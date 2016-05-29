import THREE from "three"
import Tween from "./Tween"
import Particle from "./Particle"

/**
* @author Lee Stemkoski   http://www.adelphi.edu/~stemkoski/
* Adapted to new version of Three.js and ES6 by:
* @author Ismael Mendonca @github: ismaelmt
*/

///////////////////////////////////////////////////////////////////////////////

/////////////
// SHADERS //
/////////////

// attribute: data that may be different for each particle (such as size and color);
// can only be used in vertex shader
// varying: used to communicate data from vertex shader to fragment shader
// uniform: data that is the same for each particle (such as texture)

let particleVertexShader = 
[
"attribute vec3  customColor;",
"attribute float customOpacity;",
"attribute float customSize;",
"attribute float customAngle;",
"attribute float customVisible;",  // float used as boolean (0 = false, 1 = true)
"varying vec4  vColor;",
"varying float vAngle;",
"void main()",
"{",
	"if ( customVisible > 0.5 )", // true
		"vColor = vec4( customColor, customOpacity );", 
        //set color associated to vertex; use later in fragment shader.
	"else",	// false
		"vColor = vec4(0.0, 0.0, 0.0, 0.0);", //make particle invisible.
		
	"vAngle = customAngle;",

	"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
	"gl_PointSize = customSize * ( 300.0 / length( mvPosition.xyz ) );",     
    // scale particles as objects in 3D space
	"gl_Position = projectionMatrix * mvPosition;",
"}"
].join("\n");

let particleFragmentShader =
[
"uniform sampler2D texture;",
"varying vec4 vColor;", 	
"varying float vAngle;",   
"void main()", 
"{",
	"gl_FragColor = vColor;",
	
	"float c = cos(vAngle);",
	"float s = sin(vAngle);",
	"vec2 rotatedUV = vec2(c * (gl_PointCoord.x - 0.5) + s * (gl_PointCoord.y - 0.5) + 0.5,", 
	                      "c * (gl_PointCoord.y - 0.5) - s * (gl_PointCoord.x - 0.5) + 0.5);",  // rotate UV coordinates to rotate texture
    	"vec4 rotatedTexture = texture2D( texture,  rotatedUV );",
	"gl_FragColor = gl_FragColor * rotatedTexture;",    
    // sets an otherwise white particle texture to desired color
"}"
].join("\n");

///////////////////////////////////////////////////////////////////////////////

///////////////////////////
// PARTICLE ENGINE CLASS //
///////////////////////////

let Type = Object.freeze({ "CUBE":1, "SPHERE":2 });

class ParticleEngine {

    constructor(scene) {
        /////////////////////////
        // PARTICLE PROPERTIES //
        /////////////////////////
        
        this.positionStyle = Type.CUBE;		
        this.positionBase   = new THREE.Vector3();
        // cube shape data
        this.positionSpread = new THREE.Vector3();
        // sphere shape data
        this.positionRadius = 0; // distance from base at which particles start
        
        this.velocityStyle = Type.CUBE;	
        // cube movement data
        this.velocityBase       = new THREE.Vector3();
        this.velocitySpread     = new THREE.Vector3(); 
        // sphere movement data
        //   direction vector calculated using initial position
        this.speedBase   = 0;
        this.speedSpread = 0;
        
        this.accelerationBase   = new THREE.Vector3();
        this.accelerationSpread = new THREE.Vector3();	
        
        this.angleBase               = 0;
        this.angleSpread             = 0;
        this.angleVelocityBase       = 0;
        this.angleVelocitySpread     = 0;
        this.angleAccelerationBase   = 0;
        this.angleAccelerationSpread = 0;
        
        this.sizeBase   = 0.0;
        this.sizeSpread = 0.0;
        this.sizeTween  = new Tween();
                
        // store colors in HSL format in a THREE.Vector3 object
        // http://en.wikipedia.org/wiki/HSL_and_HSV
        this.colorBase   = new THREE.Vector3(0.0, 1.0, 0.5); 
        this.colorSpread = new THREE.Vector3(0.0, 0.0, 0.0);
        this.colorTween  = new Tween();
        
        this.opacityBase   = 1.0;
        this.opacitySpread = 0.0;
        this.opacityTween  = new Tween();

        this.blendStyle = THREE.NormalBlending; // false;

        this.particleArray = [];
        this.particlesPerSecond = 100;
        this.particleDeathAge = 1.0;
        
        ////////////////////////
        // EMITTER PROPERTIES //
        ////////////////////////
        
        this.emitterAge      = 0.0;
        this.emitterAlive    = true;
        this.emitterDeathAge = 60; // time (seconds) at which to stop creating particles.
        
        // How many particles could be active at any time?
        this.particleCount = this.particlesPerSecond * 
            Math.min( this.particleDeathAge, this.emitterDeathAge );

        //////////////
        // THREE.JS //
        //////////////
        
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleTexture  = null;
        this.particleMaterial = new THREE.ShaderMaterial({
            uniforms: 
            {
                texture:   { type: "t", value: this.particleTexture },
            },
            vertexShader:   particleVertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true, // alphaTest: 0.5,  
            // if having transparency issues, try including: alphaTest: 0.5, 
            blending: THREE.NormalBlending, depthTest: true,
            
        });
        this.particleMesh = new THREE.Mesh();

        this.scene = scene;

        // var geometry = new THREE.CircleGeometry( 5, 32 );
        // var material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
        // var circle = new THREE.Mesh( geometry, material );
        // this.scene.add( circle );

    }
	
    setValues( parameters ) {
        if ( parameters === undefined ) return;
        
        // clear any previous tweens that might exist
        this.sizeTween    = new Tween();
        this.colorTween   = new Tween();
        this.opacityTween = new Tween();
        
        for ( let key in parameters ) 
            this[ key ] = parameters[ key ];
        
        // attach tweens to particles
        Particle.prototype.sizeTween    = this.sizeTween;
        Particle.prototype.colorTween   = this.colorTween;
        Particle.prototype.opacityTween = this.opacityTween;	
        
        // calculate/set derived particle engine values
        this.particleArray = [];
        this.emitterAge      = 0.0;
        this.emitterAlive    = true;
        this.particleCount = this.particlesPerSecond * 
            Math.min( this.particleDeathAge, this.emitterDeathAge );
        
        this.particleGeometry = new THREE.BufferGeometry()
        
        this.particleMaterial = new THREE.ShaderMaterial( 
        {
            uniforms: 
            {
                texture: { type: "t", value: this.particleTexture },
            },
            vertexShader:   particleVertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,  alphaTest: 0.5, // if having transparency issues, 
                                                // try including: alphaTest: 0.5, 
            blending: THREE.NormalBlending, depthTest: true
        });
        this.particleMesh = new THREE.Points();
    }
        
    // helper functions for randomization
    randomValue(base, spread) {
        return base + spread * (Math.random() - 0.5);
    }
    
    
    randomVector3(base, spread) {
        var rand3 = new THREE.Vector3( Math.random() - 0.5, 
                                      Math.random() - 0.5, Math.random() - 0.5 );
        return new THREE.Vector3().addVectors( base, 
                    new THREE.Vector3().multiplyVectors( spread, rand3 ) );
    }


    createParticle()
    {
        let particle = new Particle();

        if (this.positionStyle == Type.CUBE)
            particle.position = this.randomVector3(this.positionBase, 
                                                   this.positionSpread ); 
        if (this.positionStyle == Type.SPHERE) {
            let z = 2 * Math.random() - 1;
            let t = 6.2832 * Math.random();
            let r = Math.sqrt( 1 - z*z );
            let vec3 = new THREE.Vector3( r * Math.cos(t), r * Math.sin(t), z );
            particle.position = new THREE.Vector3().addVectors( 
                this.positionBase, vec3.multiplyScalar( this.positionRadius ) );
        }
            
        if ( this.velocityStyle == Type.CUBE ) {
            particle.velocity = this.randomVector3(this.velocityBase,
                                                   this.velocitySpread ); 
        }
        if ( this.velocityStyle == Type.SPHERE ) {
            let direction = new THREE.Vector3().subVectors(
                particle.position, this.positionBase );
            
            let speed = this.randomValue( this.speedBase, this.speedSpread );
            particle.velocity  = direction.normalize().multiplyScalar( speed );
        }
        
        particle.acceleration = this.randomVector3(
            this.accelerationBase, this.accelerationSpread ); 

        particle.angle = this.randomValue(this.angleBase, this.angleSpread );
        particle.angleVelocity = this.randomValue(this.angleVelocityBase,
                                                  this.angleVelocitySpread);
        particle.angleAcceleration = this.randomValue(this.angleAccelerationBase, 
                                                      this.angleAccelerationSpread );

        particle.size = this.randomValue(this.sizeBase, this.sizeSpread );

        let color = this.randomVector3(this.colorBase, this.colorSpread );
        particle.color = new THREE.Color().setHSL(color.x, color.y, color.z );
        
        particle.opacity = this.randomValue( this.opacityBase, this.opacitySpread );

        particle.age   = 0;
        particle.alive = 0; // particles initialize as inactive
        
        return particle;
    }

    initialize() {
        // link particle data with geometry/material dataa
        this.visibles = new Float32Array(this.particleCount);
        this.colors = new Float32Array(this.particleCount * 3);
        this.opacities = new Float32Array(this.particleCount); 
        this.sizes = new Float32Array(this.particleCount);
        this.angles = new Float32Array(this.particleCount);
        this.positions = new Float32Array(this.particleCount * 3);

        for (let i = 0, j = 0; i < this.particleCount; i++,  j+=3)
        {
            // remove duplicate code somehow, here and in update function below.
            this.particleArray[i] = this.createParticle();
            
            this.positions[j] = this.particleArray[i].position.x;
            this.positions[j + 1] = this.particleArray[i].position.y;
            this.positions[j + 2] = this.particleArray[i].position.z;

            this.visibles[i] = this.particleArray[i].alive;
            
            this.colors[j] = this.particleArray[i].color.r;
            this.colors[j + 1] = this.particleArray[i].color.g;
            this.colors[j + 2] = this.particleArray[i].color.b;
            
            this.opacities[i] = this.particleArray[i].opacity;
            this.sizes[i] = this.particleArray[i].size;
            this.angles[i] = this.particleArray[i].angle;
        }
        
        this.particleGeometry.addAttribute("position",
            new THREE.BufferAttribute(this.positions, 3));

        this.particleGeometry.addAttribute("customVisible", 
            new THREE.BufferAttribute(this.visibles, 1));

        this.particleGeometry.addAttribute("customAngle", 
            new THREE.BufferAttribute(this.angles, 1));

        this.particleGeometry.addAttribute("customSize", 
            new THREE.BufferAttribute(this.sizes, 1));

        this.particleGeometry.addAttribute("customColor", 
            new THREE.BufferAttribute(this.colors, 3));

        this.particleGeometry.addAttribute("customOpacity", 
            new THREE.BufferAttribute(this.opacities, 1));

        this.particleMaterial.blending = this.blendStyle;

        if ( this.blendStyle != THREE.NormalBlending) 
            this.particleMaterial.depthTest = false;
        
        this.particleMesh = new THREE.Points( this.particleGeometry, 
                                              this.particleMaterial );
        this.particleMesh.dynamic = true;
        this.particleMesh.sortParticles = true;

        return this.particleMesh;
        // this.scene.add( this.particleMesh );
    }

    update(dt, color, bandsArray) {
        let recycleIndices = [];
        
        
        //
        // this.particleGeometry.attributes.position.needsUpdate = true;
        // this.particleGeometry.attributes.customVisible.needsUpdate = true;
        // this.particleGeometry.attributes.customAngle.needsUpdate = true;
        // this.particleGeometry.attributes.customSize.needsUpdate = true;
        // this.particleGeometry.attributes.customColor.needsUpdate = true;
        // this.particleGeometry.attributes.customOpacity.needsUpdate = true;
        //
        // update particle data
        for (let i = 0, j = 0; i < this.particleCount; i++, j+=3) {
            if (this.particleArray[i].alive ) {
                this.particleArray[i].update(dt);

                // check if particle should expire
                // could also use: death by size<0 or alpha<0.
                if ( this.particleArray[i].age > this.particleDeathAge ) {
                    this.particleArray[i].alive = 0.0;
                    recycleIndices.push(i);
                }
     
                this.positions[j] = this.particleArray[i].position.x;
                this.positions[j + 1] = this.particleArray[i].position.y;
                this.positions[j + 2] = this.particleArray[i].position.z;

                this.visibles[i] = this.particleArray[i].alive;
 
                // Use pitch colors
                this.colors[j] = color[0] / 360;
                this.colors[j + 1] = color[1] / 100;
                this.colors[j + 2] = color[2] / 100;
               
                // this.colors[j] = this.particleArray[i].color.r;
                // this.colors[j + 1] = this.particleArray[i].color.g;
                // this.colors[j + 2] = this.particleArray[i].color.b;
                
                this.opacities[i] = this.particleArray[i].opacity;
                this.sizes[i] = this.particleArray[i].size *  bandsArray[i % 18] / 10;
                this.angles[i] = this.particleArray[i].angle;

            }		
        }
        this.particleGeometry.addAttribute("position",
            new THREE.BufferAttribute(this.positions, 3));

        this.particleGeometry.addAttribute("customVisible", 
            new THREE.BufferAttribute(this.visibles, 1));

        this.particleGeometry.addAttribute("customAngle", 
            new THREE.BufferAttribute(this.angles, 1));

        this.particleGeometry.addAttribute("customSize", 
            new THREE.BufferAttribute(this.sizes, 1));

        this.particleGeometry.addAttribute("customColor", 
            new THREE.BufferAttribute(this.colors, 3));

        this.particleGeometry.addAttribute("customOpacity", 
            new THREE.BufferAttribute(this.opacities, 1));


        // check if particle emitter is still running
        if (!this.emitterAlive ) return;

        // if no particles have died yet, then there are still particles to activate
        if (this.emitterAge < this.particleDeathAge )
        {
            // determine indices of particles to activate
            let startIndex = Math.round( this.particlesPerSecond * 
                                        (this.emitterAge + 0) );
            let endIndex = Math.round( this.particlesPerSecond * 
                                      (this.emitterAge + dt));
            if  ( endIndex > this.particleCount ) 
                  endIndex = this.particleCount; 
                  
            for (let i = startIndex; i < endIndex; i++) {
                this.particleArray[i].alive = 1.0;
            }
        }

        // if any particles have died while the emitter is still running, 
        // we imediately recycle them
        let i;
        for (let j = 0, k = 0; j < recycleIndices.length; j++, k+=3) {
            i = recycleIndices[j];
            
            this.particleArray[i] = this.createParticle();
            this.particleArray[i].alive = 1.0; // activate right away
            
            this.particleGeometry.attributes.position.array[k] = 
                this.particleArray[i].position.x;
            this.particleGeometry.attributes.position.array[k + 1] = 
                this.particleArray[i].position.y;
            this.particleGeometry.attributes.position.array[k + 2] = 
                this.particleArray[i].position.z;
        }

        // stop emitter?
        this.emitterAge += dt;
        if ( this.emitterAge > this.emitterDeathAge )  this.emitterAlive = false;
    }

    destroy() {
        this.scene.remove( this.particleMesh );
    }
}

export default ParticleEngine
