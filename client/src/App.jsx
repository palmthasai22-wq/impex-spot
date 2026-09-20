import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import LandingHero from './components/LandingHero';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import AdminMonitorGrid from './components/AdminMonitorGrid';
import PinForm from './components/PinForm';
import EmergencyForm from './components/EmergencyForm';

import HowPage from './components/HowPage';
import CommunitiesPage from './components/CommunitiesPage';
import FAQPage from './components/FAQPage';
import ReportPage from './components/ReportPage';
import KanbanPage from './components/KanbanPage';
import useAuth from './hooks/useAuth';

const MainApp = () => {
  const [view, setView] = useState(window.location.pathname === '/admin/cameras' ? 'cameras' : 'landing');
  useEffect(() => {
    const onPopState = () => setView(window.location.pathname === '/admin/cameras' ? 'cameras' : 'landing');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigate = next => {
    if (next === 'cameras') window.history.pushState({}, '', '/admin/cameras');
    else if (window.location.pathname === '/admin/cameras') window.history.pushState({}, '', '/');
    setView(next);
  };
  const [showPinForm, setShowPinForm] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  
  const [pinPosition, setPinPosition] = useState(null);
  const [pinCategory, setPinCategory] = useState('');
  const [emergencyPosition, setEmergencyPosition] = useState(null);
  const { isAdmin, isSuperAdmin, token, login, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden relative">
      {/* Navbar shown on ALL pages */}
      <Navbar onNavigate={navigate} currentView={view} />

      <main className="flex-grow min-h-0 relative w-full overflow-hidden overflow-y-auto">
        {view === 'landing' && (
          <LandingHero
            onEnter={() => setView('map')}
            onPin={() => { setView('map'); setTimeout(() => setShowPinForm(true), 400); }}
          />
        )}
        {view === 'map' && (
          <MapView
            onAddPin={(position = null, category = '') => { setPinPosition(position); setPinCategory(category); setShowPinForm(true); }}
            onEmergency={(position = null) => { setEmergencyPosition(position); setShowEmergencyForm(true); }}

            onBack={() => setView('landing')}
            pinFormOpen={showPinForm}
            isAdmin={isAdmin}
          />
        )}
        {view === 'how' && <HowPage onBack={() => setView('landing')} />}
        {view === 'commu' && <CommunitiesPage onBack={() => setView('landing')} />}
        {view === 'faq' && <FAQPage onBack={() => setView('landing')} />}
        {view === 'report' && <ReportPage onBack={() => setView('landing')} />}
        {view === 'kanban' && <KanbanPage onNavigate={setView} />}
        {view === 'admin' && (isAdmin
          ? <AdminDashboard token={token} onCameras={() => navigate('cameras')} onBack={() => setView('map')} onLogout={logout} />
          : <AdminLogin onLogin={login} />)}
        {view === 'cameras' && (isSuperAdmin
          ? <AdminMonitorGrid token={token} onBack={() => navigate('admin')} onLogout={logout} />
          : <><p className="p-4 text-center">เข้าสู่ระบบด้วยบัญชีผู้ดูแลกล้อง</p><AdminLogin onLogin={login} /></>)}
      </main>

      {showPinForm && <PinForm
        onClose={() => { setShowPinForm(false); setPinPosition(null); setPinCategory(''); }}
        initialPosition={pinPosition}
        initialCategory={pinCategory}
        onEmergency={() => { setShowPinForm(false); setShowEmergencyForm(true); }}
        isAdmin={isAdmin}
      />}
      {showEmergencyForm && <EmergencyForm initialPosition={emergencyPosition} onClose={() => { setShowEmergencyForm(false); setEmergencyPosition(null); }} />}
      

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: '"Noto Sans Thai", sans-serif',
            borderRadius: '16px',
            padding: '14px 22px',
            fontSize: '14px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          },
          success: {
            style: { background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
            iconTheme: { primary: '#16A34A', secondary: '#F0FDF4' },
          },
          error: {
            style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
            iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' },
          },
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
