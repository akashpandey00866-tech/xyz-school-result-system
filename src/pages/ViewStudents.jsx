import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Edit3,
  WalletCards,
  History,
  Trash2,
  X,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Mail,
  Hash,
  MapPin,
  CalendarDays,
  UserRound,
} from "lucide-react";

import { db } from "../config/firebase";
import AdminLayout from "../layouts/AdminLayout";

function ViewStudents() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [openClass, setOpenClass] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleteEnrollment, setDeleteEnrollment] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  /* =========================================================
     LOAD STUDENTS
  ========================================================= */

  const loadStudents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const snapshot = await getDocs(
        collection(db, "students")
      );

      const data = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || "")
          )
        );

      setStudents(data);
    } catch (error) {
      console.error("Student records error:", error);
      alert(error?.message || "Unable to load students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return students;

    return students.filter((student) => {
      const searchable = [
        student.name,
        student.enrollmentNo,
        student.className,
        student.section,
        student.mobile,
        student.phone,
        student.email,
        student.fatherName,
        student.motherName,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchable.includes(term);
    });
  }, [students, search]);

  /* =========================================================
     CLASS + SECTION GROUPING
  ========================================================= */

  const groupedStudents = useMemo(() => {
    const groups = {};

    for (let i = 1; i <= 12; i++) {
      groups[String(i)] = {};
    }

    filteredStudents.forEach((student) => {
      const className =
        student.className ||
        student.class ||
        "Unknown";

      const section =
        student.section ||
        student.classSection ||
        "A";

      if (!groups[className]) {
        groups[className] = {};
      }

      if (!groups[className][section]) {
        groups[className][section] = [];
      }

      groups[className][section].push(student);
    });

    return groups;
  }, [filteredStudents]);

  const classEntries = Object.entries(groupedStudents).filter(
    ([, sections]) =>
      Object.values(sections).flat().length > 0
  );

  const activeStudents = students.filter(
    (student) =>
      String(student.status || "Active").toLowerCase() ===
      "active"
  ).length;

  const classCount = new Set(
    students.map(
      (student) =>
        student.className ||
        student.class ||
        "Unknown"
    )
  ).size;

  /* =========================================================
     SECURE DELETE
  ========================================================= */

  const openDelete = (student) => {
    setDeleteTarget(student);
    setDeleteName("");
    setDeleteEnrollment("");
    setDeleteError("");
  };

  const closeDelete = () => {
    if (deleting) return;

    setDeleteTarget(null);
    setDeleteName("");
    setDeleteEnrollment("");
    setDeleteError("");
  };

  const deleteVerified =
    deleteTarget &&
    deleteName.trim().toLowerCase() ===
      String(deleteTarget.name || "")
        .trim()
        .toLowerCase() &&
    deleteEnrollment.trim().toLowerCase() ===
      String(deleteTarget.enrollmentNo || "")
        .trim()
        .toLowerCase();

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (!deleteVerified) {
      setDeleteError(
        "Student Name and Enrollment Number do not match."
      );
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteDoc(
        doc(db, "students", deleteTarget.id)
      );

      setStudents((current) =>
        current.filter(
          (student) =>
            student.id !== deleteTarget.id
        )
      );

      if (profile?.id === deleteTarget.id) {
        setProfile(null);
      }

      closeDelete();
    } catch (error) {
      console.error(
        "Student deletion error:",
        error
      );

      setDeleteError(
        error?.message ||
          "Unable to delete student."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8">

        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-950 via-green-800 to-emerald-600 text-white shadow-xl">

          <div className="absolute -right-24 -top-28 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-32 w-96 h-96 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative p-6 sm:p-8">

            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

              <div className="flex items-start gap-4">

                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center shrink-0">
                  <Users size={29} />
                </div>

                <div>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold">
                    <CheckCircle2 size={13} />
                    Student Management
                  </span>

                  <h1 className="text-3xl sm:text-4xl font-black mt-3">
                    Student Records
                  </h1>

                  <p className="text-emerald-100 mt-2 max-w-2xl">
                    Manage student profiles, admissions,
                    fees, payment history and records from
                    one workspace.
                  </p>

                </div>
              </div>

              <button
                type="button"
                onClick={() => loadStudents(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-green-800 font-bold shadow-lg hover:bg-emerald-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={18}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh Records
              </button>

            </div>

          </div>
        </section>

        {/* =====================================================
            QUICK STATS
        ====================================================== */}

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">

          <StatCard
            icon={<Users size={21} />}
            title="Total Students"
            value={students.length}
            text="All registered records"
            bg="bg-white"
          />

          <StatCard
            icon={<CheckCircle2 size={21} />}
            title="Active Students"
            value={activeStudents}
            text="Currently active"
            bg="bg-emerald-50"
          />

          <StatCard
            icon={<GraduationCap size={21} />}
            title="Classes"
            value={classCount}
            text="Classes containing records"
            bg="bg-blue-50"
          />

          <StatCard
            icon={<Search size={21} />}
            title="Showing"
            value={filteredStudents.length}
            text="Records matching search"
            bg="bg-amber-50"
          />

        </section>

        {/* =====================================================
            SEARCH
        ====================================================== */}

        <section className="mt-6 bg-white border border-slate-200 rounded-3xl shadow-sm p-5">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Find a Student
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Search by name, enrollment, mobile,
                email, father name or class.
              </p>
            </div>

            <div className="relative w-full lg:max-w-2xl">

              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search Name / Enrollment / Mobile / Email..."
                className="w-full h-12 pl-12 pr-11 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <X size={17} />
                </button>
              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            RECORDS
        ====================================================== */}

        <section className="mt-6">

          {loading ? (

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-14 text-center">

              <RefreshCw
                size={30}
                className="animate-spin mx-auto text-green-700"
              />

              <h3 className="font-bold text-lg mt-4">
                Loading Student Records
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Fetching the latest data from Firebase...
              </p>

            </div>

          ) : classEntries.length === 0 ? (

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-14 text-center">

              <Users
                size={42}
                className="mx-auto text-slate-300"
              />

              <h3 className="font-bold text-xl mt-4">
                {search
                  ? "No Matching Students"
                  : "No Student Records"}
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                {search
                  ? "Try another search term."
                  : "Students will appear here after they are added."}
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {classEntries.map(
                ([className, sections]) => {

                  const studentsInClass =
                    Object.values(sections).flat();

                  const isOpen =
                    openClass === className ||
                    Boolean(search);

                  return (
                    <section
                      key={className}
                      className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
                    >

                      {/* CLASS BAR */}

                      <button
                        type="button"
                        onClick={() =>
                          setOpenClass(
                            isOpen
                              ? null
                              : className
                          )
                        }
                        className="w-full px-5 sm:px-6 py-4 bg-gradient-to-r from-green-700 to-emerald-600 text-white flex items-center justify-between hover:from-green-800 hover:to-emerald-700 transition"
                      >

                        <div className="flex items-center gap-3">

                          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                            <GraduationCap size={21} />
                          </div>

                          <div className="text-left">

                            <p className="text-lg font-black">
                              Class {className}
                            </p>

                            <p className="text-xs text-emerald-100">
                              {studentsInClass.length} Student
                              {studentsInClass.length !== 1
                                ? "s"
                                : ""}
                            </p>

                          </div>

                        </div>

                        <div className="flex items-center gap-3">

                          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-white/15 text-xs font-bold">
                            {Object.keys(sections).length} Section
                            {Object.keys(sections).length !== 1
                              ? "s"
                              : ""}
                          </span>

                          {isOpen ? (
                            <ChevronUp size={21} />
                          ) : (
                            <ChevronDown size={21} />
                          )}

                        </div>

                      </button>

                      {/* SECTIONS */}

                      {isOpen && (
                        <div className="p-4 sm:p-6 space-y-7">

                          {Object.entries(sections)
                            .sort(([a], [b]) =>
                              String(a).localeCompare(
                                String(b),
                                undefined,
                                { numeric: true }
                              )
                            )
                            .map(
                              ([section, sectionStudents]) => (

                                <div key={section}>

                                  <div className="flex items-center justify-between mb-4">

                                    <div className="flex items-center gap-3">

                                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                                        <Users size={19} />
                                      </div>

                                      <div>
                                        <h2 className="font-extrabold text-blue-800">
                                          Section {section}
                                        </h2>

                                        <p className="text-xs text-slate-500">
                                          {sectionStudents.length} student
                                          {sectionStudents.length !== 1
                                            ? "s"
                                            : ""}
                                        </p>
                                      </div>

                                    </div>

                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                                    {sectionStudents.map(
                                      (student) => (

                                        <StudentCard
                                          key={student.id}
                                          student={student}
                                          onView={() =>
                                            setProfile(
                                              student
                                            )
                                          }
                                          onEdit={() =>
                                            navigate(
                                              `/edit-student/${student.id}`
                                            )
                                          }
                                          onCollect={() =>
                                            navigate(
                                              `/collect-fee/${student.id}`
                                            )
                                          }
                                          onHistory={() =>
                                            navigate(
                                              `/payment-history/${student.id}`
                                            )
                                          }
                                          onDelete={() =>
                                            openDelete(
                                              student
                                            )
                                          }
                                        />

                                      )
                                    )}

                                  </div>

                                </div>

                              )
                            )}

                        </div>
                      )}

                    </section>
                  );
                }
              )}

            </div>

          )}

        </section>

      </div>

      {/* =====================================================
          PROFILE MODAL
      ====================================================== */}

      {profile && (
        <ProfileModal
          student={profile}
          onClose={() =>
            setProfile(null)
          }
          onEdit={() =>
            navigate(
              `/edit-student/${profile.id}`
            )
          }
          onCollect={() =>
            navigate(
              `/collect-fee/${profile.id}`
            )
          }
          onHistory={() =>
            navigate(
              `/payment-history/${profile.id}`
            )
          }
          onDelete={() => {
            const target = profile;
            setProfile(null);
            openDelete(target);
          }}
        />
      )}

      {/* =====================================================
          DELETE MODAL
      ====================================================== */}

      {deleteTarget && (
        <DeleteModal
          student={deleteTarget}
          name={deleteName}
          enrollment={deleteEnrollment}
          setName={setDeleteName}
          setEnrollment={setDeleteEnrollment}
          verified={deleteVerified}
          error={deleteError}
          deleting={deleting}
          onClose={closeDelete}
          onConfirm={confirmDelete}
        />
      )}

    </AdminLayout>
  );
}

/* ===========================================================
   STUDENT CARD
=========================================================== */

function StudentCard({
  student,
  onView,
  onEdit,
  onCollect,
  onHistory,
  onDelete,
}) {
  const name =
    student.name ||
    "Unnamed Student";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="group bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-green-200 hover:shadow-xl hover:-translate-y-0.5 transition">

      <div className="flex gap-4">

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50 text-green-700 flex items-center justify-center text-lg font-black shrink-0">
          {initials || "ST"}
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <h3 className="font-extrabold text-slate-900 truncate">
                {name}
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Enrollment:{" "}
                <b className="text-slate-700">
                  {student.enrollmentNo || "—"}
                </b>
              </p>

            </div>

            <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              {student.status || "Active"}
            </span>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-2 mt-5">

        <MiniInfo
          icon={<GraduationCap size={14} />}
          label="Class"
          value={
            student.className ||
            student.class ||
            "—"
          }
        />

        <MiniInfo
          icon={<Users size={14} />}
          label="Section"
          value={
            student.section ||
            "—"
          }
        />

        <MiniInfo
          icon={<Phone size={14} />}
          label="Mobile"
          value={
            student.mobile ||
            student.phone ||
            "—"
          }
        />

        <MiniInfo
          icon={<Mail size={14} />}
          label="Email"
          value={
            student.email ||
            "—"
          }
        />

      </div>

      {/* ALL EXISTING ACTIONS PRESERVED */}

      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">

        <ActionButton
          icon={<Eye size={15} />}
          label="Profile"
          onClick={onView}
          className="bg-slate-900 hover:bg-slate-800 text-white"
        />

        <ActionButton
          icon={<Edit3 size={15} />}
          label="Edit"
          onClick={onEdit}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        />

        <ActionButton
          icon={<WalletCards size={15} />}
          label="Collect Fee"
          onClick={onCollect}
          className="bg-green-600 hover:bg-green-700 text-white"
        />

        <ActionButton
          icon={<History size={15} />}
          label="History"
          onClick={onHistory}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        />

        <button
          type="button"
          onClick={onDelete}
          className="col-span-2 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-700 font-bold text-sm hover:bg-red-100 transition"
        >
          <Trash2 size={15} />
          Delete Student
        </button>

      </div>

    </article>
  );
}

/* ===========================================================
   PROFILE MODAL
=========================================================== */

function ProfileModal({
  student,
  onClose,
  onEdit,
  onCollect,
  onHistory,
  onDelete,
}) {
  const fields = [
    ["Name", student.name, <UserRound size={16} />],
    ["Enrollment", student.enrollmentNo, <Hash size={16} />],
    [
      "Class",
      student.className || student.class,
      <GraduationCap size={16} />,
    ],
    [
      "Section",
      student.section,
      <Users size={16} />,
    ],
    [
      "Mobile",
      student.mobile || student.phone,
      <Phone size={16} />,
    ],
    [
      "Email",
      student.email,
      <Mail size={16} />,
    ],
    [
      "Father",
      student.fatherName,
      <UserRound size={16} />,
    ],
    [
      "Mother",
      student.motherName,
      <UserRound size={16} />,
    ],
    [
      "Address",
      student.address,
      <MapPin size={16} />,
    ],
    [
      "Session",
      student.session ||
        student.academicSession,
      <CalendarDays size={16} />,
    ],
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">

        <div className="sticky top-0 z-10 bg-white border-b p-5 flex items-center justify-between">

          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-green-700">
              Student Profile
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-1">
              {student.name || "Student"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
          >
            <X size={19} />
          </button>

        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-3">

          {fields.map(
            ([label, value, icon]) => (

              <div
                key={label}
                className="rounded-2xl border border-slate-200 p-4"
              >

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  {icon}
                  {label}
                </div>

                <p className="mt-2 font-bold text-slate-800 break-words">
                  {value || "Not available"}
                </p>

              </div>

            )
          )}

        </div>

        <div className="p-5 border-t grid grid-cols-2 sm:flex sm:justify-end gap-2">

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold"
          >
            <Edit3 size={16} />
            Edit
          </button>

          <button
            type="button"
            onClick={onCollect}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white font-bold"
          >
            <WalletCards size={16} />
            Collect Fee
          </button>

          <button
            type="button"
            onClick={onHistory}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-bold"
          >
            <History size={16} />
            History
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold"
          >
            <Trash2 size={16} />
            Delete
          </button>

        </div>

      </div>
    </div>
  );
}

/* ===========================================================
   SECURE DELETE MODAL
=========================================================== */

function DeleteModal({
  student,
  name,
  enrollment,
  setName,
  setEnrollment,
  verified,
  error,
  deleting,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="bg-gradient-to-r from-red-700 to-rose-600 text-white p-6">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <ShieldAlert size={25} />
            </div>

            <div>

              <h2 className="text-xl font-black">
                Confirm Student Deletion
              </h2>

              <p className="text-red-100 text-sm mt-1">
                Verification is required before deletion.
              </p>

            </div>

          </div>

        </div>

        <div className="p-6">

          <div className="rounded-2xl bg-red-50 border border-red-100 p-4">

            <p className="text-xs font-bold uppercase tracking-wide text-red-600">
              Selected Student
            </p>

            <p className="font-black text-slate-900 mt-1">
              {student.name || "—"}
            </p>

            <p className="text-sm text-slate-600 mt-1">
              Enrollment:{" "}
              <b>{student.enrollmentNo || "—"}</b>
            </p>

          </div>

          <p className="text-sm text-slate-600 mt-5 leading-6">
            To prevent accidental deletion, type the
            exact <b>Student Name</b> and{" "}
            <b>Enrollment Number</b>.
            The delete action will remain locked until
            both values match.
          </p>

          <div className="space-y-4 mt-5">

            <div>
              <label className="block text-sm font-bold mb-2">
                Student Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter exact student name"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Enrollment Number
              </label>

              <input
                type="text"
                value={enrollment}
                onChange={(event) =>
                  setEnrollment(event.target.value)
                }
                placeholder="Enter exact enrollment number"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none"
              />
            </div>

          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">

            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={!verified || deleting}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={17} />
                  Confirm Delete
                </>
              )}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   SMALL COMPONENTS
=========================================================== */

function StatCard({
  icon,
  title,
  value,
  text,
  bg,
}) {
  return (
    <div
      className={`${bg} border border-slate-200 rounded-2xl p-5 shadow-sm`}
    >

      <div className="flex items-center justify-between">

        <div className="w-10 h-10 rounded-xl bg-white/80 text-green-700 flex items-center justify-center">
          {icon}
        </div>

        <p className="text-2xl font-black text-slate-900">
          {value}
        </p>

      </div>

      <p className="font-bold text-slate-900 mt-4">
        {title}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        {text}
      </p>

    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 min-w-0">

      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
        <span className="text-green-700">
          {icon}
        </span>
        {label}
      </div>

      <p className="text-xs font-semibold text-slate-700 mt-1 truncate">
        {value}
      </p>

    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

export default ViewStudents;