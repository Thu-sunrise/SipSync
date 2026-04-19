import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import OrderCard from './OrderCard';

const KanbanColumn = ({ id, title, orders, icon: Icon }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="kanban-column">
      <div className="column-header">
        <div className="column-title">
          <Icon size={20} className="column-icon" />
          <h2>{title}</h2>
        </div>
        <span className="count-badge">{orders.length}</span>
      </div>
      
      <SortableContext 
        id={id}
        items={orders.map(o => o.orderId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-content">
          {orders.map(order => (
            <OrderCard key={order.orderId} order={order} />
          ))}
          {orders.length === 0 && (
            <div className="empty-state">Trống</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanColumn;
