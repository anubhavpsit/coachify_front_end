import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from 'react-bootstrap';
import { formatDate } from '../../utils/date';

type ActivityAttachment = {
  id: number;
  original_name: string;
  path: string;
  url?: string | null;
  file_type?: 'image' | 'pdf' | 'other';
};

interface Activity {
  id: number;
  activity_date: string;
  chapter: string | null;
  topic: string | null;
  notes: string | null;
  homework: string | null;
  remarks: string | null;
  homework_status?: 'not_done' | 'partial' | 'done' | null;
  teacher?: { id: number; name: string } | null;
  subject?: { id: number; subject: string } | null;
  attachments?: ActivityAttachment[];
}

const statusConfig = {
  done: { label: 'Done', bg: '#D1FAE5', color: '#065F46' },
  partial: { label: 'Partial', bg: '#FEF3C7', color: '#92400E' },
  not_done: { label: 'Not Done', bg: '#FEE2E2', color: '#991B1B' },
};

export default function StudentActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewAttachment, setPreviewAttachment] = useState<ActivityAttachment | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
  const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_BASE_URL ?? 'http://coachify.local/storage';
  const token = localStorage.getItem('authToken');

  const loadActivities = async (date?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const res = await axios.get(`${API_BASE_URL}/student/daily-activities`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      if (res.data.success) setActivities(res.data.data || []);
    } catch (error) {
      console.error('Error loading student activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttachmentUrl = (a: ActivityAttachment) =>
    a.url ? a.url : `${STORAGE_BASE_URL}/${a.path}`;

  useEffect(() => {
    loadActivities(filterDate || undefined);
  }, [filterDate]);

  return (
    <div style={{ padding: '12px 16px', maxWidth: '860px', margin: '0 auto' }}>

      {/* Page header + filter in one row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h6 style={{ margin: 0, fontWeight: '600', fontSize: '15px', color: '#111827' }}>
          My Daily Activities
        </h6>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', color: '#374151', outline: 'none' }}
          />
          {filterDate && (
            <button
              type="button"
              onClick={() => setFilterDate('')}
              style={{ fontSize: '12px', color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: '#9CA3AF', fontSize: '13px' }}>Loading…</p>
      ) : activities.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '13px' }}>No activities found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.map((act) => {
            const status = act.homework_status ? statusConfig[act.homework_status] : null;
            const hasTaught = act.chapter || act.topic || act.notes;
            const hasHomework = act.homework || act.homework_status || (act.attachments && act.attachments.length > 0);

            return (
              <div key={act.id} style={{ border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                    {formatDate(act.activity_date)}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {act.subject?.subject ?? 'Subject not set'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {act.teacher?.name ?? '—'}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                  {/* Taught Today */}
                  {hasTaught && (
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>Taught Today</span>
                      <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {act.chapter && <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}><span style={{ color: '#9CA3AF' }}>Chapter </span>{act.chapter}</p>}
                        {act.topic && <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}><span style={{ color: '#9CA3AF' }}>Topic </span>{act.topic}</p>}
                        {act.notes && <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}><span style={{ color: '#9CA3AF' }}>Notes </span>{act.notes}</p>}
                      </div>
                    </div>
                  )}

                  {/* Homework */}
                  {hasHomework && (
                    <div style={hasTaught ? { borderTop: '1px solid #F3F4F6', paddingTop: '8px' } : {}}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>Homework</span>
                        {status && (
                          <span style={{ fontSize: '10px', fontWeight: '600', padding: '1px 7px', borderRadius: '999px', background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        )}
                      </div>
                      {act.homework && <p style={{ margin: 0, fontSize: '13px', color: '#374151', marginBottom: '4px' }}>{act.homework}</p>}
                      {act.attachments && act.attachments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                          {act.attachments.map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => setPreviewAttachment(file)}
                              style={{ fontSize: '12px', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '5px', padding: '2px 7px', cursor: 'pointer', lineHeight: '1.4' }}
                            >
                              {file.original_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Teacher's Remarks */}
                  {act.remarks && (
                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '7px', padding: '8px 10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B45309' }}>Teacher's Remarks</span>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#78350F', lineHeight: '1.5' }}>{act.remarks}</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attachment preview modal */}
      <Modal show={!!previewAttachment} onHide={() => setPreviewAttachment(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '15px' }}>Attachment Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewAttachment ? (
            previewAttachment.file_type === 'pdf' ? (
              <iframe
                title="Attachment PDF"
                src={`${getAttachmentUrl(previewAttachment)}#toolbar=0`}
                className="w-full h-[70vh]"
              />
            ) : (
              <img
                src={getAttachmentUrl(previewAttachment)}
                alt={previewAttachment.original_name}
                className="max-h-[70vh] w-full object-contain"
              />
            )
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreviewAttachment(null)}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
