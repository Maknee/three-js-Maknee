const viewAngle = 75;
const aspectRatio = window.innerWidth / window.innerHeight;
const nearPlane = 1;
const farPlane = 2000;

const worldWidth = 700;
const worldLength = 700;

const width = 256;
const height = 256;

class Scene
{
    constructor()
    {
        //init the scene
        this.scene = new THREE.Scene();

        //add fog
        this.scene.fog = new THREE.FogExp2( 0xffccff, 0.0015 );

        //init the perspective camera
        this.camera = new THREE.PerspectiveCamera(viewAngle, aspectRatio, nearPlane, farPlane);
        
        this.camera.position.set(0, 10, 0);

        //setup the renderer
        this.renderer = new THREE.WebGLRenderer( {antialias: true} );
        this.renderer.setClearColor(0x333333);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if ( WEBVR.isAvailable() === false ) {
            document.body.appendChild( WEBVR.getMessage() );

            this.controls = new THREE.PointerLockControls(this.camera);
            this.controls.enabled = true;
            //add the camera to the scene
            this.scene.add(this.controls.getObject());
        } else {
            this.controls = new THREE.VRControls( this.camera );
            this.effect = new THREE.VREffect( this.renderer );
            document.body.appendChild( WEBVR.getButton( this.effect ) );
        }

        //add the renderer to the canvas
        document.body.appendChild(this.renderer.domElement);
    }
}

class PerlinNoise
{
    perlin(x, y) {

        //Used to form the vector points
        var x1 = Math.floor(x);
        var x2 = Math.ceil(x);
        var y1 = Math.floor(y);
        var y2 = Math.ceil(y);

        //Bounding vectors of the point
        var aVec = new THREE.Vector2(x1, y1);
        var bVec = new THREE.Vector2(x2, y1);
        var cVec = new THREE.Vector2(x1, y2);
        var dVec = new THREE.Vector2(x2, y2);

        //Create the point vector itself
        var pointVec = new THREE.Vector2(x, y);

        //Calculate the distance between the vectors
        var distAVec = aVec.sub(pointVec);
        var distBVec = bVec.sub(pointVec);
        var distCVec = cVec.sub(pointVec);
        var distDVec = dVec.sub(pointVec);

        //The interpolation values
        var xDiff = x - x1;
        var yDiff = y - y1;

        //create gradient vectors
        var aGradientVec = new THREE.Vector2(Math.random(), Math.random());
        var bGradientVec = new THREE.Vector2(Math.random(), Math.random());
        var cGradientVec = new THREE.Vector2(Math.random(), Math.random());
        var dGradientVec = new THREE.Vector2(Math.random(), Math.random());

        //Take the dot product between the distance vectors and the gradient vectors
        var aDotVec = aGradientVec.dot(distAVec);
        var bDotVec = bGradientVec.dot(distBVec);
        var cDotVec = cGradientVec.dot(distCVec);
        var dDotVec = dGradientVec.dot(distDVec);

        //console.log(bDotVec);

        //Lerp (bilinear interpolation) between the dot products horizontally
        var bilinearInter1 = this.lerp(aDotVec, bDotVec, xDiff);
        var bilinearInter2 = this.lerp(cDotVec, dDotVec, xDiff);

        //Lerp (bilinear interpolation) between the dot products vertically
        return this.lerp(bilinearInter1, bilinearInter2, yDiff);
    }

    lerp(a, b, x) {
        return a + x * (b - a);
    }
}

class ParticleSystem
{
    constructor(scene, size, textureName)
    {
        this.scene = scene;
        this.particles = new THREE.Geometry();
        this.setParticleMaterial(textureName, 0xff99ff, 5)
        this.size = size;
        this.generateParticles(this.size);
        this.generateParticleSystem();
        this.scene.add(this.system);
    }

    //Sets the particles to some material
    setParticleMaterial(textureName, color, size)
    {
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);
        this.particleMaterial = new THREE.PointsMaterial({color: color, size: size, 
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false });
    }

    //Generate individual particles
    generateParticles(numParticles)
    {
        //Randomize velocity for each
        this.velocity = [];
        for(var i = 0; i < numParticles; i++)
        {
            var x = Math.random() * 500 - 250;
            var y = Math.random() * 500 - 250;
            var z = Math.random() * 500 - 250;
            var particle = new THREE.Vector3(x, y, z);
            this.particles.vertices.push(particle);
            this.velocity[i] = Math.random() + 1;
        }
    }

    //Generates a particle system after creating particles
    generateParticleSystem()
    {
        this.system = new THREE.Points(this.particles, this.particleMaterial);
    }

    update() {
        this.system.rotation.y += 0.015;

        var i = 0;
        var vertices = this.system.geometry.vertices;
        while (i < vertices.length) {
            // get the particle
            var vertex = vertices[i];

            // check if we need to reset
            if (vertex.y < -200) {
                vertex.y = Math.random() * 400 - 200;
            }

            // update the velocity with
            // a splat of randomniz
            vertex.y -= this.velocity[i];
            i++;
        }

        // flag to the particle system
        // that we've changed its vertices.
        this.system.geometry.verticesNeedUpdate = true;
    }
}

class Moon
{
    constructor(scene, textureName)
    {
        var moonGeometry = new THREE.SphereGeometry(50, 10, 10);
        
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);

        var moonMaterial = new THREE.MeshLambertMaterial({map: texture, blending: THREE.AdditiveBlending, 
            side: THREE.DoubleSide, emissive: 0xff44444, emissiveIntensity: 1});

        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);

        this.moon.position.y = 100;
        this.moon.position.z = -200;
        
        //Used to pivot the moon around the center
        this.moonCenter = new THREE.Object3D();
        this.moonCenter.position.set(0, 0, 0);
        this.moonCenter.add(this.moon);

        scene.add(this.moonCenter);
    }

    update()
    {
        this.moonCenter.rotateY(-Math.PI / 1000);
        this.moon.rotateX(Math.PI / 1000);
        this.moon.rotateY(-Math.PI / 1000);
        this.moon.geometry.verticesNeedUpdate = true;
    }
}

class Mountain
{
    constructor(scene)
    {
        var loader = new THREE.TextureLoader();
        var texture = loader.load("images/mountain.jpg");
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);

        //construct a plane
        this.planeGeometry = new THREE.PlaneGeometry(worldWidth, worldLength, width - 1, height - 1);
        this.planeGeometry.rotateX(-Math.PI / 2);
        var planeMaterial  = new THREE.MeshPhongMaterial({ color: 0x00ffff, 
            vertexColors: THREE.VertexColors, shading: THREE.SmoothShading, 
            side: THREE.DoubleSide, wireframe: false,
            map: texture});
        var plane = new THREE.Mesh(this.planeGeometry, planeMaterial);

        var perlinNoise = new PerlinNoise();

        for (var i = 0; i < this.planeGeometry.vertices.length; i++)
        {
            this.planeGeometry.vertices[i].y = perlinNoise.perlin(this.planeGeometry.vertices[i].x, this.planeGeometry.vertices[i].z) * 30;
        }

        this.planeGeometry.vertices.needsUpdate = true;

        plane.position.set(0, 0, 0);

        //add the plane to the scene
        scene.add(plane);
    }

    //Used to put trees in place
    GetRandomPoint()
    {
        var points = [];
        for (var i = 0; i < this.planeGeometry.vertices.length; i++)
        {
            var vertex = this.planeGeometry.vertices[i];
            if(vertex.x < 100 && vertex.x > -100
                && vertex.z < 100 && vertex.z > -100)
                points.push(vertex);
        }
        return points[Math.round(Math.random() * points.length)];
    }
}

class Tree
{
    constructor(x, y, z, scene, numParticles, treeTextureName, leafTextureName)
    {
        //Get the points and use them as a starting location for the tree
        var radius = Math.random() * 0.5 + 0.5;
        var height = Math.random() * 30 + 15;
        var treeGeometry = new THREE.CylinderGeometry(
            radius, radius, height, 32);

        //load tree texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(treeTextureName);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        var treeMaterial = new THREE.MeshBasicMaterial({map: texture});
        this.tree = new THREE.Mesh(treeGeometry, treeMaterial);
        this.tree.position.set(x, y, z);
        
        scene.add(this.tree);

        //Create the leaves (particle system)
        this.scene = scene;
        this.numParticles = numParticles;
        this.leafTextureName = leafTextureName;
        this.GenerateLeaves(x, y, z, radius, height);

        //how strong the wind is for the leaves
        this.wind = Math.random() * 2;
    }

    GenerateLeaves(x, y, z, radius, height)
    {
        this.particles = new THREE.Geometry();

        var leafSize = Math.random() * 3 + 3;
        this.setParticleMaterial(this.leafTextureName, 0xff00ff, leafSize);
        this.generateParticles(this.numParticles, radius, height);
        this.generateParticleSystem();

        this.system.position.set(x, y + height/2, z);
        this.scene.add(this.system);
    }

    //Sets the particles to some material
    setParticleMaterial(leafTextureName, color, size)
    {
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(leafTextureName);

        this.particleMaterial = new THREE.PointsMaterial({
            size: size, vertexColors: THREE.VertexColors,
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            opacity: 1, depthWrite: false});
    }

    //Generate individual particles
    generateParticles(numParticles, radius, height)
    {
        //is a set of booleans to check if a leaf is falling
        this.falling = []

        //original location is used to restore the leaves' location after they fall 
        this.originalLocation = [];
        for(var i = 0; i < numParticles; i++)
        {
            var randomWidth = Math.random() * radius * 2 - radius;
            var randomHeight = Math.random() * height * 2 - height;
            // random location of particles
            var x = randomWidth * 10;
            var y = randomHeight / 10;
            var z = randomWidth * 10;
            var particle = new THREE.Vector3(x, y, z);
            this.particles.vertices.push(particle);
            
            // Calculate the direction vectors as well (used for explosion)
            this.originalLocation[i] = new THREE.Vector3(x, y, z);
            this.falling[i] = false;

            // add blank colors
            var color = new THREE.Color();
            this.particles.colors.push(color);
        }
    }

    //Generates a particle system after creating particles
    generateParticleSystem()
    {
        this.system = new THREE.Points(this.particles, this.particleMaterial);
    }

    update() {
        //make the particles scatter
        var vertices = this.system.geometry.vertices;
        for (var i = 0; i < vertices.length; i++) 
        {
            if(Math.random()/vertices.length < 0.00005)
            {
                this.falling[i] = true;
            }

            if(this.falling[i] === true)
            {
                // get the particle
                var vertex = vertices[i];

                // update the position
                vertex.y -= 0.5;
                vertex.x -= this.wind;

                //Check if out of bounds
                if(vertex.y < -worldWidth)
                {
                    vertex.x = this.originalLocation[i].x;
                    vertex.y = this.originalLocation[i].y;
                    vertex.z = this.originalLocation[i].z;
                    this.falling[i] = false;
                }
            }
        }

        //update the mesh's geometry and material
        this.system.geometry.verticesNeedUpdate = true;
    }
}

class Cloud
{
    constructor(scene, size, textureName)
    {
        this.scene = scene;
        this.cloudSpeed = Math.random() * 1 + 1.5;
        this.particles = new THREE.Geometry();
        //this.particles.position = new THREE.Vector3(
          //  Math.random() * 300 - 300, Math.random() * 300 - 300, Math.random() * 300 - 300);
        this.setParticleMaterial(textureName, 0xffffff, 10)
        this.size = size;
        this.generateParticles(this.size);
        this.generateParticleSystem();
        this.system.position.x = Math.random() * 600 - 300;
        this.system.position.y = Math.random() * 300;
        this.system.position.z = Math.random() * 1500 - 750;
        this.scene.add(this.system);
    }

    //Sets the particles to some material
    setParticleMaterial(textureName, color, size)
    {
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        this.particleMaterial = new THREE.PointsMaterial({color: color, size: size, 
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false });
    }

    //Generate individual particles
    generateParticles(numParticles)
    {
        for(var i = 0; i < numParticles; i++)
        {
            var x = Math.random() * 300 - 200;
            var y = Math.random() * 100 - 50;
            var z = Math.random() * 300 - 200;
            var particle = new THREE.Vector3(x, y, z);
            this.particles.vertices.push(particle);
        }
    }

    //Generates a particle system after creating particles
    generateParticleSystem()
    {
        this.system = new THREE.Points(this.particles, this.particleMaterial);
    }

    update() {
        this.system.rotation.x += 0.001;
        this.system.rotation.y += 0.001;

        var i = 0;
        var vertices = this.system.geometry.vertices;
        while (i < vertices.length) {
            // get the particle
            var vertex = vertices[i];

            // check if we need to reset
            if (vertex.z < -worldWidth) {
                vertex.z = worldWidth;
            }

            // update the velocity with
            // a splat of randomniz
            vertex.z -= this.cloudSpeed;
            i++;
        }

        // flag to the particle system
        // that we've changed its vertices.
        this.system.geometry.verticesNeedUpdate = true;
    }
}

class Sky
{
    constructor(scene, textureName)
    {
        var skyGeometry = new THREE.SphereGeometry(500, 50, 50);
        
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);

        var skyMaterial = new THREE.MeshBasicMaterial({map: texture, side: THREE.BackSide});

        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);

        scene.add(this.sky);
    }

    update()
    {
        //this.sky.rotateX(Math.PI / 1000);
        this.sky.rotateY(-Math.PI / 5000);
        this.sky.geometry.verticesNeedUpdate = true;
    }
}

class Sea
{
    constructor(camera, renderer, scene)
    {
        this.clock = new THREE.Clock(true);

        this.seaGeometry = new THREE.PlaneGeometry( 
            worldWidth, worldLength, width, height);

        this.seaGeometry.rotateX( - Math.PI / 2 );

        var loader = new THREE.TextureLoader();
        var texture = loader.load("images/sea.jpg");
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);
        
        var seaMaterial = new THREE.MeshBasicMaterial( { color: 0x0044ff, map: texture } );
        this.seaMesh = new THREE.Mesh(this.seaGeometry, seaMaterial );

        scene.add(this.seaMesh);
    }

    update()
    {
        for (var i = 0; i < this.seaGeometry.vertices.length; i++ ) 
        {
            var vertex = this.seaGeometry.vertices[i];
            vertex.y = 2 * Math.sin( i / 10 
                + this.clock.getElapsedTime() + vertex.x/10 + vertex.z/10);
        }
        this.seaMesh.geometry.verticesNeedUpdate = true;
    }
}

class Firework
{
    constructor(scene, size, explosionSize, textureName)
    {
        this.scene = scene;
        this.size = size;
        this.explosionSize = explosionSize;
        this.textureName = textureName;
        this.clock = new THREE.Clock(true);
        this.CreateAFireWork();
    }

    CreateAFireWork()
    {
        this.startTime = this.clock.getElapsedTime();
        this.currentTime = this.clock.getElapsedTime() - this.startTime;
        this.particles = new THREE.Geometry();
        this.setParticleMaterial(this.textureName, 0xff00ff, 10)
        this.generateParticles(this.size, this.explosionSize);
        this.generateParticleSystem();

        //Randomize the particle system's location
        this.system.position.set( (Math.random() * this.size * 0.5) - this.size * 0.25, 
            Math.random() * 10, (Math.random() * this.size * 0.5) - this.size * 0.25);
        this.scene.add(this.system);

        //boolean for explosion 
        this.explosionBool = false;
        //counter until explosion
        this.explosionTimer = 0;
        //The elapsed time before explosion
        this.explosionTotalTimer = Math.random() * 500 + 100;
    }

    //Sets the particles to some material
    setParticleMaterial(textureName, color, size)
    {
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);

        this.particleMaterial = new THREE.PointsMaterial({
            size: size, vertexColors: THREE.VertexColors,
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false});
    }

    //Generate individual particles
    generateParticles(numParticles, explosionSize)
    {
        this.directionVec = [];
        for(var i = 0; i < numParticles; i++)
        {
            // random location
            var x = Math.random() * explosionSize - (explosionSize/2);
            var y = Math.random() * explosionSize - (explosionSize/2);
            var z = Math.random() * explosionSize - (explosionSize/2);
            var particle = new THREE.Vector3(x, y, z);
            this.particles.vertices.push(particle);
            
            // Calculate the direction vectors as well (used for explosion)
            this.directionVec[i] = new THREE.Vector3(x, y, z);

            // add blank colors
            var color = new THREE.Color();
            this.particles.colors.push(color);
        }
    }

    //Generates a particle system after creating particles
    generateParticleSystem()
    {
        this.system = new THREE.Points(this.particles, this.particleMaterial);
    }

    update() {
        this.currentTime = this.clock.getElapsedTime() - this.startTime;
        if(this.explosionTimer > this.explosionTotalTimer && !this.explosionBool)
        {
            //Start the explosion
            this.explosionBool = true;
            //reset the timer
            this.explosionTimer = 0;
        }
        else if(this.explosionTimer > this.explosionTotalTimer && this.explosionBool)
        {
            //We are done with this particle system, refresh it
            this.scene.remove(this.system);
            this.CreateAFireWork();
        }

        if(this.explosionBool)
        {
            //Check if we are done
            if(this.explosionTimer > this.explosionTotalTimer)
            {
                //Start the explosion
                this.explosionBool = true;
                //reset the timer
                this.explosionTimer = 0;
            }
            var timeRatio = this.explosionTimer/this.explosionTotalTimer;
            
            //make the particles scatter
            var vertices = this.system.geometry.vertices;
            for (var i = 0; i < vertices.length; i++) 
            {
                // get the particle
                var vertex = vertices[i];

                // update the position
                vertex.x += this.directionVec[i].x * this.currentTime / 4;
                vertex.y += this.directionVec[i].y * this.currentTime / 4;
                vertex.z += this.directionVec[i].z * this.currentTime / 4;
            }

            //update the color too
            var colors = this.system.geometry.colors;
            for (var i = 0; i < colors.length; i++) 
            {
                //Change the color
                var newColor = new THREE.Color(((1 - timeRatio) + Math.random())/2, timeRatio, timeRatio);

                colors[i] = newColor;
            }

            // Change opacity and size
            this.system.material.opacity = 1 - timeRatio;
            this.system.material.size = Math.sqrt(this.size) * (1 - timeRatio);

            this.explosionTimer += this.currentTime;
        }
        else
        {
            var timeRatio = this.explosionTimer/this.explosionTotalTimer;
            //make the rocket go up
            var vertices = this.system.geometry.vertices;
            for (var i = 0; i < vertices.length; i++) 
            {
                // get the particle
                var vertex = vertices[i];

                // update the position
                vertex.y += this.currentTime / 4;
            }

            //update the color too
            var colors = this.system.geometry.colors;
            for (var i = 0; i < colors.length; i++) 
            {
                //Change the color
                var newColor = new THREE.Color((1 - timeRatio), timeRatio, timeRatio);
                //newColor.setHSL( (1 - timeRatio), 1, 1 );

                colors[i] = newColor;
            }

            // Change opacity and size
            this.system.material.opacity = 1 - timeRatio;
            this.system.material.size = (Math.sqrt(this.size)/2) * (1 - timeRatio);

            this.explosionTimer += this.currentTime;
        }

        //update the mesh's geometry and material
        this.system.geometry.verticesNeedUpdate = true;
        this.system.geometry.colorsNeedUpdate = true;
        this.system.material.needsUpdate = true;
    }
}

//Global variables
var scene = new Scene();
//Moon
var moon = new Moon(scene.scene, "images/moon.jpg");
//Sky
var sky = new Sky(scene.scene, "images/skydome.png");
//Mountain
var mountain = new Mountain(scene.scene);

//Sea
var sea = new Sea(scene.camera, scene.renderer, scene.scene);

var clouds = [];
for(var i = 0; i < 10; i++)
{
    clouds[i] = new Cloud(scene.scene, Math.random() * 1000 + 100, "images/cloud.jpg");
}

var fireworks = [];
for(var i = 0; i < 10; i++)
{
    fireworks[i] = new Firework(scene.scene, Math.random() * 1000 + 200, 10, "images/particle1.png");
}

var trees = [];
for(var i = 0; i < 10; i++)
{
    var point = mountain.GetRandomPoint();
    trees[i] = new Tree(point.x, point.y, point.z, scene.scene, 25, 
        "images/tree.jpg", "images/sakura.png");
}

//add a particle system for leaf blowing simulation
var leaves = new ParticleSystem(scene.scene, 1000, "images/sakura.png");

//Initialize everything
Init();
//start the call to draw each frame
DrawFrame();

function Init()
{
    //add a directional light
    var directionLight = new THREE.DirectionalLight(0xffffff, 0.2);
    scene.scene.add(directionLight);
}


function DrawFrame() {
    //update each frame
    requestAnimationFrame(DrawFrame);

    //moon
    moon.update();

    //sky
    sky.update();

    //sea
    sea.update();

    for(var i = 0; i < fireworks.length; i++)
    {
        fireworks[i].update();
    }

    for(var i = 0; i < clouds.length; i++)
    {
        clouds[i].update();
    }

    for(var i = 0; i < trees.length; i++)
    {
        trees[i].update();
    }

    leaves.update();


    //render the scene and switch buffer
    scene.renderer.render(scene.scene, scene.camera);
}

//resize window
window.addEventListener( 'resize', function () {
    this.scene.camera.aspect = window.innerWidth / window.innerHeight;
    this.scene.camera.updateProjectionMatrix();
    this.scene.renderer.setSize( window.innerWidth, window.innerHeight );
}, false );