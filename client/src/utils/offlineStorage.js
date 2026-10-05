const STORAGE_KEY = 'mocu_offline_verifications_queue';

export const offlineStorage = {
  getQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading offline queue:', e);
      return [];
    }
  },

  enqueue(scanRecord) {
    try {
      const queue = this.getQueue();
      // Check for duplicate scan of same barcode in local queue
      const existingIdx = queue.findIndex(item => item.barcode === scanRecord.barcode);
      const recordWithMeta = {
        ...scanRecord,
        localId: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        queuedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        // Update existing record in queue with newer scan
        queue[existingIdx] = recordWithMeta;
      } else {
        queue.push(recordWithMeta);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      return { success: true, queueCount: queue.length, record: recordWithMeta };
    } catch (e) {
      console.error('Error enqueuing offline scan:', e);
      return { success: false, error: e.message };
    }
  },

  remove(localId) {
    try {
      const queue = this.getQueue().filter(item => item.localId !== localId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      return queue.length;
    } catch (e) {
      console.error('Error removing scan:', e);
      return 0;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  async syncAll(apiClient) {
    const queue = this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0, errors: [] };

    let synced = 0;
    let failed = 0;
    const errors = [];
    const remainingQueue = [];

    for (const item of queue) {
      try {
        const payload = {
          barcode: item.barcode,
          campaign_id: item.campaign_id,
          scanned_campus_id: item.scanned_campus_id,
          scanned_building_id: item.scanned_building_id,
          scanned_room_id: item.scanned_room_id,
          scanned_department_id: item.scanned_department_id,
          condition: item.condition,
          remarks: item.remarks ? `[Offline Synced] ${item.remarks}` : '[Offline Synced]',
          photo_url: item.photo_url,
          gps_lat: item.gps_lat,
          gps_lng: item.gps_lng
        };

        const res = await apiClient.post('/api/v1/verifications/scan', payload);
        if (res.success) {
          synced++;
        } else {
          failed++;
          errors.push({ barcode: item.barcode, message: res.message || 'Verification failed' });
          remainingQueue.push(item);
        }
      } catch (err) {
        failed++;
        errors.push({ barcode: item.barcode, message: err.message });
        remainingQueue.push(item);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));

    return {
      total: queue.length,
      synced,
      failed,
      remainingCount: remainingQueue.length,
      errors
    };
  }
};
