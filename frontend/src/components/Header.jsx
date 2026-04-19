import { LogOut } from 'lucide-react';

const Header = ({ isConnected, onLogout }) => {
  return (
    <header className="main-header">
      <div className="header-brand">
        <h1>SipSync Dashboard</h1>
        <p>Hệ thống quản lý đơn hàng thời gian thực</p>
      </div>
      
      <div className="header-actions">
        <div className="system-status">
          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
          <span className="status-text">
            {isConnected ? 'Hệ thống trực tuyến' : 'Mất kết nối server'}
          </span>
        </div>

        <button onClick={onLogout} className="logout-button" title="Đăng xuất">
          <LogOut size={18} />
          <span>Thoát</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
