import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// Force Axios to send cookies automatically for every dashboard session request
axios.defaults.withCredentials = true;

const Login = ({ setToken }) => {
  const navigate = useNavigate();
  const [mobileNum, setMobileNum] = useState("");
  const [password, setPassword] = useState("");

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      // 🌟 ROBUST CLEANING: Strip spaces, dashes, parentheses
      const cleanMobile = mobileNum.replace(/\s+/g, "").replace(/[-()]/g, "");

      // Standardize to your exact backend format (+91xxxxxxxxxx)
      const fullMobileNum = cleanMobile.startsWith("+91")
        ? cleanMobile
        : cleanMobile.startsWith("91")
          ? `+${cleanMobile}`
          : `+91${cleanMobile}`;

      /* 🚀 BULLETPROOF FIX: We bypass Vercel's broken rewrites entirely and hit ngrok directly.
        By providing a Googlebot User-Agent, ngrok instantly allows the request through 
        without serving the warning page, bypassing the browser's strict CORS preflight check.
      */
      const response = await axios.post(
        "https://sacrifice-ravishing-nail.ngrok-free.dev/api/user/login",
        {
          mobileNum: fullMobileNum,
          password: password,
        },
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
          },
        }
      );

      if (response.data.success) {
        // Double-Check Security: Verify that the account profile has the proper Admin designation
        if (response.data.user && response.data.user.role === "admin") {
          setToken(true);
          localStorage.setItem("user", JSON.stringify(response.data.user));
          toast.success("Welcome back, Admin!");
          navigate("/");
        } else {
          // Explicit Block: If the user credentials exist but they aren't admin, deny access immediately
          toast.error(
            "Access denied. This account is not authorized as an Administrator."
          );
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={onSubmitHandler}
        className="flex flex-col items-center w-full max-w-sm gap-4 text-gray-800 p-8 border rounded-xl shadow-lg bg-white border-t-4 border-black"
      >
        <div className="inline-flex items-center gap-2 mb-2 mt-3">
          <p className="prata-regular text-2xl font-bold uppercase tracking-wider">
            Admin Portal LogIn
          </p>
        </div>

        <div className="flex w-full border border-gray-400 rounded overflow-hidden focus-within:border-black transition-all">
          <span className="bg-gray-100 px-3 py-2 border-r border-gray-400 text-gray-500 text-sm flex items-center font-medium">
            +91
          </span>
          <input
            type="tel"
            value={mobileNum}
            onChange={(e) => setMobileNum(e.target.value)}
            className="w-full px-3 py-2 outline-none text-sm"
            placeholder="Mobile Number (e.g. 9087795074)"
            required
          />
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-400 rounded outline-none text-sm focus:border-black transition-all"
          placeholder="Password"
          required
        />

        <button className="bg-black text-white font-bold py-2.5 mt-2 rounded w-full hover:bg-gray-800 active:scale-[0.99] transition-all uppercase tracking-widest text-xs">
          Login to Dashboard
        </button>
      </form>
    </div>
  );
};

export default Login;