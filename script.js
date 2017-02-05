const viewAngle = 75;
const aspectRatio = window.innerWidth / window.innerHeight;
const nearPlane = 1;
const farPlane = 2000;

const worldWidth = 700;
const worldLength = 700;

const widthSegments = 255;
const heightSegments = 255;

class Scene
{
    constructor()
    {
        //init the scene
        this.scene = new THREE.Scene();

        //add fog (light pink)
        this.scene.fog = new THREE.FogExp2( 0xffccff, 0.0015 );

        //init the perspective camera
        this.camera = new THREE.PerspectiveCamera(viewAngle, aspectRatio, nearPlane, farPlane);

        //setup the renderer
        this.renderer = new THREE.WebGLRenderer( {antialias: true} );
        this.renderer.setClearColor(0x333333);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        //Based on whether or not WEBVR is supported or not, change the controls.
        if ( WEBVR.isAvailable() === false ) 
        {
            document.body.appendChild( WEBVR.getMessage() );

            //Set the camera position for non-VR
            this.camera.position.set(0, 10, 0);

            //Setup the controls
            this.controls = new THREE.PointerLockControls(this.camera);
            this.controls.enabled = true;

            //add the camera to the scene
            this.scene.add(this.controls.getObject());
        } 
        else 
        {
            //Set the camera positon for VR (needs the camera to be parented to an object to move???)
            this.camera.position.set(0, 0, 0);

            //Setup the controls
            this.controls = new THREE.VRControls( this.camera );
            this.effect = new THREE.VREffect( this.renderer );
            document.body.appendChild( WEBVR.getButton( this.effect ) );

            //Parent the camera to a group
            var cameraPos = new THREE.Group();
            cameraPos.position.set(0, 200, 0);
            this.scene.add(cameraPos);
            cameraPos.add(this.camera);
        }

        //add the renderer to the canvas
        document.body.appendChild(this.renderer.domElement);
    }
}

//Perlin Noise implementation (Based on how it was discussed in class)
class PerlinNoise
{
    perlin(x, y) {

        //Used to form the vector points that bound the point we inputted
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

        //Lerp (bilinear interpolation) between the dot products horizontally
        var bilinearInter1 = this.lerp(aDotVec, bDotVec, xDiff);
        var bilinearInter2 = this.lerp(cDotVec, dDotVec, xDiff);

        //Lerp (bilinear interpolation) between the dot products vertically
        return this.lerp(bilinearInter1, bilinearInter2, yDiff);
    }

    //Helper function for lerping
    lerp(a, b, ratio) {
        return a + ratio * (b - a);
    }
}

class ParticleSystem
{
    //Takes in the scene, size of each particle and texture to map the particles with   
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
        //Load the texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);

        //Create the material
        this.particleMaterial = new THREE.PointsMaterial({color: color, size: size, 
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false });
    }

    //Generate individual particles
    generateParticles(numParticles)
    {
        //Randomize velocity for each particle, so they don't move at the same speed 
        //This array keeps track of each particle's velocity
        this.velocity = [];

        //Iterate through the particles and randomize their x, y, z location
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
        //rotate the whole system as well
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

            // update the velocity with the velocity we initiliazed the particle with
            vertex.y -= this.velocity[i];
            i++;
        }

        // flag to the particle system to update the verticles
        this.system.geometry.verticesNeedUpdate = true;
    }
}

class Moon
{
    // Takes in the scene and texture to map the moon with
    constructor(scene, textureName)
    {
        //Create a moon geometry
        var moonGeometry = new THREE.SphereGeometry(50, 10, 10);
        
        //Load the texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);

        //Create the material for the mesh
        var moonMaterial = new THREE.MeshLambertMaterial({map: texture, blending: THREE.AdditiveBlending, 
            side: THREE.DoubleSide, emissive: 0xff44444, emissiveIntensity: 1});

        //Creat the mesh
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);

        //Update its position to be in front of the user
        this.moon.position.y = 100;
        this.moon.position.z = -200;
        
        //Used to pivot the moon around the center (parent the moon to this pivot)
        this.moonCenter = new THREE.Object3D();
        this.moonCenter.position.set(0, 0, 0);
        this.moonCenter.add(this.moon);

        //Add the moon to the scene
        scene.add(this.moonCenter);
    }

    update()
    {
        //Update the rotating moon
        this.moonCenter.rotateY(-Math.PI / 1000);
        this.moon.rotateX(Math.PI / 1000);
        this.moon.rotateY(-Math.PI / 1000);

        this.moon.geometry.verticesNeedUpdate = true;
    }
}

class Mountain
{
    //Takes the scene
    constructor(scene)
    {
        //construct a plane that will be deformed via perlin noise
        this.planeGeometry = new THREE.PlaneGeometry(worldWidth, worldLength, widthSegments, heightSegments);
        this.planeGeometry.rotateX(-Math.PI / 2);

        //Load the mountain texture
        var loader = new THREE.TextureLoader();
        var texture = loader.load("images/mountain.jpg");
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);

        //Construct the material
        var planeMaterial  = new THREE.MeshPhongMaterial({ color: 0x00ffff, 
            vertexColors: THREE.VertexColors, shading: THREE.SmoothShading, 
            side: THREE.DoubleSide, wireframe: false,
            map: texture});
        
        //Construct the plane mesh
        var plane = new THREE.Mesh(this.planeGeometry, planeMaterial);

        //Create the perlin noise class
        var perlinNoise = new PerlinNoise();

        //Iterate through each vertex of the plane and call perlin noise function on it to generate a "mountain" looking plane
        for (var i = 0; i < this.planeGeometry.vertices.length; i++)
        {
            this.planeGeometry.vertices[i].y = perlinNoise.perlin(this.planeGeometry.vertices[i].x, this.planeGeometry.vertices[i].z) * 30;
        }

        //Update the plane's vertices
        this.planeGeometry.vertices.needsUpdate = true;

        //Center the plane
        plane.position.set(0, 0, 0);

        //add the plane to the scene
        scene.add(plane);
    }

    //Generate a random point to place trees on
    GetRandomPoint()
    {
        //Make an array of points and store the vertices near the user into the array 
        var points = [];
        for (var i = 0; i < this.planeGeometry.vertices.length; i++)
        {
            var vertex = this.planeGeometry.vertices[i];
            if(vertex.x < 100 && vertex.x > -100
                && vertex.z < 100 && vertex.z > -100)
                points.push(vertex);
        }

        //Return a random point in the point array
        return points[Math.round(Math.random() * points.length)];
    }
}

class Tree
{
    //Takes in x, y, z (position), the scene, number of particles (leaves on the tree), tree texture and leaf texture
    constructor(x, y, z, scene, numParticles, treeTextureName, leafTextureName)
    {
        //Generate a random radius and height of each tree
        var radius = Math.random() * 0.5 + 0.5;
        var heightSegments = Math.random() * 30 + 15;

        //Generate the tree geometry
        var treeGeometry = new THREE.CylinderGeometry(
            radius, radius, heightSegments, 32);

        //load tree texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(treeTextureName);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        //Construct the tree material
        var treeMaterial = new THREE.MeshBasicMaterial({map: texture});
        
        //Generate the tree mesh
        this.tree = new THREE.Mesh(treeGeometry, treeMaterial);
        
        //Place the tree mesh based on the paramters
        this.tree.position.set(x, y, z);
        
        //Add the tree to the scene
        scene.add(this.tree);

        //Create the leaves (particle system)
        this.scene = scene;
        this.numParticles = numParticles;
        this.leafTextureName = leafTextureName;

        this.GenerateLeaves(x, y, z, radius, heightSegments);

        //how strong the wind is for the leaves
        this.wind = Math.random() * 2;
    }

    //Generate the leaves based radius and height of the tree
    GenerateLeaves(x, y, z, radius, heightSegments)
    {
        //Construct a particle geometry that holds all the vertices
        this.particles = new THREE.Geometry();

        //Generate the leaf material
        var leafSize = Math.random() * 3 + 3;
        this.setParticleMaterial(this.leafTextureName, 0xff00ff, leafSize);
        
        //Generate the vertices in the particle system
        this.generateParticles(this.numParticles, radius, heightSegments);

        //Generate the particle system itself
        this.generateParticleSystem();

        //Set the particle system above the base of the tree so the tree looks like it has leaves
        this.system.position.set(x, y + heightSegments/2, z);
        this.scene.add(this.system);
    }

    //Create the particle material material
    setParticleMaterial(leafTextureName, color, size)
    {
        //Load the texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(leafTextureName);

        //Create the material
        this.particleMaterial = new THREE.PointsMaterial({
            size: size, vertexColors: THREE.VertexColors,
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            opacity: 1, depthWrite: false});
    }

    //Generate individual particles
    generateParticles(numParticles, radius, heightSegments)
    {
        //is a set of booleans to check if a leaf is falling
        this.falling = []

        //original location is used to restore the leaves' location after they fall 
        this.originalLocation = [];
        for(var i = 0; i < numParticles; i++)
        {
            //Generate a random location for each particle
            var randomWidth = Math.random() * radius * 2 - radius;
            var randomHeight = Math.random() * heightSegments * 2 - heightSegments;

            // set the random location of particles
            var x = randomWidth * 10;
            var y = randomHeight / 10;
            var z = randomWidth * 10;

            var particle = new THREE.Vector3(x, y, z);
            this.particles.vertices.push(particle);
            
            // Calculate the direction vectors as well (used for falling)
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

            //If the particle is already falling
            if(this.falling[i] === true)
            {
                // get the particle
                var vertex = vertices[i];

                // update the position
                vertex.y -= 0.5;
                vertex.x -= this.wind;

                //Check if out of bounds and plave it back
                if(vertex.y < -worldWidth)
                {
                    vertex.x = this.originalLocation[i].x;
                    vertex.y = this.originalLocation[i].y;
                    vertex.z = this.originalLocation[i].z;
                    this.falling[i] = false;
                }
            }
            else
            {
                //Randomize whether or not the particle falls if the particle isn't already failling
                if(Math.random()/vertices.length < 0.00005)
                {
                    this.falling[i] = true;
                }
            }
        }

        //update the mesh's geometry and material
        this.system.geometry.verticesNeedUpdate = true;
    }
}

class Cloud
{
    //Takes in the scene, number of particles and the texture name
    constructor(scene, numParticles, textureName)
    {
        this.scene = scene;

        //Set how fast the clouds move
        this.cloudSpeed = Math.random() * 1 + 1.5;
        
        //Set the particle's geometry - will add vertices later
        this.particles = new THREE.Geometry();

        //Generate the material for each particle
        this.setParticleMaterial(textureName, 0xffffff, 10)

        //Generate the vertices
        this.generateParticles(numParticles);

        //Create the particle system
        this.generateParticleSystem();

        //Randomize where the cloud is located
        this.system.position.x = Math.random() * 600 - 300;
        this.system.position.y = Math.random() * 300;
        this.system.position.z = Math.random() * 1500 - 750;

        //Add the cloud to the scene
        this.scene.add(this.system);
    }

    //Sets the particles to some material
    setParticleMaterial(textureName, color, size)
    {
        //Load the texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        //Create the particle material
        this.particleMaterial = new THREE.PointsMaterial({color: color, size: size, 
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false });
    }

    //Generate individual particles
    generateParticles(numParticles)
    {
        //Generate each particle near each other
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

    //Updates the cloud's position
    update() {
        //Give an swaying effect by rotating the system
        this.system.rotation.x += 0.001;
        this.system.rotation.y += 0.001;

        //Make the clouds move foward in the scene
        this.system.position.z -= this.cloudSpeed;

        //Reset the cloud's position if the clouds go to far out
        if(this.system.position.z < -worldWidth)
            this.system.position.z = worldWidth;

        // flag to update the geometry
        this.system.geometry.verticesNeedUpdate = true;
    }
}

class Sky
{
    //Sky dome takes in the scene and texture
    constructor(scene, textureName)
    {
        //Create a geometry (sphere for the dome)
        var skyGeometry = new THREE.SphereGeometry(500, 50, 50);
        
        //Load the texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);

        //Generate the material - note we flip the material inside out because we are inside this dome
        var skyMaterial = new THREE.MeshBasicMaterial({map: texture, side: THREE.BackSide});

        //Create the mesh
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);

        //Add the key to the scene
        scene.add(this.sky);
    }

    update()
    {
        //Create a slight rotation to the sky to make it feel as if the sky was moving :)
        this.sky.rotateY(-Math.PI / 5000);

        //Update the mesh's position
        this.sky.geometry.verticesNeedUpdate = true;
    }
}

class Sea
{
    //Takes in the scene
    constructor(scene)
    {
        //Create a clock to tsee how much time has elapsed
        this.clock = new THREE.Clock(true);

        //Create a plane geometry for the sea
        this.seaGeometry = new THREE.PlaneGeometry( 
            worldWidth, worldLength, widthSegments, heightSegments);

        this.seaGeometry.rotateX( - Math.PI / 2 );

        //Load the texture
        var loader = new THREE.TextureLoader();
        
        var texture = loader.load("images/sea.jpg");
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);
        
        //Create the sea material
        var seaMaterial = new THREE.MeshBasicMaterial( { color: 0x0044ff, map: texture } );
        
        //Create the sea mesh
        this.seaMesh = new THREE.Mesh(this.seaGeometry, seaMaterial );

        //Add the mesh to the scene
        scene.add(this.seaMesh);
    }

    update()
    {
        //Make the sea sway up and down by moving the vertices
        for (var i = 0; i < this.seaGeometry.vertices.length; i++ ) 
        {
            var vertex = this.seaGeometry.vertices[i];

            //Played with this y to get the effect desired
            //Used Math.sin to generate a sin wave for the vertices
            vertex.y = 2 * Math.sin( i / 10 
                + this.clock.getElapsedTime() + vertex.x/10 + vertex.z/10);
        }

        //Update the sea mesh
        this.seaMesh.geometry.verticesNeedUpdate = true;
    }
}

class Firework
{
    //Takes in scene, number of particles in the firework, radius of the particle, and texture name 
    constructor(scene, numParticles, radius, textureName)
    {
        this.scene = scene;
        this.numParticles = numParticles;
        this.radius = radius;
        this.textureName = textureName;

        //Clock used for velocity calculation
        this.clock = new THREE.Clock(true);

        //Call the generate function
        this.CreateAFireWork();
    }

    CreateAFireWork()
    {
        //Reset the clock
        this.startTime = this.clock.getElapsedTime();
        this.currentTime = this.clock.getElapsedTime() - this.startTime;

        //Generate the geometry
        this.particles = new THREE.Geometry();

        //Generate the particle material
        this.setParticleMaterial(this.textureName, 0xff00ff, 10)

        //Generate the vertices of the particles
        this.generateParticles(this.numParticles, this.radius);

        //Generate the particle system
        this.generateParticleSystem();

        //Randomize the particle system's location
        this.system.position.set( (Math.random() * this.numParticles * 0.5) - this.numParticles * 0.25, 
            Math.random() * 10, (Math.random() * this.numParticles * 0.5) - this.numParticles * 0.25);
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
        //Load the texture
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin(true);
        var texture = loader.load(textureName);

        //Create the material
        this.particleMaterial = new THREE.PointsMaterial({
            size: size, vertexColors: THREE.VertexColors,
            map: texture, blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false});
    }

    //Generate individual particles
    generateParticles(numParticles, radius)
    {
        this.directionVec = [];
        for(var i = 0; i < numParticles; i++)
        {
            // random location
            var x = Math.random() * radius - (radius/2);
            var y = Math.random() * radius - (radius/2);
            var z = Math.random() * radius - (radius/2);
            var particle = new THREE.Vector3(x, y, z);
            this.particles.vertices.push(particle);
            
            // Calculate the direction vectors as well (used for explosion)
            this.directionVec[i] = new THREE.Vector3(x, y, z);

            // add blank colors (will change later)
            var color = new THREE.Color();
            this.particles.colors.push(color);
        }
    }

    //Generates a particle system after creating particles
    generateParticleSystem()
    {
        this.system = new THREE.Points(this.particles, this.particleMaterial);
    }

    //Note: the explosion timer is used for both the launching of the firework and explosion of the firework
    update() {
        //Time elapsed since the start of the firework
        this.currentTime = this.clock.getElapsedTime() - this.startTime;

        //Check if the firework should explode
        if(this.explosionTimer > this.explosionTotalTimer && !this.explosionBool)
        {
            //Start the explosion
            this.explosionBool = true;
            //reset the timer
            this.explosionTimer = 0;
        }
        //Check if the explosion is done (reset the firework)
        else if(this.explosionTimer > this.explosionTotalTimer && this.explosionBool)
        {
            //We are done with this particle system, remove and recreate
            this.scene.remove(this.system);
            this.CreateAFireWork();
        }

        //Check if this firework should be exploding
        if(this.explosionBool)
        {
            //Check if we are done with explosion
            if(this.explosionTimer > this.explosionTotalTimer)
            {
                //Start the explosion
                this.explosionBool = true;
                //reset the timer
                this.explosionTimer = 0;
            }

            //the ratio between the start of the explosion and the end of the explosion time
            var timeRatio = this.explosionTimer/this.explosionTotalTimer;
            
            //make the particles scatter
            var vertices = this.system.geometry.vertices;
            for (var i = 0; i < vertices.length; i++) 
            {
                // get the particle
                var vertex = vertices[i];

                // update the position based on the direction vector away from the center
                vertex.x += this.directionVec[i].x * this.currentTime / 4;
                vertex.y += this.directionVec[i].y * this.currentTime / 4;
                vertex.z += this.directionVec[i].z * this.currentTime / 4;
            }

            //update the color too
            var colors = this.system.geometry.colors;
            for (var i = 0; i < colors.length; i++) 
            {
                //Change the color (Messed with this to generate a bright color)
                var newColor = new THREE.Color(((1 - timeRatio) + Math.random())/2, timeRatio, timeRatio);

                colors[i] = newColor;
            }

            // Change opacity and size
            this.system.material.opacity = 1 - timeRatio;
            this.system.material.size = Math.sqrt(this.radius) * (1 - timeRatio);

            //Update the timer
            this.explosionTimer += this.currentTime;
        }
        //If the firework isn't exploding, then the firework should be moving up
        else
        {
            //the ratio between the start of the explosion and the end of the explosion time
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
                //Change the color (Messed with this to generate a bright color)
                var newColor = new THREE.Color((1 - timeRatio), timeRatio, timeRatio);

                colors[i] = newColor;
            }

            // Change opacity and size
            this.system.material.opacity = 1 - timeRatio;
            this.system.material.size = (Math.sqrt(this.radius)/2) * (1 - timeRatio);

            //Update the timer
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

//add a directional light to illumiate the scene a bit(cheap)
var directionLight = new THREE.DirectionalLight(0xffffff, 0.2);
scene.scene.add(directionLight);

//Moon
var moon = new Moon(scene.scene, "images/moon.jpg");

//Sky
var sky = new Sky(scene.scene, "images/skydome.png");

//Mountain
var mountain = new Mountain(scene.scene);

//Sea
var sea = new Sea(scene.scene);

//add a particle system for leaf blowing simulation
var leaves = new ParticleSystem(scene.scene, 1000, "images/sakura.png");

//Array of clouds
var clouds = [];
for(var i = 0; i < 5; i++)
{
    clouds[i] = new Cloud(scene.scene, Math.random() * 1000 + 100, "images/cloud.jpg");
}

//Array of fireworks
var fireworks = [];
for(var i = 0; i < 5; i++)
{
    fireworks[i] = new Firework(scene.scene, Math.random() * 1000 + 200, 10, "images/particle1.png");
}

//Array of trees
var trees = [];
for(var i = 0; i < 10; i++)
{
    var point = mountain.GetRandomPoint();
    trees[i] = new Tree(point.x, point.y, point.z, scene.scene, 25, 
        "images/tree.jpg", "images/sakura.png");
}


//******************Start rendering the scene********************//

//start the call to draw each frame
if ( WEBVR.isAvailable() === false ) 
{
    DrawFrame();
}
else
{
     scene.effect.requestAnimationFrame(DrawFrame);
}

//Render function
function DrawFrame() {
    if ( WEBVR.isAvailable() === false ) 
    {
        //update each frame
        requestAnimationFrame(DrawFrame);
    }
    else
    {
        scene.effect.requestAnimationFrame(DrawFrame);
    }

    //******************UPDATE MESH********************//

    //moon
    moon.update();

    //sky
    sky.update();

    //sea
    sea.update();

    //leaves
    leaves.update();

    //Array of clouds
    for(var i = 0; i < clouds.length; i++)
    {
        clouds[i].update();
    }

    //Array of fireworks
    for(var i = 0; i < fireworks.length; i++)
    {
        fireworks[i].update();
    }

    //Array of trees
    for(var i = 0; i < trees.length; i++)
    {
        trees[i].update();
    }

    //******************END OF UPDATE MESH********************//

    //render the scene and switch buffer
    if ( WEBVR.isAvailable() === false ) {
        scene.renderer.render(scene.scene, scene.camera);
    }
    else
    {
        //Update the VR controls
        scene.controls.update();

        scene.effect.render(scene.scene, scene.camera);
    }
}

//resize window if necessary
window.addEventListener( 'resize', function () {
    this.scene.camera.aspect = window.innerWidth / window.innerHeight;
    this.scene.camera.updateProjectionMatrix();
    this.scene.renderer.setSize( window.innerWidth, window.innerHeight );
}, false );