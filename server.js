const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { connectDB } = require('./db-config');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configure multer for audio uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Ensure data directory exists
const dataFile = path.join(__dirname, 'data', 'feedback.json');
const dataDir = path.join(__dirname, 'data');

async function initializeDataFile() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        try {
            await fs.access(dataFile);
        } catch {
            await fs.writeFile(dataFile, '[]');
        }
    } catch (error) {
        console.error('Error initializing data file:', error);
    }
}

initializeDataFile();

// Routes
app.post('/api/feedback', upload.single('audioFeedback'), async (req, res) => {
    try {
        const { feedbacks, audioFiles } = await connectDB();
        const feedback = req.body.feedback;
        
        // Save feedback to MongoDB
        const feedbackData = {
            feedback,
            timestamp: new Date(),
            audioFile: null
        };

        if (req.file) {
            const audioBuffer = await fs.readFile(req.file.path);
            const audioResult = await audioFiles.insertOne({
                filename: req.file.filename,
                data: audioBuffer,
                uploadDate: new Date()
            });
            feedbackData.audioFile = audioResult.insertedId;
            
            // Clean up the temporary file
            await fs.unlink(req.file.path);
        }

        const result = await feedbacks.insertOne(feedbackData);
        res.json({ success: true, id: result.insertedId });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ success: false, error: 'Failed to save feedback' });
    }
    try {
        const feedback = {
            id: Date.now().toString(),
            name: req.body.name,
            textFeedback: req.body.textFeedback,
            audioFeedback: req.file ? req.file.path : null,
            createdAt: new Date().toISOString()
        };

        const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
        data.push(feedback);
        await fs.writeFile(dataFile, JSON.stringify(data, null, 2));

        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Error submitting feedback' });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const data = await fs.readFile(dataFile, 'utf8');
        const feedback = JSON.parse(data);
        res.json(feedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
        console.error('Error reading feedback:', error);
        res.status(500).json({ error: 'Error fetching feedback' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
