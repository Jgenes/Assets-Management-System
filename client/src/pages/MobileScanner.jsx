import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { offlineStorage } from '../utils/offlineStorage';
import { formatCurrency, formatDate, getConditionBadge } from '../utils/formatters';
import {
  Camera, QrCode, Search, CheckCircle2, AlertTriangle, AlertCircle,
  MapPin, Building, RefreshCw, Wifi, WifiOff, UploadCloud,
  ChevronRight, ArrowLeft, CameraOff, Sparkles, Check, X
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function MobileScanner({ onBack }) {
  const { user } = useAuth();
  const notify = useNotify();

  // Network & Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(offlineStorage.getQueue());
  const [syncing, setSyncing] = useState(false);

  // Verification Audit Context
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');

  // Scanner States
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedAsset, setScannedAsset] = useState(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [scannerError, setScannerError] = useState('');

  // Verification Input Form
  const [verifiedCondition, setVerifiedCondition] = useState('good');
  const [remarks, setRemarks] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [lastVerificationResult, setLastVerificationResult] = useState(null);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'mobile-qr-reader';

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load Campaigns & Buildings
  useEffect(() => {
    async function init() {
      try {
        const [cRes, bRes] = await Promise.all([
          api.get('/api/v1/verifications/campaigns'),
          api.get('/api/v1/buildings')
        ]);
        if (cRes.success && cRes.campaigns.length > 0) {
          setCampaigns(cRes.campaigns);
          setSelectedCampaign(cRes.campaigns[0].id);
        }
        if (bRes.success) {
          setBuildings(bRes.buildings || []);
          if (bRes.buildings.length > 0) {
            setSelectedBuilding(bRes.buildings[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to initialize mobile scanner context:', err);
      }
    }
    init();
  }, []);

  // Load rooms when building changes
  useEffect(() => {
    if (selectedBuilding) {
      api.get(`/api/v1/rooms?building_id=${selectedBuilding}`)
        .then(res => {
          if (res.success) {
            setRooms(res.rooms || []);
            if (res.rooms?.length > 0) {
              setSelectedRoom(res.rooms[0].id);
            } else {
              setSelectedRoom('');
            }
          }
        })
        .catch(console.error);
    }
  }, [selectedBuilding]);

  // Start Camera Barcode Scanner using html5-qrcode
  const startCameraScanner = async () => {
    setScannerError('');
    setScannerActive(true);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 180 },
        aspectRatio: 1.0
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Success callback
          stopCameraScanner();
          handleBarcodeScanned(decodedText);
        },
        () => {
          // Frame error (ignore scanning frames)
        }
      );
    } catch (err) {
      console.warn('Camera start error:', err);
      setScannerError('Could not access mobile camera. Please permit camera permissions or use manual entry.');
      setScannerActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore
      }
    }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Handle scanned or entered code
  const handleBarcodeScanned = async (code) => {
    if (!code || !code.trim()) return;
    const clean = code.trim().replace(/^https?:\/\/.*\/asset\//i, '');
    setLoadingAsset(true);
    setScannedAsset(null);
    setLastVerificationResult(null);

    try {
      const res = await api.get(`/api/v1/assets/lookup/${clean}`);
      if (res.success && res.asset) {
        setScannedAsset(res.asset);
        setVerifiedCondition(res.asset.condition || 'good');
        setRemarks('');
      } else {
        notify.error(`No asset registered with barcode '${clean}'.`);
      }
    } catch (err) {
      if (!isOnline) {
        // Offline lookup fallback: create an offline placeholder asset for verification
        setScannedAsset({
          id: null,
          barcode: clean,
          asset_number: clean,
          name: `Unverified Offline Asset (${clean})`,
          condition: 'good',
          is_offline_cached: true
        });
        setVerifiedCondition('good');
        notify.info('Working in Offline Mode. Verification will be queued locally.');
      } else {
        notify.error(err.message || `Asset '${clean}' not found in registry.`);
      }
    } finally {
      setLoadingAsset(false);
    }
  };

  // Submit Physical Verification
  const handleSubmitVerification = async () => {
    if (!scannedAsset) return;

    setSubmittingVerification(true);

    const payload = {
      barcode: scannedAsset.barcode,
      asset_id: scannedAsset.id,
      campaign_id: selectedCampaign,
      scanned_building_id: selectedBuilding,
      scanned_room_id: selectedRoom,
      condition: verifiedCondition,
      remarks,
      photo_url: photoPreview,
      gps_lat: -3.3348,
      gps_lng: 37.3402
    };

    if (!isOnline) {
      // Save locally in offline queue
      const res = offlineStorage.enqueue(payload);
      setOfflineQueue(offlineStorage.getQueue());
      setLastVerificationResult({
        offline: true,
        message: 'Verification recorded and queued in offline storage.',
        status: 'queued'
      });
      notify.success('Recorded in offline queue!');
      setSubmittingVerification(false);
      return;
    }

    try {
      const res = await api.post('/api/v1/verifications/scan', payload);
      if (res.success) {
        setLastVerificationResult(res);
        notify.success(res.message || 'Asset verified successfully!');
      }
    } catch (err) {
      notify.error(err.message || 'Verification submission failed.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Sync Offline Queue
  const handleSyncOfflineQueue = async () => {
    setSyncing(true);
    try {
      const res = await offlineStorage.syncAll(api);
      setOfflineQueue(offlineStorage.getQueue());
      if (res.synced > 0) {
        notify.success(`Successfully synchronized ${res.synced} offline verification scans!`);
      } else if (res.failed > 0) {
        notify.warning(`${res.failed} offline scans could not be synced.`);
      }
    } catch (err) {
      notify.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Check for location mismatch
  const hasLocationMismatch = scannedAsset && (
    (selectedBuilding && Number(selectedBuilding) !== Number(scannedAsset.building_id)) ||
    (selectedRoom && Number(selectedRoom) !== Number(scannedAsset.room_id))
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 text-white flex flex-col font-sans pb-16">
      {/* Mobile Top Navigation */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1 rounded-full bg-slate-800 text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
            MoCU
          </div>
          <div>
            <div className="text-xs font-black tracking-wide text-white leading-tight">MOBILE AUDIT SCANNER</div>
            <div className="text-[10px] text-amber-400 font-semibold">Physical Verification Engine</div>
          </div>
        </div>

        {/* Online / Offline Indicator & Sync Badge */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800 animate-pulse">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </span>
          )}

          {offlineQueue.length > 0 && (
            <button
              onClick={handleSyncOfflineQueue}
              disabled={syncing || !isOnline}
              className="flex items-center gap-1 text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow disabled:opacity-50"
              title="Click to synchronize queued scans"
            >
              <UploadCloud className={`w-3 h-3 ${syncing ? 'animate-bounce' : ''}`} />
              <span>Sync ({offlineQueue.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Step 1: Physical Audit Location Context */}
        <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Current Physical Audit Location</span>
            </span>
            <span className="text-slate-400 font-normal">Step 1</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">Building</label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-400"
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">Room / Office</label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-400"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.room_name} ({r.room_code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Barcode & QR Camera Scanner */}
        <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan Barcode or QR Code</span>
            </span>
            <span className="text-slate-400 font-normal">Step 2</span>
          </div>

          {/* HTML5 Camera Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border-2 border-slate-700">
            <div id={scannerContainerId} className="w-full h-full"></div>

            {!scannerActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 border border-slate-700">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Camera Scanner Ready</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Point camera at asset barcode or QR tag</div>
                </div>
                <button
                  onClick={startCameraScanner}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scanner</span>
                </button>
              </div>
            )}

            {scannerActive && (
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={stopCameraScanner}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-bold shadow"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>

          {scannerError && (
            <div className="p-2 bg-amber-950/80 border border-amber-800 text-amber-200 text-xs rounded-lg">
              {scannerError}
            </div>
          )}

          {/* Manual Barcode Entry or Laser Gun fallback */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Or Manual Barcode / Scanner Gun Entry:
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScanned(manualCode)}
                placeholder="e.g. MOCU-ICT-2026-000001"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleBarcodeScanned(manualCode)}
                disabled={!manualCode.trim() || loadingAsset}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-40"
              >
                {loadingAsset ? '...' : 'Lookup'}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Asset Details & Location Mismatch Verification Card */}
        {scannedAsset && (
          <div className="bg-slate-800/90 rounded-xl p-4 border border-slate-700 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold">{scannedAsset.asset_number}</span>
                <h3 className="text-sm font-black text-white">{scannedAsset.name}</h3>
              </div>
              <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {scannedAsset.barcode}
              </span>
            </div>

            {/* Mismatch Warning Alert Banner */}
            {hasLocationMismatch ? (
              <div className="p-3 rounded-lg bg-rose-950/90 border-2 border-rose-600 text-rose-200 text-xs space-y-1 animate-pulse">
                <div className="font-black flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>LOCATION MISMATCH DETECTED!</span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  Expected in: <span className="font-bold underline text-white">{scannedAsset.building_name || 'Building'} ({scannedAsset.room_name || 'Room'})</span>
                  <br />
                  Physically scanned in: <span className="font-bold underline text-amber-300">
                    {buildings.find(b => b.id == selectedBuilding)?.name} ({rooms.find(r => r.id == selectedRoom)?.room_name})
                  </span>
                </div>
                <div className="text-[10px] text-rose-300/80 pt-1 border-t border-rose-800/60">
                  Per MoCU Audit Policy: Mismatch will be flagged in the institutional audit register without changing permanent records.
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Location Matched: Asset verified in correct designated room!</span>
              </div>
            )}

            {/* Current Asset Info Summary */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">Department:</span>
                <span className="font-semibold text-white">{scannedAsset.department_name || 'Central'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Custodian:</span>
                <span className="font-semibold text-amber-300">{scannedAsset.custodian_name || 'Dept. Custody'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Serial Number:</span>
                <span className="font-mono text-white">{scannedAsset.serial_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Last Audit:</span>
                <span className="text-white">{formatDate(scannedAsset.last_verified_at) || 'Never'}</span>
              </div>
            </div>

            {/* Condition Selection */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Verified Physical Condition
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['new', 'good', 'fair', 'poor', 'damaged', 'obsolete'].map(cond => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setVerifiedCondition(cond)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase transition ${
                      verifiedCondition === cond
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-700 border border-slate-800'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Verifier Remarks */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Auditor Field Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Physical tags legible, power tested, noted any damages or changes..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>

            {/* Submit Verification Button */}
            <button
              onClick={handleSubmitVerification}
              disabled={submittingVerification}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submittingVerification ? 'Recording Verification...' : 'Submit Physical Verification'}</span>
            </button>
          </div>
        )}

        {/* Verification Success / Mismatch Feedback Card */}
        {lastVerificationResult && (
          <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-xs space-y-2 animate-scale-up">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verification Successfully Recorded!</span>
            </div>
            <p className="text-slate-300 text-[11px]">{lastVerificationResult.message}</p>
            <button
              onClick={() => { setScannedAsset(null); setManualCode(''); setLastVerificationResult(null); }}
              className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xs"
            >
              Scan Next Asset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
