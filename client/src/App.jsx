import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import LandingHero from './components/LandingHero';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import PinForm from './components/PinForm';
import EmergencyForm from './components/EmergencyForm';
import FilterPanel from './components/FilterPanel';
import HowPage from './components/HowPage';
import CommunitiesPage from './components/CommunitiesPage';
import FAQPage from './components/FAQPage';
import ReportPage from './components/ReportPage';
import useAuth from './hooks/useAuth';

const MainApp = () => {
  const [view, setView] = useState('landing');
  const [showPinForm, setShowPinForm] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [pinPosition, setPinPosition] = useState(null);
  const [pinCategory, setPinCategory] = useState('');
  const [emergencyPosition, setEmergencyPosition] = useState(null);
  const { isAdmin, token, login, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden relative">
      {/* Navbar shown on ALL pages */}
      <Navbar onNavigate={setView} currentView={view} />

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
            onFilter={() => setShowFilter(true)}
            onBack={() => setView('landing')}
            pinFormOpen={showPinForm}
          />
        )}
        {view === 'how' && <HowPage onBack={() => setView('landing')} />}
        {view === 'commu' && <CommunitiesPage onBack={() => setView('landing')} />}
        {view === 'faq' && <FAQPage onBack={() => setView('landing')} />}
        {view === 'report' && <ReportPage onBack={() => setView('landing')} />}
        {view === 'admin' && (isAdmin
          ? <AdminDashboard token={token} onBack={() => setView('map')} onLogout={logout} />
          : <AdminLogin onLogin={login} />)}
      </main>

      {showPinForm && <PinForm
        onClose={() => { setShowPinForm(false); setPinPosition(null); setPinCategory(''); }}
        initialPosition={pinPosition}
        initialCategory={pinCategory}
        onEmergency={() => { setShowPinForm(false); setShowEmergencyForm(true); }}
      />}
      {showEmergencyForm && <EmergencyForm initialPosition={emergencyPosition} onClose={() => { setShowEmergencyForm(false); setEmergencyPosition(null); }} />}
      {showFilter && <FilterPanel onClose={() => setShowFilter(false)} />}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Prompt',
            borderRadius: '20px',
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
