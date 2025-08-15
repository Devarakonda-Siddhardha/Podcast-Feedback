let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingTimer;
let startTime;
let currentStream = null;

document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('record');
    const audioPlayer = document.getElementById('audio-player');
    const feedbackForm = document.getElementById('feedback');
    const timerDisplay = document.getElementById('recording-timer');
    const themeToggle = document.getElementById('theme-toggle');
    const clearRecordingButton = document.getElementById('clear-recording');

    // ******* PASTE YOUR APPS SCRIPT URL HERE *******
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDLKdmB-3DQyYA3JJLInb2SCIz_5uXwuqIw3dWPllsrNIKfar9FLyhHKXZT3E7UKML/exec";
    // ***********************************************

    // Theme Toggle (unchanged)
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });

    function updateTimer() {
        const now = Date.now();
        const duration = now - startTime;
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / 1000 / 60) % 60);
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Clear recording
    clearRecordingButton.addEventListener('click', () => {
        audioPlayer.src = '';
        audioChunks = [];
        clearRecordingButton.style.display = 'none';
        audioPlayer.style.display = 'none';
    });

    // Handle recording
    recordButton.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
                
                currentStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
                
                mediaRecorder = new MediaRecorder(currentStream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPlayer.src = audioUrl;
                    audioPlayer.style.display = 'block';
                    clearRecordingButton.style.display = 'inline-block';

                    clearInterval(recordingTimer);
                    timerDisplay.textContent = '00:00';
                    audioPlayer.play().catch(() => {});
                };

                mediaRecorder.start(1000); // gather chunks each second
                isRecording = true;
                recordButton.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
                recordButton.classList.add('recording');

                startTime = Date.now();
                recordingTimer = setInterval(updateTimer, 1000);
                audioPlayer.style.display = 'none';
                clearRecordingButton.style.display = 'none';
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Could not access microphone. Please check permissions.');
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
            recordButton.innerHTML = '<i class="fas fa-microphone"></i> Start Recording';
            recordButton.classList.remove('recording');
        }
    });

    // Convert blob to base64 (no prefix)
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Handle form submission -> send to Google Apps Script
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const textFeedback = document.getElementById('text-feedback').value;

        let audioBase64 = "";
        if (audioChunks.length > 0) {
            const webmBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioBase64 = await blobToBase64(webmBlob);
        }

        const formData = new URLSearchParams();
        formData.append('name', name);
        formData.append('textFeedback', textFeedback);
        formData.append('audio', audioBase64);

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Feedback submitted successfully!');
                feedbackForm.reset();
                audioPlayer.src = '';
                audioChunks = [];
            } else {
                throw new Error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error submitting feedback. Please try again.');
        }
    });

    // NOTE: Your previous loadFeedback() hit /api/feedback (no backend now).
    // You can remove it or later implement a doGet() in Apps Script to read Sheet data.
});
