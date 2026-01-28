import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button, Modal } from "react-bootstrap";

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
  homework?: string | null;
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
  chapter: string;
  topic: string;
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
  notes?: string | null;
  homework?: string | null;
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
      chapter: "",
      topic: "",
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
  const [batchForm, setBatchForm] = useState({
    class_id: "",
    subject_id: "",
    chapter: "",
    topic: "",
    notes: "",
    homework: "",
  });
  const [batchAttachments, setBatchAttachments] = useState<File[]>([]);

  const [historyActivities, setHistoryActivities] = useState<
    HistoryActivityRow[]
  >([]);
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const fromQuery = searchParams.get("date");
    if (fromQuery && !Number.isNaN(Date.parse(fromQuery))) {
      return fromQuery;
    }
    return "";
  });

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://coachify.local/api/v1";
  const STORAGE_BASE_URL =
    import.meta.env.VITE_STORAGE_BASE_URL ?? "http://coachify.local/storage";
  const token = localStorage.getItem("authToken");
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
            chapter: act.chapter ?? "",
            topic: act.topic ?? "",
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

      setHistoryActivities(response.data?.data || []);
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
        chapter: "",
        topic: "",
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
        chapter: activity.chapter || null,
        topic: activity.topic || null,
        notes: activity.notes || null,
        homework: activity.homework || null,
        homework_status: activity.homework_status ?? undefined,
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
            chapter: activity.chapter || null,
            topic: activity.topic || null,
            notes: activity.notes || null,
            homework: activity.homework || null,
            homework_status: activity.homework_status ?? undefined,
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
      return <span className="text-sm text-gray-500">-</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {attachments.map((file) => (
          <button
            key={file.id}
            type="button"
            className="text-blue-600 underline text-xs"
            onClick={() => setPreviewAttachment(file)}
          >
            {file.original_name}
          </button>
        ))}
      </div>
    );
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
        if (batchForm.chapter) formData.append("chapter", batchForm.chapter);
        if (batchForm.topic) formData.append("topic", batchForm.topic);
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
            chapter: batchForm.chapter || null,
            topic: batchForm.topic || null,
            notes: batchForm.notes || null,
            homework: batchForm.homework || null,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      alert("Batch activity saved successfully!");

      setBatchForm({
        class_id: "",
        subject_id: "",
        chapter: "",
        topic: "",
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
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Daily Activities</h2>

      <div className="flex gap-3 mb-4">
        <Button
          variant={mode === "student" ? "primary" : "outline-primary"}
          onClick={() => setMode("student")}
        >
          Per Student
        </Button>
        <Button
          variant={mode === "batch" ? "primary" : "outline-primary"}
          onClick={() => setMode("batch")}
        >
          By Class &amp; Subject
        </Button>
        <Button
          variant={mode === "history" ? "primary" : "outline-primary"}
          onClick={() => setMode("history")}
        >
          History
        </Button>
      </div>

      {mode === "history" ? (
        <>
          <div className="border p-4 mb-4 rounded bg-gray-50">
            <label className="block font-semibold mb-1">Filter by Date</label>
            <input
              type="date"
              className="w-full border p-2 mb-3"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Clear the date to see all records.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Student</th>
                  <th className="border px-2 py-1">Subject</th>
                  <th className="border px-2 py-1">Chapter</th>
                  <th className="border px-2 py-1">Topic</th>
                  <th className="border px-2 py-1">Homework</th>
                  <th className="border px-2 py-1">Attachments</th>
                  <th className="border px-2 py-1">Homework Status</th>
                </tr>
              </thead>
              <tbody>
                {historyActivities.length === 0 ? (
                  <tr>
                    <td
                      className="border px-2 py-2 text-center text-gray-500"
                      colSpan={7}
                    >
                      No activities found.
                    </td>
                  </tr>
                ) : (
                  historyActivities.map((act) => (
                    <tr key={act.id}>
                      <td className="border px-2 py-1">
                        {act.activity_date}
                      </td>
                      <td className="border px-2 py-1">
                        {act.student?.name ?? "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {act.subject?.subject ?? "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {act.chapter ?? "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {act.topic ?? "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {act.homework ?? "-"}
                      </td>
                      <td className="border px-2 py-1">
                        {renderReadOnlyAttachments(act.attachments)}
                      </td>
                      <td className="border px-2 py-1">
                        <select
                          className="border p-1 text-sm"
                          value={act.homework_status ?? "not_done"}
                          onChange={(e) =>
                            handleHistoryStatusChange(
                              act.id,
                              e.target.value as "not_done" | "partial" | "done"
                            )
                          }
                        >
                          <option value="not_done">Not done</option>
                          <option value="partial">Partial</option>
                          <option value="done">Done</option>
                        </select>
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
          <div className="border p-4 mb-4 rounded bg-gray-50">
            <label className="block font-semibold mb-1">Class</label>
            <select
              className="w-full border p-2 mb-3"
              value={batchForm.class_id}
              onChange={(e) =>
                setBatchForm((prev) => ({ ...prev, class_id: e.target.value }))
              }
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <label className="block font-semibold mb-1">Subject</label>
            <select
              className="w-full border p-2 mb-3"
              value={batchForm.subject_id}
              onChange={(e) =>
                setBatchForm((prev) => ({
                  ...prev,
                  subject_id: e.target.value,
                }))
              }
            >
              <option value="">Select Subject</option>
              {allSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.subject}
                </option>
              ))}
            </select>

            <input
              className="w-full border p-2 mb-3"
              type="text"
              placeholder="Chapter"
              value={batchForm.chapter}
              onChange={(e) =>
                setBatchForm((prev) => ({ ...prev, chapter: e.target.value }))
              }
            />

            <input
              className="w-full border p-2 mb-3"
              type="text"
              placeholder="Topic"
              value={batchForm.topic}
              onChange={(e) =>
                setBatchForm((prev) => ({ ...prev, topic: e.target.value }))
              }
            />

            <textarea
              className="w-full border p-2 mb-3"
              placeholder="Notes"
              value={batchForm.notes}
              onChange={(e) =>
                setBatchForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            ></textarea>

            <textarea
              className="w-full border p-2 mb-3"
              placeholder="Homework"
              value={batchForm.homework}
              onChange={(e) =>
                setBatchForm((prev) => ({ ...prev, homework: e.target.value }))
              }
            ></textarea>

            <div className="mb-4">
              <label className="block font-semibold mb-1">Attachments</label>
              {batchAttachments.length ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {batchAttachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 border rounded px-2 py-1 bg-white"
                    >
                      <span className="text-sm truncate max-w-[160px]">
                        {file.name}
                      </span>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() =>
                          setBatchAttachments((prev) =>
                            prev.filter((_, idx) => idx !== index),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-2">
                  No attachments yet.
                </p>
              )}

              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                className="w-full border p-2"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length) {
                    setBatchAttachments((prev) => [...files, ...prev]);
                  }
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: images or PDFs up to 10&nbsp;MB.
              </p>
            </div>
          </div>

          <div className="flex gap-3 my-3">
            <Button
              onClick={submitBatchActivity}
              disabled={!batchForm.class_id || !batchForm.subject_id}
            >
              Save For Entire Class
            </Button>
          </div>
        </>
      ) : (
        <>
          {activities.map((activity, index) => (
            <div
              key={index}
              className="border p-4 mb-4 rounded bg-gray-50"
            >
              {/* Student */}
              <label className="block font-semibold mb-1">Student</label>
              <select
                className="w-full border p-2 mb-3"
                value={activity.student_id ?? ""}
                onChange={(e) =>
                  handleSelectStudent(index, Number(e.target.value))
                }
              >
                <option value="">Select Student</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>

              {/* Subject */}
              <label className="block font-semibold mb-1">Subject</label>
              <select
                className="w-full border p-2 mb-3"
                value={activity.subject_id ?? ""}
                disabled={!activity.student_id}
                onChange={(e) =>
                  handleChange(index, "subject_id", Number(e.target.value))
                }
              >
                <option value="">Select Subject</option>
                {activity.subjects?.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subject}
                  </option>
                ))}
              </select>

              {/* Chapter */}
              <input
                className="w-full border p-2 mb-3"
                type="text"
                placeholder="Chapter"
                value={activity.chapter ?? ""}
                onChange={(e) => handleChange(index, "chapter", e.target.value)}
              />

              {/* Topic */}
              <input
                className="w-full border p-2 mb-3"
                type="text"
                placeholder="Topic"
                value={activity.topic ?? ""}
                onChange={(e) => handleChange(index, "topic", e.target.value)}
              />

              {/* Notes */}
              <textarea
                className="w-full border p-2 mb-3"
                placeholder="Notes"
                value={activity.notes ?? ""}
                onChange={(e) => handleChange(index, "notes", e.target.value)}
              ></textarea>

          {/* Homework */}
          <textarea
            className="w-full border p-2 mb-3"
            placeholder="Homework"
            value={activity.homework ?? ""}
            onChange={(e) => handleChange(index, "homework", e.target.value)}
          ></textarea>

              <div className="mb-3">
                <label className="block font-semibold mb-1">Attachments</label>
                {activity.attachments?.length ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {activity.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 border rounded px-2 py-1 bg-white"
                      >
                        <span className="text-sm truncate max-w-[140px]">
                          {file.original_name}
                        </span>
                        <Button
                          size="sm"
                          variant="link"
                          onClick={() => setPreviewAttachment(file)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={deletingAttachmentId === file.id}
                          onClick={() =>
                            handleDeleteAttachment(activity.id, file.id, index)
                          }
                        >
                          {deletingAttachmentId === file.id ? "Removing" : "Remove"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-2">
                    No attachments yet.
                  </p>
                )}

                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="w-full border p-2"
                  disabled={
                    !activity.student_id ||
                    !activity.subject_id ||
                    (activity.id !== null && uploadingAttachmentId === activity.id)
                  }
                  onChange={(e) => {
                    const files = e.target.files
                      ? Array.from(e.target.files)
                      : [];
                    if (files.length) {
                      handleActivityAttachmentUpload(index, files);
                    }
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: images or PDFs up to 10&nbsp;MB.
                </p>
              </div>

          <div className="flex justify-end mt-2">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => removeActivityRow(index)}
            >
              Remove Activity
            </Button>
          </div>
        </div>
      ))}

          <div className="flex gap-3 my-3">
            <Button onClick={addNewActivityRow}>+ Add New Activity</Button>
            <Button onClick={submitActivities}>Submit Activities</Button>
          </div>
        </>
      )}

      <Modal
        show={!!previewAttachment}
        onHide={() => setPreviewAttachment(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Attachment Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewAttachment ? (
            previewAttachment.file_type === "pdf" ? (
              <iframe
                title="Attachment PDF"
                src={`${getAttachmentUrl(previewAttachment)}#toolbar=0`}
                className="w-full h-[70vh]"
              ></iframe>
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
          <Button variant="secondary" onClick={() => setPreviewAttachment(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
