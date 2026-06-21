import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login = ({ setToken }) => {
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Dynamically choose your production or fallback backend link
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://sacrifice-ravishing-nail.ngrok-free.dev";

    // Global Fallback Header Rule to handle any background page queries across the application
    axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            
            // 1. Clear out user whitespace
            let cleanMobile = mobileNumber.trim();

            // 2. Format phone to strict +91 structure (+919087795074)
            if (!cleanMobile.startsWith('+')) {
                if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
                    cleanMobile = `+${cleanMobile}`;
                } else {
                    cleanMobile = `+91${cleanMobile}`;
                }
            }

            // 3. Dispatch secure network payload
            const response = await axios.post(`${backendUrl}/api/user/login`, {
                mobileNumber: cleanMobile,
                password: password
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true' // Forces Ngrok to skip warning screens completely
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
            console.error("Login System Error:", error);
            toast.error(error.response?.data?.message || "Network Error: Connectivity with database failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                        Opticals ERP Admin
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                        Sign in to manage inventory, invoicing, and products
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={onSubmitHandler}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mobile Number
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="text"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    placeholder="Enter 10-digit number (e.g. 9087795074)"
                                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out`}
                        >
                            {loading ? 'Authenticating Profile...' : 'Login to Dashboard'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;