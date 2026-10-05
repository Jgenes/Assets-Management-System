import React from 'react';
import BarcodeRenderer from './BarcodeRenderer';
import QrRenderer from './QrRenderer';

export default function AssetLabel({
  asset,
  size = 'standard', // 'standard' (50x30mm approx), 'compact' (40x20mm), 'detailed' (70x45mm)
  className = ''
}) {
  if (!asset) return null;

  const barcodeValue = asset.barcode || asset.asset_number?.replace(/\//g, '-') || 'MoCU-AMS';
  const qrValue = asset.qr_code || `https://mocu.ac.tz/ams/asset/${barcodeValue}`;

  if (size === 'compact') {
    return (
      <div className={`label-card bg-white border border-slate-800 p-2 text-black rounded font-sans flex flex-col justify-between ${className}`}
           style={{ width: '220px', minHeight: '120px' }}>
        <div className="flex items-center justify-between border-b border-black pb-1 mb-1">
          <div>
            <div className="text-[9px] font-extrabold tracking-wider leading-tight text-slate-900">MOSHI CO-OPERATIVE UNIVERSITY</div>
            <div className="text-[8px] font-bold text-slate-700">MoCU • ASSET LABEL</div>
          </div>
          <span className="text-[10px] font-extrabold bg-black text-white px-1 rounded">MoCU</span>
        </div>

        <div className="text-[10px] font-bold truncate text-slate-900 leading-tight">{asset.name}</div>
        <div className="text-[9px] font-mono font-semibold text-slate-800">{asset.asset_number}</div>

        <div className="my-1 flex justify-center bg-white py-0.5">
          <BarcodeRenderer value={barcodeValue} width={1.2} height={26} fontSize={8} />
        </div>

        <div className="flex justify-between items-center text-[7px] text-slate-600 border-t border-slate-300 pt-0.5">
          <span>SN: {asset.serial_number || 'N/A'}</span>
          <span>{asset.department_name || 'MoCU'}</span>
        </div>
      </div>
    );
  }

  if (size === 'detailed') {
    return (
      <div className={`label-card bg-white border-2 border-slate-900 p-3 text-black rounded-lg shadow-sm flex flex-col justify-between ${className}`}
           style={{ width: '340px', minHeight: '190px' }}>
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">M</div>
            <div>
              <div className="text-[11px] font-black tracking-wider leading-tight text-slate-900">MOSHI CO-OPERATIVE UNIVERSITY</div>
              <div className="text-[9px] font-semibold text-slate-700">INSTITUTIONAL ASSET MANAGEMENT SYSTEM</div>
            </div>
          </div>
          <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">MoCU</span>
        </div>

        <div className="flex gap-2 items-center justify-between">
          <div className="flex-1 min-w-0 pr-1">
            <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Asset Name</div>
            <div className="text-xs font-black truncate text-slate-900 leading-tight">{asset.name}</div>

            <div className="mt-1">
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Asset No: </span>
              <span className="text-[11px] font-mono font-black text-slate-950">{asset.asset_number}</span>
            </div>

            <div className="mt-0.5 text-[9px] text-slate-700">
              <span className="font-semibold">Serial:</span> {asset.serial_number || 'N/A'}
            </div>
            <div className="text-[8px] text-slate-600 truncate">
              <span className="font-semibold">Location:</span> {asset.building_name || ''} {asset.room_code ? `(${asset.room_code})` : ''}
            </div>
          </div>

          <div className="shrink-0 p-1 bg-white border border-slate-200 rounded">
            <QrRenderer value={qrValue} size={58} />
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-200 flex flex-col items-center">
          <BarcodeRenderer value={barcodeValue} width={1.4} height={34} fontSize={9} />
        </div>

        <div className="flex justify-between items-center text-[8px] text-slate-500 pt-1 border-t border-slate-300">
          <span>Custodian: {asset.custodian_name || 'Department Custody'}</span>
          <span>Property of MoCU • Do Not Remove</span>
        </div>
      </div>
    );
  }

  // Standard (50x30mm standard label)
  return (
    <div className={`label-card bg-white border-2 border-slate-900 p-2.5 text-black rounded shadow-none font-sans flex flex-col justify-between ${className}`}
         style={{ width: '280px', minHeight: '150px' }}>
      <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">M</div>
          <div>
            <div className="text-[10px] font-black tracking-wide leading-tight text-slate-900">MOSHI CO-OPERATIVE UNIVERSITY</div>
            <div className="text-[8px] font-bold text-slate-600">MoCU PROPERTY</div>
          </div>
        </div>
        <div className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">MoCU</div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[8px] uppercase tracking-wider text-slate-500 font-semibold">Asset</div>
          <div className="text-[11px] font-extrabold truncate text-slate-950 leading-tight">{asset.name}</div>
          <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-500 font-semibold">Asset No</div>
          <div className="text-[10px] font-mono font-black text-slate-900">{asset.asset_number}</div>
        </div>
        <div className="shrink-0 p-0.5 border border-slate-200 rounded">
          <QrRenderer value={qrValue} size={48} />
        </div>
      </div>

      <div className="my-1 flex justify-center bg-white">
        <BarcodeRenderer value={barcodeValue} width={1.3} height={30} fontSize={9} />
      </div>

      <div className="flex justify-between items-center text-[8px] text-slate-600 border-t border-slate-300 pt-1">
        <span>SN: {asset.serial_number || 'N/A'}</span>
        <span>Dept: {asset.department_code || asset.department_name || 'MoCU'}</span>
      </div>
    </div>
  );
}
