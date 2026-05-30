'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ErrorBanner';
import { formatDate } from '@/lib/utils';
import type { ActivityLog } from '@/lib/types';

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('limit', String(limit));
        queryParams.set('offset', String(offset));
        if (entityType) queryParams.set('entityType', entityType);
        if (action) queryParams.set('action', action);

        const res = await fetch(`/api/activity-log?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to load activity logs');
        }
        interface ActivityLogsResponse {
          data: ActivityLog[];
          pagination: {
            total: number;
            limit: number;
            offset: number;
          };
        }
        const body = (await res.json()) as ActivityLogsResponse;
        if (!cancelled) {
          setLogs(body.data);
          setTotal(body.pagination.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [limit, offset, entityType, action]);

  const handleEntityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntityType(e.target.value);
    setOffset(0);
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAction(e.target.value);
    setOffset(0);
  };

  function formatLogAction(log: ActivityLog) {
    const entity = log.entityType.replace(/-/, ' ');
    const act = log.action.replace(/_/, ' ');
    return `${act.charAt(0).toUpperCase() + act.slice(1)} ${entity}`;
  }

  function getEntityIcon(type: string) {
    switch (type) {
      case 'products':
        return '📦';
      case 'shipments':
        return '🚢';
      case 'invoices':
        return '📄';
      case 'contacts':
        return '👤';
      case 'campaigns':
        return '✉️';
      case 'tasks':
        return '📋';
      default:
        return '⚙️';
    }
  }

  const startRecord = total > 0 ? offset + 1 : 0;
  const endRecord = Math.min(offset + limit, total);

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Activity Log</h1>
          <Badge variant="neutral">{String(total)} Events</Badge>
        </div>
        <p>Audit trail of all administrative and operations changes in the system.</p>
      </div>

      {/* Filters section */}
      <Card className="stagger-item margin-bottom-lg">
        <div className="grid-2">
          <FormField id="filter-entity-type" label="Filter by Module">
            <select value={entityType} onChange={handleEntityTypeChange}>
              <option value="">All Modules</option>
              <option value="products">Inventory (Products)</option>
              <option value="shipments">Shipments</option>
              <option value="invoices">Invoices</option>
              <option value="contacts">Contacts</option>
              <option value="campaigns">Email Campaigns</option>
              <option value="tasks">Tasks</option>
            </select>
          </FormField>

          <FormField id="filter-action" label="Filter by Action">
            <select value={action} onChange={handleActionChange}>
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="bulk_imported">Bulk Imported</option>
              <option value="bulk_deleted">Bulk Deleted</option>
            </select>
          </FormField>
        </div>
      </Card>

      {/* Main Content: Timeline */}
      <Card className="stagger-item">
        {loading ? (
          <div className="stack-2 align-center-justify-center">
            <Spinner size="md" id="activity-logs-spinner" />
            <span className="text-sm text-tertiary">Loading audit trail...</span>
          </div>
        ) : logs.length > 0 ? (
          <div className="stack-5">
            <div className="activity-timeline">
              {logs.map((log) => (
                <div key={log.id} className="activity-item stagger-item">
                  <div className="activity-icon">
                    {getEntityIcon(log.entityType)}
                  </div>
                  <div className="activity-details">
                    <div className="activity-action">
                      {formatLogAction(log)}
                    </div>
                    {log.reason && (
                      <div className="text-xs text-secondary font-medium activity-reason">
                        Reason: {log.reason}
                      </div>
                    )}
                    <div className="activity-time">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="table-pagination-footer activity-log-pagination">
              <div className="pagination-info">
                Showing <span className="font-semibold">{String(startRecord)}</span> to{' '}
                <span className="font-semibold">{String(endRecord)}</span> of{' '}
                <span className="font-semibold">{String(total)}</span> events
              </div>
              <div className="pagination-buttons">
                <Button
                  id="btn-prev-page"
                  variant="secondary"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Previous
                </Button>
                <Button
                  id="btn-next-page"
                  variant="secondary"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="stack-2 align-center-justify-center text-tertiary">
            <span>🔍 No matching activity log records found.</span>
          </div>
        )}
      </Card>
    </div>
  );
}
