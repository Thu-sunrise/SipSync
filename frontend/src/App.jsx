import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Coffee, CheckCircle2, Clock } from 'lucide-react';

// Import Components
import Header from './components/Header';
import KanbanColumn from './components/KanbanColumn';
import OrderCard from './components/OrderCard';
import Login from './components/Login';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const socket = io(API_BASE_URL);

export default function App() {
  const [orders, setOrders] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Cấu hình axios để tự động gửi token trong Header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // --- API Calls ---
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/order`);
      // Lấy toàn bộ data từ .data (theo cấu trúc backend trả về {status: 'success', data: [...]})
      const allOrders = response.data.data || [];
      // Lọc ra các đơn hàng đang xử lý (không lấy đơn đã hủy hoặc nháp)
      const activeStatuses = ['QUEUED', 'IN_PROGRESS', 'COMPLETED'];
      const filtered = allOrders.filter(o => 
        activeStatuses.includes(o.status)
      );
      setOrders(filtered);
    } catch (error) {
      console.error('Lỗi lấy danh sách đơn hàng:', error);
    }
  }, []);

  const updateStatusOnServer = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/order/${orderId}/status`, {
        status: newStatus,
        changedBy: 'admin',
        note: 'Cập nhật từ Kanban Dashboard'
      });
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
      fetchOrders(); // Rollback nếu lỗi
    }
  };

  // --- Socket.io Listeners ---
  useEffect(() => {
    fetchOrders();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('SUBSCRIBE_ORDERS'); // Đăng ký nhận notify đơn hàng
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('ORDER_PAID', (data) => {
      console.log('Có đơn hàng mới đã thanh toán:', data);
      fetchOrders();
    });

    socket.on('ORDER_STATUS_CHANGED', (updatedOrder) => {
      // Cập nhật ngay lập tức nếu đơn hàng đã có trong danh sách
      setOrders(prev => prev.map(o => 
        o.orderId === updatedOrder.orderId ? updatedOrder : o
      ));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('ORDER_PAID');
      socket.off('ORDER_STATUS_CHANGED');
    };
  }, [fetchOrders]);

  // --- Drag & Drop Handlers ---
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const orderId = active.id;
    const newStatus = over.id; // over.id là tên cột (QUEUED, IN_PROGRESS, COMPLETED)

    const order = orders.find(o => o.orderId === orderId);
    if (!order || order.status === newStatus) return;

    // Optimistic Update UI trước cho mượt
    setOrders(prev => prev.map(o => 
      o.orderId === orderId ? { ...o, status: newStatus } : o
    ));

    // Gọi API cập nhật server
    await updateStatusOnServer(orderId, newStatus);
  };

  const getOrdersByStatus = (status) => orders.filter(o => o.status === status);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  if (!token) {
    return <Login onLoginSuccess={setToken} />;
  }

  return (
    <div className="app-container">
      <Header isConnected={isConnected} onLogout={handleLogout} />

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          <KanbanColumn 
            id="QUEUED" 
            title="Chờ làm" 
            orders={getOrdersByStatus('QUEUED')} 
            icon={Clock}
          />
          <KanbanColumn 
            id="IN_PROGRESS" 
            title="Đang làm" 
            orders={getOrdersByStatus('IN_PROGRESS')} 
            icon={Coffee}
          />
          <KanbanColumn 
            id="COMPLETED" 
            title="Hoàn thành" 
            orders={getOrdersByStatus('COMPLETED')} 
            icon={CheckCircle2}
          />
        </div>

        <DragOverlay>
          {activeId ? (
            <OrderCard 
              order={orders.find(o => o.orderId === activeId)} 
              isOverlay 
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
