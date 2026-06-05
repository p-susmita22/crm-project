import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = "mongodb+srv://paridasusmita2003_db_user:1MpzTO5Fun6Y7R0g@cluster0.1mcctnt.mongodb.net/crm_db?retryWrites=true&w=majority";

async function backup() {
  try {
    await mongoose.connect(MONGO_URI);
    const customerSchema = new mongoose.Schema({}, { strict: false });
    const Customer = mongoose.model('Customer', customerSchema, 'customers');

    const customers = await Customer.find({});
    
    const backupPath = path.join(__dirname, 'customers_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(customers, null, 2));
    
    console.log(`Backup completed successfully. Saved to ${backupPath}`);
  } catch (error) {
    console.error('Backup failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

backup();
