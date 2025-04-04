const QRCode = require('qrcode');

async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text); // Generates a Base64 image
  } catch (err) {
    console.error('QR Code Generation Error:', err);
    return null;
  }
}

module.exports = { generateQRCode };
