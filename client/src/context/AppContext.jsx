import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [pins, setPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [sessionId, setSessionId] = useState('');
  
  useEffect(() => {
    let sid = localStorage.getItem('impex_session_id');
    if (!sid) {
      sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      localStorage.setItem('impex_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  return (
    <AppContext.Provider value={{
      pins, setPins,
      selectedPin, setSelectedPin,
      sessionId
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
