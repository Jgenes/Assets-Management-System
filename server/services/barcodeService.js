const QRCode = require('qrcode');
const db = require('../db/database');

const barcodeService = {
  async generateAssetNumber(categoryCode = 'GEN') {
    const year = new Date().getFullYear();
    const prefixSetting = db.get("SELECT value FROM system_settings WHERE key = 'asset_number_prefix'");
    const prefix = prefixSetting ? prefixSetting.value : 'MoCU';
    const cleanCat = (categoryCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Find the latest sequence number for this category and year
    const likePattern = `${prefix}/${cleanCat}/${year}/%`;
    const lastAsset = db.get(`
      SELECT asset_number FROM assets
      WHERE asset_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `, [likePattern]);

    let seq = 1;
    if (lastAsset && lastAsset.asset_number) {
      const parts = lastAsset.asset_number.split('/');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    const paddedSeq = String(seq).padStart(6, '0');
    return `${prefix}/${cleanCat}/${year}/${paddedSeq}`;
  },

  generateBarcodeString(assetNumber) {
    // Code 128 standard uses alphanumeric without slashes or dashes
    // Format: MOCU-ICT-2026-000001
    return assetNumber.replace(/\//g, '-').toUpperCase();
  },

  async generateQrCodeDataUrl(payload) {
    try {
      return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 2,
        width: 256,
        color: {
          dark: '#0A2540',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
      throw err;
    }
  },

  async generateQrSvg(payload) {
    try {
      return await QRCode.toString(payload, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#0A2540',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('Error generating QR SVG:', err);
      throw err;
    }
  },

  isAssetNumberAvailable(assetNumber, excludeId = null) {
    let sql = 'SELECT id FROM assets WHERE asset_number = ?';
    const params = [assetNumber];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const existing = db.get(sql, params);
    return !existing;
  },

  isBarcodeAvailable(barcode, excludeId = null) {
    let sql = 'SELECT id FROM assets WHERE barcode = ?';
    const params = [barcode];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const existing = db.get(sql, params);
    return !existing;
  }
};

module.exports = barcodeService;
