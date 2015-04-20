window.addEventListener("load", function() {
	start();
});

var horizAspect = 480.0 / 640.0;

var gl;
// A global variable for the WebGL context

var squareRotation = 0.0;

var squareXOffset = 0.0;
var squareYOffset = 0.0;
var squareZOffset = 0.0;

var xIncValue = 0.2;
var yIncValue = -0.4;
var zIncValue = 0.3;

lastSquareUpdateTime = (new Date).getTime();

function initWebGL(canvas) {
	gl = null;

	try {
		// Try to grab the standard context. If it fails, fallback to experimental.
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	} catch(e) {
	}

	// If we don't have a GL context, give up now
	if (!gl) {
		alert("Unable to initialize WebGL. Your browser may not support it.");
		gl = null;
	}

	return gl;
}

function start() {
	canvas = document.getElementById("glcanvas");

	gl = initWebGL(canvas);
	// Initialize the GL context

	loadIdentity();

	if (gl) {
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.5, 0.0, 0.0, 1.0);
		// Set clear color to black, fully opaque
		gl.enable(gl.DEPTH_TEST);
		// Enable depth testing
		gl.depthFunc(gl.LEQUAL);
		// Near things obscure far things
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// Clear the color as well as the depth buffer.

		//Init the shaders
		initShaders();

		//Init the buffers
		initBuffers();

		//Draw the dam scene
		drawScene();
	}
}

function initShaders() {
	fragmentShader = getShader(gl, "shader-fs");
	vertexShader = getShader(gl, "shader-vs");

	// Create the shader program
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program.");
	}

	gl.useProgram(shaderProgram);

	vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(vertexPositionAttribute);

	vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(vertexColorAttribute);
}

function getShader(gl, id) {

	shaderScript = document.getElementById(id);

	if (!shaderScript) {
		return null;
	}

	theSource = "";
	currentChild = shaderScript.firstChild;

	while (currentChild) {
		if (currentChild.nodeType == currentChild.TEXT_NODE) {
			theSource += currentChild.textContent;
		}

		currentChild = currentChild.nextSibling;
	}

	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		// Unknown shader type
		return null;
	}
	gl.shaderSource(shader, theSource);

	// Compile the shader program
	gl.compileShader(shader);

	// See if it compiled successfully
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function initBuffers() {
	squareVerticesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);

	vertices = [1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	colors = [1.0, 1.0, 1.0, 1.0, // white
	1.0, 0.0, 0.0, 1.0, // red
	0.0, 1.0, 0.0, 1.0, // green
	0.0, 0.0, 1.0, 1.0 // blue
	];

	squareVerticesColorBuffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}

function drawScene() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mvPushMatrix();
	mvRotate(squareRotation, [1, 0, 1]);

	perspectiveMatrix = makePerspective(45, 640.0 / 480.0, 0.1, 100.0);

	loadIdentity();
	mvTranslate([-0.0, 0.0, -6.0]);

	gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer);
	gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	setMatrixUniforms();

	currentTime = (new Date).getTime();
	if (lastSquareUpdateTime) {
		delta = currentTime - lastSquareUpdateTime;

		squareRotation += (30 * delta) / 1000.0;
	}

	lastSquareUpdateTime = currentTime;

	squareXOffset += xIncValue * ((30 * delta) / 1000.0);
	squareYOffset += yIncValue * ((30 * delta) / 1000.0);
	squareZOffset += zIncValue * ((30 * delta) / 1000.0);

	if (Math.abs(squareYOffset) > 2.5) {
		xIncValue = -xIncValue;
		yIncValue = -yIncValue;
		zIncValue = -zIncValue;
	}

	mvTranslate([squareXOffset, squareYOffset, squareZOffset]);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function setMatrixUniforms() {
	pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

	mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}

function loadIdentity() {
	mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
	mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
	multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

var mvMatrixStack = [];

function mvPushMatrix(m) {
	if (m) {
		mvMatrixStack.push(m.dup());
		mvMatrix = m.dup();
	} else {
		mvMatrixStack.push(mvMatrix.dup());
	}
}

function mvPopMatrix() {
	if (!mvMatrixStack.length) {
		throw ("Can't pop from an empty matrix stack.");
	}

	mvMatrix = mvMatrixStack.pop();
	return mvMatrix;
}

function mvRotate(angle, v) {
	inRadians = angle * Math.PI / 180.0;

	m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
	multMatrix(m);
}