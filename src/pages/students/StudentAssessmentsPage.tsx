import { useEffect, useState } from 'react';
import axios from 'axios';

interface AssessmentAssignment {
  id: number;
  scheduled_date: string;
  status: string;
  attempted_at?: string | null;
  assessment: {
    id: number;
    title: string;
    total_marks: number;
    subject?: { id: number; subject: string };
    teacher?: { id: number; name: string };
  };
  result?: {
    marks_obtained: number;
    total_marks: number;
    percentage: number;
    teacher_notes?: string | null;
  };
}

interface AssessmentFileRow {
  id: number;
  type: 'question_paper' | 'answer_sheet' | 'other';
  path: string;
  original_name: string;
  uploaded_at?: string | null;
}

export default function StudentAssessmentsPage() {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
  const STORAGE_BASE_URL =
    import.meta.env.VITE_STORAGE_BASE_URL ?? 'http://coachify.local/storage';
  const token = localStorage.getItem('authToken');

  const [upcoming, setUpcoming] = useState<AssessmentAssignment[]>([]);
  const [history, setHistory] = useState<AssessmentAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [filesByAssessment, setFilesByAssessment] = useState<
    Record<
      number,
      {
        question_papers: AssessmentFileRow[];
        answer_sheets: AssessmentFileRow[];
      }
    >
  >({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [upcomingRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/student/assessments/upcoming`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/student/assessments/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (upcomingRes.data.success) setUpcoming(upcomingRes.data.data || []);
      if (historyRes.data.success) setHistory(historyRes.data.data || []);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadFilesForAssessment = async (assessmentId: number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/student/assessments/${assessmentId}/files`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setFilesByAssessment(prev => ({
          ...prev,
          [assessmentId]: response.data.data,
        }));
      }
    } catch (error) {
      console.error('Error loading assessment files:', error);
    }
  };

  return (
    <div>
      <h6 className="fw-semibold mb-3">My Assessments</h6>

      {loading ? (
        <div className="text-center py-4">
          <span className="spinner-border spinner-border-sm"></span>
          <span className="ms-2">Loading assessments...</span>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h6 className="fw-semibold mb-2">Upcoming Assessments</h6>
            {upcoming.length === 0 ? (
              <p className="text-muted">No upcoming assessments.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Scheduled Date</th>
                      <th>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(a => (
                      <tr key={a.id}>
                        <td>{a.assessment.title}</td>
                        <td>{a.assessment.subject?.subject ?? '-'}</td>
                        <td>{a.assessment.teacher?.name ?? '-'}</td>
                        <td>{a.scheduled_date}</td>
                        <td>
                          {filesByAssessment[a.assessment.id] ? (
                            <div className="d-flex flex-column gap-1">
                              {filesByAssessment[a.assessment.id].question_papers
                                .map(file => (
                                  <a
                                    key={file.id}
                                    href={`${STORAGE_BASE_URL}/${file.path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {file.original_name}
                                  </a>
                                ))}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none"
                              onClick={() =>
                                loadFilesForAssessment(a.assessment.id)
                              }
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h6 className="fw-semibold mb-2">Completed Assessments</h6>
            {history.length === 0 ? (
              <p className="text-muted">No completed assessments yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Marks</th>
                      <th>Percentage</th>
                      <th>Teacher Notes</th>
                      <th>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(a => (
                      <tr key={a.id}>
                        <td>{a.assessment.title}</td>
                        <td>{a.assessment.subject?.subject ?? '-'}</td>
                        <td>{a.attempted_at ?? '-'}</td>
                        <td>
                          {a.result
                            ? `${a.result.marks_obtained}/${a.result.total_marks}`
                            : '-'}
                        </td>
                        <td>
                          {a.result
                            ? `${Number(a.result.percentage).toFixed(2)}%`
                            : '-'}
                        </td>
                        <td>{a.result?.teacher_notes ?? '-'}</td>
                        <td>
                          {filesByAssessment[a.assessment.id] ? (
                            <div className="d-flex flex-column gap-1">
                              {filesByAssessment[a.assessment.id].question_papers
                                .length > 0 && (
                                <div>
                                  <span className="d-block text-xs text-muted mb-1">
                                    Question Paper(s):
                                  </span>
                                  {filesByAssessment[
                                    a.assessment.id
                                  ].question_papers.map(file => (
                                    <a
                                      key={file.id}
                                      href={`${STORAGE_BASE_URL}/${file.path}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="d-block"
                                    >
                                      {file.original_name}
                                    </a>
                                  ))}
                                </div>
                              )}
                              {filesByAssessment[a.assessment.id].answer_sheets
                                .length > 0 && (
                                <div className="mt-1">
                                  <span className="d-block text-xs text-muted mb-1">
                                    Answer Sheet(s):
                                  </span>
                                  {filesByAssessment[
                                    a.assessment.id
                                  ].answer_sheets.map(file => (
                                    <a
                                      key={file.id}
                                      href={`${STORAGE_BASE_URL}/${file.path}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="d-block"
                                    >
                                      {file.original_name}
                                    </a>
                                  ))}
                                </div>
                              )}
                              {filesByAssessment[a.assessment.id].question_papers
                                .length === 0 &&
                                filesByAssessment[a.assessment.id].answer_sheets
                                  .length === 0 && (
                                  <span className="text-muted text-xs">
                                    No files uploaded.
                                  </span>
                                )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none"
                              onClick={() =>
                                loadFilesForAssessment(a.assessment.id)
                              }
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
