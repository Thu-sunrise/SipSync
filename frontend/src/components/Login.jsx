import React, { useState } from 'react';
import axios from 'axios';
import { Lock, LogIn } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Login = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { password });
      if (response.data.status === 'success') {
        const token = response.data.token;
        localStorage.setItem('adminToken', token);
        onLoginSuccess(token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đăng nhập, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Lock size={24} />
          </div>
          <h2>Admin Login</h2>
          <p>Hệ thống quản lý SipSync</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Mật khẩu Admin</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              required
              autoFocus
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Đang xác thực...' : (
              <>
                <LogIn size={18} />
                Đăng nhập
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
