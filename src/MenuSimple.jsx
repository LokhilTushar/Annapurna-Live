import React, { useEffect, useState } from 'react';

const MENU_URL = '/api/restaurant/findMenu';
const DEFAULT_RESTAURANT_ID = 'b9eece39-b641-4ff0-85ac-7836abe97d65';

const MenuSimple = () => {
  const [menuData, setMenuData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(MENU_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ resturentId: DEFAULT_RESTAURANT_ID })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Request failed: ${response.status} ${text}`);
        }

        const payload = await response.json();
        setMenuData(payload);
      } catch (err) {
        setError(err?.message || 'Failed to load menu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Menu</h1>

        {isLoading && (
          <div className="text-slate-500">Loading menu...</div>
        )}

        {!isLoading && error && (
          <div className="text-red-600">{error}</div>
        )}

        {!isLoading && !error && !menuData && (
          <div className="text-slate-500">No data found.</div>
        )}

        {!isLoading && !error && menuData && (
          <pre className="bg-white border border-slate-200 rounded-xl p-4 text-xs overflow-auto">
            {JSON.stringify(menuData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default MenuSimple;