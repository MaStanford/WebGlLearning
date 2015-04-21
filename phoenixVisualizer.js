var g = {};
var artwork = '';
var images = [];
var canvasid = '';
var directionSpin = true;
var directionTilt = true;
var currentSpin = 0;
var currentTilt = 0;
var incTilt = 0.1;
var incSpin = 0.5;

function init(artworkurl) {

	if (artworkurl) {
		artwork = artworkurl;
	} else {
		//Set the default here
		artwork = "resources/image.jpeg";
	}

	// Initialize
	var gl = initWebGL("example");
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

	// Set some uniform variables for the shaders
	gl.uniform3f(gl.getUniformLocation(program, "lightDir"), 0, 0, 1);
	gl.uniform1i(gl.getUniformLocation(program, "sampler2d"), 0);

	// Create a box. On return 'gl' contains a 'box' property with
	// the BufferObjects containing the arrays for vertices,
	// normals, texture coords, and indices.
	g.box = makeBox(gl);

	// Load an image to use. Returns a WebGLTexture object
	spiritTexture = loadImageTexture(gl, artwork);

	// Create some matrices to use later and save their locations in the shaders
	g.mvMatrix = new J3DIMatrix4();
	g.u_normalMatrixLoc = gl.getUniformLocation(program, "u_normalMatrix");
	g.normalMatrix = new J3DIMatrix4();
	g.u_modelViewProjMatrixLoc = gl.getUniformLocation(program, "u_modelViewProjMatrix");
	g.mvpMatrix = new J3DIMatrix4();

	// Enable all of the vertex attribute arrays.
	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);
	gl.enableVertexAttribArray(2);

	// Set up all the vertex attributes for vertices, normals and texCoords
	gl.bindBuffer(gl.ARRAY_BUFFER, g.box.vertexObject);
	gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, g.box.normalObject);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, g.box.texCoordObject);
	gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

	// Bind the index array
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.box.indexObject);

	return gl;
}

var requestId;

function reshape(gl) {
	// change the size of the canvas's backing store to match the size it is displayed.
	var canvas = document.getElementById(canvasid);
	if (canvas.clientWidth == canvas.width && canvas.clientHeight == canvas.height)
		return;

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	// Set the viewport and projection matrix for the scene
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
	g.perspectiveMatrix = new J3DIMatrix4();
	g.perspectiveMatrix.perspective(30, canvas.clientWidth / canvas.clientHeight, 1, 10000);
	g.perspectiveMatrix.lookat(0, 0, 7, 0, 0, 0, 0, 1, 0);
}

function drawPicture(gl) {
	// Make sure the canvas is sized correctly.
	reshape(gl);

	// Clear the canvas
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Make a model/view matrix.
	g.mvMatrix.makeIdentity();
	g.mvMatrix.rotate(20, 1, 0, 0);
	g.mvMatrix.rotate(currentSpin, 0, 1, 0);
	g.mvMatrix.rotate(currentTilt, 1, 0, 0);


	// Construct the normal matrix from the model-view matrix and pass it in
	g.normalMatrix.load(g.mvMatrix);
	g.normalMatrix.invert();
	g.normalMatrix.transpose();
	g.normalMatrix.setUniform(gl, g.u_normalMatrixLoc, false);

	// Construct the model-view * projection matrix and pass it in
	g.mvpMatrix.load(g.perspectiveMatrix);
	g.mvpMatrix.multiply(g.mvMatrix);
	g.mvpMatrix.setUniform(gl, g.u_modelViewProjMatrixLoc, false);

	// Bind the texture to use
	gl.bindTexture(gl.TEXTURE_2D, spiritTexture);

	// Draw the cube
	gl.drawElements(gl.TRIANGLES, g.box.numIndices, gl.UNSIGNED_BYTE, 0);

	// Show the framerate
	framerate.snapshot();

	//Get the angle of the dangle
	if (directionSpin) {
		currentSpin += incSpin;
	} else {
		currentSpin -= incSpin;
	}

	if (directionTilt) {
		currentTilt += incTilt;
	} else {
		currentTilt -= incTilt;
	}

	//Reset if the dangle has too much angle
	if (currentSpin > 360) {
		currentSpin -= 360;
	} else if (currentSpin < -360) {
		currentSpin += 360;
	}

	//Reset if the dangle has too much angle
	if (currentTilt > 360) {
		currentTilt -= 360;
	} else if (currentTilt < -360) {
		currentTilt += 360;
	}
}

/**
 * The launch point for our visualizer.
 * Pass in the canvas id.
 */
function start(canvas) {

	canvasid = canvas;
	var c = document.getElementById(canvasid);

	registerElementMouseDrag(document.getElementById("framerate"));

	registerElementMouseDrag(c);

	c.addEventListener('webglcontextlost', handleContextLost, false);
	c.addEventListener('webglcontextrestored', handleContextRestored, false);

	var gl = init();

	if (!gl) {
		return;
	}

	framerate = new Framerate("framerate");

	var f = function() {
		drawPicture(gl);
		requestId = window.requestAnimFrame(f, c);
	};

	f();

	function handleContextLost(e) {
		e.preventDefault();
		clearLoadingImages();
		if (requestId !== undefined) {
			window.cancelAnimFrame(requestId);
			requestId = undefined;
		}
	}

	function handleContextRestored() {
		init();
		f();
	}

}

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
		directionSpin = true;
	} else {
		directionSpin = false;
	}

	//Change direction if we swipe
	if (yPosition > 0) {
		directionTilt = true;
	} else {
		directionTilt = false;
	}

	//Get some of the edge off
	xPosition *= .10;
	yPosition *= .10;

	//Change the angle of the dangle.
	currentSpin += xPosition;
	currentTilt += yPosition;

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
 * Set the artwork Url for the current track.
 */
function setArtworkUrl(artworkurl) {
	init(artworkurl);
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
