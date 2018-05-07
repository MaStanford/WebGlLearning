This is a visualizer in WebGl using the Audio API. 

npm install

npm start

New auto play rules in Chrome means you need to click the window to allow the audio to init.

If not started, then try start('main');

Add a shape, using the url of the album art. Ex. addShape(0, 'https://i.imgur.com/Pidaux7.jpg');

Play a track by calling changeTrack(). Ex. changeTrack('https://vignette.wikia.nocookie.net/central/images/7/75/Rayman_Music_-_Main_Theme.ogg/revision/latest?cb=20170917040941');

Mouse drags move the object, audio from the analyzer also changes the audio