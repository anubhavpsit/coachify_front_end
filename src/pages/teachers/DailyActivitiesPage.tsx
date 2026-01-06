import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "react-bootstrap";

export default function DailyActivitiesPage() {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([
    {
      id: null as number | null,
      student_id: "",
      subjects: [],
      subject_id: "",
      chapter: "",
      topic: "",
      notes: "",
      homework: "",
    },
  ]);

  const [mode, setMode] = useState<"student" | "batch" | "history">(() => {
    const fromQuery = searchParams.get("mode");
    if (fromQuery === "student" || fromQuery === "batch" || fromQuery === "history") {
      return fromQuery;
    }
    return "student";
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [batchForm, setBatchForm] = useState({
    class_id: "",
    subject_id: "",
    chapter: "",
    topic: "",
    notes: "",
    homework: "",
  });

  const [historyActivities, setHistoryActivities] = useState<any[]>([]);
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const fromQuery = searchParams.get("date");
    if (fromQuery && !Number.isNaN(Date.parse(fromQuery))) {
      return fromQuery;
    }
    return "";
  });

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://coachify.local/api/v1";
  const token = localStorage.getItem("authToken");
  const tenantId = localStorage.getItem("tenant_id");

  // --------------------------
  // Load students once
  // --------------------------
  const loadStudents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teachers/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data.data);
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
        axios.get(`${API_BASE_URL}/classes/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/subjects/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (classesRes.data.success) {
        setClasses(classesRes.data.data || []);
      }
      if (subjectsRes.data.status) {
        setAllSubjects(subjectsRes.data.data || []);
      }
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
      const loadedActivities = await Promise.all(
        response.data.data.map(async (act: any) => {
          const subjectResponse = await axios.get(
            `${API_BASE_URL}/students/${act.student_id}/subjects`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return {
            id: act.id,
            student_id: act.student_id,
            subjects: subjectResponse.data.data || [],
            subject_id: act.subject_id,
            chapter: act.chapter,
            topic: act.topic,
            notes: act.notes,
            homework: act.homework,
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
      const params: any = {};
      if (date) params.date = date;

      const response = await axios.get(
        `${API_BASE_URL}/teacher/daily-activities`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      setHistoryActivities(response.data.data || []);
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
        prev.map((act: any) =>
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
    const response = await axios.get(
      `${API_BASE_URL}/students/${studentId}/subjects`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const updated = [...activities];
    updated[index] = {
      ...updated[index],
      student_id: studentId,
      subjects: response.data.data || [],
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
  const handleChange = (index: number, field: string, value: any) => {
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
      },
    ]);
  };

  // --------------------------
  // Submit all activities
  // --------------------------
  const submitActivities = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/daily-activities`,
        { activities },
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
   const activity: any = activities[index];

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

   // --------------------------
   // Submit batch activity for class & subject
   // --------------------------
  const submitBatchActivity = async () => {
     try {
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
         { headers: { Authorization: `Bearer ${token}` } }
       );

       alert("Batch activity saved successfully!");

       setBatchForm({
         class_id: "",
         subject_id: "",
         chapter: "",
         topic: "",
         notes: "",
         homework: "",
       });

       // Reload activities so per-student list reflects new entries
       loadActivities();
     } catch (error: any) {
       console.error("Error saving batch activity:", error);
       if (error?.response?.data?.message) {
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
                  historyActivities.map((act: any) => (
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
                {activity.subjects?.map((sub: any) => (
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
    </div>
  );
}
