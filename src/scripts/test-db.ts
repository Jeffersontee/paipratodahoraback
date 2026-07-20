import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUri = process.env.DEV_DB_URI;
console.log('Testing connection to DB URI:', dbUri);

if (!dbUri) {
    console.error('DEV_DB_URI is not defined in .env file!');
    process.exit(1);
}

mongoose.connect(dbUri)
    .then(() => {
        console.log('Successfully connected to MongoDB!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });
