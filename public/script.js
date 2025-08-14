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

    // Theme Toggle
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
                    
                    // Stop and reset timer
                    clearInterval(recordingTimer);
                    timerDisplay.textContent = '00:00';
                    
                    // Keep the stream active for potential new recordings
                    audioPlayer.play().catch(e => console.log('Auto-play prevented:', e));
                };

                // Start recording
                mediaRecorder.start(1000); // Collect data every second
                isRecording = true;
                recordButton.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
                recordButton.classList.add('recording');
                
                // Start timer
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

    // Handle form submission
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('textFeedback', document.getElementById('text-feedback').value);

        if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            formData.append('audioFeedback', audioBlob, 'recording.wav');
        }

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Feedback submitted successfully!');
                feedbackForm.reset();
                audioPlayer.src = '';
                loadFeedback();
            } else {
                throw new Error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error submitting feedback. Please try again.');
        }
    });

    // Load existing feedback
    async function loadFeedback() {
        try {
            const response = await fetch('/api/feedback');
            const feedback = await response.json();
            
            feedbackContainer.innerHTML = feedback.map(item => `
                <div class="feedback-item">
                    <h3>${item.name}</h3>
                    <div class="feedback-date">${new Date(item.createdAt).toLocaleDateString()}</div>
                    <div class="feedback-text">${item.textFeedback}</div>
                    ${item.audioFeedback ? `
                        <audio controls src="/uploads/${item.audioFeedback.split('/').pop()}"></audio>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading feedback:', error);
        }
    }

    // Load initial feedback
    loadFeedback();
});
