import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Menu as MenuIcon, 
  Layers, 
  LayoutGrid, 
  LogOut, 
  Search,
  CheckCircle,
  Clock,
  User,
  Utensils
} from 'lucide-react';
import { config } from './config';

const KitchenDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'menu', 'categories', 'tables'
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
    // Fetch others as needed
  }, [activeTab]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn("No token found");
            return;
        }
        const cleanToken = token.trim().replace(/^Bearer\s+/i, '');

        const today = new Date();
        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const payload = {
            startDate: formatDate(today),
            endDate: formatDate(today)
        };

        const response = await fetch(`${config.apiBaseUrl}/api/orders/list`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Kitchen Orders Data:", data);
            
            let fetchedOrders = [];
            // Handle various response shapes
            if (data.data && Array.isArray(data.data)) fetchedOrders = data.data;
            else if (Array.isArray(data)) fetchedOrders = data;
            
             const mappedOrders = fetchedOrders.map(o => ({
                orderId: o.orderId || 'N/A',
                customerName: o.customerName || 'Guest',
                tableNo: o.tableNo || '-',
                status: 'Placed', 
                timestamp: o.createdAt || new Date().toISOString(),
                totalAmount: o.orderTotal || 0,
                items: (o.orderData && Array.isArray(o.orderData)) ? o.orderData.map(i => ({
                    name: i.menuName || 'Item',
                    quantity: i.quantity || 1,
                    price: i.menuPrice || 0
                })) : [] 
            }));

            // Sort newest first
            mappedOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setOrders(mappedOrders);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert("Authorization missing. Please login again.");
            return;
        }
        const cleanToken = token.trim().replace(/^Bearer\s+/i, '');

        const response = await fetch(`${config.apiBaseUrl}/api/orders/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId: orderId })
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { message: "Invalid Response" };
        }

        if (response.ok) {
             // Handle logical errors if any
             if (data.response && (data.response !== '1' && data.response !== 1)) {
                 alert("Failed to Accept: " + (data.message || "Unknown Error"));
             } else {
                 // Success - Use server message
                 alert(data.message || "Order Accepted Successfully");
                 // Refresh orders
                 fetchOrders();
             }
        } else {
            console.error("Accept Failed", data);
            alert("Error: " + (data.message || "Server Error"));
        }
    } catch (error) {
        console.error("Accept Error:", error);
        alert("Failed to connect to server.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <ClipboardList className="text-[#FF7034]" /> Kitchen Order Ticket (KOT)
            </h2>
            
            {isLoading ? (
               <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-[#FF7034]/30 border-t-[#FF7034] rounded-full animate-spin"></div>
               </div>
            ) : orders.length === 0 ? (
               <div className="text-center text-slate-400 py-20">No active orders found for today.</div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {orders.map(order => (
                    <div key={order.orderId} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                       <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                          <div>
                             <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 inline-block">Table {order.tableNo}</span>
                             <h3 className="font-bold text-lg text-slate-800">{order.customerName}</h3>
                             <p className="text-xs font-mono text-slate-400 mt-1">{order.orderId}</p>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-bold text-slate-400 mb-1 flex items-center justify-end gap-1">
                                <Clock size={12} /> {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                             <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">{order.status}</span>
                          </div>
                       </div>
                       
                       <div className="space-y-3 mb-4">
                          {order.items.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                <span className="font-bold text-slate-700">{item.name}</span>
                                <span className="text-lg font-black text-[#FF7034]">x{item.quantity}</span>
                             </div>
                          ))}
                       </div>

                       <div className="flex gap-2">
                          <button 
                             onClick={() => acceptOrder(order.orderId)}
                             className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                           >
                             <CheckCircle size={16} /> Accept Order
                          </button>
                       </div>
                    </div>
                 ))}
               </div>
            )}
          </div>
        );
      case 'menu':
        return <div className="p-10 text-center text-slate-400 font-bold">Menu Management (Coming Soon)</div>;
      case 'categories':
        return <div className="p-10 text-center text-slate-400 font-bold">Category Management (Coming Soon)</div>;
      case 'tables':
        return <div className="p-10 text-center text-slate-400 font-bold">Table Management (Coming Soon)</div>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1c23] text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-gray-800">
           <div className="w-10 h-10 bg-[#FF7034] rounded-lg flex items-center justify-center">
              <Utensils size={20} className="text-white" />
           </div>
           <div>
              <h1 className="font-black leading-none text-lg">KITCHEN</h1>
              <span className="text-xs text-gray-400">Dashboard</span>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
           {[
             { id: 'orders', label: 'Orders', icon: <ClipboardList size={20} /> },
             { id: 'menu', label: 'Menu Items', icon: <MenuIcon size={20} /> },
             { id: 'categories', label: 'Categories', icon: <Layers size={20} /> },
             { id: 'tables', label: 'Tables', icon: <LayoutGrid size={20} /> },
           ].map(item => (
             <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === item.id 
                    ? 'bg-[#FF7034] text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
             >
                {item.icon}
                {item.label}
             </button>
           ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
           <button 
             onClick={onLogout}
             className="flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors w-full px-4 py-3 font-bold text-sm"
           >
             <LogOut size={20} /> Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
         {renderContent()}
      </main>
    </div>
  );
};

export default KitchenDashboard;
