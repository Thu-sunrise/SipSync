import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock } from 'lucide-react';

const OrderCard = ({ order, isOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: order.orderId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const getTagClass = (status) => {
    switch (status) {
      case 'QUEUED': return 'tag-queued';
      case 'IN_PROGRESS': return 'tag-progress';
      case 'COMPLETED': return 'tag-completed';
      default: return '';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'QUEUED': return 'Chờ làm';
      case 'IN_PROGRESS': return 'Đang làm';
      case 'COMPLETED': return 'Xong';
      default: return status;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`order-card ${isOverlay ? 'dragging' : ''}`}
      {...attributes} 
      {...listeners}
    >
      <div className="card-header">
        <span className="order-id">#{order.orderId.split('_')[1] || order.orderId}</span>
        <div className="order-time">
          <Clock size={12} />
          <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      
      <h3 className="customer-name">{order.customerName || 'Khách ẩn danh'}</h3>
      
      <div className="item-list">
        {order.items.map((item, idx) => (
          <div key={idx} className="item-row">
            <span className="item-name">
              {item.name} <small className="item-size">({item.size})</small>
            </span>
            <span className="item-quantity">x{item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="card-footer">
        <span className={`tag ${getTagClass(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
        <span className="total-amount">{order.totalAmount.toLocaleString()}đ</span>
      </div>
    </div>
  );
};

export default OrderCard;
