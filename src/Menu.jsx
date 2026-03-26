import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  X, 
  ChevronRight, 
  Clock, 
  ShoppingBag, 
  Utensils, 
  User,
  Home,
  Menu as MenuIcon,
  ClipboardList,
  Receipt,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { config } from './config';

// Mock Data
// Categories are now fetched from API

const MENU_ITEMS_MOCK = [
  { id: 1, category: 'breakfast', name: 'Save Cheese Thepla', price: 55.00, isVeg: true },
  { id: 2, category: 'breakfast', name: 'Cheese Masala Bhakhri', price: 65.00, isVeg: true },
  { id: 3, category: 'breakfast', name: 'Dahi (Curd)', price: 12.00, isVeg: true },
  { id: 4, category: 'breakfast', name: 'Shekeli Bhakhari', price: 25.00, isVeg: true },
  { id: 5, category: 'cold-drink', name: 'Masala Chaas', price: 20.00, isVeg: true },
  { id: 6, category: 'cold-drink', name: 'Fresh Lime Soda', price: 45.00, isVeg: true },
  { id: 7, category: 'hot-drink', name: 'Masala Tea', price: 15.00, isVeg: true },
  { id: 8, category: 'gathiya', name: 'Vanela Gathiya (250g)', price: 120.00, isVeg: true },
];

const getMenuItemDedupKey = (item) => {
  if (item.menuId !== undefined && item.menuId !== null) return `menuId:${item.menuId}`;
  return `name:${String(item.name || '').trim().toLowerCase()}|price:${Number(item.price ?? 0)}`;
};

const dedupeMenuItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = getMenuItemDedupKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const Menu = ({ onLogout }) => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [fullMenuData, setFullMenuData] = useState([]); // Store all categories with their items
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'menu', 'orders', 'bill'
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Checkout State
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [tableNo, setTableNo] = useState('1'); // Default to 1 or T7A
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
  
  // Orders State
  const [activeOrders, setActiveOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  useEffect(() => {
    // Debugging: Log whenever tab changes
    console.log(`%c[Navigation] Switched to: ${activeTab}`, "color: #ff7034; font-weight: bold; font-size: 12px;");
    
    // Also log token status on every tab switch to ensure we know it's there
    const token = localStorage.getItem('authToken');
    console.log("Current Token Status:", token ? "Present" : "Missing", token);

    // Provide full login response data on every screen/tab switch as requested
    const debugData = localStorage.getItem('lastLoginDebugData');
    if (debugData) {
        try {
            console.log("%c[Token Response Data]:", "color: green; font-weight: bold;", JSON.parse(debugData));
        } catch (e) {
            console.log("Raw Token Response Data:", debugData);
        }
    } else {
        console.log("No Token Response Data available in storage.");
    }
  }, [activeTab]);

  useEffect(() => {
      if (activeTab === 'orders') {
          fetchOrders();
      }
  }, [activeTab]);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn("No token found for fetching orders");
            setIsLoadingOrders(false);
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

        console.log("Fetching orders with payload:", payload);

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
            console.log("Orders Fetched:", data);
            
            // Check for wrapped response structure
            let orders = [];
            if (data.data && Array.isArray(data.data)) {
                 orders = data.data;
            } else if (Array.isArray(data)) {
                 orders = data;
            }
            
            // Map to UI format based on provided API response
            const mappedOrders = orders.map(o => ({
                orderId: o.orderId || 'N/A',
                customerName: o.customerName || 'Guest',
                tableNo: o.tableNo || '-',
                status: 'Placed', // Default status as API doesn't provide one currently
                timestamp: o.createdAt || new Date().toISOString(),
                totalAmount: o.orderTotal || 0,
                // Map 'orderData' to items
                items: (o.orderData && Array.isArray(o.orderData)) ? o.orderData.map(i => ({
                    name: i.menuName || 'Item',
                    quantity: i.quantity || 1,
                    price: i.menuPrice || 0
                })) : [] 
            }));
            
            // Sort by timestamp desc (newest first)
            mappedOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // De-duplicate orders by orderId (or fallback composite key)
            const uniqueOrdersMap = new Map();
            mappedOrders.forEach((order) => {
              const key = order.orderId && order.orderId !== 'N/A'
                ? `order:${order.orderId}`
                : `${order.customerName}|${order.tableNo}|${order.timestamp}`;
              if (!uniqueOrdersMap.has(key)) {
                uniqueOrdersMap.set(key, order);
              }
            });
            const dedupedOrders = Array.from(uniqueOrdersMap.values());

            // Filter to show ONLY orders placed by this device/session OR matching customer Name
            const myOrderIds = JSON.parse(localStorage.getItem('myOrderIds') || '[]');
            const lastCustomerName = localStorage.getItem('lastCustomerName');
            
            const myOrders = dedupedOrders.filter(o => {
                const idMatch = myOrderIds.includes(o.orderId);
                const nameMatch = lastCustomerName && o.customerName && o.customerName.toLowerCase() === lastCustomerName.toLowerCase();
                return idMatch || nameMatch;
            });

            console.log("Found Local Order IDs:", myOrderIds);
            console.log("Last Customer Name:", lastCustomerName);
            console.log("Filtered Orders:", myOrders);

            setActiveOrders(myOrders);
        } else {
            console.error("Failed to fetch orders:", response.status);
            const text = await response.text();
            console.error("Error details:", text);
        }
    } catch (e) {
        console.error("Error in fetchOrders:", e);
    } finally {
        setIsLoadingOrders(false);
    }
  };

  // SCROLL TO CATEGORY FUNCTION
  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Deprecated individual fetch in favor of bulk load at start
  /* const fetchMenuItems = async (categoryId) => { ... } */

  useEffect(() => {
    // Debugging: Log all details when on homepage (Initial Mount)
    const token = localStorage.getItem('authToken');
    const debugData = localStorage.getItem('lastLoginDebugData');
    
    console.log("%c[System] Menu Component Mounted", "font-weight: bold; font-size: 14px;");
    console.log("API Base URL:", config.apiBaseUrl);
    console.log("Full Token:", token);
    
    if (debugData) {
       try {
         console.log("%c[Last Login Response Data]:", "color: blue; font-weight: bold;", JSON.parse(debugData));
       } catch (e) {
         console.log("Raw Debug Data:", debugData);
       }
    } else {
        console.warn("No debug login data found in localStorage");
    }

    const fetchMenuData = async () => {
      setIsInitialLoading(true);
      try {
        // Using a default resturentId for development as requested.
        const restaurantId = "b9eece39-b641-4ff0-85ac-7836abe97d65";

        console.log(`Fetching full menu from findMenu endpoint for restaurant: ${restaurantId}`);
        const response = await fetch(`${config.apiBaseUrl}/api/restaurant/findMenu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ resturentId: restaurantId })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch menu: ${response.status}`, errorText);
          return;
        }

        const payload = await response.json();
        console.log("Full menu response payload:", payload);
        const menuList = Array.isArray(payload.data) ? payload.data : [];
        const categoryMap = new Map();
        let itemCounter = 0; // Global counter for unique IDs

        menuList.forEach(cat => {
          if (!cat || cat.categoryId === undefined || cat.categoryId === null || !cat.menuItemList) return;
          
          const rawItems = Array.isArray(cat.menuItemList) ? cat.menuItemList.filter(Boolean) : [];
          if (rawItems.length === 0) return;

          const mappedItems = rawItems.map((item) => {
            itemCounter++;
            return {
              id: `item-${itemCounter}`, // Globally unique ID
              menuId: item.menuId, // Keep original menuId for order placement
              category: cat.categoryId,
              name: item.menuName || 'Item',
              price: Number(item.menuPrice ?? 0),
              isVeg: true,
              description: '',
              isActive: item.isActive !== false,
              availableQuantity: typeof item.quantity === 'number' ? item.quantity : 100
            };
          });

          const uniqueMappedItems = dedupeMenuItems(mappedItems);

          if (categoryMap.has(cat.categoryId)) {
            const current = categoryMap.get(cat.categoryId);
            current.items = dedupeMenuItems([...current.items, ...uniqueMappedItems]);
          } else {
            categoryMap.set(cat.categoryId, {
              id: cat.categoryId,
              name: cat.categoryName || `Category ${cat.categoryId}`,
              icon: '🍽️',
              items: uniqueMappedItems
            });
          }
        });

        const finalMenuData = Array.from(categoryMap.values());
        setFullMenuData(finalMenuData);
        setCategories(finalMenuData.map(c => ({ id: c.id, name: c.name, icon: c.icon })));

        if (finalMenuData.length > 0) {
          setActiveCategory(finalMenuData[0].id);
          setActiveTab('menu'); // Switch to menu tab after loading
        } else {
          console.warn("No categories with items found in menu response.");
        }
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  // Cart Logic
  const addToCart = (item) => {
    console.log("Adding item to cart:", item);
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const getItemQuantity = (id) => {
    return cart.find(i => i.id === id)?.quantity || 0;
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const buildOrderPayload = () => {
    if (!customerName || !mobileNumber || !tableNo) {
        alert("Please fill in all customer details.");
        return null;
    }

    // Retrieve Restaurant ID
    let restaurantId = localStorage.getItem('restaurantId');
    
    if (!restaurantId) {
         const debugData = localStorage.getItem('lastLoginDebugData');
         if (debugData) {
            try {
                const parsed = JSON.parse(debugData);
                if (parsed.data && parsed.data.restaurantId) restaurantId = parsed.data.restaurantId;
                else if (parsed.restaurantId) restaurantId = parsed.restaurantId;
            } catch (e) { }
         }
    }
    
    if (!restaurantId) {
         console.warn("Using Fallback Restaurant ID");
         restaurantId = "b9eece39-b641-4ff0-85ac-7836abe97d65"; 
    }

    const orderId = "#" + Math.random().toString(36).substr(2, 8).toUpperCase();

    const orderLines = cart
      .map(item => ({
        menuId: Number(item.menuId),
        quantity: Number(item.quantity)
      }))
      .filter(line => Number.isFinite(line.menuId) && line.menuId > 0 && Number.isFinite(line.quantity) && line.quantity > 0);

    if (orderLines.length === 0) {
      alert("Unable to place order: invalid menu item mapping. Please refresh menu and try again.");
      return null;
    }

    const totalQuantity = Number(orderLines.reduce((acc, item) => acc + item.quantity, 0));

    return {
      orderId,
      customerName: customerName,
      mobileNumber: String(mobileNumber),
      tableNo: Number(tableNo) || 1,
      restaurantId,
      orderType: 1,
      quantity: totalQuantity,
      menuItems: orderLines
    };
  };

  const submitOrder = async (payload) => {
    setIsPlacingOrder(true);

    try {
        const apiPayload = {
          ...payload,
          mobileNo: payload.mobileNumber,
          resturentId: payload.restaurantId,
          orderData: payload.menuItems
        };

        console.log("Placing Order Payload:", JSON.stringify(payload, null, 2));
        
        const token = localStorage.getItem('authToken');
        const cleanToken = token ? token.trim().replace(/^Bearer\s+/i, '') : '';
        const headers = {
          'Content-Type': 'application/json'
        };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        const response = await fetch(`${config.apiBaseUrl}/api/orders/place`, {
          method: 'POST',
          headers,
          body: JSON.stringify(apiPayload)
        });

        const responseText = await response.text();
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error("Failed to parse response JSON", responseText);
          data = { message: "Invalid server response", response: "0" };
        }

        console.log("Order Response Status:", response.status);
        console.log("Order Response Data:", data);
        
        if (response.ok) {
          // Check for logical success (API specific)
          if (data.response && (data.response !== '1' && data.response !== 1)) {
            console.error("Logical Error in Response:", data);
            alert("Order Failed: " + (data.message || "Server processed but returned error"));
            return;
          }

          // DETECT REAL ORDER ID FROM SERVER RESPONSE
          // The server might generate its own ID (e.g., #RZNL3FLL) which differs from our client-side ID
          let serverOrderId = null;
          if (data.data && data.data.orderId) serverOrderId = data.data.orderId;
          else if (data.orderId) serverOrderId = data.orderId;
          else if (data.data && Array.isArray(data.data) && data.data[0] && data.data[0].orderId) serverOrderId = data.data[0].orderId;
            
          // Fallback to client ID if server didn't return one (though it should)
          const finalOrderId = serverOrderId || payload.orderId;

          console.log(`Order ID Logic - Client: ${payload.orderId}, Server: ${serverOrderId}, Final: ${finalOrderId}`);

          // SAVE ORDER ID TO LOCAL STORAGE FOR HISTORY TRACKING
          const currentOrderList = JSON.parse(localStorage.getItem('myOrderIds') || '[]');
          if (!currentOrderList.includes(finalOrderId)) {
            currentOrderList.push(finalOrderId);
            localStorage.setItem('myOrderIds', JSON.stringify(currentOrderList));
            console.log("Saved new Order ID locally:", finalOrderId);
          }

          // SAVE CUSTOMER NAME RECENTLY USED
          localStorage.setItem('lastCustomerName', payload.customerName);

          // Create a local representation of the order for the UI
          const newOrder = {
            orderId: finalOrderId,
            customerName: payload.customerName,
            tableNo: payload.tableNo,
            items: cart.map(c => ({ 
              name: c.name, 
              quantity: c.quantity, 
              price: c.price 
            })),
            totalAmount: subtotal,
            status: 'Placed',
            timestamp: new Date().toISOString()
            };

            setActiveOrders(prev => [newOrder, ...prev]);

          alert(`Order Placed Successfully! Order ID: ${finalOrderId}`);
          setCart([]);
          setShowCheckout(false);
          setShowSummary(false);
          setActiveTab('orders');
        } else {
          console.error("Order Failed:", data);
            
          if (response.status === 403 || response.status === 401) {
            alert("Session Expired or Unauthorized. Please Login Again.");
            onLogout();
            } else {
            alert("Failed to place order: " + (data.message || "Server Error"));
            }
        }
        
      } catch (error) {
        console.error("Order Error:", error);
        alert("An error occurred while placing the order.");
      } finally {
        setIsPlacingOrder(false);
      }
  };

  const handlePlaceOrder = () => {
    const payload = buildOrderPayload();
    if (!payload) return;
    setPendingOrderPayload(payload);
    setShowPayloadPreview(true);
  };

  const handleConfirmPlaceOrder = async () => {
    if (!pendingOrderPayload) return;
    setShowPayloadPreview(false);
    await submitOrder(pendingOrderPayload);
    setPendingOrderPayload(null);
  };

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return fullMenuData.reduce((acc, categoryGroup) => {
      const matchingItems = categoryGroup.items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return [...acc, ...matchingItems];
    }, []);
  }, [fullMenuData, searchQuery]);

  // Components for different tabs
  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in duration-500 relative z-10">
            {/* Landing Page Decorative Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
               <div className="absolute top-10 left-10 w-32 h-32 border-4 border-[#FF7034] rounded-full opacity-10"></div>
               <div className="absolute top-40 right-10 w-24 h-24 border-4 border-[#FF7034] rotate-45 opacity-10"></div>
               <div className="absolute bottom-40 left-20 w-16 h-16 bg-[#FF7034] rounded-sm opacity-10"></div>
               <div className="grid grid-cols-4 gap-4 absolute bottom-10 right-10 opacity-20">
                  {[...Array(16)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-[#FF7034] rounded-full"></div>)}
               </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[40px] shadow-2xl shadow-orange-100/50 border border-white flex flex-col items-center max-w-sm md:max-w-md w-full transition-all hover:shadow-orange-200/50 hover:scale-[1.02] duration-300">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-red-700 to-red-900 rounded-full flex items-center justify-center text-white p-4 mb-6 shadow-xl shadow-red-200 ring-4 ring-white">
                <Utensils size={48} className="md:w-16 md:h-16" />
              </div>
              <h1 className="text-xl md:text-3xl font-black text-slate-800 leading-tight mb-2 tracking-tight">MAHADEV MATKA CHA<br/>AND NASTA HOUSE</h1>
              <p className="text-slate-500 font-medium mb-8">Authentic flavors, served with love.</p>
              
              <button 
                onClick={() => setActiveTab('menu')}
                className="bg-[#FF7034] text-white w-full py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl flex items-center justify-center gap-3 shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-1 active:scale-95 transition-all"
              >
                Order Now
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div className="flex flex-col h-full bg-slate-50/50">
             {/* Header */}
             <div className="p-6 md:p-8 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-200">
                <h2 className="text-2xl font-black text-slate-800">Active Orders</h2>
                <div className="bg-orange-100 text-[#FF7034] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                   {activeOrders.length} Pending
                </div>
             </div>

             {/* Order List */}
             <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
            {isLoadingOrders ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 animate-in fade-in zoom-in-95 duration-300">
                         <div className="w-12 h-12 border-4 border-[#FF7034]/20 border-t-[#FF7034] rounded-full animate-spin mb-4"></div>
                         <p className="font-bold text-slate-500">Fetching Orders...</p>
                    </div>
                ) : activeOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-48 h-48 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <ClipboardList className="w-24 h-24 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">No Orders Yet</h3>
                        <p className="text-slate-400 text-sm mt-2">Start scanning the menu to place your first order.</p>
                    </div>
                ) : (
                    activeOrders.map((order) => (
                        <div key={order.orderId} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-black text-slate-800">{order.customerName}</h3>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Table {order.tableNo}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">
                                      {order.timestamp ? (() => {
                                        const d = new Date(order.timestamp);
                                        const today = new Date();
                                        const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                                        return isToday 
                                          ? "Today, " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                          : d.toLocaleDateString([], {month: 'short', day: 'numeric'}) + ", " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                      })() : 'Just now'} 
                                      • <span className="font-mono">{order.orderId}</span>
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    order.status === 'Ready' || order.status === 'ready' ? 'bg-green-100 text-green-600' :
                                    order.status === 'Served' || order.status === 'served' ? 'bg-blue-100 text-blue-600' :
                                    'bg-yellow-100 text-yellow-600'
                                }`}>
                                    {order.status}
                                </div>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm font-medium text-slate-600">
                                        <span>{item.quantity} x {item.name}</span>
                                        <span className="font-bold text-slate-800">₹ {(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Bill</span>
                                <span className="text-xl font-black text-slate-800">₹ {order.totalAmount}</span>
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>
        );
      case 'bill':
        return (
          <div className="flex flex-col items-center justify-center h-[70vh] px-10 text-center animate-in fade-in duration-300">
             <div className="w-48 h-48 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                <Receipt className="w-24 h-24 text-slate-200" />
             </div>
             <h3 className="text-xl font-bold text-slate-700">No Bill Generated Yet</h3>
             <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Your bill will appear here once you place your order and request for the check.</p>
             <button onClick={() => setActiveTab('menu')} className="mt-8 bg-[#FF7034] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:shadow-orange-200 transition-all">Start Ordering</button>
          </div>
        );
      case 'menu':
        if (isInitialLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <div className="w-8 h-8 border-4 border-[#FF7034]/30 border-t-[#FF7034] rounded-full animate-spin mb-4"></div>
                    <p className="font-bold">Loading Menu...</p>
                </div>
            );
        }

        return (
          <div className="pb-32 md:pb-8 space-y-8 animate-in fade-in duration-500 pt-4 p-4 md:p-8 max-w-7xl mx-auto">
            {fullMenuData.map((categoryGroup) => {
               // Filter items within this category based on search query
               const visibleItems = categoryGroup.items.filter(item => 
                 item.name.toLowerCase().includes(searchQuery.toLowerCase())
               );

               if (visibleItems.length === 0) return null;

               return (
                <div key={categoryGroup.id} id={`category-${categoryGroup.id}`} className="scroll-mt-40">
                  <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-20 py-4 mb-4 flex items-center gap-4">
                     <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight capitalize">{categoryGroup.name}</h3>
                     <div className="h-0.5 flex-1 bg-slate-200 rounded-full"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {visibleItems.map(item => {
                      const qty = getItemQuantity(item.id);
                      return (
                      <div key={item.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex gap-4 transition-all hover:shadow-md hover:border-orange-100 group relative overflow-hidden">
                        
                        {/* Veg/Non-Veg Indicator */}
                        <div className={`absolute top-4 right-4 w-4 h-4 border ${item.isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center p-[2px] rounded-[4px] bg-white z-10 shadow-sm`}>
                          <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                        </div>

                        {/* Image Placeholder */}
                        <div className="w-24 h-24 bg-slate-50/80 rounded-2xl shrink-0 flex items-center justify-center text-3xl shadow-inner relative overflow-hidden border border-slate-100">
                            <span className="group-hover:scale-110 transition-transform duration-500 block">🥘</span>
                        </div>
                        
                        <div className="flex flex-col flex-1 justify-between py-1">
                          <div className="pr-6">
                            <h3 className="font-bold text-slate-800 text-base leading-tight mb-1 line-clamp-2">{item.name}</h3>
                            <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-2 h-8">{item.description || ''}</p>
                            
                            {/* Stock Indicator - Optional */}
                             {/* {item.isActive && item.availableQuantity > 0 ? (
                                <p className="text-green-600 text-[10px] font-bold">IN STOCK</p>
                             ) : (
                                <p className="text-red-500 text-[10px] font-bold">OUT OF STOCK</p>
                             )} */}
                          </div>
                          
                          <div className="flex items-end justify-between mt-auto">
                            <span className="text-lg font-black text-slate-800">₹ {item.price}</span>
                            
                            {qty === 0 ? (
                              <button 
                                onClick={() => addToCart(item)}
                                // disabled={!item.isActive || (item.availableQuantity !== undefined && item.availableQuantity <= 0)}
                                className="bg-white text-slate-900 border border-slate-200 w-20 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 transition-all hover:bg-[#FF7034] hover:text-white hover:border-[#FF7034] hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                              >
                                ADD
                              </button>
                            ) : (
                              <div className="flex items-center bg-slate-900 rounded-xl overflow-hidden shadow-lg shadow-slate-200 h-9">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-full flex items-center justify-center text-white hover:bg-white/20 transition-colors active:bg-white/30"><Minus size={14} strokeWidth={3} /></button>
                                <span className="px-1 text-sm font-bold text-white min-w-[20px] text-center">{qty}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-full flex items-center justify-center text-white hover:bg-white/20 transition-colors active:bg-white/30"><Plus size={14} strokeWidth={3} /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
               );
            })}
          </div>
        );
      
      default: 
         return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/50 text-slate-800 font-sans select-none overflow-hidden relative">
      
      {/* Sidebar Navigation (Desktop) */}
      <nav className="hidden md:flex flex-col w-20 lg:w-64 bg-white border-r border-slate-200 h-full shrink-0 z-50 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 lg:gap-4 mb-4">
           <div className="w-10 h-10 bg-red-800 rounded-xl flex items-center justify-center text-white p-2 shrink-0 shadow-lg shadow-red-100">
              <Utensils size={20} />
           </div>
           <div className="hidden lg:block">
              <h1 className="text-sm font-black leading-tight text-slate-800">MAHADEV<br/>CHA HOUSE</h1>
           </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-2 px-3">
          {[
            { id: 'home', label: 'Home', icon: <Home size={22} /> },
            { id: 'menu', label: 'Menu', icon: <MenuIcon size={22} /> },
            { id: 'orders', label: 'Orders', icon: <ClipboardList size={22} /> },
            { id: 'bill', label: 'Bill', icon: <Receipt size={22} /> }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setActiveTab(btn.id)}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${
                activeTab === btn.id 
                  ? 'bg-[#FF7034] text-white shadow-lg shadow-orange-200' 
                  : 'text-slate-400 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <div className={`${activeTab !== btn.id && 'group-hover:scale-110'} transition-transform`}>{btn.icon}</div>
              <span className="hidden lg:block text-sm font-bold tracking-wide">{btn.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100">
           <button 
             onClick={onLogout}
             className="flex items-center gap-3 text-slate-400 hover:text-red-500 transition-colors p-2 lg:px-4 rounded-xl hover:bg-red-50 w-full"
           >
              <LogOut size={20} />
              <span className="hidden lg:block text-sm font-bold">Logout</span>
           </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header (Desktop + Mobile Wrapper) */}
        {activeTab !== 'home' && (
          <header className={`bg-white z-30 px-4 md:px-8 py-4 border-b border-slate-200 flex flex-col gap-4 shadow-sm relative ${activeTab === 'home' ? 'bg-transparent border-none' : ''}`}>
            <div className="flex items-center justify-between">
              {/* Mobile Logo Show only on mobile */}
              <div className="flex md:hidden items-center gap-3">
                 <div className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center text-white p-2 shadow-lg shadow-red-100">
                    <Utensils size={20} />
                 </div>
                 <div>
                    <h1 className="text-sm font-bold leading-none mb-1">MAHADEV MATKA...</h1>
                 </div>
              </div>
              
              {/* Search Bar - Responsive width */}
              <div className="relative flex-1 max-w-md hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search for items..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7034]/20 focus:border-[#FF7034] transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

               {/* Mobile Search Icon Trigger (Simplified for now) */}
               <button className="md:hidden bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Search size={20} />
               </button>

              <div className="flex items-center gap-3">
                <div className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border border-slate-200">
                  <Receipt size={14} /> <span className="hidden md:inline">Table</span> T7A
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-500">
                   <User size={20} />
                </div>
              </div>
            </div>

            {/* Mobile Search Bar (Visible only if active and on mobile) */}
            <div className="md:hidden relative">
               <input 
                  type="text" 
                  placeholder="Search..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-4 text-sm focus:outline-none focus:border-[#FF7034]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>

            {/* Category Horizontal Scroll (Now acts as scroll-to links) */}
            {activeTab === 'menu' && (
              <div className="flex overflow-x-auto gap-4 no-scrollbar pb-1 md:pb-0 pt-2">
                {isInitialLoading ? (
                    <div className="flex gap-4">
                        {[1,2,3].map(i => <div key={i} className="w-16 h-20 bg-slate-200 animate-pulse rounded-xl"></div>)}
                    </div>
                ) : (
                    categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => scrollToCategory(cat.id)}
                        className="flex flex-col items-center min-w-[70px] md:min-w-[90px] shrink-0 group transition-transform active:scale-95"
                    >
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl border flex items-center justify-center text-2xl mb-2 transition-all ${
                        activeCategory === cat.id 
                            ? 'border-[#FF7034] bg-[#FF7034] text-white shadow-md shadow-orange-200' 
                            : 'border-slate-100 bg-white text-slate-600 group-hover:border-[#FF7034]/50'
                        }`}>
                        <span className="filter drop-shadow-sm">{cat.icon}</span>
                        </div>
                        <span className={`text-[10px] md:text-xs font-bold ${activeCategory === cat.id ? 'text-[#FF7034]' : 'text-slate-500'}`}>
                        {cat.name}
                        </span>
                    </button>
                    ))
                )}
              </div>
            )}
          </header>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 w-full relative">
          {renderContent()}
        </main>
      </div>

      {/* Floating Cart Banner */}
      {cart.length > 0 && !showSummary && activeTab === 'menu' && (
        <div className="fixed bottom-24 md:bottom-10 left-4 right-4 md:left-auto md:right-10 md:w-96 z-40 animate-in slide-in-from-bottom-2 duration-500">
           <div className="bg-slate-900 text-white rounded-[20px] p-4 pr-5 flex items-center justify-between shadow-2xl shadow-slate-900/20 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setShowSummary(true)}>
              <div className="flex items-center gap-4">
                 <div className="bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center font-bold text-[#FF7034] border border-slate-700">
                    {totalItems}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">Total Order</span>
                    <span className="text-[#FF7034] font-black text-lg">₹ {subtotal.toFixed(2)}</span>
                 </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400 font-bold text-sm group">
                 View Cart <ChevronRight size={18} className="text-[#FF7034] group-hover:translate-x-1 transition-transform" />
              </div>
           </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden h-20 bg-white border-t border-slate-100 flex items-center justify-around shrink-0 z-50 fixed bottom-0 w-full shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)] pb-2">
        {[
          { id: 'home', label: 'Home', icon: <Home size={24} /> },
          { id: 'menu', label: 'Menu', icon: <MenuIcon size={24} /> },
          { id: 'orders', label: 'Orders', icon: <ClipboardList size={24} /> },
          { id: 'bill', label: 'Pay Bill', icon: <Receipt size={24} /> }
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setActiveTab(btn.id)}
            className={`flex flex-col items-center gap-1 w-full transition-all active:scale-95 ${
              activeTab === btn.id ? 'text-[#FF7034]' : 'text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === btn.id ? 'bg-orange-50' : ''}`}>
               {btn.icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${activeTab === btn.id ? 'text-[#FF7034]' : 'text-slate-400'}`}>{btn.label}</span>
          </button>
        ))}
      </nav>

      {/* Order Summary Modal (Responsive) */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 flex items-end md:items-center justify-end md:justify-center">
           {/* Dismiss Overlay */}
           <div className="absolute inset-0" onClick={() => setShowSummary(false)}></div>

           <div className="bg-white w-full md:max-w-md md:rounded-[32px] md:m-4 max-h-[90vh] md:max-h-[85vh] rounded-t-[40px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 duration-500 shadow-2xl relative z-10">
              {/* Modal Header */}
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-50 bg-white">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800">Your Order</h2>
                    <p className="text-slate-400 text-sm font-bold">{totalItems} items selected</p>
                 </div>
                 <button 
                    onClick={() => setShowSummary(false)}
                    className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-90 transition-all cursor-pointer"
                 >
                    <X size={20} />
                 </button>
              </div>

              {/* Modal Items List */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50">
                 {cart.map((item) => (
                   <div key={item.id} className="flex items-start justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2 mb-1">
                            <div className={`w-4 h-4 border ${item.isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center p-[2px] rounded-[4px]`}>
                              <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                            </div>
                            <span className="font-bold text-slate-800 text-lg">{item.name}</span>
                         </div>
                         <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-bold pl-6">
                            ₹ {item.price} x {item.quantity}
                         </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                         <span className="text-lg font-black text-slate-800">₹ {(item.price * item.quantity).toFixed(2)}</span>
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-sm scale-90 origin-right">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><Minus size={14} strokeWidth={3} /></button>
                          <span className="px-2 text-sm font-black text-slate-700 w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-200 transition-colors"><Plus size={14} strokeWidth={3} /></button>
                        </div>
                      </div>
                   </div>
                 ))}

                 {/* Note Box */}
                 <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                       <ClipboardList size={16} />
                       <span className="text-xs font-bold uppercase tracking-wider">Cooking Instructions</span>
                    </div>
                    <textarea 
                      placeholder="e.g. Less spicy, no onions..."
                      className="w-full bg-white border border-blue-100/50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none h-20 placeholder:text-blue-200/70 text-slate-600 font-medium"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                    />
                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 md:p-8 bg-white border-t border-slate-50 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] z-20">
                 <div className="flex items-center justify-between mb-6">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Amount</span>
                    <span className="text-3xl font-black text-slate-800">₹ {subtotal.toFixed(2)}</span>
                 </div>
                 <button 
                  onClick={() => {
                    setShowSummary(false);
                    setShowCheckout(true);
                  }}
                  className="w-full bg-[#FF7034] text-white py-4 md:py-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-200 active:scale-95 transition-all hover:shadow-orange-300 hover:-translate-y-1 flex items-center justify-center gap-2"
                 >
                    Confirm Order <ArrowRight size={20} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Checkout Selection Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4">
           {/* Dismiss Overlay */}
           <div className="absolute inset-0" onClick={() => setShowCheckout(false)}></div>

           <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden flex flex-col p-6 md:p-8 animate-in zoom-in-95 duration-300 relative z-10 shadow-2xl">
              <h2 className="text-2xl font-black text-slate-800 mb-6">Customer Details</h2>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Customer Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7034]"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Enter Name"
                      />
                  </div>
                  <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Mobile Number</label>
                      <input 
                        type="tel" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7034]"
                        value={mobileNumber}
                        onChange={e => setMobileNumber(e.target.value)}
                        placeholder="Enter 10-digit Mobile"
                        maxLength={10}
                      />
                  </div>
                  <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Table No</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7034]"
                        value={tableNo}
                        onChange={e => setTableNo(e.target.value)}
                        placeholder="Table Number"
                      />
                  </div>
              </div>

              <div className="mt-8 flex gap-3">
                 <button 
                   onClick={() => setShowCheckout(false)}
                   className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                   onClick={handlePlaceOrder}
                   disabled={isPlacingOrder}
                   className="flex-1 bg-[#FF7034] text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:shadow-orange-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    {isPlacingOrder ? (
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        'Place Order'
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}

      {showPayloadPreview && pendingOrderPayload && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowPayloadPreview(false)}></div>

          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative z-10">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">Technical Details</h3>
                <p className="text-sm text-slate-500">Payload that will be sent to place order</p>
              </div>
              <button
                onClick={() => setShowPayloadPreview(false)}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 max-h-[55vh] overflow-auto">
              <pre className="text-xs md:text-sm text-slate-800 whitespace-pre-wrap break-all bg-white border border-slate-200 rounded-2xl p-4">
{JSON.stringify(pendingOrderPayload, null, 2)}
              </pre>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowPayloadPreview(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPlaceOrder}
                disabled={isPlacingOrder}
                className="flex-1 bg-[#FF7034] text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPlacingOrder ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Proceed & Place Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Helper for ArrowRight icon in button (omitted in imports earlier by mistake)
const ArrowRight = ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

export default Menu;