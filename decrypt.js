import crypto from 'crypto';
import process from 'process';

const base64Data = process.argv[2];
const keyHex = "C5D58EF67A7584E4A29F6C35BBC4EB12";

if (!base64Data) {
    console.error("Missing ciphertext");
    process.exit(1);
}

try {
    const key = Buffer.from(keyHex, 'hex');
    const encryptedBuffer = Buffer.from(base64Data, 'base64');
    
    // The first 16 bytes are the IV
    const iv = encryptedBuffer.subarray(0, 16);
    const ciphertext = encryptedBuffer.subarray(16);
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log(decrypted);
} catch (e) {
    console.error("Decryption failed:", e.message);
    process.exit(1);
}
