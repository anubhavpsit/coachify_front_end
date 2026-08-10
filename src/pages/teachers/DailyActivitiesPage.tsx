import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "react-bootstrap";
import { ROLES } from '../../constants/roles';
import { formatDate } from '../../utils/date';
import AttachmentPreviewModal from '../../components/common/AttachmentPreviewModal';
import TopicAutocomplete from '../../components/topics/TopicAutocomplete.tsx';
import ChapterAutocomplete, { type ChapterSuggestion } from '../../components/topics/ChapterAutocomplete.tsx';

type AttachmentFileType = "image" | "pdf" | "other";

type ActivityAttachment = {
  id: number;
  original_name: string;
  path: string;
  url?: string | null;
  file_type?: AttachmentFileType;
  mime_type?: string | null;
};

type StudentOption = {
  id: number;
  name: string;
};

type SubjectOption = {
  id: number;
  subject: string;
};

type ClassOption = {
  id: number;
  name: string;
};

type HistoryActivityRow = {
  id: number;
  activity_date: string;
  chapter?: string | null;
  topic?: string | null;
  chapter_number?: number | null;
  chapter_model?: { id: number; name: string } | null;
  topic_model?: { id: number; name: string } | null;
  notes?: string | null;
  homework?: string | null;
  remarks?: string | null;
  homework_status?: "not_done" | "partial" | "done" | null;
  student?: { id: number; name: string } | null;
  subject?: { id: number; subject: string } | null;
  attachments?: ActivityAttachment[];
};

type ActivityFormRow = {
  id: number | null;
  student_id: number | "";
  subjects: SubjectOption[];
  subject_id: number | "";
  chapter_number: number | null;
  chapter_id: number | null;
  chapter_name: string;
  topic_id: number | null;
  topic_name: string;
  /** The chapter the currently selected topic belongs to (or null) — used to reset the topic when the chapter changes to something else. */
  topic_chapter_id: number | null;
  notes: string;
  homework: string;
  homework_status?: "not_done" | "partial" | "done";
  attachments: ActivityAttachment[];
};

type ActivityApiResponse = {
  id: number;
  student_id: number;
  subject_id: number;
  chapter?: string | null;
  topic?: string | null;
  chapter_number?: number | null;
  chapter_id?: number | null;
  chapter_model?: { id: number; name: string } | null;
  topic_id?: number | null;
  topic_model?: { id: number; name: string; chapter_id: number | null } | null;
  notes?: string | null;
  homework?: string | null;
  remarks?: string | null;
  homework_status?: "not_done" | "partial" | "done" | null;
  attachments?: ActivityAttachment[];
};

export default function DailyActivitiesPage() {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [activities, setActivities] = useState<ActivityFormRow[]>([
    {
      id: null,
      student_id: "",
      subjects: [],
      subject_id: "",
      chapter_number: null,
      chapter_id: null,
      chapter_name: "",
      topic_id: null,
      topic_name: "",
      topic_chapter_id: null,
      notes: "",
      homework: "",
      homework_status: "not_done",
      attachments: [],
    },
  ]);

  const [mode, setMode] = useState<"student" | "batch" | "history">(() => {
    const fromQuery = searchParams.get("mode");
    if (fromQuery === "student" || fromQuery === "batch" || fromQuery === "history") {
      return fromQuery;
    }
    return "student";
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectOption[]>([]);
  const [batchForm, setBatchForm] = useState<{
    class_id: string;
    subject_id: string;
    chapter_number: number | null;
    chapter_id: number | null;
    chapter_name: string;
    topic_id: number | null;
    topic_name: string;
    topic_chapter_id: number | null;
    notes: string;
    homework: string;
  }>({
    class_id: "",
    subject_id: "",
    chapter_number: null,
    chapter_id: null,
    chapter_name: "",
    topic_id: null,
    topic_name: "",
    topic_chapter_id: null,
    notes: "",
    homework: "",
  });
  const [batchAttachments, setBatchAttachments] = useState<File[]>([]);

  const [historyActivities, setHistoryActivities] = useState<
    HistoryActivityRow[]
  >([]);
  const [historyRemarks, setHistoryRemarks] = useState<Record<number, string>>({});
  const [savingRemarkId, setSavingRemarkId] = useState<number | null>(null);
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const fromQuery = searchParams.get("date");
    if (fromQuery && !Number.isNaN(Date.parse(fromQuery))) {
      return fromQuery;
    }
    return "";
  });
  const [activityDate, setActivityDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://coachify.local/api/v1";
  const STORAGE_BASE_URL =
    import.meta.env.VITE_STORAGE_BASE_URL ?? "http://coachify.local/storage";
  const token = localStorage.getItem("authToken");
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    try {
      const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      if (authUser?.role) {
        setUserRole(authUser.role);
      }
    } catch {
      // ignore
    }
  }, []);
  const tenantId = localStorage.getItem("tenant_id");

  const [previewAttachment, setPreviewAttachment] =
    useState<ActivityAttachment | null>(null);
  const [uploadingAttachmentId, setUploadingAttachmentId] = useState<number | null>(
    null,
  );
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(
    null,
  );

  // --------------------------
  // Load students once
  // --------------------------
  const loadStudents = async () => {
    try {
      const response = await axios.get<{ data: StudentOption[] }>(
        `${API_BASE_URL}/teachers/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const list = (response.data?.data || []).map((student) => ({
        id: student.id,
        name: student.name,
      }));
      setStudents(list);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  // --------------------------
  // Load classes and subjects (for batch mode)
  // --------------------------
  const loadClassesAndSubjects = async () => {
    if (!tenantId) return;

    try {
      const [classesRes, subjectsRes] = await Promise.all([
        axios.get<{ success: boolean; data: ClassOption[] }>(
          `${API_BASE_URL}/classes/${tenantId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
        axios.get<{ data?: SubjectOption[]; subjects?: SubjectOption[]; status?: boolean }>(
          `${API_BASE_URL}/subjects/${tenantId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      ]);

      const classesData = classesRes.data.success
        ? classesRes.data.data || []
        : [];
      const subjectsData =
        subjectsRes.data.data || subjectsRes.data.subjects || [];

      setClasses(classesData);
      setAllSubjects(subjectsData);
    } catch (error) {
      console.error("Error loading classes/subjects:", error);
    }
  };

  // --------------------------
  // Load today's activities
  // --------------------------
  const loadActivities = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/daily-activities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch subjects for all rows
      const apiActivities: ActivityApiResponse[] = response.data.data || [];
      const loadedActivities: ActivityFormRow[] = await Promise.all(
        apiActivities.map(async (act) => {
          const subjectResponse = await axios.get<{ data: SubjectOption[] }>(
            `${API_BASE_URL}/students/${act.student_id}/subjects`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return {
            id: act.id,
            student_id: act.student_id,
            subjects: subjectResponse.data?.data || [],
            subject_id: act.subject_id,
            chapter_number: act.chapter_number ?? null,
            chapter_id: act.chapter_id ?? null,
            chapter_name: act.chapter_model?.name ?? "",
            topic_id: act.topic_id ?? null,
            topic_name: act.topic_model?.name ?? "",
            topic_chapter_id: act.topic_model?.chapter_id ?? null,
            notes: act.notes ?? "",
            homework: act.homework ?? "",
            homework_status: act.homework_status ?? "not_done",
            attachments: act.attachments || [],
          };
        })
      );

      setActivities(loadedActivities);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  // --------------------------
  // Load teacher history activities (optionally filtered by date)
  // --------------------------
  const loadHistoryActivities = async (date?: string) => {
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;

      const response = await axios.get<{ data: HistoryActivityRow[] }>(
        `${API_BASE_URL}/teacher/daily-activities`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      const loaded: HistoryActivityRow[] = response.data?.data || [];
      setHistoryActivities(loaded);
      const remarksMap: Record<number, string> = {};
      loaded.forEach((act) => { remarksMap[act.id] = act.remarks ?? ''; });
      setHistoryRemarks(remarksMap);
    } catch (error) {
      console.error("Error loading history activities:", error);
    }
  };

  const handleHistoryStatusChange = async (
    activityId: number,
    newStatus: "not_done" | "partial" | "done"
  ) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/daily-activities/${activityId}/status`,
        { homework_status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setHistoryActivities((prev) =>
        prev.map((act) =>
          act.id === activityId ? { ...act, homework_status: newStatus } : act
        )
      );
    } catch (error) {
      console.error("Error updating homework status:", error);
      alert("Failed to update homework status.");
    }
  };

  const handleHistoryRemarksSave = async (activityId: number) => {
    try {
      setSavingRemarkId(activityId);
      await axios.patch(
        `${API_BASE_URL}/daily-activities/${activityId}/status`,
        { remarks: historyRemarks[activityId] ?? '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistoryActivities((prev) =>
        prev.map((act) =>
          act.id === activityId ? { ...act, remarks: historyRemarks[activityId] } : act
        )
      );
    } catch (error) {
      console.error("Error saving remarks:", error);
      alert("Failed to save remarks.");
    } finally {
      setSavingRemarkId(null);
    }
  };


// Fetch subjects for a specific row without affecting other rows
const handleSelectStudent = async (
  index: number,
  studentId: number,
  currentSubjectId: number | null = null
) => {
  try {
    const response = await axios.get<{ data: SubjectOption[] }>(
      `${API_BASE_URL}/students/${studentId}/subjects`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const updated = [...activities];
    updated[index] = {
      ...updated[index],
      student_id: studentId,
      subjects: response.data?.data || [],
      subject_id: currentSubjectId ?? updated[index].subject_id ?? "",
    };
    setActivities(updated);
  } catch (error) {
    console.error("Failed to fetch subjects:", error);
  }
};


  useEffect(() => {
    loadStudents();
    loadActivities();
    loadClassesAndSubjects();
  }, []);

  // When switching to history mode or changing date, reload history
  useEffect(() => {
    if (mode === "history") {
      loadHistoryActivities(historyDate || undefined);
    }
  }, [mode, historyDate]);

  // --------------------------
  // Fetch subjects for a row
  // --------------------------
  // --------------------------
  // Handle change per field
  // --------------------------
  const handleChange = <K extends keyof ActivityFormRow>(
    index: number,
    field: K,
    value: ActivityFormRow[K],
  ) => {
    const updated = [...activities];
    updated[index][field] = value;
    setActivities(updated);
  };

  // Changing the chapter resets the topic if it doesn't belong to the newly selected chapter
  // (or belonged to some chapter while the new selection has none, and vice versa).
  const handleChapterChange = (index: number, chapter: ChapterSuggestion | null) => {
    const updated = [...activities];
    const current = updated[index];
    const newChapterId = chapter?.id ?? null;
    const topicStillValid = current.topic_chapter_id === newChapterId;
    updated[index] = {
      ...current,
      chapter_id: newChapterId,
      chapter_name: chapter?.name ?? "",
      ...(topicStillValid ? {} : { topic_id: null, topic_name: "", topic_chapter_id: null }),
    };
    setActivities(updated);
  };

  // --------------------------
  // Add new activity row
  // --------------------------
  const addNewActivityRow = () => {
    setActivities([
      ...activities,
      {
        id: null,
        student_id: "",
        subjects: [],
        subject_id: "",
        chapter_number: null,
        chapter_id: null,
        chapter_name: "",
        topic_id: null,
        topic_name: "",
        topic_chapter_id: null,
        notes: "",
        homework: "",
        attachments: [],
      },
    ]);
  };

  // --------------------------
  // Submit all activities
  // --------------------------
  const submitActivities = async () => {
    try {
      const formattedActivities = activities.map((activity) => ({
        id: activity.id,
        student_id:
          activity.student_id !== "" ? Number(activity.student_id) : undefined,
        subject_id:
          activity.subject_id !== "" ? Number(activity.subject_id) : undefined,
        chapter_number: activity.chapter_number || null,
        chapter_id: activity.chapter_id || null,
        topic_id: activity.topic_id || null,
        notes: activity.notes || null,
        homework: activity.homework || null,
        homework_status: activity.homework_status ?? undefined,
        activity_date: activityDate || undefined,
      }));

      await axios.post(
        `${API_BASE_URL}/daily-activities`,
        { activities: formattedActivities },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Activities saved successfully!");
      // Reload activities to reflect any changes
      loadActivities();
    } catch (error) {
      console.error("Error saving activities:", error);
      alert("Failed to save activities.");
    }
  };

  // --------------------------
  // Remove an activity row
  // --------------------------
  const removeActivityRow = async (index: number) => {
   const activity = activities[index];
   if (!activity) {
     return;
   }

    // If this row is not saved yet, just remove it from state
    if (!activity.id) {
      const updated = [...activities];
      updated.splice(index, 1);
      setActivities(updated);
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/daily-activities/${activity.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Reload list to reflect deletion
      await loadActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
      alert("Failed to delete activity.");
    }
  };

  const getAttachmentUrl = (attachment: ActivityAttachment) => {
    if (attachment.url) return attachment.url;
    return `${STORAGE_BASE_URL}/${attachment.path}`;
  };

  const ensureActivityExists = async (index: number) => {
    const activity = activities[index];
    if (!activity) return null;

    if (!token) {
      alert("Authentication error. Please log in again.");
      return null;
    }

    if (activity.id) {
      return activity.id;
    }

    if (!activity.student_id || !activity.subject_id) {
      alert("Select a student and subject before uploading attachments.");
      return null;
    }

    try {
      const payload = {
        activities: [
          {
            id: activity.id,
            student_id: Number(activity.student_id),
            subject_id: Number(activity.subject_id),
            chapter_number: activity.chapter_number || null,
            chapter_id: activity.chapter_id || null,
            topic_id: activity.topic_id || null,
            notes: activity.notes || null,
            homework: activity.homework || null,
            homework_status: activity.homework_status ?? undefined,
            activity_date: activityDate || undefined,
          },
        ],
      };

      const response = await axios.post(
        `${API_BASE_URL}/daily-activities`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const saved = response.data?.data?.[0];
      if (saved?.id) {
        setActivities((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            ...saved,
            attachments: saved.attachments || [],
          } as ActivityFormRow;
          return updated;
        });
        return saved.id;
      }
    } catch (error) {
      console.error("Error saving activity before upload:", error);
      alert(
        "Failed to save the activity before uploading attachments. Please try again.",
      );
    }

    return null;
  };

  const handleActivityAttachmentUpload = async (
    index: number,
    files: File[],
  ) => {
    if (!files.length) return;

    const activityId = await ensureActivityExists(index);
    if (!activityId || !token) return;

    try {
      setUploadingAttachmentId(activityId);

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(
          `${API_BASE_URL}/daily-activities/${activityId}/attachments`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const uploaded = response.data?.data;
        if (uploaded) {
          setActivities((prev) => {
            const updated = [...prev];
            const row = { ...updated[index] } as ActivityFormRow;
            const existing = row.attachments || [];
            row.attachments = [uploaded, ...existing];
            row.id = activityId;
            updated[index] = row;
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
      alert("Failed to upload attachment. Please try again.");
    } finally {
      setUploadingAttachmentId(null);
    }
  };

  const handleDeleteAttachment = async (
    activityId: number | null,
    attachmentId: number,
    index: number,
  ) => {
    if (!activityId || !token) return;

    try {
      setDeletingAttachmentId(attachmentId);
      await axios.delete(
        `${API_BASE_URL}/daily-activities/${activityId}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setActivities((prev) => {
        const updated = [...prev];
        const row = { ...updated[index] } as ActivityFormRow;
        row.attachments = (row.attachments || []).filter(
          (attachment) => attachment.id !== attachmentId,
        );
        updated[index] = row;
        return updated;
      });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      alert("Failed to delete attachment.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const renderReadOnlyAttachments = (
    attachments?: ActivityAttachment[],
  ) => {
    if (!attachments || attachments.length === 0) {
      return <span className="text-secondary small">-</span>;
    }

    return (
      <div className="d-flex flex-wrap gap-1">
        {attachments.map((file) => (
          <button
            key={file.id}
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-underline"
            style={{ fontSize: '0.75rem' }}
            onClick={() => setPreviewAttachment(file)}
          >
            {file.original_name}
          </button>
        ))}
      </div>
    );
  };

  const handleBatchChapterChange = (chapter: ChapterSuggestion | null) => {
    setBatchForm((prev) => {
      const newChapterId = chapter?.id ?? null;
      const topicStillValid = prev.topic_chapter_id === newChapterId;
      return {
        ...prev,
        chapter_id: newChapterId,
        chapter_name: chapter?.name ?? "",
        ...(topicStillValid ? {} : { topic_id: null, topic_name: "", topic_chapter_id: null }),
      };
    });
  };

   // --------------------------
   // Submit batch activity for class & subject
   // --------------------------
  const submitBatchActivity = async () => {
    try {
      const hasAttachments = batchAttachments.length > 0;

      if (hasAttachments) {
        const formData = new FormData();
        formData.append("class_id", batchForm.class_id);
        formData.append("subject_id", batchForm.subject_id);
        if (batchForm.chapter_number) formData.append("chapter_number", String(batchForm.chapter_number));
        if (batchForm.chapter_id) formData.append("chapter_id", String(batchForm.chapter_id));
        if (batchForm.topic_id) formData.append("topic_id", String(batchForm.topic_id));
        if (batchForm.notes) formData.append("notes", batchForm.notes);
        if (batchForm.homework) formData.append("homework", batchForm.homework);

        batchAttachments.forEach((file) => {
          formData.append("attachments[]", file);
        });

        await axios.post(`${API_BASE_URL}/daily-activities/batch`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/daily-activities/batch`,
          {
            class_id: batchForm.class_id,
            subject_id: batchForm.subject_id,
            chapter_number: batchForm.chapter_number || null,
            chapter_id: batchForm.chapter_id || null,
            topic_id: batchForm.topic_id || null,
            notes: batchForm.notes || null,
            homework: batchForm.homework || null,
            activity_date: activityDate || undefined,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      alert("Batch activity saved successfully!");

      setBatchForm({
        class_id: "",
        subject_id: "",
        chapter_number: null,
        chapter_id: null,
        chapter_name: "",
        topic_id: null,
        topic_name: "",
        topic_chapter_id: null,
        notes: "",
        homework: "",
      });
      setBatchAttachments([]);

      // Reload activities so per-student list reflects new entries
      loadActivities();
    } catch (error: unknown) {
      console.error("Error saving batch activity:", error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Failed to save batch activity.");
      }
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h6 className="fw-semibold mb-0">Daily Activities</h6>
          <p className="text-secondary-light text-xs mb-0">Log what you taught today for each student.</p>
        </div>
      </div>

      {/* Mode tabs */}
      <ul className="nav nav-tabs mb-1">
        <li className="nav-item">
          <button
            className={`nav-link${mode === "student" ? " active" : ""}`}
            onClick={() => setMode("student")}
            title="Log an activity for one or more individual students"
          >
            Per Student
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link${mode === "batch" ? " active" : ""}`}
            onClick={() => setMode("batch")}
            title="Log the same activity for every student in a class at once"
          >
            By Class &amp; Subject
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link${mode === "history" ? " active" : ""}`}
            onClick={() => setMode("history")}
            title="View and edit previously submitted activities"
          >
            History
          </button>
        </li>
      </ul>
      <p className="text-xs text-secondary-light mb-4">
        {mode === "student" && "Log today's activity for one or more specific students."}
        {mode === "batch" && "Log the same lesson for an entire class in one go."}
        {mode === "history" && "View past activities. Update homework status and add remarks here."}
      </p>

      {mode === "history" ? (
        <>
          {/* History date filter */}
          <div className="card mb-3">
            <div className="card-body py-2 d-flex align-items-center gap-3">
              <label className="form-label fw-semibold mb-0 text-nowrap">Filter by Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ maxWidth: 200 }}
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
              />
              {historyDate && (
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setHistoryDate("")}>
                  Clear
                </button>
              )}
              <span className="text-xs text-secondary-light">Leave empty to show all records.</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Topic</th>
                  <th>Class Notes</th>
                  <th>Homework</th>
                  <th>Attachments</th>
                  <th>HW Status</th>
                  <th style={{ minWidth: 220 }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {historyActivities.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-secondary-light py-4">
                      No activities found.
                    </td>
                  </tr>
                ) : (
                  historyActivities.map((act) => (
                    <tr key={act.id}>
                      <td className="text-nowrap">{formatDate(act.activity_date)}</td>
                      <td>{act.student?.name ?? "-"}</td>
                      <td>{act.subject?.subject ?? "-"}</td>
                      <td>{act.chapter_model?.name ?? act.chapter_number ?? act.chapter ?? "-"}</td>
                      <td>{act.topic_model?.name ?? act.topic ?? "-"}</td>
                      <td>{act.notes ?? "-"}</td>
                      <td>{act.homework ?? "-"}</td>
                      <td>{renderReadOnlyAttachments(act.attachments)}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={act.homework_status ?? "not_done"}
                          onChange={(e) =>
                            handleHistoryStatusChange(act.id, e.target.value as "not_done" | "partial" | "done")
                          }
                        >
                          <option value="not_done">Not done</option>
                          <option value="partial">Partial</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td>
                        <textarea
                          className="form-control form-control-sm mb-1"
                          rows={2}
                          placeholder="e.g. Good Work! / Improve your writing."
                          value={historyRemarks[act.id] ?? ""}
                          onChange={(e) =>
                            setHistoryRemarks((prev) => ({ ...prev, [act.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success w-100"
                          disabled={savingRemarkId === act.id}
                          onClick={() => handleHistoryRemarksSave(act.id)}
                        >
                          {savingRemarkId === act.id ? "Saving…" : "Save Remarks"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : mode === "batch" ? (
        <>
          <div className="card mb-3">
            <div className="card-header fw-semibold py-2">Class Details</div>
            <div className="card-body">
              {/* Date + Class + Subject in one row */}
              <div className="row g-3 mb-3">
                <div className="col-sm-4">
                  <label className="form-label fw-semibold">Activity Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                  />
                  <div className="form-text">Applied to all students in the class.</div>
                </div>
                <div className="col-sm-4">
                  <label className="form-label fw-semibold">Class</label>
                  <select
                    className="form-select"
                    value={batchForm.class_id}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, class_id: e.target.value }))}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-4">
                  <label className="form-label fw-semibold">Subject</label>
                  <select
                    className="form-select"
                    value={batchForm.subject_id}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, subject_id: e.target.value }))}
                  >
                    <option value="">Select Subject</option>
                    {allSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.subject}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chapter + Topic */}
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label fw-semibold">Chapter (optional)</label>
                  <ChapterAutocomplete
                    subjectId={batchForm.subject_id ? Number(batchForm.subject_id) : null}
                    value={batchForm.chapter_id ? { id: batchForm.chapter_id, name: batchForm.chapter_name } : null}
                    onChange={handleBatchChapterChange}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label fw-semibold">Topic</label>
                  <TopicAutocomplete
                    subjectId={batchForm.subject_id ? Number(batchForm.subject_id) : null}
                    chapterId={batchForm.chapter_id}
                    value={batchForm.topic_id ? { id: batchForm.topic_id, name: batchForm.topic_name } : null}
                    onChange={(topic) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        topic_id: topic?.id ?? null,
                        topic_name: topic?.name ?? "",
                        topic_chapter_id: topic?.chapter_id ?? null,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Class Notes */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Class Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="What was taught today? Key points covered in class."
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Homework */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Homework</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Complete exercises 1–5 on page 48."
                  value={batchForm.homework}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, homework: e.target.value }))}
                />
              </div>

              {/* Attachments */}
              <div className="mb-2">
                <label className="form-label fw-semibold">Attachments</label>
                {batchAttachments.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {batchAttachments.map((file, index) => (
                      <span key={`${file.name}-${index}`} className="badge bg-secondary-subtle text-secondary d-flex align-items-center gap-1 px-2 py-1">
                        {file.name}
                        <button
                          type="button"
                          className="btn-close btn-close-sm ms-1"
                          style={{ fontSize: '0.6rem' }}
                          onClick={() => setBatchAttachments((prev) => prev.filter((_, idx) => idx !== index))}
                          aria-label="Remove"
                        />
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="form-control"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (files.length) setBatchAttachments((prev) => [...files, ...prev]);
                    e.target.value = "";
                  }}
                />
                <div className="form-text">Images or PDFs, up to 10 MB each.</div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end">
            <Button
              variant="primary"
              className="px-4"
              onClick={submitBatchActivity}
              disabled={!batchForm.class_id || !batchForm.subject_id}
            >
              Save For Entire Class
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Activity Date — shared across all rows */}
          <div className="card mb-3">
            <div className="card-body py-2 d-flex align-items-center gap-3">
              <label className="form-label fw-semibold mb-0 text-nowrap">Activity Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ maxWidth: 200 }}
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
              />
              <span className="text-xs text-secondary-light">
                This date applies to <strong>all</strong> students below.
              </span>
            </div>
          </div>

          {/* Per-student activity cards */}
          {activities.map((activity, index) => {
            const studentName = activity.student_id
              ? students.find((s) => s.id === activity.student_id)?.name
              : null;
            return (
              <div key={index} className="card mb-3">
                <div className="card-header d-flex align-items-center justify-content-between py-2">
                  <span className="fw-semibold">
                    {studentName
                      ? `Activity — ${studentName}`
                      : `Activity ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeActivityRow(index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="card-body">
                  {/* Student + Subject */}
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Student <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={activity.student_id ?? ""}
                        onChange={(e) => handleSelectStudent(index, Number(e.target.value))}
                      >
                        <option value="">Select Student</option>
                        {students.map((st) => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Subject <span className="text-danger">*</span></label>
                      {!activity.student_id && (
                        <div className="form-text mb-1">Select a student first to load their subjects.</div>
                      )}
                      <select
                        className="form-select"
                        value={activity.subject_id ?? ""}
                        disabled={!activity.student_id}
                        onChange={(e) => handleChange(index, "subject_id", Number(e.target.value))}
                      >
                        <option value="">Select Subject</option>
                        {activity.subjects?.map((sub) => (
                          <option key={sub.id} value={sub.id}>{sub.subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Chapter + Topic */}
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Chapter (optional)</label>
                      <ChapterAutocomplete
                        subjectId={activity.subject_id ? Number(activity.subject_id) : null}
                        value={activity.chapter_id ? { id: activity.chapter_id, name: activity.chapter_name } : null}
                        onChange={(chapter) => handleChapterChange(index, chapter)}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Topic</label>
                      <TopicAutocomplete
                        subjectId={activity.subject_id ? Number(activity.subject_id) : null}
                        chapterId={activity.chapter_id}
                        value={activity.topic_id ? { id: activity.topic_id, name: activity.topic_name } : null}
                        onChange={(topic) => {
                          handleChange(index, "topic_id", topic?.id ?? null);
                          handleChange(index, "topic_name", topic?.name ?? "");
                          handleChange(index, "topic_chapter_id", topic?.chapter_id ?? null);
                        }}
                      />
                    </div>
                  </div>

                  {/* Class Notes */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Class Notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="What was taught today? Key points covered in class."
                      value={activity.notes ?? ""}
                      onChange={(e) => handleChange(index, "notes", e.target.value)}
                    />
                  </div>

                  {/* Homework */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Homework</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Complete exercises 1–5 on page 48."
                      value={activity.homework ?? ""}
                      onChange={(e) => handleChange(index, "homework", e.target.value)}
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="form-label fw-semibold">Attachments</label>
                    {!activity.id && (
                      <div className="form-text mb-1">Save the activity first, then you can attach files.</div>
                    )}
                    {activity.attachments?.length ? (
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        {activity.attachments.map((file) => (
                          <span key={file.id} className="badge bg-secondary-subtle text-secondary d-flex align-items-center gap-2 px-2 py-1">
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 text-secondary text-decoration-none"
                              onClick={() => setPreviewAttachment(file)}
                            >
                              {file.original_name}
                            </button>
                            {userRole === ROLES.COACHING_ADMIN && (
                              <button
                                type="button"
                                className="btn-close"
                                style={{ fontSize: '0.6rem' }}
                                disabled={deletingAttachmentId === file.id}
                                onClick={() => handleDeleteAttachment(activity.id, file.id, index)}
                                aria-label="Remove"
                              />
                            )}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="form-control form-control-sm"
                      disabled={
                        !activity.student_id ||
                        !activity.subject_id ||
                        (activity.id !== null && uploadingAttachmentId === activity.id)
                      }
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (files.length) handleActivityAttachmentUpload(index, files);
                        e.target.value = "";
                      }}
                    />
                    <div className="form-text">Images or PDFs, up to 10 MB each.</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom action bar */}
          <div className="d-flex align-items-center justify-content-between mt-2 mb-4">
            <Button variant="outline-primary" onClick={addNewActivityRow}>
              + Add Another Student
            </Button>
            <Button variant="primary" className="px-4" onClick={submitActivities}>
              Submit Activities
            </Button>
          </div>
        </>
      )}

      <AttachmentPreviewModal
        attachment={previewAttachment}
        url={previewAttachment ? getAttachmentUrl(previewAttachment) : null}
        onHide={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
