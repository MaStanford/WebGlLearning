/**
 * Load dependencies
 */
loadScript(["phoenixVisualizer/webgl-utils.js", "phoenixVisualizer/webgl-debug.js", "phoenixVisualizer/J3DI.js", "phoenixVisualizer/J3DIMath.js"]);

function loadScript(urlList, callback) {
	// Adding the script tag to the head as suggested before
	var head = document.getElementsByTagName('head')[0];
	for ( i = 0; i < urlList.length; i++) {
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = urlList[i];

		// Then bind the event to the callback function.
		// There are several events for cross browser compatibility.
		script.onreadystatechange = callback;
		script.onload = callback;

		// Fire the loading
		head.appendChild(script);
	}
}

var audioCtx = {};
var analyser = {};
var audio = {};
var url = '';
var source = {};
var drawables = [];
var isAudioInit = false;

/**
 * Drawable to draw to screen.
 */
function drawable(shape, artworkUrl) {
	this.shape = {};

	if (artworkUrl) {
		this.artworkUrl = artworkUrl;
	} else {
		this.artworkUrl = "https://i.imgur.com/tVn635T.png";
	}

	this.x = Math.random() - .5;
	this.y = Math.random() - .5;
	this.z = Math.random() - .5;
	this.canvasid = '';
	this.directionSpin = true;
	this.directionTilt = true;
	this.currentSpin = 0;
	this.currentTilt = 0;
	this.incTilt = 0.5;
	this.incSpin = 0.5;
	this.texture = 0;
	this.mvMatrix = new J3DIMatrix4();
	this.mvMatrix.translate(this.x, this.y, 0);
	this.u_normalMatrixLoc = 0;
	this.normalMatrix = new J3DIMatrix4();
	this.u_modelViewProjMatrixLoc = 0;
	this.mvpMatrix = new J3DIMatrix4();
	this.perspectiveMatrix = new J3DIMatrix4();
	this.perspectiveMatrix.perspective(30, canvas.clientWidth / canvas.clientHeight, 1, 10000);
	this.perspectiveMatrix.lookat(0, 0, 7, 0, 0, 0, 0, 1, 0);

	// Create a shape. On return 'gl' contains a 'box' property with
	// the BufferObjects containing the arrays for vertices,
	// normals, texture coords, and indices.
	switch(shape) {
	case 0:
		this.shape = makeBox(gl);
		break;
	case 1:
		this.shape = makeSphere(gl);
		break;
	default:
		this.shape = makeBox(gl);
		break;
	}

	// Load an image to use. Returns a WebGLTexture object
	this.texture = loadImageTexture(gl, this.artworkUrl);
};

/**
 * Draw function will draw the buffers to screen
 */
drawable.prototype.draw = function(gl, average) {

	var program = simpleSetup(gl,
	// The ids of the vertex and fragment shaders
	"vshader", "fshader",
	// The vertex attribute names used by the shaders.
	// The order they appear here corresponds to their index
	// used later.
	["vNormal", "vColor", "vPosition"],
	// The clear color and depth values
	[0, 0, 0.5, 1], 10000);

	// Set some uniform variables for the shaders
	gl.uniform3f(gl.getUniformLocation(program, "lightDir"), 0, 0, 1);
	gl.uniform1i(gl.getUniformLocation(program, "sampler2d"), 0);

	// Get shader location
	this.u_normalMatrixLoc = gl.getUniformLocation(program, "u_normalMatrix");
	this.u_modelViewProjMatrixLoc = gl.getUniformLocation(program, "u_modelViewProjMatrix");

	// Enable all of the vertex attribute arrays.
	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);
	gl.enableVertexAttribArray(2);

	// Set up all the vertex attributes for vertices, normals and texCoords
	gl.bindBuffer(gl.ARRAY_BUFFER, this.shape.vertexObject);
	gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.shape.normalObject);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.shape.texCoordObject);
	gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

	// Bind the index array
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.shape.indexObject);

	// Make a model/view matrix.
	this.mvMatrix.makeIdentity();
	this.mvMatrix.rotate(20, 0, 0, 0);
	this.mvMatrix.rotate(this.currentSpin, 0, .5, 0);
	this.mvMatrix.rotate(this.currentTilt, .5, 0, 0);
	this.mvMatrix.scale(average/2 + 1, average/2 + 1, average/2 + 1);
	this.mvMatrix.translate(this.x + this.x, this.y + this.y, this.z + this.z);

	// Construct the normal matrix from the model-view matrix and pass it in
	this.normalMatrix.load(this.mvMatrix);
	this.normalMatrix.invert();
	this.normalMatrix.transpose();
	this.normalMatrix.setUniform(gl, this.u_normalMatrixLoc, false);

	// Construct the model-view * projection matrix and pass it in
	this.mvpMatrix.load(this.perspectiveMatrix);
	this.mvpMatrix.multiply(this.mvMatrix);
	this.mvpMatrix.scale(.5, .5, .5);
	this.mvpMatrix.setUniform(gl, this.u_modelViewProjMatrixLoc, false);

	// Bind the texture to use
	gl.bindTexture(gl.TEXTURE_2D, this.texture);

	// Draw the cube
	gl.drawElements(gl.TRIANGLES, this.shape.numIndices, gl.UNSIGNED_BYTE, 0);

	//Get the angle of the dangle
	if (this.directionSpin) {
		this.currentSpin += this.incSpin;
	} else {
		this.currentSpin -= this.incSpin;
	}

	if (this.directionTilt) {
		this.currentTilt += this.incTilt;
	} else {
		this.currentTilt -= this.incTilt;
	}

	//Reset if the dangle has too much angle
	if (this.currentSpin > 360) {
		this.currentSpin -= 360;
	} else if (this.currentSpin < -360) {
		this.currentSpin += 360;
	}

	//Reset if the dangle has too much angle
	if (this.currentTilt > 360) {
		this.currentTilt += 360;
	} else if (this.currentTilt < -360) {
		this.currentTilt -= 360;
	}
};

/**
 * The launch point for our visualizer.
 * Pass in the canvas id.
 */
function start(canvasName) {

	canvas = document.getElementById(canvasName);

	registerElementMouseDrag(canvas);

	canvas.addEventListener('webglcontextlost', handleContextLost, false);
	canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

	var gl = initCanvas(canvasName);

	if (!gl) {
		return;
	}

	framerate = new Framerate("framerate");

	var draw = function() {
		drawPicture(gl, canvasName);
		requestId = window.requestAnimFrame(draw, canvas);
	};

	draw();

	addShape(0, null);

	function handleContextLost(e) {
		e.preventDefault();
		clearLoadingImages();
		if (requestId !== undefined) {
			window.cancelAnimFrame(requestId);
			requestId = undefined;
		}
	}

	function handleContextRestored() {
		initCanvas(canvasName);
		draw();
	}

}

/**
 * Sets up the webgl context
 */
function initCanvas(canvasid) {
	// Initialize
	var gl = initWebGL(canvasid);
	if (!gl) {
		return;
	}

	var program = simpleSetup(gl,
	// The ids of the vertex and fragment shaders
	"vshader", "fshader",
	// The vertex attribute names used by the shaders.
	// The order they appear here corresponds to their index
	// used later.
	["vNormal", "vColor", "vPosition"],
	// The clear color and depth values
	[0, 0, 0.5, 1], 10000);

	// Make sure the canvas is sized correctly.
	reshape(gl, canvasid);

	return gl;
}

var requestId;

/**
 * Resets the lookat, perspective and canvas.
 */
function reshape(gl, canvasid) {

	// change the size of the canvas's backing store to match the size it is displayed.
	var canvas = document.getElementById(canvasid);

	if (canvas.clientWidth == canvas.width && canvas.clientHeight == canvas.height)
		return;

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	// Set the viewport and projection matrix for the scene
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

	for ( i = 0; i < drawables.length; i++) {
		drawables[i].perspectiveMatrix = new J3DIMatrix4();
		drawables[i].perspectiveMatrix.perspective(30, canvas.clientWidth / canvas.clientHeight, 1, 10000);
		drawables[i].perspectiveMatrix.lookat(0, 0, 7, 0, 0, 0, 0, 1, 0);
	}
}

/**
 * Contains the loop to grab audio data and draw shapes.
 *
 * This should be called by the animation callback.
 */
function drawPicture(gl, canvasid) {
	var average = 1.0;
	if(isAudioInit){
		//Get the audio data
		var bufferLength = analyser.frequencyBinCount;

		var dataArray = new Float32Array(bufferLength);

		analyser.getFloatTimeDomainData(dataArray);

		var total = 0;

		for ( i = 0; i < bufferLength; i++) {
			total += Math.abs(dataArray[i]);
		}

		average = total / bufferLength;
	}

	// Clear the canvas
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Show the framerate
	framerate.snapshot();

	for ( i = 0; i < drawables.length; i++) {
		drawables[i].draw(gl, average);
	}
}

/**
 * This is called by a click on the canvas, new chrome rules say that audio cannot auto play until interaction.
 * Gets the refernces to the audio context and creates an audio object and analyser.
 */
function initAudio() {
	if(!isAudioInit){
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		analyser = initAnalyser();
		audio = document.querySelector('audio');//new Audio();
		audio.crossOrigin = "anonymous";
		source = audioCtx.createMediaElementSource(audio);
		source.connect(analyser);
		source.connect(audioCtx.createGain());
		analyser.connect(audioCtx.destination);
		changeTrack('https://vignette.wikia.nocookie.net/central/images/7/75/Rayman_Music_-_Main_Theme.ogg/revision/latest?cb=20170917040941');
		isAudioInit = true;
	}
}

function initAnalyser() {
	var analyser = audioCtx.createAnalyser();
	analyser.ftt = 200;
	analyser.fftSize = 2048;
	analyser.smoothingTimeConstant = 0;
	analyser.maxDecibels = 0;
	analyser.minDecibels = -80;
	return analyser;
}

/**
 * Changes the currently playing track
 * @param {Object} newUrl
 */
function changeTrack(newUrl) {
	audio.src = newUrl;
	this.playTrack();
	return audio.src;
}

/**
 * Stops the currently playing track
 */
function stopTrack() {
	return source.mediaElement.stop();
}

/**
 * Plays the track set by changeTrack
 */
function playTrack() {
	source.mediaElement.play();
	return source.mediaElement;
}

/**
 * Register an element for our mouse move listeners.
 */
function registerElementMouseDrag(element) {

	flag = 0;

	element.addEventListener("mousemove", function(e) {
		if (flag === 1) {
			getClickPosition(e);
		}
	}, false);
	element.addEventListener("mousedown", function(e) {
		flag = 1;
		xPrevPos = 0;
		yPrevPos = 0;
	}, false);
	element.addEventListener("mouseup", function(e) {
		flag = 0;
	}, false);
	element.addEventListener("mouseout", function(e) {
		flag = 0;
	}, false);
}

var xPrevPos = 0;
var yPrevPos = 0;

/**
 * Get's the current click position and moves the angle.
 */
function getClickPosition(e) {

	var parentPosition = getPosition(e.currentTarget);
	var xPosition = e.clientX - parentPosition.x;
	var yPosition = e.clientY - parentPosition.y;
	var xHolder = xPosition;
	var yHolder = yPosition;

	if (xPrevPos === 0) {
		xPrevPos = xPosition;
	}

	if (yPrevPos === 0) {
		yPrevPos = yPosition;
	}

	//Get the right way the drag was
	xPosition -= xPrevPos;
	yPosition -= yPrevPos;

	//Change direction if we swipe
	if (xPosition > 0) {
		drawables[0].directionSpin = true;
	} else {
		drawables[0].directionSpin = false;
	}

	//Change direction if we swipe
	if (yPosition > 0) {
		drawables[0].directionTilt = true;
	} else {
		drawables[0].directionTilt = false;
	}

	//Get some of the edge off
	xPosition *= .10;
	yPosition *= .10;

	//Change the angle of the dangle.
	drawables[0].currentSpin += xPosition;
	drawables[0].currentTilt += yPosition;

	//Set up for next round
	xPrevPos = xHolder;
	yPrevPos = yHolder;
}

/**
 * Traverses the element tree to figure out the location of the click.
 *
 */
function getPosition(element) {
	var xPosition = 0;
	var yPosition = 0;

	while (element) {
		xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
		yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
		element = element.offsetParent;
	}
	return {
		x : xPosition,
		y : yPosition
	};
}

/**
 * Adds a shape to the draw list.
 * shapetype - 0 = box 1 = sphere, artworkUrl is the texture url.
 */
function addShape(shapeType, artworkUrl) {
	drawables.push(new drawable(shapeType, artworkUrl));
}

/**
 * This is not needed.
 * The LoadImageTexture is exactly the same as this.
 *
 * @param {Object} url
 */
function loadCrossOriginImage(url) {
	if (!url) {
		return;
	}
	var img = new Image();
	img.crossOrigin = url;
	img.src = url;
	images.push(img);
}
