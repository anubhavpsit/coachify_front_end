import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Icon from './common/Icon.tsx';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

type ActivityLog = {
  id: number;
  user_id: number | null;
  user_role: string | null;
  action: string;
  module: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    role: string;
  } | null;
};

type PaginatedResponse = {
  logs: ActivityLog[];
  pagination: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
};

type DashboardUser = {
  id: number;
  name: string;
  role: string;
  tenant_id?: number | null;
};

type Filters = {
  role: 'all' | 'coaching_admin' | 'teacher' | 'student';
  userId: string;
  startDate: string;
  endDate: string;
};

const dateToInputValue = (date: Date) => date.toISOString().slice(0, 10);

const createDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    start: dateToInputValue(start),
    end: dateToInputValue(end),
  };
};

const initialRange = createDefaultRange();

export default function ActivityLogCard() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 25,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    role: 'all',
    userId: 'all',
    startDate: initialRange.start,
    endDate: initialRange.end,
  });
  const [users, setUsers] = useState<DashboardUser[]>([]);

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || '{}');
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Sign in to view activity logs.');
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append('per_page', String(pagination.per_page));
    params.append('page', String(page));
    if (filters.role !== 'all') {
      params.append('user_role', filters.role);
    }
    if (filters.userId !== 'all') {
      params.append('user_id', filters.userId);
    }
    if (filters.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters.endDate) {
      params.append('end_date', filters.endDate);
    }

    axios
      .get<{ success: boolean; data: PaginatedResponse }>(
        `${API_BASE_URL}/activity-logs?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      )
      .then(response => {
        setLogs(response.data.data.logs || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination,
        }));
      })
      .catch(thrown => {
        if (axios.isCancel(thrown)) {
          return;
        }
        setError('Unable to load activity logs.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters, page, pagination.per_page]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    axios
      .get<{ success: boolean; data: DashboardUser[] }>(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(response => {
        const list = response.data.data || [];
        const tenantId =
          typeof authUser?.tenant_id === 'number' ? authUser.tenant_id : null;

        const filteredUsers = tenantId
          ? list.filter(user => user.tenant_id === tenantId)
          : list;

        const adminEntry =
          authUser?.role === 'coaching_admin' && typeof authUser?.id === 'number'
            ? [{
                id: authUser.id,
                name: `${authUser?.name || 'You'} (Admin)`,
                role: 'coaching_admin',
                tenant_id: tenantId,
              }]
            : [];

        setUsers([...adminEntry, ...filteredUsers]);
      })
      .catch(() => {
        setUsers([]);
      });
  }, [authUser?.id, authUser?.name, authUser?.role]);

  const groupedLogs = useMemo(() => {
    const groups = new Map<string, ActivityLog[]>();
    logs.forEach(log => {
      const key = new Date(log.created_at).toDateString();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(log);
    });
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }, [logs]);

  const updateFilters = (changes: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...changes }));
    setPage(1);
  };

  const resetFilters = () => {
    const range = createDefaultRange();
    updateFilters({
      role: 'all',
      userId: 'all',
      startDate: range.start,
      endDate: range.end,
    });
  };

  return (
    <div className="card p-20 radius-12 mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-16">
        <div>
          <h6 className="fw-semibold mb-2 d-flex align-items-center gap-2">
            <Icon icon="solar:clock-outline" className="icon text-primary-600" />
            Recent Activity Logs
          </h6>
          <p className="text-secondary-light text-sm mb-0">
            Track who did what across your coaching in real time.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select text-sm"
            value={filters.role}
            onChange={event =>
              updateFilters({ role: event.target.value as Filters['role'] })
            }
          >
            <option value="all">All roles</option>
            <option value="coaching_admin">Admins</option>
            <option value="teacher">Teachers</option>
            <option value="student">Students</option>
          </select>
          <select
            className="form-select text-sm"
            value={filters.userId}
            onChange={event => updateFilters({ userId: event.target.value })}
          >
            <option value="all">All users</option>
            {users.map(user => (
              <option key={`${user.role}-${user.id ?? 'admin'}`} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row g-3 mb-16">
        <div className="col-md-3">
          <label className="form-label text-sm fw-medium">From</label>
          <input
            type="date"
            className="form-control"
            value={filters.startDate}
            max={filters.endDate}
            onChange={event => updateFilters({ startDate: event.target.value })}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label text-sm fw-medium">To</label>
          <input
            type="date"
            className="form-control"
            min={filters.startDate}
            value={filters.endDate}
            onChange={event => updateFilters({ endDate: event.target.value })}
          />
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <button className="btn btn-light w-100" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      </div>

      {error && <p className="text-danger-600 text-sm mb-12">{error}</p>}
      {loading && <p className="text-secondary-light text-sm mb-12">Loading logs…</p>}

      {!loading && !error && groupedLogs.length === 0 && (
        <p className="text-secondary-light text-sm">No activity recorded for the selected filters.</p>
      )}

      {!loading && !error && groupedLogs.length > 0 && (
        <div className="activity-log-list">
          {groupedLogs.map(group => (
            <div key={group.date} className="mb-16">
              <h6 className="text-sm text-uppercase text-secondary mb-8">{group.date}</h6>
              <div className="list-group">
                {group.items.map(item => (
                  <div key={item.id} className="list-group-item border rounded-3 mb-8">
                    <div className="d-flex align-items-center justify-content-between gap-3">
                      <div>
                        <p className="fw-semibold mb-1 text-capitalize">
                          {item.action.replace(/_/g, ' ')}
                        </p>
                        <p className="mb-1 text-sm text-secondary">
                          Module: <span className="text-dark">{item.module}</span>
                        </p>
                        {item.description && (
                          <p className="mb-1 text-sm">{item.description}</p>
                        )}
                        {item.metadata && typeof item.metadata === 'object' && (
                          <div className="d-flex flex-wrap gap-2 mt-1">
                            {Object.entries(item.metadata).map(([key, value]) => (
                              <span key={`${item.id}-${key}`} className="badge bg-light text-dark text-xs">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <p className="text-sm mb-1">
                          {item.user?.name || 'System'}{' '}
                          <span className="text-secondary">({item.user_role || 'N/A'})</span>
                        </p>
                        <p className="text-xs text-secondary mb-0">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between mt-12">
        <button
          className="btn btn-outline-primary"
          disabled={page <= 1 || loading}
          onClick={() => setPage(prev => Math.max(1, prev - 1))}
        >
          Previous
        </button>
        <p className="mb-0 text-sm text-secondary">
          Page {pagination.current_page} of {pagination.last_page} · {pagination.total} logs
        </p>
        <button
          className="btn btn-outline-primary"
          disabled={page >= pagination.last_page || loading}
          onClick={() => setPage(prev => prev + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
