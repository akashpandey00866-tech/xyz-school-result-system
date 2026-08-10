import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function calculateSubjectPass(subject, academicSubject = null) {
  const theory = Number(subject?.theory ?? 0);
  const practical = Number(subject?.practical ?? 0);

  const passingTheory = Number(
    subject?.passingTheory ??
      academicSubject?.passingTheory ??
      0
  );
  const passingPractical = Number(
    subject?.passingPractical ??
      academicSubject?.passingPractical ??
      0
  );

  // Academic Configuration uses separate theory/practical passing rules.
  if (passingTheory > 0 || passingPractical > 0) {
    return theory >= passingTheory && practical >= passingPractical;
  }

  const passingMarks = Number(
    subject?.passingMarks ??
      academicSubject?.passingMarks ??
      0
  );

  if (passingMarks > 0) {
    return theory + practical >= passingMarks;
  }

  return true;
}

function normalizeResultStatus(result, academicSubjects) {
  const savedSubjects = Array.isArray(result?.subjects)
    ? result.subjects
    : [];

  if (savedSubjects.length > 0) {
    const failedSubjects = savedSubjects.filter((subject) => {
      const code = normalize(subject.subjectCode ?? subject.code);
      const academicSubject = academicSubjects.find(
        (item) => normalize(item.code ?? item.subjectCode) === code
      );
      return !calculateSubjectPass(subject, academicSubject);
    });

    return {
      status: failedSubjects.length === 0 ? "PASS" : "FAIL",
      failedCount: failedSubjects.length,
      failedSubjects,
    };
  }

  if (result?.failedCount !== undefined) {
    const failedCount = Number(result.failedCount || 0);
    return {
      status: failedCount === 0 ? "PASS" : "FAIL",
      failedCount,
      failedSubjects: result.failedSubjects || [],
    };
  }

  const storedStatus = normalize(result?.status).toUpperCase();
  if (storedStatus === "PASS" || storedStatus === "FAIL") {
    return {
      status: storedStatus,
      failedCount: storedStatus === "FAIL" ? 1 : 0,
      failedSubjects: result?.failedSubjects || [],
    };
  }

  const percentage = Number(result?.percentage || 0);
  return {
    status: percentage >= 33 ? "PASS" : "FAIL",
    failedCount: percentage >= 33 ? 0 : 1,
    failedSubjects: [],
  };
}

function ViewResults() {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [academicSubjects, setAcademicSubjects] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("All");
  const [examFilter, setExamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadResultsAndAcademicConfig();
  }, []);

  useEffect(() => {
    let data = [...results];

    const keyword = search.trim().toLowerCase();
    if (keyword) {
      data = data.filter((item) =>
        [
          item.studentName,
          item.enrollmentNo,
          item.mobile,
          item.className,
          item.section,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(keyword)
        )
      );
    }

    if (classFilter !== "All") {
      data = data.filter((item) => item.className === classFilter);
    }

    if (sectionFilter !== "All") {
      data = data.filter((item) => item.section === sectionFilter);
    }

    if (sessionFilter !== "All") {
      data = data.filter((item) => item.session === sessionFilter);
    }

    if (examFilter !== "All") {
      data = data.filter(
        (item) => (item.examName || item.exam) === examFilter
      );
    }

    if (statusFilter !== "All") {
      data = data.filter((item) => item.computedStatus === statusFilter);
    }

    setFilteredResults(data);
  }, [
    results,
    search,
    classFilter,
    sectionFilter,
    sessionFilter,
    examFilter,
    statusFilter,
  ]);

  async function loadResultsAndAcademicConfig() {
    try {
      setLoading(true);
      setMessage("");

      const [resultSnapshot, subjectSnapshot, sessionSnapshot] =
        await Promise.all([
          getDocs(collection(db, "results")),
          getDocs(collection(db, "subjects")),
          getDocs(collection(db, "academicSessions")),
        ]);

      const subjects = subjectSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const sessions = sessionSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const active = sessions.find((item) => item.active === true) || null;
      setAcademicSubjects(subjects);
      setActiveSession(active);

      const rawResults = resultSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const normalizedResults = rawResults.map((result) => ({
        ...result,
        examName: result.examName || result.exam || "",
        computedStatus: normalizeResultStatus(result, subjects).status,
        computedFailedCount: normalizeResultStatus(result, subjects).failedCount,
      }));

      // Keep the stored result status synchronized with Add Result / Academic Configuration.
      await Promise.all(
        normalizedResults
          .filter(
            (item) =>
              item.computedStatus && item.status !== item.computedStatus
          )
          .map((item) =>
            updateDoc(doc(db, "results", item.id), {
              status: item.computedStatus,
              failedCount: item.computedFailedCount,
              updatedAt: new Date(),
            }).catch((error) =>
              console.warn("Status sync skipped:", item.id, error)
            )
          )
      );

      setResults(normalizedResults);
    } catch (error) {
      console.error("View Results loading error:", error);
      setMessage(error?.message || "Unable to load results.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(id, currentStatus) {
    try {
      await updateDoc(doc(db, "results", id), {
        publishStatus: currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
        published: currentStatus !== "PUBLISHED",
        publishedAt: currentStatus !== "PUBLISHED" ? new Date() : null,
        publishedBy: currentStatus !== "PUBLISHED" ? "Admin" : "",
        updatedAt: new Date(),
      });
      await loadResultsAndAcademicConfig();
    } catch (error) {
      console.error(error);
      setMessage(error?.message || "Unable to update publish status.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this Result?")) return;

    try {
      await deleteDoc(doc(db, "results", id));
      await loadResultsAndAcademicConfig();
    } catch (error) {
      console.error(error);
      setMessage(error?.message || "Unable to delete result.");
    }
  }

  const classes = useMemo(
    () => ["All", ...new Set(results.map((item) => item.className).filter(Boolean))],
    [results]
  );

  const sections = useMemo(
    () => ["All", ...new Set(results.map((item) => item.section).filter(Boolean))],
    [results]
  );

  const sessions = useMemo(
    () => ["All", ...new Set(results.map((item) => item.session).filter(Boolean))],
    [results]
  );

  const exams = useMemo(
    () => [
      "All",
      ...new Set(
        results
          .map((item) => item.examName || item.exam)
          .filter(Boolean)
      ),
    ],
    [results]
  );

  const totalResults = results.length;
  const passResults = results.filter((item) => item.computedStatus === "PASS").length;
  const failResults = results.filter((item) => item.computedStatus === "FAIL").length;
  const publishedResults = results.filter(
    (item) => item.publishStatus === "PUBLISHED" || item.published === true
  ).length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="mt-5 text-2xl font-bold text-green-700">
              Loading Results...
            </h2>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-green-700 font-bold tracking-wide">RESULT MANAGEMENT</p>
              <h1 className="text-4xl font-bold text-gray-900 mt-1">View Results</h1>
              <p className="text-gray-500 mt-2">
                Academic Configuration → Add Result → View Result
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Active Session</div>
              <div className="font-bold text-gray-800">
                {activeSession?.name || "Not configured"}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            {message}
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-5 mb-8">
          <Stat title="Total Results" value={totalResults} />
          <Stat title="PASS" value={passResults} />
          <Stat title="FAIL" value={failResults} />
          <Stat title="Published" value={publishedResults} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search student / enrollment / class"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />

            <Select label="Class" value={classFilter} onChange={setClassFilter} options={classes} />
            <Select label="Section" value={sectionFilter} onChange={setSectionFilter} options={sections} />
            <Select label="Session" value={sessionFilter} onChange={setSessionFilter} options={sessions} />
            <Select label="Exam" value={examFilter} onChange={setExamFilter} options={exams} />
            <Select
              label="Result Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={["All", "PASS", "FAIL"]}
            />

            <button
              onClick={loadResultsAndAcademicConfig}
              className="border border-green-700 text-green-700 hover:bg-green-50 rounded-xl px-4 py-3 font-semibold"
            >
              ↻ Refresh
            </button>

            <button
              onClick={() => navigate("/add-result")}
              className="bg-green-700 hover:bg-green-800 text-white rounded-xl px-4 py-3 font-semibold"
            >
              + Add Result
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-green-700 text-white">
                <tr>
                  <th className="p-4 text-left">Student</th>
                  <th className="p-4">Enrollment</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Session</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">%</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Result</th>
                  <th className="p-4">Publish</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-gray-500">
                      No Results Found
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((item) => {
                    const published =
                      item.publishStatus === "PUBLISHED" || item.published === true;
                    const status = item.computedStatus;

                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-semibold">{item.studentName || "-"}</td>
                        <td className="p-4 text-center">{item.enrollmentNo || "-"}</td>
                        <td className="p-4 text-center">
                          {item.className || "-"}{item.section ? `-${item.section}` : ""}
                        </td>
                        <td className="p-4 text-center">{item.session || "-"}</td>
                        <td className="p-4 text-center">{item.examName || item.exam || "-"}</td>
                        <td className="p-4 text-center font-bold">
                          {item.obtainedMarks ?? item.grandTotal ?? 0} / {item.maximumMarks ?? "-"}
                        </td>
                        <td className="p-4 text-center">{Number(item.percentage || 0).toFixed(2)}%</td>
                        <td className="p-4 text-center font-bold">{item.grade || "-"}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              status === "PASS"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handlePublish(item.id, published ? "PUBLISHED" : "DRAFT")}
                            className={`px-3 py-2 rounded-lg text-white font-semibold ${
                              published
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {published ? "Unpublish" : "Publish"}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => navigate(`/edit-result/${item.id}`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => navigate(`/result/${item.id}`)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-xl px-4 py-3 w-full bg-white"
      >
        {options.map((option) => (
          <option key={String(option)} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <p className="text-gray-500 font-semibold">{title}</p>
      <p className="text-4xl font-bold text-green-700 mt-2">{value}</p>
    </div>
  );
}

export default ViewResults;