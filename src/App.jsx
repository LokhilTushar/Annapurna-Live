import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Menu from './Menu';
import Login from './Login';

function App() {
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('roles');
    localStorage.removeItem('userId');
    localStorage.removeItem('refreshToken');
  };

  return (
    <Routes>
      <Route path="/" element={<Menu onLogout={handleLogout} />} />
      <Route path="/admin/login" element={<Login onLoginSuccess={() => {}} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;