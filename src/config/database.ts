import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/bravo_instalacoes';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(' Conectado ao MongoDB com sucesso.');
  } catch (error) {
    console.error(' Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}
