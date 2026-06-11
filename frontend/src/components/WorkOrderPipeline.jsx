import React from 'react';

/**
 * WorkOrderPipeline — agent-drafted work orders grouped by lifecycle stage.
 * Hairline-divided rows, not nested glass cards; completed orders recede.
 */
export default function WorkOrderPipeline({ workOrders = [], onSelectSegment }) {
  const pending = workOrders.filter((wo) => wo.status === 'pending');
  const completed = workOrders.filter((wo) => wo.status === 'completed');

  return (
    <section className="panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="panel-title">Work orders</h2>
        {pending.length > 0 && (
          <span className="font-mono text-[11px] text-warn">{pending.length} pending</span>
        )}
      </div>

      <div className="overflow-y-auto max-h-[360px]">
        {workOrders.length === 0 ? (
          <p className="text-xs text-ink-3 px-4 py-6 text-center">
            No work orders. The agent drafts them automatically when a segment degrades.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {pending.map((order) => (
              <WorkOrderRow key={order.workOrderId} order={order} onSelectSegment={onSelectSegment} />
            ))}
            {completed.length > 0 && (
              <div className="px-4 py-1.5 bg-surface-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
                  Completed {completed.length}
                </span>
              </div>
            )}
            {completed.map((order) => (
              <WorkOrderRow
                key={order.workOrderId}
                order={order}
                onSelectSegment={onSelectSegment}
                muted
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function WorkOrderRow({ order, onSelectSegment, muted = false }) {
  const isUrgent = order.priority === 'urgent';

  return (
    <div className={`px-4 py-2.5 ${muted ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium text-ink">{order.workOrderId}</span>
        <button
          onClick={() => onSelectSegment && onSelectSegment(order.segmentId)}
          className="font-mono text-[11px] text-accent hover:underline cursor-pointer"
        >
          {order.segmentId}
        </button>
        <span className={`ml-auto ${isUrgent ? 'chip-crit' : 'chip-warn'}`}>
          {order.priority || 'high'}
        </span>
      </div>

      {order.reason && (
        <p className="text-[11px] text-ink-2 mt-1 line-clamp-2">{order.reason}</p>
      )}
      {order.recommendedAction && !muted && (
        <p className="text-[11px] text-ink-3 mt-0.5 line-clamp-1">
          Action: {order.recommendedAction}
        </p>
      )}
    </div>
  );
}
