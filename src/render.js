const { desktopCapturer, remote } = require('electron');

const { writeFile } = require('fs');

const { dialog, Menu } = remote;

// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');
const videoContainer = document.getElementById('video-container');
const videoOverlay = document.getElementById('video-overlay');
const pauseIcon = document.getElementById('pause-icon');

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

const recordBtn = document.getElementById('recordBtn');
recordBtn.onclick = e => {
    if (mediaRecorder.state === "recording" || mediaRecorder.state === "paused") {
        if (mediaRecorder.state === "paused") {
            videoOverlay.classList.remove('video-filter'); 
            pauseIcon.classList.add('hidden');
        }
        mediaRecorder.stop();
        recordBtn.classList.remove('is-danger');
        videoElement.classList.remove('recording');
        recordBtn.innerText = 'Start';
        pauseBtn.disabled = true;
    } else {
        recordedChunks.length = 0;
        mediaRecorder.start();
        recordBtn.classList.add('is-danger');
        videoElement.classList.add('recording');
        recordBtn.innerText = 'Stop';
        pauseBtn.disabled = false;
    }
};

const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.onclick = e => {
    if (mediaRecorder.state === "recording") {
        mediaRecorder.pause();
        pauseBtn.innerText = 'Resume';
        videoOverlay.classList.add('video-filter');
        pauseIcon.classList.remove('hidden');
    } else if (mediaRecorder.state === "paused") {
        mediaRecorder.resume();
        pauseBtn.innerText = 'Pause';
        videoOverlay.classList.remove('video-filter'); 
        pauseIcon.classList.add('hidden');
    }
};

// Get the available video sources
async function getVideoSources() {
    const inputSources = await desktopCapturer.getSources({
        types: ['window', 'screen']
    });

    const videoOptionsMenu = Menu.buildFromTemplate(
        inputSources.map(source => {
            return {
                label: source.name,
                click: () => selectSource(source)
            };
        })
    );


    videoOptionsMenu.popup();
}

// Change the videoSource window to record
async function selectSource(source) {
    // if (mediaRecorder != null) {
    //     if (mediaRecorder.state === "recording" || mediaRecorder.state === "paused") {
    //         // stop existing stream
    //         mediaRecorder.stop();
    //     }
    // }

    videoSelectBtn.innerText = source.name;

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
            }
        }
    };

    // Create a Stream
    const stream = await navigator.mediaDevices
        .getUserMedia(constraints);

    // Preview the source in a video element
    videoElement.srcObject = stream;
    videoElement.play();

    // Create the Media Recorder
    const options = { mimeType: 'video/webm; codecs=vp9' };
    
    mediaRecorder = new MediaRecorder(stream, options);

    // Register Event Handlers
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;

    // Updates the UI
}

// Captures all recorded chunks
function handleDataAvailable(e) {
    console.log('video data available');
    recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save video',
        defaultPath: `vid-${Date.now()}.webm`
    });

    if (filePath) {
        writeFile(filePath, buffer, () => console.log('video saved successfully!'));
    }

}