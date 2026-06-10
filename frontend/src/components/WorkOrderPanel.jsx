import React from 'react';

/**
 * WorkOrderPanel Component
 * Displays a list of auto-dispatched work orders in glassmorphic sub-cards.
 *
 * Props:
 * - workOrders: Array of work order objects:
 *   { workOrderId, segmentId, riskScore, priority, reason, recommendedAction, status, createdAt, completedAt }
 */

/** Priority badge config */
const PRIORITY_CONFIG = {
  urgent: {
    label: 'URGENT',
    classes: 'bg-red-500/20 text-red-300 border border-red-500/30',
    dot: 'bg-red-400 animate-pulse',
  },
  high: {
    label: 'HIGH',
    classes: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    dot: 'bg-orange-400',
  },
};

/** Status badge config */
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
};

function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.high;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.classes}`}>
      {config.label}
    </span>
  );
}

function WorkOrderCard({ order }) {
  const isCompleted = order.status === 'completed';

  return (
    <div
      className={`bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 transition-all duration-300 ${
        isCompleted ? 'opacity-50' : 'hover:bg-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      {/* Header row: IDs + badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-bold text-white tracking-tight truncate">
            {order.workOrderId}
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            Segment: <span className="text-gray-300">{order.segmentId}</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <PriorityBadge priority={order.priority} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Reason */}
      {order.reason && (
        <div className="mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Reason</p>
          <p className="text-xs text-gray-300 leading-relaxed">{order.reason}</p>
        </div>
      )}

      {/* Recommended Action */}
      {order.recommendedAction && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Action</p>
          <p className="text-xs text-gray-300 leading-relaxed">{order.recommendedAction}</p>
        </div>
      )}
    </div>
  );
}

export default function WorkOrderPanel({ workOrders = [] }) {
  const pendingCount = workOrders.filter(wo => wo.status === 'pending').length;

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Panel Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="text-sm font-bold text-white tracking-tight">Work Orders</h3>
        </div>
        {workOrders.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {workOrders.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs italic tracking-wide">
            No active work orders.
          </div>
        ) : (
          workOrders.map((order) => (
            <WorkOrderCard key={order.workOrderId} order={order} />
          ))
        )}
      </div>
    </div>
  );
}
