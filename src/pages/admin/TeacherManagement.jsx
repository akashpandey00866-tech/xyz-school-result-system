import { useEffect, useMemo, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

import { db } from "../../config/firebase";

/* =========================================================
   SECURITY
   ---------------------------------------------------------
   - Teacher password is handled ONLY by Firebase Auth.
   - Password is NEVER stored in Firestore.
   - Secondary Firebase app prevents Admin logout.
========================================================= */

let secondaryAuth = null;

function getSecondaryAuth() {
  if (secondaryAuth) return secondaryAuth;

  const primaryApp = getApp();
  const appName = "teacher-account-creator";

  let secondaryApp = getApps().find(
    (app) => app.name === appName
  );

  if (!secondaryApp) {
    secondaryApp = initializeApp(
      primaryApp.options,
      appName
    );
  }

  secondaryAuth = getAuth(secondaryApp);

  return secondaryAuth;
}

/* =========================================================
   HELPERS
========================================================= */

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

/* =========================================================
   FORM
========================================================= */

const EMPTY_FORM = {
  name: "",
  email: "",
  whatsapp: "",

  sessionId: "",
  classId: "",
  section: "",

  subjectIds: [],

  isClassTeacher: false,
  classTeacherClassId: "",
  classTeacherSection: "",
};

/* =========================================================
   COMPONENT
========================================================= */

function TeacherManagement() {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] =
    useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [editingId, setEditingId] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  /* =======================================================
     MESSAGE MODAL
  ======================================================= */

  const [messageTeacher, setMessageTeacher] =
    useState(null);

  const [messageSubject, setMessageSubject] =
    useState("");

  const [messageText, setMessageText] =
    useState("");

  /* =======================================================
     BROADCAST MESSAGE
  ======================================================= */

  const [showBroadcastModal, setShowBroadcastModal] =
    useState(false);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        sessionSnap,
        classSnap,
        subjectSnap,
        classSubjectSnap,
        teacherSnap,
      ] = await Promise.all([
        getDocs(
          collection(
            db,
            "academicSessions"
          )
        ),

        getDocs(
          collection(
            db,
            "classes"
          )
        ),

        getDocs(
          collection(
            db,
            "subjects"
          )
        ),

        getDocs(
          collection(
            db,
            "classSubjects"
          )
        ),

        getDocs(
          collection(
            db,
            "teachers"
          )
        ),
      ]);

      setSessions(
        sessionSnap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        )
      );

      setClasses(
        classSnap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        )
      );

      setSubjects(
        subjectSnap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        )
      );

      setClassSubjects(
        classSubjectSnap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        )
      );

      setTeachers(
        teacherSnap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load Teacher Management data."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     ACTIVE SESSION
  ======================================================= */

  const activeSession = useMemo(
    () =>
      sessions.find(
        (item) =>
          item.active === true
      ) ||
      sessions[0] ||
      null,
    [sessions]
  );

  /* =======================================================
     CLASSES
  ======================================================= */

  const availableClasses =
    useMemo(() => {
      return classes
        .filter(
          (item) =>
            item.sessionId ===
            form.sessionId
        )
        .sort((a, b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            ),
            undefined,
            {
              numeric: true,
            }
          )
        );
    }, [
      classes,
      form.sessionId,
    ]);

  const selectedClass =
    useMemo(
      () =>
        availableClasses.find(
          (item) =>
            item.id ===
            form.classId
        ) || null,
      [
        availableClasses,
        form.classId,
      ]
    );

  const sections = useMemo(
    () =>
      Array.isArray(
        selectedClass?.sections
      )
        ? selectedClass.sections
        : [],
    [selectedClass]
  );

  /* =======================================================
     CLASS TEACHER CLASSES
  ======================================================= */

  const classTeacherClasses =
    useMemo(
      () =>
        classes.filter(
          (item) =>
            item.sessionId ===
            form.sessionId
        ),
      [
        classes,
        form.sessionId,
      ]
    );

  const classTeacherClass =
    useMemo(
      () =>
        classTeacherClasses.find(
          (item) =>
            item.id ===
            form.classTeacherClassId
        ) || null,
      [
        classTeacherClasses,
        form.classTeacherClassId,
      ]
    );

  const classTeacherSections =
    Array.isArray(
      classTeacherClass?.sections
    )
      ? classTeacherClass.sections
      : [];

  /* =======================================================
     SUBJECTS FOR SELECTED CLASS
  ======================================================= */

  const distribution =
    useMemo(
      () =>
        classSubjects.find(
          (item) =>
            item.classId ===
              form.classId &&
            item.sessionId ===
              form.sessionId
        ) || null,
      [
        classSubjects,
        form.classId,
        form.sessionId,
      ]
    );

  const availableSubjects =
    useMemo(() => {
      if (
        !distribution ||
        !Array.isArray(
          distribution.subjectIds
        )
      ) {
        return [];
      }

      return subjects.filter(
        (subject) =>
          subject.sessionId ===
            form.sessionId &&
          distribution.subjectIds.includes(
            subject.id
          ) &&
          normalize(
            subject.status
          ) !== "inactive"
      );
    }, [
      distribution,
      subjects,
      form.sessionId,
    ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredTeachers =
    useMemo(() => {
      const q =
        normalize(search);

      if (!q) return teachers;

      return teachers.filter(
        (teacher) =>
          normalize(
            teacher.name
          ).includes(q) ||
          normalize(
            teacher.email
          ).includes(q) ||
          normalize(
            teacher.className
          ).includes(q) ||
          normalize(
            teacher.section
          ).includes(q) ||
          normalize(
            teacher.classTeacherClassName
          ).includes(q) ||
          normalize(
            teacher.subjectNames?.join(
              " "
            )
          ).includes(q)
      );
    }, [
      teachers,
      search,
    ]);

  /* =======================================================
     FORM HELPERS
  ======================================================= */

  function updateForm(
    field,
    value
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function changeSession(
    sessionId
  ) {
    setForm((prev) => ({
      ...prev,

      sessionId,

      classId: "",
      section: "",
      subjectIds: [],

      classTeacherClassId: "",
      classTeacherSection: "",
    }));
  }

  function changeClass(
    classId
  ) {
    setForm((prev) => ({
      ...prev,

      classId,
      section: "",
      subjectIds: [],
    }));
  }

  function toggleSubject(
    subjectId
  ) {
    setForm((prev) => {
      const exists =
        prev.subjectIds.includes(
          subjectId
        );

      return {
        ...prev,

        subjectIds: exists
          ? prev.subjectIds.filter(
              (id) =>
                id !== subjectId
            )
          : [
              ...prev.subjectIds,
              subjectId,
            ],
      };
    });
  }

  /* =======================================================
     CREATE FORM
  ======================================================= */

  function openCreate() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,

      sessionId:
        activeSession?.id || "",
    });

    setSuccess("");
    setError("");
    setShowForm(true);
  }

  /* =======================================================
     EDIT FORM
  ======================================================= */

  function openEdit(
    teacher
  ) {
    setEditingId(
      teacher.id
    );

    setForm({
      name:
        teacher.name || "",

      email:
        teacher.email || "",

      whatsapp:
        teacher.whatsapp || "",

      sessionId:
        teacher.sessionId || "",

      classId:
        teacher.classId || "",

      section:
        teacher.section || "",

      subjectIds:
        Array.isArray(
          teacher.subjectIds
        )
          ? teacher.subjectIds
          : [],

      isClassTeacher:
        teacher.isClassTeacher ===
        true,

      classTeacherClassId:
        teacher.classTeacherClassId ||
        "",

      classTeacherSection:
        teacher.classTeacherSection ||
        "",
    });

    setSuccess("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  /* =======================================================
     CREATE TEACHER
  ======================================================= */

  async function createTeacher() {
    const name =
      form.name.trim();

    const email =
      normalize(form.email);

    const whatsapp =
      form.whatsapp.trim();

    if (!name) {
      setError(
        "Enter teacher name."
      );
      return;
    }

    if (
      !email ||
      !email.includes("@")
    ) {
      setError(
        "Enter a valid teacher email."
      );
      return;
    }

    if (!form.sessionId) {
      setError(
        "Select academic session."
      );
      return;
    }

    if (!form.classId) {
      setError(
        "Select teaching class."
      );
      return;
    }

    if (!form.section) {
      setError(
        "Select teaching section."
      );
      return;
    }

    if (
      form.subjectIds.length ===
      0
    ) {
      setError(
        "Select at least one subject."
      );
      return;
    }

    if (
      form.isClassTeacher &&
      !form.classTeacherClassId
    ) {
      setError(
        "Select Class Teacher class."
      );
      return;
    }

    if (
      form.isClassTeacher &&
      !form.classTeacherSection
    ) {
      setError(
        "Select Class Teacher section."
      );
      return;
    }

    const duplicate =
      teachers.some(
        (teacher) =>
          normalize(
            teacher.email
          ) === email
      );

    if (duplicate) {
      setError(
        "A teacher with this email already exists."
      );
      return;
    }

    const session =
      sessions.find(
        (item) =>
          item.id ===
          form.sessionId
      );

    const selectedSubjects =
      availableSubjects.filter(
        (subject) =>
          form.subjectIds.includes(
            subject.id
          )
      );

    const classTeacher =
      classTeacherClasses.find(
        (item) =>
          item.id ===
          form.classTeacherClassId
      );

    let authInstance =
      null;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      /* ---------------------------------------------------
         SECONDARY AUTH

         Admin remains logged in.
      --------------------------------------------------- */

      authInstance =
        getSecondaryAuth();

      /* ---------------------------------------------------
         CREATE ACCOUNT

         Password is randomly generated only for
         Firebase Authentication.

         It is NEVER written to Firestore.
      --------------------------------------------------- */

      const randomPassword =
        `${crypto.randomUUID()}Aa1!`;

      const credential =
        await createUserWithEmailAndPassword(
          authInstance,
          email,
          randomPassword
        );

      const authUid =
        credential.user.uid;

      /* ---------------------------------------------------
         FIRESTORE PROFILE
      --------------------------------------------------- */

      await setDoc(
  doc(
    db,
    "teachers",
    authUid
  ),
  {
    authUid,

    role: "teacher",

    name,
    email,
    whatsapp,

    sessionId:
      form.sessionId,

    sessionName:
      session?.name || "",

    classId:
      form.classId,

    className:
      selectedClass?.name || "",

    section:
      form.section,

    subjectIds:
      unique(
        form.subjectIds
      ),

    subjectNames:
      selectedSubjects.map(
        (subject) =>
          subject.name
      ),

    isClassTeacher:
      form.isClassTeacher,

    classTeacherClassId:
      form.isClassTeacher
        ? form.classTeacherClassId
        : "",

    classTeacherClassName:
      form.isClassTeacher
        ? classTeacher?.name || ""
        : "",

    classTeacherSection:
      form.isClassTeacher
        ? form.classTeacherSection
        : "",

    accountStatus:
      "ACTIVE",

    mustChangePassword:
      true,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  }
);

      /* ---------------------------------------------------
         SECURE PASSWORD SETUP EMAIL
      --------------------------------------------------- */

      await sendPasswordResetEmail(
        authInstance,
        email
      );

      /* ---------------------------------------------------
         ADMIN SESSION SAFE
      --------------------------------------------------- */

      await signOut(
        authInstance
      );

      setSuccess(
        `🎉 Congratulations! ${name} has been added successfully. A secure password setup email has been sent to ${email}.`
      );

      setShowForm(false);
      setForm(EMPTY_FORM);

      await loadData();
    } catch (err) {
      console.error(
        "Create teacher error:",
        err
      );

      if (
        err?.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "This email already exists in Firebase Authentication."
        );
      } else if (
        err?.code ===
        "auth/invalid-email"
      ) {
        setError(
          "Invalid email address."
        );
      } else if (
        err?.code ===
        "permission-denied"
      ) {
        setError(
          "Firestore permission denied. Check Firebase Security Rules."
        );
      } else {
        setError(
          err?.message ||
            "Unable to create teacher."
        );
      }

      try {
        if (authInstance) {
          await signOut(
            authInstance
          );
        }
      } catch {}
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     UPDATE TEACHER
  ======================================================= */

  async function updateTeacher() {
    if (!editingId) return;

    const name =
      form.name.trim();

    if (!name) {
      setError(
        "Enter teacher name."
      );
      return;
    }

    if (!form.sessionId) {
      setError(
        "Select academic session."
      );
      return;
    }

    if (!form.classId) {
      setError(
        "Select teaching class."
      );
      return;
    }

    if (!form.section) {
      setError(
        "Select teaching section."
      );
      return;
    }

    if (
      form.subjectIds.length ===
      0
    ) {
      setError(
        "Select at least one subject."
      );
      return;
    }

    if (
      form.isClassTeacher &&
      !form.classTeacherClassId
    ) {
      setError(
        "Select Class Teacher class."
      );
      return;
    }

    if (
      form.isClassTeacher &&
      !form.classTeacherSection
    ) {
      setError(
        "Select Class Teacher section."
      );
      return;
    }

    const session =
      sessions.find(
        (item) =>
          item.id ===
          form.sessionId
      );

    const classTeacher =
      classTeacherClasses.find(
        (item) =>
          item.id ===
          form.classTeacherClassId
      );

    const selectedSubjects =
      availableSubjects.filter(
        (subject) =>
          form.subjectIds.includes(
            subject.id
          )
      );

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateDoc(
        doc(
          db,
          "teachers",
          editingId
        ),
        {
          name,

          whatsapp:
            form.whatsapp.trim(),

          sessionId:
            form.sessionId,

          sessionName:
            session?.name || "",

          classId:
            form.classId,

          className:
            selectedClass?.name ||
            "",

          section:
            form.section,

          subjectIds:
            unique(
              form.subjectIds
            ),

          subjectNames:
            selectedSubjects.map(
              (subject) =>
                subject.name
            ),

          isClassTeacher:
            form.isClassTeacher,

          classTeacherClassId:
            form.isClassTeacher
              ? form.classTeacherClassId
              : "",

          classTeacherClassName:
            form.isClassTeacher
              ? classTeacher?.name ||
                ""
              : "",

          classTeacherSection:
            form.isClassTeacher
              ? form.classTeacherSection
              : "",

          updatedAt:
            serverTimestamp(),
        }
      );

      setSuccess(
        "Teacher details updated successfully."
      );

      closeForm();
      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to update teacher."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (editingId) {
      await updateTeacher();
    } else {
      await createTeacher();
    }
  }

  /* =======================================================
     RESET PASSWORD
  ======================================================= */

  async function resetPassword(
    teacher
  ) {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const authInstance =
        getSecondaryAuth();

      await sendPasswordResetEmail(
        authInstance,
        teacher.email
      );

      await signOut(
        authInstance
      );

      setSuccess(
        `🔐 Secure password reset email sent to ${teacher.email}.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to send password reset email."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     SEND PORTAL MESSAGE
  ======================================================= */

  async function sendMessage(
    event
  ) {
    event.preventDefault();

    if (!messageTeacher) return;

    if (
      !messageSubject.trim()
    ) {
      setError(
        "Enter message subject."
      );
      return;
    }

    if (
      !messageText.trim()
    ) {
      setError(
        "Enter message."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await addDoc(
        collection(
          db,
          "messages"
        ),
        {
          recipientUid:
            messageTeacher.authUid,

          recipientRole:
            "teacher",

          recipientName:
            messageTeacher.name,

          subject:
            messageSubject.trim(),

          message:
            messageText.trim(),

          senderRole:
            "admin",

          senderName:
            "School Administration",

          read: false,

          createdAt:
            serverTimestamp(),
        }
      );

      setSuccess(
        `📨 Message sent to ${messageTeacher.name}.`
      );

      setMessageTeacher(null);
      setMessageSubject("");
      setMessageText("");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to send message."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     BROADCAST MESSAGE — ALL ACTIVE TEACHERS
  ======================================================= */

  async function sendMessageToAllTeachers(event) {
    event.preventDefault();

    if (!messageSubject.trim()) {
      setError("Enter message subject.");
      return;
    }

    if (!messageText.trim()) {
      setError("Enter message.");
      return;
    }

    const activeTeachers = teachers.filter(
      (teacher) =>
        normalize(teacher.accountStatus) === "active" &&
        teacher.authUid
    );

    if (activeTeachers.length === 0) {
      setError("No active teachers with valid accounts were found.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await Promise.all(
        activeTeachers.map((teacher) =>
          addDoc(collection(db, "messages"), {
            recipientUid: teacher.authUid,
            recipientRole: "teacher",
            recipientName: teacher.name || "",
            subject: messageSubject.trim(),
            message: messageText.trim(),
            senderRole: "admin",
            senderName: "School Administration",
            read: false,
            messageType: "ANNOUNCEMENT",
            createdAt: serverTimestamp(),
          })
        )
      );

      setSuccess(
        `📢 Announcement sent successfully to ${activeTeachers.length} active teachers.`
      );

      setMessageSubject("");
      setMessageText("");
      setShowBroadcastModal(false);
    } catch (err) {
      console.error("Broadcast message error:", err);
      setError(
        err?.message ||
          "Unable to send announcement to all teachers."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     WHATSAPP

     IMPORTANT:
     No password is ever placed in WhatsApp.
     It tells teacher to check registered email.
  ======================================================= */

  function openWhatsApp(
    teacher
  ) {
    if (!teacher.whatsapp) {
      setError(
        "WhatsApp number is not available for this teacher."
      );
      return;
    }

    const phone =
      teacher.whatsapp.replace(
        /\D/g,
        ""
      );

    const text = `
🎉 Congratulations ${teacher.name}!

Your XYZ School Teacher account has been successfully created.

Registered Email:
${teacher.email}

Class:
${teacher.className} - ${teacher.section}

${
  teacher.isClassTeacher
    ? `Class Teacher:
${teacher.classTeacherClassName} - ${teacher.classTeacherSection}`
    : ""
}

Subjects:
${
  teacher.subjectNames?.join(
    ", "
  ) || "—"
}

🔐 For security, your password is NOT sent through WhatsApp.

Please check your registered email for the secure password setup link.

Regards,
XYZ School Administration
`.trim();

    const url =
      `https://wa.me/${phone}?text=` +
      encodeURIComponent(text);

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =======================================================
     ENABLE / DISABLE
  ======================================================= */

  async function toggleStatus(
    teacher
  ) {
    const active =
      normalize(
        teacher.accountStatus
      ) === "active";

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateDoc(
        doc(
          db,
          "teachers",
          teacher.id
        ),
        {
          accountStatus:
            active
              ? "DISABLED"
              : "ACTIVE",

          updatedAt:
            serverTimestamp(),
        }
      );

      setSuccess(
        `${teacher.name} ${
          active
            ? "disabled"
            : "enabled"
        } successfully.`
      );

      await loadData();
    } catch (err) {
      setError(
        err?.message ||
          "Unable to update status."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     DELETE PROFILE
  ======================================================= */

  async function deleteTeacher(
    teacher
  ) {
    const confirmed =
      window.confirm(
        `Delete teacher profile for ${teacher.name}?`
      );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      await deleteDoc(
        doc(
          db,
          "teachers",
          teacher.id
        )
      );

      setSuccess(
        "Teacher Firestore profile deleted."
      );

      await loadData();
    } catch (err) {
      setError(
        err?.message ||
          "Unable to delete teacher."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center">

          <div className="text-5xl">
            👨‍🏫
          </div>

          <div className="w-10 h-10 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mt-5" />

          <h2 className="font-black text-xl mt-5">
            Loading Teacher Management
          </h2>

        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">

      <div className="max-w-[1600px] mx-auto">

        {/* HEADER */}

        <div className="bg-gradient-to-r from-green-950 via-green-800 to-emerald-700 text-white rounded-3xl p-6 md:p-8 shadow-xl">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>

              <p className="text-green-200 text-xs font-black uppercase tracking-widest">
                School ERP
              </p>

              <h1 className="text-3xl md:text-4xl font-black mt-2">
                Teacher Management
              </h1>

              <p className="text-green-100 mt-2">
                Manage teachers, assignments and secure accounts.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={openCreate}
                className="group bg-white text-green-900 px-6 py-3 rounded-2xl font-black shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
              >
                <span className="mr-2">＋</span>
                Add Teacher
              </button>

              <button
                onClick={() => {
                  setMessageSubject("");
                  setMessageText("");
                  setError("");
                  setSuccess("");
                  setShowBroadcastModal(true);
                }}
                className="group bg-fuchsia-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-fuchsia-500 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
              >
                <span className="mr-2">📢</span>
                Message All Teachers
              </button>
            </div>

          </div>

        </div>

        {/* ALERT */}

        {(success ||
          error) && (
          <div
            className={`mt-5 p-4 rounded-2xl border font-semibold ${
              error
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {error ||
              success}
          </div>
        )}

        {/* STATS */}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
          <Stat
            title="Total Teachers"
            value={teachers.length}
            icon="👨‍🏫"
            accent="emerald"
          />

          <Stat
            title="Active Accounts"
            value={
              teachers.filter(
                (t) => normalize(t.accountStatus) === "active"
              ).length
            }
            icon="🟢"
            accent="cyan"
          />

          <Stat
            title="Class Teachers"
            value={
              teachers.filter((t) => t.isClassTeacher).length
            }
            icon="🎓"
            accent="violet"
          />

          <Stat
            title="Available Subjects"
            value={subjects.length}
            icon="📚"
            accent="amber"
          />
        </div>

        {/* SEARCH */}

        <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 p-4 mt-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
                🔎
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teacher, email, class, section or subject..."
                className="w-full border border-slate-200 bg-slate-50 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:bg-white focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-300 transition"
              />
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-fuchsia-50 to-cyan-50 border border-fuchsia-100 px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest font-black text-fuchsia-700">
                Showing
              </p>
              <p className="text-lg font-black text-slate-800">
                {filteredTeachers.length}
                <span className="text-sm text-slate-500 font-bold">
                  {" "}of {teachers.length}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* TABLE */}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 mt-5 overflow-hidden">

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-gradient-to-r from-slate-950 via-slate-900 to-fuchsia-950 text-white">

                <tr>

                  <Th>
                    Teacher
                  </Th>

                  <Th>
                    Teaching Class
                  </Th>

                  <Th>
                    Class Teacher
                  </Th>

                  <Th>
                    Subjects
                  </Th>

                  <Th>
                    Status
                  </Th>

                  <Th right>
                    Actions
                  </Th>

                </tr>

              </thead>

              <tbody>

                {filteredTeachers.length ===
                0 ? (

                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12 text-slate-500"
                    >
                      No teachers found.
                    </td>
                  </tr>

                ) : (

                  filteredTeachers.map(
                    (teacher) => {

                      const active =
                        normalize(
                          teacher.accountStatus
                        ) ===
                        "active";

                      return (
                        <tr
                          key={
                            teacher.id
                          }
                          className="border-t border-slate-100 hover:bg-gradient-to-r hover:from-fuchsia-50/50 hover:via-white hover:to-cyan-50/50 transition-colors"
                        >

                          <td className="px-5 py-5">

                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white flex items-center justify-center font-black shadow-md">
                                {(teacher.name || "T")
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black text-slate-900">
                                  {teacher.name}
                                </p>
                                <p className="text-sm text-cyan-700 font-semibold">
                                  {teacher.email}
                                </p>
                              </div>
                            </div>

                          </td>

                          <td className="px-5 py-5 font-bold">

                            <span className="inline-flex items-center rounded-xl bg-cyan-50 text-cyan-800 px-3 py-2">
                              {teacher.className || "—"}
                            </span>
                            <span className="mx-1 text-slate-400">•</span>
                            <span className="inline-flex items-center rounded-xl bg-violet-50 text-violet-800 px-3 py-2">
                              {teacher.section || "—"}
                            </span>

                          </td>

                          <td className="px-5 py-5">

                            {teacher.isClassTeacher ? (

                              <div>

                                <span className="bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-800 border border-violet-200 px-3 py-1 rounded-full text-xs font-black">
                                  CLASS TEACHER
                                </span>

                                <p className="font-bold mt-2">
                                  {
                                    teacher.classTeacherClassName
                                  }
                                  {" - "}
                                  {
                                    teacher.classTeacherSection
                                  }
                                </p>

                              </div>

                            ) : (

                              <span className="text-cyan-700 bg-cyan-50 border border-cyan-100 px-3 py-1 rounded-full text-xs font-black">
                                Subject Teacher
                              </span>

                            )}

                          </td>

                          <td className="px-5 py-5">

                            <div className="flex flex-wrap gap-2">

                              {(
                                teacher.subjectNames ||
                                []
                              ).map(
                                (
                                  subject,
                                  index
                                ) => (

                                  <span
                                    key={
                                      index
                                    }
                                    className="bg-gradient-to-r from-amber-50 to-orange-50 text-orange-800 border border-orange-100 px-2.5 py-1.5 rounded-xl text-xs font-black"
                                  >
                                    {
                                      subject
                                    }
                                  </span>

                                )
                              )}

                            </div>

                          </td>

                          <td className="px-5 py-5">

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black ${
                                active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {active
                                ? "ACTIVE"
                                : "DISABLED"}
                            </span>

                          </td>

                          <td className="px-5 py-5">

                            <div className="flex justify-end gap-2 flex-wrap">

                              <button
                                onClick={() =>
                                  setMessageTeacher(
                                    teacher
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-bold"
                              >
                                Message
                              </button>

                              <button
                                onClick={() =>
                                  resetPassword(
                                    teacher
                                  )
                                }
                                disabled={
                                  saving
                                }
                                className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold"
                              >
                                Reset Password
                              </button>

                              <button
                                onClick={() =>
                                  openWhatsApp(
                                    teacher
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-green-50 text-green-700 font-bold"
                              >
                                WhatsApp
                              </button>

                              <button
                                onClick={() =>
                                  openEdit(
                                    teacher
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-slate-100 font-bold"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  toggleStatus(
                                    teacher
                                  )
                                }
                                disabled={
                                  saving
                                }
                                className="px-3 py-2 rounded-lg bg-orange-50 text-orange-700 font-bold"
                              >
                                {active
                                  ? "Disable"
                                  : "Enable"}
                              </button>

                              <button
                                onClick={() =>
                                  deleteTeacher(
                                    teacher
                                  )
                                }
                                disabled={
                                  saving
                                }
                                className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-bold"
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* =================================================
            CREATE / EDIT MODAL
        ================================================= */}

        {showForm && (

          <Modal
            title={
              editingId
                ? "Edit Teacher"
                : "Create Teacher Account"
            }
            onClose={
              closeForm
            }
          >

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5"
            >

              <Field
                label="Teacher Name"
              >
                <input
                  value={
                    form.name
                  }
                  onChange={(e) =>
                    updateForm(
                      "name",
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="Enter teacher name"
                  required
                />
              </Field>

              <Field
                label="Teacher Email"
              >
                <input
                  type="email"
                  value={
                    form.email
                  }
                  disabled={
                    Boolean(
                      editingId
                    )
                  }
                  onChange={(e) =>
                    updateForm(
                      "email",
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="teacher@example.com"
                  required
                />
              </Field>

              <Field
                label="WhatsApp Number"
              >
                <input
                  value={
                    form.whatsapp
                  }
                  onChange={(e) =>
                    updateForm(
                      "whatsapp",
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="+91 9876543210"
                />

                <p className="text-xs text-slate-500 mt-1">
                  Password is never sent through WhatsApp.
                </p>

              </Field>

              <Field
                label="Academic Session"
              >
                <select
                  value={
                    form.sessionId
                  }
                  onChange={(e) =>
                    changeSession(
                      e.target.value
                    )
                  }
                  className="input"
                  required
                >

                  <option value="">
                    Select Session
                  </option>

                  {sessions.map(
                    (session) => (

                      <option
                        key={
                          session.id
                        }
                        value={
                          session.id
                        }
                      >
                        {
                          session.name
                        }

                        {session.active
                          ? " • ACTIVE"
                          : ""}
                      </option>

                    )
                  )}

                </select>
              </Field>

              <Field
                label="Teaching Class"
              >
                <select
                  value={
                    form.classId
                  }
                  onChange={(e) =>
                    changeClass(
                      e.target.value
                    )
                  }
                  className="input"
                  disabled={
                    !form.sessionId
                  }
                  required
                >

                  <option value="">
                    Select Class
                  </option>

                  {availableClasses.map(
                    (item) => (

                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.name
                        }
                      </option>

                    )
                  )}

                </select>
              </Field>

              <Field
                label="Teaching Section"
              >
                <select
                  value={
                    form.section
                  }
                  onChange={(e) =>
                    updateForm(
                      "section",
                      e.target.value
                    )
                  }
                  className="input"
                  disabled={
                    !form.classId
                  }
                  required
                >

                  <option value="">
                    Select Section
                  </option>

                  {sections.map(
                    (section) => (

                      <option
                        key={
                          section
                        }
                        value={
                          section
                        }
                      >
                        {
                          section
                        }
                      </option>

                    )
                  )}

                </select>
              </Field>

              <Field
                label="Assigned Subjects"
              >

                {availableSubjects.length ===
                0 ? (

                  <div className="border border-dashed rounded-xl p-4 text-sm text-slate-500">
                    Configure subjects for this class first.
                  </div>

                ) : (

                  <div className="grid sm:grid-cols-2 gap-3">

                    {availableSubjects.map(
                      (subject) => {

                        const selected =
                          form.subjectIds.includes(
                            subject.id
                          );

                        return (
                          <label
                            key={
                              subject.id
                            }
                            className={`border rounded-xl p-4 cursor-pointer ${
                              selected
                                ? "border-green-500 bg-green-50"
                                : "border-slate-200"
                            }`}
                          >

                            <input
                              type="checkbox"
                              checked={
                                selected
                              }
                              onChange={() =>
                                toggleSubject(
                                  subject.id
                                )
                              }
                              className="mr-2 accent-green-700"
                            />

                            <span className="font-bold">
                              {
                                subject.name
                              }
                            </span>

                            <span className="block text-xs text-slate-500 ml-6">
                              {
                                subject.code
                              }
                            </span>

                          </label>
                        );
                      }
                    )}

                  </div>

                )}

              </Field>

              {/* CLASS TEACHER */}

              <div className="border rounded-2xl p-5">

                <label className="flex items-center gap-3">

                  <input
                    type="checkbox"
                    checked={
                      form.isClassTeacher
                    }
                    onChange={(e) => {
                      updateForm(
                        "isClassTeacher",
                        e.target.checked
                      );

                      if (
                        !e.target.checked
                      ) {
                        updateForm(
                          "classTeacherClassId",
                          ""
                        );

                        updateForm(
                          "classTeacherSection",
                          ""
                        );
                      }
                    }}
                    className="w-5 h-5 accent-green-700"
                  />

                  <span className="font-black">
                    This teacher is a Class Teacher
                  </span>

                </label>

                {form.isClassTeacher && (

                  <div className="grid md:grid-cols-2 gap-4 mt-4">

                    <select
                      value={
                        form.classTeacherClassId
                      }
                      onChange={(e) =>
                        updateForm(
                          "classTeacherClassId",
                          e.target.value
                        )
                      }
                      className="input"
                      required
                    >

                      <option value="">
                        Select Class Teacher Class
                      </option>

                      {classTeacherClasses.map(
                        (item) => (

                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>

                        )
                      )}

                    </select>

                    <select
                      value={
                        form.classTeacherSection
                      }
                      onChange={(e) =>
                        updateForm(
                          "classTeacherSection",
                          e.target.value
                        )
                      }
                      className="input"
                      disabled={
                        !form.classTeacherClassId
                      }
                      required
                    >

                      <option value="">
                        Select Section
                      </option>

                      {classTeacherSections.map(
                        (section) => (

                          <option
                            key={
                              section
                            }
                            value={
                              section
                            }
                          >
                            {
                              section
                            }
                          </option>

                        )
                      )}

                    </select>

                  </div>

                )}

              </div>

              {/* SECURITY */}

              {!editingId && (

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">

                  <p className="font-black text-blue-800">
                    🔐 Secure Password Setup
                  </p>

                  <p className="text-sm text-blue-700 mt-1">
                    A password is generated only inside
                    Firebase Authentication. It is never
                    stored in Firestore and is never sent
                    through WhatsApp. The teacher receives
                    a secure password setup email.
                  </p>

                </div>

              )}

              <div className="flex gap-3 pt-2">

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex-1 bg-green-700 text-white rounded-xl py-3 font-black disabled:bg-slate-400"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Teacher"
                    : "🎉 Create Teacher"}
                </button>

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="px-6 bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>

              </div>

            </form>

          </Modal>

        )}

        {/* =================================================
            MESSAGE MODAL
        ================================================= */}

        {messageTeacher && (

          <Modal
            title="📨 Send Portal Message"
            onClose={() =>
              setMessageTeacher(
                null
              )
            }
          >

            <form
              onSubmit={
                sendMessage
              }
              className="space-y-5"
            >

              <div className="bg-slate-50 rounded-xl p-4">

                <p className="font-black">
                  {
                    messageTeacher.name
                  }
                </p>

                <p className="text-sm text-slate-500">
                  {
                    messageTeacher.email
                  }
                </p>

              </div>

              <Field
                label="Subject"
              >

                <input
                  value={
                    messageSubject
                  }
                  onChange={(e) =>
                    setMessageSubject(
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="Important Notice"
                  required
                />

              </Field>

              <Field
                label="Message"
              >

                <textarea
                  value={
                    messageText
                  }
                  onChange={(e) =>
                    setMessageText(
                      e.target.value
                    )
                  }
                  rows="6"
                  className="input resize-none"
                  placeholder="Write message..."
                  required
                />

              </Field>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="w-full bg-purple-700 text-white rounded-xl py-3 font-black"
              >
                {saving
                  ? "Sending..."
                  : "Send Message"}
              </button>

            </form>

          </Modal>

        )}

        {/* =================================================
            BROADCAST MESSAGE MODAL
        ================================================= */}

        {showBroadcastModal && (
          <Modal
            title="📢 Broadcast to All Teachers"
            onClose={() => {
              if (!saving) setShowBroadcastModal(false);
            }}
          >
            <form
              onSubmit={sendMessageToAllTeachers}
              className="space-y-5"
            >
              <div className="rounded-3xl p-5 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-cyan-50 border border-fuchsia-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-700 text-white flex items-center justify-center text-xl shadow-lg">
                    📢
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg">
                      School-wide Teacher Announcement
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      The announcement will appear in every active teacher's portal inbox.
                    </p>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center rounded-full bg-white/80 border border-white px-4 py-2 text-sm font-black text-fuchsia-800 shadow-sm">
                  👥{" "}
                  {teachers.filter(
                    (teacher) =>
                      normalize(teacher.accountStatus) === "active" &&
                      teacher.authUid
                  ).length}{" "}
                  active recipients
                </div>
              </div>

              <Field label="Message Subject">
                <input
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="input border-slate-200 focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-300"
                  placeholder="e.g. Staff Meeting Tomorrow"
                  maxLength={120}
                  required
                />
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {messageSubject.length}/120
                </p>
              </Field>

              <Field label="Announcement Message">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows="7"
                  maxLength={2000}
                  className="input resize-none border-slate-200 focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-300"
                  placeholder="Type your announcement here..."
                  required
                />
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {messageText.length}/2000
                </p>
              </Field>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <span className="font-black">🔐 Privacy:</span>{" "}
                Passwords, reset links and private credentials are never included in portal messages.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  disabled={saving}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl py-3.5 font-black transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 text-white rounded-2xl py-3.5 font-black shadow-lg hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Sending announcement..." : "📢 Send to All Teachers"}
                </button>
              </div>
            </form>
          </Modal>
        )}

      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Stat({
  title,
  value,
  icon = "✦",
  accent = "emerald",
}) {
  const themes = {
    emerald: {
      shell: "from-emerald-50 to-teal-50 border-emerald-100",
      icon: "from-emerald-500 to-teal-600",
      value: "text-emerald-800",
    },
    cyan: {
      shell: "from-cyan-50 to-sky-50 border-cyan-100",
      icon: "from-cyan-500 to-blue-600",
      value: "text-cyan-800",
    },
    violet: {
      shell: "from-violet-50 to-fuchsia-50 border-violet-100",
      icon: "from-violet-500 to-fuchsia-600",
      value: "text-violet-800",
    },
    amber: {
      shell: "from-amber-50 to-orange-50 border-amber-100",
      icon: "from-amber-500 to-orange-600",
      value: "text-orange-800",
    },
  };

  const theme = themes[accent] || themes.emerald;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${theme.shell} p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/50" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-black">
            {title}
          </p>
          <p className={`text-3xl md:text-4xl font-black mt-2 ${theme.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br ${theme.icon} text-white flex items-center justify-center text-xl shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  right,
}) {
  return (
    <th
      className={`px-5 py-4 text-sm font-black ${
        right
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div>
      <label className="block font-bold mb-2">
        {label}
      </label>

      {children}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl border border-white/70">

        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">

          <h2 className="text-2xl font-black bg-gradient-to-r from-fuchsia-700 via-violet-700 to-cyan-700 bg-clip-text text-transparent">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 font-black"
          >
            ✕
          </button>

        </div>

        <div className="p-6">
          {children}
        </div>

      </div>

    </div>
  );
}

export default TeacherManagement;