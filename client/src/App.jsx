import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

import Dashboard from './pages/Dashboard';
import AssetsList from './pages/AssetsList';
import BarcodeLabels from './pages/BarcodeLabels';
import MobileScanner from './pages/MobileScanner';
import Campuses from './pages/Campuses';
import Buildings from './pages/Buildings';
import Rooms from './pages/Rooms';
import Departments from './pages/Departments';
import StaffCustodians from './pages/StaffCustodians';
import VerificationCampaigns from './pages/VerificationCampaigns';
import Transfers from './pages/Transfers';
import Maintenance from './pages/Maintenance';
import Warranties from './pages/Warranties';
import Disposals from './pages/Disposals';
import Depreciation from './pages/Depreciation';
import Reports from './pages/Reports';
import BulkImport from './pages/BulkImport';
import AuditLogs from './pages/AuditLogs';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [targetAssetId, setTargetAssetId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-mocu-navy flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-bold text-amber-300 tracking-wide">
            MOSHI CO-OPERATIVE UNIVERSITY (MoCU)
          </div>
          <div className="text-xs text-slate-400">Loading Enterprise Asset Management System...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Dedicated Fullscreen Mobile Scanner View
  if (currentView === 'mobile-scanner') {
    return <MobileScanner onBack={() => setCurrentView('dashboard')} />;
  }

  const handleSearchSelect = (asset) => {
    setTargetAssetId(asset.id);
    setCurrentView('assets');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setCurrentView}
            onOpenRegisterModal={() => {
              setTargetAssetId(null);
              setCurrentView('assets');
            }}
          />
        );
      case 'assets':
        return (
          <AssetsList
            initialSelectedAssetId={targetAssetId}
            onOpenMobileScanner={() => setCurrentView('mobile-scanner')}
          />
        );
      case 'barcode-labels':
        return <BarcodeLabels />;
      case 'campuses':
        return <Campuses />;
      case 'buildings':
        return <Buildings onSelectAsset={handleSearchSelect} />;
      case 'rooms':
        return <Rooms onSelectAsset={handleSearchSelect} />;
      case 'departments':
        return <Departments onSelectAsset={handleSearchSelect} />;
      case 'staff':
        return <StaffCustodians onSelectAsset={handleSearchSelect} />;
      case 'verification-campaigns':
        return <VerificationCampaigns onOpenMobileScanner={() => setCurrentView('mobile-scanner')} />;
      case 'transfers':
        return <Transfers />;
      case 'maintenance':
        return <Maintenance />;
      case 'warranties':
        return <Warranties />;
      case 'disposals':
        return <Disposals />;
      case 'depreciation':
        return <Depreciation />;
      case 'reports':
        return <Reports />;
      case 'bulk-import':
        return <BulkImport />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'categories':
        return <Categories />;
      case 'suppliers':
        return <Suppliers />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header onNavigate={setCurrentView} onSearchSelect={handleSearchSelect} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
