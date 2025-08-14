import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://siddhardhadeverakonda:d3yWDHDjqtKVTVyP@podcastfeedback.8jh7hy7.mongodb.net/?retryWrites=true&w=majority&appName=PodcastFeedback";
const client = new MongoClient(uri);

export async function connectDB() {
    try {
        await client.connect();
        const db = client.db('podcast-feedback');
        return {
            feedbacks: db.collection('feedbacks'),
            audioFiles: db.collection('audioFiles')
        };
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

export async function storeAudio(audioBuffer, filename) {
    const { audioFiles } = await connectDB();
    return audioFiles.insertOne({
        filename,
        audio: audioBuffer,
        uploadDate: new Date()
    });
}

export async function storeFeedback(text, audioId = null) {
    const { feedbacks } = await connectDB();
    return feedbacks.insertOne({
        text,
        audioId,
        createdAt: new Date()
    });
}
