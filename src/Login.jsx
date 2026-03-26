import React, { useState } from 'react';
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff, Activity } from 'lucide-react';
import { config } from './config';
import { runApiDiagnostics } from './apiDiagnostics'; // Import the diagnostic script

const Login = ({ onLoginSuccess }) => {
  const [mobileNo, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Debugging: Log any existing token data when Login screen mounts
  React.useEffect(() => {
    const debugData = localStorage.getItem('lastLoginDebugData');
    if (debugData) {
      try {
        console.log("%c[Login Screen] Previous Token Response Data:", "color: purple; font-weight: bold;", JSON.parse(debugData));
      } catch (e) {
        console.log("[Login Screen] Raw Previous Data:", debugData);
      }
    }
  }, []);

  const handleDiagnostics = async () => {
    if (!mobileNo || !password) {
      alert("Please enter Mobile No and Password to run diagnostics.");
      return;
    }
    setIsDiagnosing(true);
    console.clear();
    await runApiDiagnostics(mobileNo, password);
    setIsDiagnosing(false);
    alert("Diagnostics Complete! Please check your browser Console (F12) for the detailed report.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const loginUrl = `${config.apiBaseUrl}/api/auth/login`;

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json' // Explicitly request JSON
        },
        body: JSON.stringify({ mobileNo, password }),
      });

      console.log("Response Status:", response.status);

      const responseText = await response.text();
      let data;
      try {
          data = JSON.parse(responseText);
      } catch (e) {
          console.warn("Could not parse response as JSON:", responseText);
          data = { message: response.statusText || "Server returned non-JSON response" };
      }

      console.log("Login API Response:", data); // Debugging

      if (response.ok) {
        alert("Login Response:\n" + JSON.stringify(data, null, 2)); // Alert response as requested

        // SAVE FULL RESPONSE FOR DEBUGGING IN MENU
        localStorage.setItem('lastLoginDebugData', JSON.stringify(data));

        // Handle specific response structure based on user requirement
        // Structure: { response: "1", message: "Login Success", data: { token: "...", refreshToken: "...", userId: "...", roles: [...] } }
        let token = null;

        if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
          token = data.data.token;
          const { refreshToken, userId, roles, restaurantId } = data.data;

          if (token) {
            localStorage.setItem('authToken', token);
          }
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
          if (userId) {
            localStorage.setItem('userId', userId);
          }
          if (restaurantId) {
            localStorage.setItem('restaurantId', restaurantId);
          }
          if (roles) {
            localStorage.setItem('roles', JSON.stringify(roles));
          }
        } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Handle cases where 'data' is an array of objects
            const userData = data.data[0];
            token = userData.token;
            const { refreshToken, userId, roles, restaurantId } = userData;
            if (token) localStorage.setItem('authToken', token);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
            if (userId) localStorage.setItem('userId', userId);
            if (restaurantId) localStorage.setItem('restaurantId', restaurantId);
            if (roles) localStorage.setItem('roles', JSON.stringify(roles));
        }

        // Fallback logic if token was not found in data.data
        if (!token) {
          token = data.token || data.jwt || data.accessToken;

          if (!token && data.data) {
            if (typeof data.data === 'string') {
              token = data.data;
            } else if (typeof data.data === 'object') {
              // Retry extraction if distinct from structure above
              token = data.data.token || data.data.jwt || data.data.accessToken;
            }
          }

          if (token) {
            localStorage.setItem('authToken', token);
          }
        }

        if (token) {
          console.log("Token saved successfully");
        } else {
          console.error("Token not found in response");
        }
        onLoginSuccess();
      } else {
        alert(`Login failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('Network error or server not reachable');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[400px] rounded-[30px] shadow-sm p-8 md:p-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">

        {/* Logo Section */}
        <div className="w-20 h-20 bg-[#FF7034] rounded-[20px] flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-100 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
          <UtensilsCrossed size={32} strokeWidth={2.5} />
        </div>

        {/* Text Section */}
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back!</h2>
        <p className="text-slate-400 text-sm font-medium mb-8">Sign in to continue to your account</p>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="space-y-2">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#FF7034]">
                <Mail size={20} strokeWidth={1.5} />
              </div>
              <input
                type="text"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                placeholder="Enter Mobile No"
                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-700 outline-none focus:border-[#FF7034] focus:ring-4 focus:ring-orange-50 transition-all placeholder:text-slate-300 font-medium text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#FF7034]">
                <Lock size={20} strokeWidth={1.5} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 text-slate-700 outline-none focus:border-[#FF7034] focus:ring-4 focus:ring-orange-50 transition-all placeholder:text-slate-300 font-medium text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FF7034] h-12 rounded-xl text-white font-bold text-base shadow-lg shadow-orange-100 hover:shadow-orange-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:pointer-events-none"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Login'
            )}
          </button>

          <button
            type="button"
            onClick={handleDiagnostics}
            disabled={isDiagnosing}
            className="w-full bg-slate-800 h-10 rounded-xl text-white font-medium text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isDiagnosing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Activity size={16} />}
            Run System Diagnostics
          </button>

        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Don't have an account? <a href="#" className="text-[#FF7034] font-bold hover:underline">Create New</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
