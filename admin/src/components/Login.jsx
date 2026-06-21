import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login = ({ setToken }) => {
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Dynamically choose backend URI
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://sacrifice-ravishing-nail.ngrok-free.dev";

    // Global Axios Interceptor fallback rule: Forces Ngrok to skip warning interstitial page
    axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            
            // Clean up any extraneous whitespaces/formatting from phone values
            const cleanMobile = mobileNumber.trim();

            const response = await axios.post(`${backendUrl}/api/user/login`, {
                mobileNumber: cleanMobile,
                password: password
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true' // <-- Explicit safety request bypass
                }
            });

            if (response.data.success) {
                const receivedToken = response.data.token;
                setToken(receivedToken);
                localStorage.setItem('token', receivedToken);
                toast.success("Logged in successfully!");
                navigate('/dashboard');
            } else {
                toast.error(response.data.message || "Invalid credentials");
            }
        } catch (error) {
            console.error("Login Error:", error);
            toast.error(error.response?.data?.message || "Network Error: Connectivity failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={onSubmitHandler} className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Opticals ERP Admin</h2>
                
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Mobile Number</label>
                    <input 
                        type="text" 
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="Enter mobile number"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200"
                >
                    {loading ? 'Logging in...' : 'Login to Dashboard'}
                </button>
            </form>
        </div>
    );
};

export default Login;