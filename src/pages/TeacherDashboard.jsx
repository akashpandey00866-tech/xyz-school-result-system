import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";


const MAX_ITEMS = 25;

const normalize = (value) =>
  String(value ?? "").trim().toLowerCase();

function formatDateTime(timestamp) {
  if (!timestamp?.toDate) return "Just now";

  return timestamp.toDate().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function expiresText(timestamp) {
  if (!timestamp?.toDate) return "24-hour notice";

  const difference =
    timestamp.toDate().getTime() - Date.now();

  if (difference <= 0) return "Expired";

  const hours = Math.floor(
    difference / (1000 * 60 * 60)
  );

  const minutes = Math.floor(
    (difference % (1000 * 60 * 60)) /
      (1000 * 60)
  );

  if (hours > 0) {
    return `Expires in ${hours}h ${minutes}m`;
  }

  return `Expires in ${minutes}m`;
}

function TeacherDashboard() {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [notices, setNotices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);


  const [attendanceDate, setAttendanceDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [historyOpenStudent, setHistoryOpenStudent] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");


  const [allTeachers, setAllTeachers] = useState([]);
  const [allTeachersLoading, setAllTeachersLoading] = useState(false);

  const [attendanceAccess, setAttendanceAccess] = useState([]);
  const [attendanceAccessLoading, setAttendanceAccessLoading] = useState(false);
  const [attendanceAccessSaving, setAttendanceAccessSaving] = useState(false);


  const [myAttendanceAccess, setMyAttendanceAccess] = useState([]);
  const [myAttendanceAccessLoading, setMyAttendanceAccessLoading] = useState(false);


  const [selectedAttendanceScopeId, setSelectedAttendanceScopeId] = useState("OWN");


  const [accessTeacherId, setAccessTeacherId] = useState("");
  const [accessTeacherSearch, setAccessTeacherSearch] = useState("");
  const [accessSubjectId, setAccessSubjectId] = useState("");
  const [accessNotice, setAccessNotice] = useState("");

  const [activeTab, setActiveTab] =
    useState("overview");

  const [error, setError] = useState("");

  
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          setAuthUser(null);
          setTeacher(null);
          setLoading(false);
          navigate("/student-login", {
            replace: true,
          });
          return;
        }

        try {
          setLoading(true);
          setError("");

          const teacherRef = doc(
            db,
            "teachers",
            currentUser.uid
          );

          const teacherSnapshot =
            await getDoc(teacherRef);

          if (!teacherSnapshot.exists()) {
            await signOut(auth);
            navigate("/student-login", {
              replace: true,
            });
            return;
          }

          const teacherData = {
            id: teacherSnapshot.id,
            ...teacherSnapshot.data(),
          };

          
          if (
            normalize(teacherData.role) !==
            "teacher"
          ) {
            await signOut(auth);
            navigate("/student-login", {
              replace: true,
            });
            return;
          }

          
          if (
            normalize(
              teacherData.accountStatus
            ) === "disabled"
          ) {
            await signOut(auth);
            setError(
              "Your teacher account is disabled. Please contact administration."
            );
            navigate("/student-login", {
              replace: true,
            });
            return;
          }

          setAuthUser(currentUser);
          setTeacher(teacherData);
        } catch (err) {
          console.error(
            "Teacher profile error:",
            err
          );

          setError(
            "Unable to load your teacher account."
          );
        } finally {
          setLoading(false);
        }
      });

    return unsubscribe;
  }, [navigate]);

  
  useEffect(() => {
    if (!authUser?.uid) return;

    const messagesQuery = query(
      collection(db, "messages"),
      where(
        "recipientUid",
        "==",
        authUser.uid
      ),
      orderBy("createdAt", "desc"),
      limit(MAX_ITEMS)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (err) => {
        console.error(
          "Messages listener:",
          err
        );
      }
    );

    return unsubscribe;
  }, [authUser?.uid]);

  
  useEffect(() => {
    if (!authUser?.uid) return;

    const noticesQuery = query(
      collection(db, "notices"),
      where(
        "recipientUid",
        "==",
        authUser.uid
      ),
      orderBy("createdAt", "desc"),
      limit(MAX_ITEMS)
    );

    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const now = Date.now();

        const activeNotices =
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .filter((item) => {
              if (
                !item.expiresAt?.toDate
              ) {
                return true;
              }

              return (
                item.expiresAt
                  .toDate()
                  .getTime() > now
              );
            });

        setNotices(activeNotices);
      },
      (err) => {
        console.error(
          "Notice listener:",
          err
        );
      }
    );

    return unsubscribe;
  }, [authUser?.uid]);

  
  useEffect(() => {
    if (!authUser?.uid) return;

    const requestQuery = query(
      collection(db, "teacherRequests"),
      where(
        "teacherUid",
        "==",
        authUser.uid
      ),
      orderBy("createdAt", "desc"),
      limit(MAX_ITEMS)
    );

    const unsubscribe = onSnapshot(
      requestQuery,
      (snapshot) => {
        setRequests(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (err) => {
        console.error(
          "Teacher request listener:",
          err
        );
      }
    );

    return unsubscribe;
  }, [authUser?.uid]);

  
  const teacherSubjects = useMemo(() => {
    const ids = Array.isArray(teacher?.subjectIds)
      ? teacher.subjectIds
      : [];
    const names = Array.isArray(teacher?.subjectNames)
      ? teacher.subjectNames
      : [];

    return ids
      .map((id, index) => ({
        id: String(id || ""),
        name: names[index] || "Assigned Subject",
      }))
      .filter((item) => item.id);
  }, [teacher?.subjectIds, teacher?.subjectNames]);

  const canManageAttendanceAccess = Boolean(
    teacher?.isClassTeacher &&
      teacher?.classTeacherClassId &&
      teacher?.classTeacherSection
  );

  
  useEffect(() => {
    if (!authUser?.uid) {
      setMyAttendanceAccess([]);
      return;
    }

    setMyAttendanceAccessLoading(true);

    const accessQuery = query(
      collection(db, "attendanceAccess"),
      where("teacherUid", "==", authUser.uid),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      accessQuery,
      (snapshot) => {
        const records = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter(
            (item) =>
              normalize(item.status) === "active" &&
              item.teacherUid === authUser.uid
          );

        setMyAttendanceAccess(records);
        setMyAttendanceAccessLoading(false);
      },
      (err) => {
        console.error("My attendance access listener:", err);
        setMyAttendanceAccess([]);
        setMyAttendanceAccessLoading(false);
      }
    );

    return unsubscribe;
  }, [authUser?.uid]);

  
  useEffect(() => {
    if (!authUser?.uid || !canManageAttendanceAccess) {
      setAttendanceAccess([]);
      return;
    }

    setAttendanceAccessLoading(true);

    const accessQuery = query(
      collection(db, "attendanceAccess"),
      where("classTeacherUid", "==", authUser.uid),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      accessQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter(
            (item) =>
              String(item.classId || "") ===
                String(teacher.classTeacherClassId || "") &&
              normalize(item.section) ===
                normalize(
                  teacher.classTeacherSection || teacher.section
                ) &&
              String(item.sessionId || "") ===
                String(teacher.sessionId || "")
          );

        setAttendanceAccess(list);
        setAttendanceAccessLoading(false);
      },
      (err) => {
        console.error("Attendance access listener:", err);
        setAttendanceAccess([]);
        setAttendanceAccessLoading(false);
      }
    );

    return unsubscribe;
  }, [
    authUser?.uid,
    canManageAttendanceAccess,
    teacher?.classTeacherClassId,
    teacher?.classTeacherSection,
    teacher?.section,
    teacher?.sessionId,
  ]);

  
  const attendanceScopes = useMemo(() => {
    const scopes = [];

    if (teacher?.className && teacher?.section) {
      scopes.push({
        id: "OWN",
        type: "OWN",
        classId: teacher.classId || teacher.classTeacherClassId || "",
        className: String(teacher.className),
        section: String(teacher.section),
        sessionId: teacher.sessionId || "",
        sessionName: teacher.sessionName || "",
        subjectId: teacher.isClassTeacher ? "ALL_CLASS" : "",
        subjectName: teacher.isClassTeacher
          ? "Class Attendance"
          : "",
        classTeacherUid: teacher.authUid || authUser?.uid || "",
        classTeacherName: teacher.name || "",
        label: `My Class • ${teacher.className}-${teacher.section}`,
      });
    }

    myAttendanceAccess.forEach((item) => {
      if (!item.className || !item.section) return;

      const id = item.id || [
        item.classId,
        item.section,
        item.subjectId || "ALL_CLASS",
        item.sessionId || "session",
      ].join("_");

      const duplicate = scopes.some(
        (scope) =>
          scope.className === String(item.className) &&
          normalize(scope.section) === normalize(item.section) &&
          String(scope.subjectId || "") === String(item.subjectId || "")
      );

      if (!duplicate) {
        scopes.push({
          id: `ACCESS:${id}`,
          type: "DELEGATED",
          accessId: id,
          classId: item.classId || "",
          className: String(item.className),
          section: String(item.section),
          sessionId: item.sessionId || "",
          sessionName: item.sessionName || "",
          subjectId: item.subjectId || "ALL_CLASS",
          subjectName: item.subjectName || "Class Attendance",
          classTeacherUid: item.classTeacherUid || "",
          classTeacherName: item.classTeacherName || "",
          teacherUid: item.teacherUid || authUser?.uid || "",
          label: `${item.className}-${item.section} • ${
            item.subjectName || "Class Attendance"
          }`,
        });
      }
    });

    return scopes;
  }, [
    teacher,
    authUser?.uid,
    myAttendanceAccess,
  ]);

  
  useEffect(() => {
    if (!attendanceScopes.length) {
      setSelectedAttendanceScopeId("OWN");
      return;
    }

    const exists = attendanceScopes.some(
      (scope) => scope.id === selectedAttendanceScopeId
    );

    if (!exists) {
      setSelectedAttendanceScopeId(attendanceScopes[0].id);
    }
  }, [attendanceScopes, selectedAttendanceScopeId]);

  const effectiveAttendanceScope = useMemo(() => {
    return (
      attendanceScopes.find(
        (scope) => scope.id === selectedAttendanceScopeId
      ) ||
      attendanceScopes[0] ||
      null
    );
  }, [attendanceScopes, selectedAttendanceScopeId]);

  const isDelegatedAttendanceScope =
    effectiveAttendanceScope?.type === "DELEGATED";

  
  useEffect(() => {
    if (
      !effectiveAttendanceScope?.className ||
      !effectiveAttendanceScope?.section
    ) {
      setStudents([]);
      return;
    }

    setStudentsLoading(true);

    const studentsQuery = query(
      collection(db, "students"),
      where(
        "className",
        "==",
        String(effectiveAttendanceScope.className)
      ),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const targetSection = normalize(
          effectiveAttendanceScope.section
        );

        const scopedStudents = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((student) => {
            const sameSection =
              normalize(student.section) === targetSection;

            const notArchived =
              student.isArchived !== true;

            const activeStatus =
              !student.status ||
              normalize(student.status) === "active";

            return (
              sameSection &&
              notArchived &&
              activeStatus
            );
          })
          .sort((a, b) => {
            const aRoll = Number(a.enrollmentNo);
            const bRoll = Number(b.enrollmentNo);

            if (
              Number.isFinite(aRoll) &&
              Number.isFinite(bRoll)
            ) {
              return aRoll - bRoll;
            }

            return String(
              a.enrollmentNo ?? ""
            ).localeCompare(
              String(b.enrollmentNo ?? ""),
              undefined,
              { numeric: true }
            );
          });

        setStudents(scopedStudents);
        setStudentsLoading(false);
      },
      (err) => {
        console.error("Scoped students listener:", err);
        setStudents([]);
        setStudentsLoading(false);
        setError(
          "Unable to load students for the selected attendance class."
        );
      }
    );

    return unsubscribe;
  }, [
    effectiveAttendanceScope?.className,
    effectiveAttendanceScope?.section,
  ]);

  
  useEffect(() => {
    if (
      !effectiveAttendanceScope?.className ||
      !effectiveAttendanceScope?.section ||
      !attendanceDate
    ) {
      setAttendanceMap({});
      return;
    }

    setAttendanceLoading(true);

    const attendanceQuery = query(
      collection(db, "attendance"),
      where(
        "className",
        "==",
        String(effectiveAttendanceScope.className)
      ),
      limit(2000)
    );

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const scoped = {};

        snapshot.docs.forEach((item) => {
          const data = item.data();

          if (
            normalize(data.section) !==
              normalize(effectiveAttendanceScope.section) ||
            String(data.date ?? "") !==
              String(attendanceDate)
          ) {
            return;
          }

          const recordSubject =
            String(data.subjectId || "ALL_CLASS");

          const requestedSubject =
            String(
              effectiveAttendanceScope.subjectId ||
                "ALL_CLASS"
            );

          if (recordSubject !== requestedSubject) {
            return;
          }

          if (data.studentId) {
            scoped[data.studentId] = {
              id: item.id,
              ...data,
            };
          }
        });

        setAttendanceMap(scoped);
        setAttendanceLoading(false);
      },
      (err) => {
        console.error("Attendance listener:", err);
        setAttendanceMap({});
        setAttendanceLoading(false);
        setError(
          "Unable to load attendance for the selected date."
        );
      }
    );

    return unsubscribe;
  }, [
    effectiveAttendanceScope?.className,
    effectiveAttendanceScope?.section,
    effectiveAttendanceScope?.subjectId,
    attendanceDate,
  ]);

  function getAttendanceStatus(studentId) {
    return (
      attendanceMap[studentId]?.status ||
      "PRESENT"
    );
  }

  function setStudentAttendance(
    studentId,
    status
  ) {
    setAttendanceMap((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] || {}),
        studentId,
        status,
      },
    }));
  }

  function markAllAttendance(
    status = "PRESENT"
  ) {
    const next = {};

    students.forEach((student) => {
      next[student.id] = {
        ...(attendanceMap[student.id] || {}),
        studentId: student.id,
        status,
      };
    });

    setAttendanceMap(next);
  }

  async function saveAttendance() {
    if (
      !authUser?.uid ||
      !effectiveAttendanceScope?.className ||
      !effectiveAttendanceScope?.section ||
      !attendanceDate ||
      students.length === 0
    ) {
      setError(
        "No attendance class is available."
      );
      return;
    }

    try {
      setAttendanceSaving(true);
      setError("");

      const batch = writeBatch(db);
      const validStatuses = new Set([
        "PRESENT",
        "ABSENT",
        "LEAVE",
      ]);

      
      const subjectId =
        effectiveAttendanceScope.subjectId ||
        "ALL_CLASS";

      const subjectName =
        effectiveAttendanceScope.subjectName ||
        "Class Attendance";

      students.forEach((student) => {
        const status =
          getAttendanceStatus(student.id);

        if (!validStatuses.has(status)) return;

        const attendanceId = [
          effectiveAttendanceScope.sessionId ||
            teacher.sessionId ||
            "session",
          attendanceDate,
          student.id,
          subjectId,
        ]
          .join("_")
          .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

        const attendanceRef = doc(
          db,
          "attendance",
          attendanceId
        );

        batch.set(
          attendanceRef,
          {
            studentId: student.id,
            studentName:
              student.name || "",
            enrollmentNo: String(
              student.enrollmentNo ?? ""
            ),
            classId:
              effectiveAttendanceScope.classId ||
              "",
            className: String(
              effectiveAttendanceScope.className
            ),
            section: String(
              effectiveAttendanceScope.section
            ),
            sessionId:
              effectiveAttendanceScope.sessionId ||
              teacher.sessionId ||
              "",
            sessionName:
              effectiveAttendanceScope.sessionName ||
              teacher.sessionName ||
              "",
            subjectId,
            subjectName,
            date: attendanceDate,
            status,
            markedBy: authUser.uid,
            markedByName:
              teacher.name ||
              authUser.displayName ||
              "Teacher",
            markedByRole: "teacher",
            accessType:
              effectiveAttendanceScope.type,
            classTeacherUid:
              effectiveAttendanceScope.classTeacherUid ||
              "",
            classTeacherName:
              effectiveAttendanceScope.classTeacherName ||
              "",
            remarks:
              attendanceMap[student.id]
                ?.remarks || "",
            createdAt:
              attendanceMap[student.id]
                ?.createdAt ||
              serverTimestamp(),
            updatedAt:
              serverTimestamp(),
          },
          { merge: true }
        );
      });

      await batch.commit();
    } catch (err) {
      console.error(
        "Save attendance error:",
        err
      );

      setError(
        err?.code ===
          "permission-denied"
          ? "Permission denied. This teacher does not have attendance access for this class/subject."
          : "Unable to save attendance. Please try again."
      );
    } finally {
      setAttendanceSaving(false);
    }
  }

  
  async function openStudentHistory(student) {
    if (
      !student?.id ||
      !effectiveAttendanceScope?.className
    ) {
      return;
    }

    try {
      setHistoryOpenStudent(student);
      setHistoryLoading(true);

      const historyQuery = query(
        collection(db, "attendance"),
        where(
          "className",
          "==",
          String(
            effectiveAttendanceScope.className
          )
        ),
        limit(2000)
      );

      const snapshot =
        await getDocs(historyQuery);

      const requestedSubject =
        String(
          effectiveAttendanceScope.subjectId ||
            "ALL_CLASS"
        );

      const history = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter(
          (item) =>
            String(item.studentId || "") ===
              String(student.id) &&
            normalize(item.section) ===
              normalize(
                effectiveAttendanceScope.section
              ) &&
            String(
              item.subjectId || "ALL_CLASS"
            ) === requestedSubject
        )
        .sort((a, b) =>
          String(
            b.date || ""
          ).localeCompare(
            String(a.date || "")
          )
        );

      setAttendanceHistory(
        (current) => ({
          ...current,
          [student.id]: history,
        })
      );
    } catch (err) {
      console.error(
        "Student attendance history error:",
        err
      );
      setError(
        "Unable to load student attendance history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  
  function exportAttendanceRows(
    rows,
    filename
  ) {
    const safeRows = Array.isArray(rows)
      ? rows
      : [];

    const header = [
      "Date",
      "Student Name",
      "Enrollment No",
      "Class",
      "Section",
      "Subject",
      "Status",
      "Marked By",
      "Remarks",
    ];

    const escapeCell = (value) => {
      const str = String(value ?? "");
      return `"${str.replace(
        /"/g,
        '""'
      )}"`;
    };

    const lines = [
      header
        .map(escapeCell)
        .join("\t"),
      ...safeRows.map((row) =>
        [
          row.date,
          row.studentName,
          row.enrollmentNo,
          row.className,
          row.section,
          row.subjectName,
          row.status,
          row.markedByName,
          row.remarks,
        ]
          .map(escapeCell)
          .join("\t")
      ),
    ];

    const blob = new Blob(
      [
        "\uFEFF" +
          lines.join("\n"),
      ],
      {
        type:
          "application/vnd.ms-excel;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      filename.endsWith(".xls")
        ? filename
        : `${filename}.xls`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  async function exportSelectedDateAttendance() {
    const rows = Object.values(
      attendanceMap
    ).map((row) => ({
      ...row,
      date: attendanceDate,
    }));

    exportAttendanceRows(
      rows,
      `attendance_${
        effectiveAttendanceScope?.className ||
        teacher.className
      }_${
        effectiveAttendanceScope?.section ||
        teacher.section
      }_${attendanceDate}.xls`
    );
  }

  async function exportCompleteClassAttendance() {
    if (
      !effectiveAttendanceScope?.className
    ) {
      return;
    }

    try {
      setAttendanceLoading(true);

      const attendanceQuery = query(
        collection(db, "attendance"),
        where(
          "className",
          "==",
          String(
            effectiveAttendanceScope.className
          )
        ),
        limit(5000)
      );

      const snapshot =
        await getDocs(
          attendanceQuery
        );

      const requestedSubject =
        String(
          effectiveAttendanceScope.subjectId ||
            "ALL_CLASS"
        );

      const rows = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter(
          (item) =>
            normalize(item.section) ===
              normalize(
                effectiveAttendanceScope.section
              ) &&
            String(
              item.subjectId || "ALL_CLASS"
            ) === requestedSubject
        )
        .sort((a, b) =>
          `${a.date}_${a.enrollmentNo}`.localeCompare(
            `${b.date}_${b.enrollmentNo}`
          )
        );

      exportAttendanceRows(
        rows,
        `complete_attendance_${
          effectiveAttendanceScope.className
        }_${
          effectiveAttendanceScope.section
        }_${
          effectiveAttendanceScope.subjectName ||
          "Class"
        }.xls`
      );
    } catch (err) {
      console.error(
        "Complete attendance export error:",
        err
      );
      setError(
        "Unable to export complete attendance."
      );
    } finally {
      setAttendanceLoading(false);
    }
  }

  
  useEffect(() => {
    if (
      !authUser?.uid ||
      !canManageAttendanceAccess
    ) {
      setAllTeachers([]);
      return;
    }

    setAllTeachersLoading(true);

    const teachersQuery = query(
      collection(db, "teachers"),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      teachersQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((item) => {
            const role =
              normalize(item.role);

            const status =
              normalize(
                item.accountStatus ||
                  item.status
              );

            const teacherUid =
              item.authUid ||
              item.id;

            return (
              role === "teacher" &&
              status !== "inactive" &&
              status !== "disabled" &&
              teacherUid !== authUser.uid
            );
          })
          .sort((a, b) =>
            String(
              a.name || ""
            ).localeCompare(
              String(
                b.name || ""
              )
            )
          );

        setAllTeachers(list);
        setAllTeachersLoading(false);
      },
      (err) => {
        console.error(
          "Teacher directory listener:",
          err
        );
        setAllTeachers([]);
        setAllTeachersLoading(false);
      }
    );

    return unsubscribe;
  }, [
    authUser?.uid,
    canManageAttendanceAccess,
  ]);

  const selectedAccessTeacher =
    useMemo(
      () =>
        allTeachers.find(
          (item) =>
            item.id ===
            accessTeacherId
        ) || null,
      [
        allTeachers,
        accessTeacherId,
      ]
    );

  const selectedAccessTeacherSubjects =
    useMemo(() => {
      if (!selectedAccessTeacher)
        return [];

      const ids =
        Array.isArray(
          selectedAccessTeacher.subjectIds
        )
          ? selectedAccessTeacher.subjectIds
          : [];

      const names =
        Array.isArray(
          selectedAccessTeacher.subjectNames
        )
          ? selectedAccessTeacher.subjectNames
          : [];

      return ids
        .map((id, index) => ({
          id: String(id || ""),
          name:
            names[index] ||
            "Assigned Subject",
        }))
        .filter(
          (item) => item.id
        );
    }, [
      selectedAccessTeacher,
    ]);

  
  useEffect(() => {
    if (
      !selectedAccessTeacher
    ) {
      setAccessSubjectId("");
      return;
    }

    const subjects =
      selectedAccessTeacherSubjects;

    if (!subjects.length) {
      setAccessSubjectId(
        "ALL_CLASS"
      );
      return;
    }

    const stillValid =
      subjects.some(
        (subject) =>
          subject.id ===
          accessSubjectId
      );

    if (!stillValid) {
      setAccessSubjectId(
        subjects[0].id
      );
    }
  }, [
    selectedAccessTeacher,
    selectedAccessTeacherSubjects,
    accessSubjectId,
  ]);

  async function grantAttendanceAccess() {
    if (
      !canManageAttendanceAccess ||
      !accessTeacherId
    ) {
      setAccessNotice(
        "Only the Class Teacher can grant attendance access."
      );
      return;
    }

    if (
      !teacher?.classTeacherClassId ||
      !teacher?.classTeacherSection
    ) {
      setAccessNotice(
        "Your Class Teacher class/section is not configured."
      );
      return;
    }

    const selectedTeacher =
      selectedAccessTeacher;

    if (
      !selectedTeacher
    ) {
      setAccessNotice(
        "Please select a teacher."
      );
      return;
    }

    const teacherUid =
      selectedTeacher.authUid ||
      selectedTeacher.id;

    if (!teacherUid) {
      setAccessNotice(
        "Selected teacher account could not be verified."
      );
      return;
    }

    const selectedSubject =
      selectedAccessTeacherSubjects.find(
        (item) =>
          item.id ===
          accessSubjectId
      ) || null;

    const subjectId =
      selectedSubject?.id ||
      "ALL_CLASS";

    const subjectName =
      selectedSubject?.name ||
      "Class Attendance";

    try {
      setAttendanceAccessSaving(
        true
      );
      setAccessNotice("");

      const accessId = [
        teacherUid,
        teacher.classTeacherClassId,
        teacher.classTeacherSection ||
          teacher.section,
        subjectId,
        teacher.sessionId ||
          "session",
      ]
        .join("_")
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

      await setDoc(
        doc(
          db,
          "attendanceAccess",
          accessId
        ),
        {
          teacherUid,
          teacherName:
            selectedTeacher.name ||
            "",
          teacherEmail:
            selectedTeacher.email ||
            "",
          subjectId,
          subjectName,
          classId:
            teacher.classTeacherClassId,
          className:
            teacher.classTeacherClassName ||
            teacher.className ||
            "",
          section:
            teacher.classTeacherSection ||
            teacher.section ||
            "",
          sessionId:
            teacher.sessionId ||
            "",
          sessionName:
            teacher.sessionName ||
            "",
          accessType:
            "CLASS_TEACHER_GRANTED",
          status: "ACTIVE",
          classTeacherUid:
            authUser.uid,
          classTeacherName:
            teacher.name ||
            authUser.displayName ||
            "",
          grantedBy:
            authUser.uid,
          grantedByName:
            teacher.name ||
            authUser.displayName ||
            "",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
        { merge: true }
      );

      setAccessNotice(
        `${selectedTeacher.name || "Teacher"} can now mark ${
          subjectName
        } attendance for Class ${
          teacher.classTeacherClassName ||
          teacher.className
        }-${teacher.classTeacherSection || teacher.section}.`
      );

      setAccessTeacherId("");
      setAccessSubjectId("");
    } catch (err) {
      console.error(
        "Grant attendance access error:",
        err
      );

      setAccessNotice(
        err?.code ===
          "permission-denied"
          ? "Permission denied. Update Firestore Rules for Class Teacher attendance access."
          : "Unable to grant attendance access."
      );
    } finally {
      setAttendanceAccessSaving(
        false
      );
    }
  }

  async function revokeAttendanceAccess(
    access
  ) {
    if (
      !access?.id ||
      !canManageAttendanceAccess
    ) {
      return;
    }

    try {
      setAttendanceAccessSaving(
        true
      );

      await updateDoc(
        doc(
          db,
          "attendanceAccess",
          access.id
        ),
        {
          status: "REVOKED",
          revokedAt:
            serverTimestamp(),
          revokedBy:
            authUser.uid,
          revokedByName:
            teacher.name ||
            authUser.displayName ||
            "",
          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (err) {
      console.error(
        "Revoke attendance access error:",
        err
      );
      setAccessNotice(
        "Unable to revoke attendance access."
      );
    } finally {
      setAttendanceAccessSaving(
        false
      );
    }
  }

  const unreadMessages = useMemo(
    () =>
      messages.filter(
        (item) => item.read !== true
      ).length,
    [messages]
  );

  const unreadNotices = useMemo(
    () =>
      notices.filter(
        (item) => item.read !== true
      ).length,
    [notices]
  );

  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          normalize(item.status) ===
          "pending"
      ).length,
    [requests]
  );

  
  async function markMessageRead(message) {
    if (
      !message?.id ||
      message.read === true
    ) {
      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "messages",
          message.id
        ),
        {
          read: true,
          readAt: serverTimestamp(),
        }
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to mark message as read."
      );
    }
  }

  
  async function markNoticeRead(notice) {
    if (
      !notice?.id ||
      notice.read === true
    ) {
      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "notices",
          notice.id
        ),
        {
          read: true,
          readAt: serverTimestamp(),
        }
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to mark notice as read."
      );
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      navigate("/student-login", {
        replace: true,
      });
    } catch (err) {
      console.error(err);
      setError("Unable to logout.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-5">
            👨‍🏫
          </div>

          <div className="w-12 h-12 mx-auto rounded-full border-4 border-cyan-300/20 border-t-cyan-300 animate-spin" />

          <h1 className="mt-5 text-xl font-black">
            Loading Teacher Portal...
          </h1>

          <p className="mt-2 text-slate-400">
            Verifying your assigned access
          </p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md">
          <div className="text-5xl">
            🔐
          </div>

          <h1 className="text-2xl font-black mt-4">
            Teacher profile unavailable
          </h1>

          <p className="text-slate-500 mt-2">
            Please contact the school administrator.
          </p>
        </div>
      </div>
    );
  }

  const displayName =
    teacher.name ||
    authUser?.displayName ||
    "Teacher";

  const tabs = [
    ["overview", "📊 Overview"],
    ["attendance", "📅 Attendance"],
    ["results", "📝 Results"],
    ["fees", "💰 Fees"],
    [
      "notices",
      `📢 Notices${
        unreadNotices
          ? ` (${unreadNotices})`
          : ""
      }`,
    ],
    [
      "messages",
      `📨 Messages${
        unreadMessages
          ? ` (${unreadMessages})`
          : ""
      }`,
    ],
    [
      "requests",
      `📩 Requests${
        pendingRequests
          ? ` (${pendingRequests})`
          : ""
      }`,
    ],
    ["profile", "👤 Profile"],
  ];

  return (
    <div className="min-h-screen bg-[#070b16]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,.22),_transparent_32%),radial-gradient(circle_at_top_left,_rgba(6,182,212,.18),_transparent_28%)]">

        {}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl shadow-lg">
                👨‍🏫
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[.25em] text-cyan-300 font-black">
                  XYZ School ERP
                </p>

                <h1 className="text-white font-black text-lg md:text-xl">
                  Teacher Portal
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <div className="hidden lg:block text-right mr-2">
                <p className="text-white font-bold">
                  {displayName}
                </p>

                <p className="text-xs text-slate-400">
                  {teacher.className ||
                    "Assigned Class"}{" "}
                  •{" "}
                  {teacher.section || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("messages")
                }
                className="relative w-11 h-11 rounded-xl bg-white/10 text-white hover:bg-white/15 transition"
                title="Messages"
              >
                📨

                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-fuchsia-500 text-white text-[10px] font-black flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("notices")
                }
                className="relative w-11 h-11 rounded-xl bg-white/10 text-white hover:bg-white/15 transition"
                title="Notifications"
              >
                🔔

                {unreadNotices > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {unreadNotices}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={logout}
                className="hidden sm:block px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-white font-bold transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">

          {error && (
            <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-red-200 font-bold">
              {error}
            </div>
          )}

          {}
          <section className="rounded-[2rem] overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-cyan-950 border border-white/10 shadow-2xl p-6 md:p-8 text-white">

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">

              <div>
                <p className="text-cyan-300 text-xs uppercase tracking-[.25em] font-black">
                  Welcome back
                </p>

                <h2 className="text-3xl md:text-5xl font-black mt-2">
                  {displayName}
                </h2>

                <p className="text-slate-300 mt-3 max-w-2xl">
                  Your access is restricted to your
                  assigned class, section and
                  authorized subjects.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>
                  {teacher.className ||
                    "Class not assigned"}
                </Badge>

                <Badge>
                  Section{" "}
                  {teacher.section || "—"}
                </Badge>

                {teacher.isClassTeacher && (
                  <Badge>
                    🎓 Class Teacher
                  </Badge>
                )}
              </div>
            </div>
          </section>

          {}
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {tabs.map(([id, label]) => (
              <button
                type="button"
                key={id}
                onClick={() =>
                  setActiveTab(id)
                }
                className={`whitespace-nowrap px-4 py-3 rounded-xl font-black text-sm transition ${
                  activeTab === id
                    ? "bg-white text-slate-950 shadow-lg"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {}
          {activeTab === "overview" && (
            <Overview
              teacher={teacher}
              students={students}
              studentsLoading={studentsLoading}
              messages={messages}
              notices={notices}
              requests={requests}
              onTab={setActiveTab}
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceSection
              teacher={teacher}
              students={students}
              studentsLoading={studentsLoading}
              attendanceDate={attendanceDate}
              setAttendanceDate={setAttendanceDate}
              attendanceMap={attendanceMap}
              attendanceLoading={attendanceLoading}
              attendanceSaving={attendanceSaving}
              attendanceSearch={attendanceSearch}
              setAttendanceSearch={setAttendanceSearch}
              getAttendanceStatus={getAttendanceStatus}
              setStudentAttendance={setStudentAttendance}
              markAllAttendance={markAllAttendance}
              saveAttendance={saveAttendance}
              openStudentHistory={openStudentHistory}
              attendanceHistory={attendanceHistory}
              historyOpenStudent={historyOpenStudent}
              historyLoading={historyLoading}
              setHistoryOpenStudent={setHistoryOpenStudent}
              exportSelectedDateAttendance={exportSelectedDateAttendance}
              exportCompleteClassAttendance={exportCompleteClassAttendance}
              canManageAttendanceAccess={canManageAttendanceAccess}
              allTeachers={allTeachers}
              allTeachersLoading={allTeachersLoading}
              attendanceAccess={attendanceAccess}
              attendanceAccessLoading={attendanceAccessLoading}
              attendanceAccessSaving={attendanceAccessSaving}
              myAttendanceAccess={myAttendanceAccess}
              myAttendanceAccessLoading={myAttendanceAccessLoading}
              attendanceScopes={attendanceScopes}
              effectiveAttendanceScope={effectiveAttendanceScope}
              selectedAttendanceScopeId={selectedAttendanceScopeId}
              setSelectedAttendanceScopeId={setSelectedAttendanceScopeId}
              accessTeacherId={accessTeacherId}
              setAccessTeacherId={setAccessTeacherId}
              accessTeacherSearch={accessTeacherSearch}
              setAccessTeacherSearch={setAccessTeacherSearch}
              accessSubjectId={accessSubjectId}
              setAccessSubjectId={setAccessSubjectId}
              teacherSubjects={teacherSubjects}
              selectedAccessTeacherSubjects={selectedAccessTeacherSubjects}
              selectedAccessTeacher={selectedAccessTeacher}
              grantAttendanceAccess={grantAttendanceAccess}
              revokeAttendanceAccess={revokeAttendanceAccess}
              accessNotice={accessNotice}
            />
          )}

          {activeTab === "results" && (
            <ResultsSection
              teacher={teacher}
              students={students}
              authUser={authUser}
            />
          )}

          {activeTab === "fees" && (
            <FeesSection
              teacher={teacher}
              students={students}
              authUser={authUser}
            />
          )}

          {activeTab === "notices" && (
            <NoticeSection
              notices={notices}
              onRead={markNoticeRead}
            />
          )}

          {activeTab === "messages" && (
            <MessageSection
              messages={messages}
              onRead={markMessageRead}
            />
          )}

          {activeTab === "requests" && (
            <RequestSection
              requests={requests}
              teacher={teacher}
              authUser={authUser}
            />
          )}

          {activeTab === "profile" && (
            <ProfileSection
              teacher={teacher}
            />
          )}

        </main>
      </div>
    </div>
  );
}


function Overview({
  teacher,
  students,
  studentsLoading,
  messages,
  notices,
  requests,
  onTab,
}) {
  const unreadMessages =
    messages.filter(
      (item) => !item.read
    ).length;

  const unreadNotices =
    notices.filter(
      (item) => !item.read
    ).length;

  const pendingRequests =
    requests.filter(
      (item) =>
        normalize(item.status) ===
        "pending"
    ).length;

  const cards = [
    {
      icon: "📅",
      title: "Attendance",
      text: "Manage attendance for assigned students",
      tab: "attendance",
      color:
        "from-cyan-500 to-blue-600",
    },
    {
      icon: "📝",
      title: "Results",
      text: "Enter authorized marks",
      tab: "results",
      color:
        "from-violet-500 to-fuchsia-600",
    },
    {
      icon: "💰",
      title: "Fees",
      text: "Authorized fee collection",
      tab: "fees",
      color:
        "from-emerald-500 to-teal-600",
    },
    {
      icon: "📢",
      title: "Notices",
      text: `${unreadNotices} unread notices`,
      tab: "notices",
      color:
        "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="mt-6 space-y-5">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            type="button"
            key={card.title}
            onClick={() =>
              onTab(card.tab)
            }
            className="text-left rounded-3xl bg-white p-5 shadow-xl hover:-translate-y-1 transition-all"
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center text-xl`}
            >
              {card.icon}
            </div>

            <h3 className="font-black text-lg mt-4">
              {card.title}
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              {card.text}
            </p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        <section className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xl">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-600 font-black">
                Assigned scope
              </p>

              <h3 className="text-2xl font-black mt-1">
                My Class
              </h3>
            </div>

            <span className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-800 font-black">
              {teacher.className || "—"}{" "}
              •{" "}
              {teacher.section || "—"}
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <MiniStat
              title="Students"
              value={studentsLoading ? "…" : students.length}
            />

            <MiniStat
              title="Attendance"
              value="—"
            />

            <MiniStat
              title="Pending Results"
              value="—"
            />
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Authorized subjects
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {(teacher.subjectNames ||
                []
              ).map(
                (
                  subject,
                  index
                ) => (
                  <span
                    key={`${subject}-${index}`}
                    className="px-3 py-2 rounded-xl bg-violet-50 text-violet-800 border border-violet-100 font-black text-sm"
                  >
                    {subject}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-6 shadow-xl">

          <p className="text-xs uppercase tracking-widest text-fuchsia-600 font-black">
            Communication
          </p>

          <h3 className="text-2xl font-black mt-1">
            Quick Center
          </h3>

          <div className="space-y-3 mt-6">

            <button
              type="button"
              onClick={() =>
                onTab("messages")
              }
              className="w-full text-left rounded-2xl bg-slate-50 hover:bg-fuchsia-50 p-4 font-bold transition"
            >
              📨 Admin Messages
              <span className="block text-xs text-slate-500 mt-1">
                {unreadMessages} unread
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onTab("notices")
              }
              className="w-full text-left rounded-2xl bg-slate-50 hover:bg-cyan-50 p-4 font-bold transition"
            >
              🔔 Notifications
              <span className="block text-xs text-slate-500 mt-1">
                {notices.length} active
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onTab("requests")
              }
              className="w-full text-left rounded-2xl bg-slate-50 hover:bg-amber-50 p-4 font-bold transition"
            >
              📩 Admin Requests
              <span className="block text-xs text-slate-500 mt-1">
                {pendingRequests} pending
              </span>
            </button>

          </div>
        </section>
      </div>
    </div>
  );
}


function AttendanceSection({
  teacher,
  students,
  studentsLoading,
  attendanceDate,
  setAttendanceDate,
  attendanceMap,
  attendanceLoading,
  attendanceSaving,
  attendanceSearch,
  setAttendanceSearch,
  getAttendanceStatus,
  setStudentAttendance,
  markAllAttendance,
  saveAttendance,
  openStudentHistory,
  attendanceHistory,
  historyOpenStudent,
  historyLoading,
  setHistoryOpenStudent,
  exportSelectedDateAttendance,
  exportCompleteClassAttendance,
  canManageAttendanceAccess,
  allTeachers,
  allTeachersLoading,
  attendanceAccess,
  attendanceAccessLoading,
  attendanceAccessSaving,
  myAttendanceAccess,
  myAttendanceAccessLoading,
  attendanceScopes,
  effectiveAttendanceScope,
  selectedAttendanceScopeId,
  setSelectedAttendanceScopeId,
  accessTeacherId,
  setAccessTeacherId,
  accessTeacherSearch,
  setAccessTeacherSearch,
  accessSubjectId,
  setAccessSubjectId,
  teacherSubjects,
  selectedAccessTeacherSubjects,
  selectedAccessTeacher,
  grantAttendanceAccess,
  revokeAttendanceAccess,
  accessNotice,
}) {
  const filteredStudents = students.filter((student) => {
    const q = normalize(attendanceSearch);
    if (!q) return true;

    return [
      student.name,
      student.enrollmentNo,
      student.email,
      student.mobile,
    ].some((value) => normalize(value).includes(q));
  });

  const counts = students.reduce(
    (acc, student) => {
      const status = getAttendanceStatus(student.id);
      if (status === "PRESENT") acc.present += 1;
      if (status === "ABSENT") acc.absent += 1;
      if (status === "LEAVE") acc.leave += 1;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

  const percentage = students.length
    ? Math.round((counts.present / students.length) * 100)
    : 0;

  const filteredTeachers = allTeachers.filter((item) => {
    const q = normalize(accessTeacherSearch);
    if (!q) return true;

    return [
      item.name,
      item.email,
      item.whatsapp,
      ...(item.subjectNames || []),
    ].some((value) => normalize(value).includes(q));
  });

  const activeAccess = attendanceAccess.filter(
    (item) => item.status === "ACTIVE"
  );

  const openHistory = historyOpenStudent
    ? attendanceHistory[historyOpenStudent.id] || []
    : [];

  const historyCounts = openHistory.reduce(
    (acc, row) => {
      if (row.status === "PRESENT") acc.present += 1;
      if (row.status === "ABSENT") acc.absent += 1;
      if (row.status === "LEAVE") acc.leave += 1;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

  const historyPercentage = openHistory.length
    ? Math.round(
        (historyCounts.present / openHistory.length) * 100
      )
    : 0;

  return (
    <section className="mt-6 space-y-5">
      <div className="bg-white rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-600 font-black">
              Attendance Center
            </p>
            <h3 className="text-3xl font-black mt-1 text-slate-900">
              📅 {effectiveAttendanceScope?.className || "Class"} • {effectiveAttendanceScope?.section || "—"}
            </h3>
            <p className="text-slate-500 mt-2">
              {effectiveAttendanceScope?.type === "DELEGATED"
                ? "You are using attendance access granted by a Class Teacher."
                : "You automatically manage attendance for your own class."}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[260px]">
              <span className="block text-xs uppercase tracking-wider text-violet-600 font-black mb-2">
                Attendance Class / Subject
              </span>
              <select
                value={selectedAttendanceScopeId}
                onChange={(event) =>
                  setSelectedAttendanceScopeId(event.target.value)
                }
                className="w-full px-4 py-3 rounded-2xl border border-violet-200 bg-violet-50 font-black text-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
              >
                {attendanceScopes.map((scope) => (
                  <option key={scope.id} value={scope.id}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-xs uppercase tracking-wider text-slate-500 font-black mb-2">
                Date
              </span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </label>

            <span className="px-4 py-3 rounded-2xl bg-cyan-50 text-cyan-800 font-black">
              🔒 Access Controlled
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <MiniStat title="Students" value={studentsLoading ? "…" : students.length} />
          <MiniStat title="Present" value={studentsLoading ? "…" : counts.present} />
          <MiniStat title="Absent" value={studentsLoading ? "…" : counts.absent} />
          <MiniStat title="Attendance %" value={studentsLoading ? "…" : `${percentage}%`} />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-black">Present</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">{counts.present}</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 border border-red-100">
            <p className="text-xs uppercase tracking-wider text-red-600 font-black">Absent</p>
            <p className="text-2xl font-black text-red-800 mt-1">{counts.absent}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
            <p className="text-xs uppercase tracking-wider text-amber-600 font-black">Leave</p>
            <p className="text-2xl font-black text-amber-800 mt-1">{counts.leave}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-violet-600 font-black">
              Daily Entry
            </p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {attendanceDate}
            </h4>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => markAllAttendance("PRESENT")}
              disabled={studentsLoading || !students.length}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black disabled:opacity-50"
            >
              ✓ All Present
            </button>

            <button
              type="button"
              onClick={() => markAllAttendance("ABSENT")}
              disabled={studentsLoading || !students.length}
              className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-black disabled:opacity-50"
            >
              All Absent
            </button>

            <button
              type="button"
              onClick={exportSelectedDateAttendance}
              disabled={!Object.keys(attendanceMap).length}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black disabled:opacity-50"
            >
              📥 Today's Excel
            </button>

            <button
              type="button"
              onClick={saveAttendance}
              disabled={
                attendanceSaving ||
                attendanceLoading ||
                studentsLoading ||
                !students.length
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-black disabled:opacity-50"
            >
              {attendanceSaving ? "Saving..." : "💾 Save Attendance"}
            </button>
          </div>
        </div>

        <input
          type="search"
          value={attendanceSearch}
          onChange={(event) => setAttendanceSearch(event.target.value)}
          placeholder="Search student..."
          className="w-full mt-5 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-cyan-400 font-semibold"
        />

        {attendanceLoading && (
          <div className="mt-4 rounded-2xl bg-cyan-50 border border-cyan-100 p-4 text-cyan-900 font-bold">
            Loading saved attendance...
          </div>
        )}

        {studentsLoading ? (
          <div className="py-12 text-center text-slate-500">
            Loading students...
          </div>
        ) : !students.length ? (
          <EmptyState
            icon="👨‍🎓"
            title="No students found"
            text={`No active students found for Class ${effectiveAttendanceScope?.className || "—"} • Section ${effectiveAttendanceScope?.section || "—"}.`}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 mt-5">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-black">#</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-black">Student</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-black">Enrollment</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-black">Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-black">Remarks</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-slate-500 font-black">History</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => {
                  const status = getAttendanceStatus(student.id);
                  const remarks = attendanceMap[student.id]?.remarks || "";

                  return (
                    <tr key={student.id} className="hover:bg-cyan-50/40">
                      <td className="px-4 py-4 font-black text-slate-500">{index + 1}</td>

                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">
                          {student.name || "Unnamed"}
                        </p>
                        {student.email && (
                          <p className="text-xs text-slate-500">{student.email}</p>
                        )}
                      </td>

                      <td className="px-4 py-4 font-bold">{student.enrollmentNo || "—"}</td>

                      <td className="px-4 py-4">
                        <select
                          value={status}
                          onChange={(event) =>
                            setStudentAttendance(student.id, event.target.value)
                          }
                          className="px-3 py-2 rounded-xl border font-black"
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="ABSENT">ABSENT</option>
                          <option value="LEAVE">LEAVE</option>
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <input
                          value={remarks}
                          onChange={(event) =>
                            setAttendanceMap((current) => ({
                              ...current,
                              [student.id]: {
                                ...(current[student.id] || {}),
                                studentId: student.id,
                                status,
                                remarks: event.target.value,
                              },
                            }))
                          }
                          placeholder="Optional"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openStudentHistory(student)}
                          className="px-3 py-2 rounded-xl bg-violet-50 text-violet-800 font-black"
                        >
                          📜 History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-black">
              Reports
            </p>
            <h4 className="text-2xl font-black text-slate-900">
              Complete Attendance
            </h4>
          </div>

          <button
            type="button"
            onClick={exportCompleteClassAttendance}
            className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black"
          >
            📊 Download Complete Class Excel
          </button>
        </div>

        <p className="text-sm text-slate-500 mt-2">
          Exports every saved attendance record for this class and section.
        </p>
      </div>

      {effectiveAttendanceScope?.type === "DELEGATED" && (
        <div className="bg-cyan-50 rounded-3xl p-6 shadow-xl border border-cyan-100">
          <p className="text-xs uppercase tracking-wider text-cyan-600 font-black">
            Delegated Attendance Access
          </p>
          <h4 className="text-2xl font-black text-cyan-950 mt-1">
            👨‍🏫 {effectiveAttendanceScope?.classTeacherName || "Class Teacher"}
          </h4>
          <p className="text-sm text-cyan-900 mt-2">
            You have access to <strong>{effectiveAttendanceScope?.className}-{effectiveAttendanceScope?.section}</strong>
            {" "}for <strong>{effectiveAttendanceScope?.subjectName || "Class Attendance"}</strong>.
          </p>
        </div>
      )}

      {canManageAttendanceAccess && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-violet-100">
          <p className="text-xs uppercase tracking-wider text-violet-600 font-black">
            Class Teacher Control
          </p>
          <h4 className="text-2xl font-black text-slate-900 mt-1">
            🔐 Grant Attendance Access
          </h4>
          <p className="text-sm text-slate-500 mt-2">
            Other teachers keep their existing login. You only grant them
            attendance permission for this class/section.
          </p>

          <div className="grid lg:grid-cols-4 gap-3 mt-5">
            <input
              value={accessTeacherSearch}
              onChange={(e) => setAccessTeacherSearch(e.target.value)}
              placeholder="Search teacher..."
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 outline-none"
            />

            <select
              value={accessTeacherId}
              onChange={(e) => setAccessTeacherId(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 font-bold"
            >
              <option value="">
                {allTeachersLoading ? "Loading..." : "Select teacher"}
              </option>
              {filteredTeachers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || "Teacher"}{item.email ? ` — ${item.email}` : ""}
                </option>
              ))}
            </select>

            <select
              value={accessSubjectId}
              onChange={(e) => setAccessSubjectId(e.target.value)}
              disabled={!accessTeacherId || !selectedAccessTeacher}
              className="px-4 py-3 rounded-2xl border border-slate-200 font-bold disabled:bg-slate-100"
            >
              <option value="ALL_CLASS">Class Attendance</option>
              {selectedAccessTeacherSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={grantAttendanceAccess}
              disabled={attendanceAccessSaving || !accessTeacherId}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-black disabled:opacity-50"
            >
              {attendanceAccessSaving ? "Saving..." : "Grant Access"}
            </button>
          </div>

          {selectedAccessTeacher && (
            <div className="mt-4 rounded-2xl bg-violet-50 border border-violet-100 p-4">
              <p className="text-xs uppercase tracking-wider text-violet-600 font-black">
                Selected Teacher
              </p>
              <p className="font-black text-violet-950 mt-1">
                {selectedAccessTeacher.name || "Teacher"}
              </p>
              <p className="text-sm text-violet-800 mt-1">
                Subjects:{" "}
                {selectedAccessTeacherSubjects.length
                  ? selectedAccessTeacherSubjects.map((subject) => subject.name).join(", ")
                  : "No subject assigned"}
              </p>
            </div>
          )}

          {accessNotice && (
            <div className="mt-4 rounded-2xl bg-cyan-50 border border-cyan-100 p-4 text-cyan-900 font-bold">
              {accessNotice}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-black text-slate-900">
                Active Access for {teacher.classTeacherClassName || teacher.className}-{teacher.classTeacherSection || teacher.section}
              </h5>
              <span className="text-sm font-bold text-slate-500">
                {activeAccess.length}
              </span>
            </div>

            {attendanceAccessLoading ? (
              <p className="text-slate-500">Loading access records...</p>
            ) : !attendanceAccess.length ? (
              <p className="p-4 rounded-2xl bg-slate-50 text-slate-500">
                No teacher has been granted attendance access yet.
              </p>
            ) : (
              attendanceAccess.map((access) => (
                <div
                  key={access.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="font-black text-slate-900">
                      {access.teacherName || "Teacher"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {access.subjectName || "Class Attendance"} •{" "}
                      {access.className}-{access.section}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-black ${
                        access.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {access.status}
                    </span>
                  </div>

                  {access.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => revokeAttendanceAccess(access)}
                      disabled={attendanceAccessSaving}
                      className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 font-black border border-red-100 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {historyOpenStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-violet-600 font-black">
                  Student Attendance History
                </p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">
                  {historyOpenStudent.name}
                </h4>
                <p className="text-sm text-slate-500">
                  Enrollment: {historyOpenStudent.enrollmentNo || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryOpenStudent(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-slate-500">
                Loading complete history...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  <MiniStat title="Total Days" value={openHistory.length} />
                  <MiniStat title="Present" value={historyCounts.present} />
                  <MiniStat title="Absent" value={historyCounts.absent} />
                  <MiniStat title="Attendance %" value={`${historyPercentage}%`} />
                </div>

                <div className="overflow-x-auto mt-6 rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs uppercase font-black text-slate-500">Date</th>
                        <th className="text-left px-4 py-3 text-xs uppercase font-black text-slate-500">Subject</th>
                        <th className="text-left px-4 py-3 text-xs uppercase font-black text-slate-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs uppercase font-black text-slate-500">Marked By</th>
                        <th className="text-left px-4 py-3 text-xs uppercase font-black text-slate-500">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {openHistory.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-bold">{row.date}</td>
                          <td className="px-4 py-3">{row.subjectName || "Class Attendance"}</td>
                          <td className="px-4 py-3 font-black">{row.status}</td>
                          <td className="px-4 py-3">{row.markedByName || "—"}</td>
                          <td className="px-4 py-3">{row.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      exportAttendanceRows(
                        openHistory,
                        `attendance_${historyOpenStudent.enrollmentNo || historyOpenStudent.id}_history.xls`
                      )
                    }
                    className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black"
                  >
                    📥 Download Student History
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}


function NoticeSection({
  notices,
  onRead,
}) {
  return (
    <section className="mt-6 space-y-4">

      <PanelHeader
        icon="📢"
        title="Notice Center"
        subtitle="Active notices addressed to your account"
      />

      {notices.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No active notices"
          text="New notices will appear here."
        />
      ) : (
        notices.map((notice) => (
          <article
            key={notice.id}
            onClick={() =>
              onRead(notice)
            }
            className={`bg-white rounded-3xl p-6 shadow-xl border-l-4 cursor-pointer ${
              notice.read
                ? "border-slate-300"
                : "border-cyan-500"
            }`}
          >
            <div className="flex flex-col md:flex-row md:justify-between gap-4">

              <div>
                <div className="flex flex-wrap gap-2">

                  <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-black">
                    {notice.priority ||
                      "NORMAL"}
                  </span>

                  {!notice.read && (
                    <span className="px-3 py-1 rounded-full bg-fuchsia-50 text-fuchsia-700 text-xs font-black">
                      NEW
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black mt-3">
                  {notice.title ||
                    notice.subject ||
                    "Notice"}
                </h3>

                <p className="text-slate-600 mt-2 whitespace-pre-wrap">
                  {notice.message ||
                    "No message"}
                </p>
              </div>

              <div className="shrink-0 text-sm text-slate-500 md:text-right">
                <p>
                  📅{" "}
                  {formatDateTime(
                    notice.createdAt
                  )}
                </p>

                <p className="mt-1">
                  ⏳{" "}
                  {expiresText(
                    notice.expiresAt
                  )}
                </p>
              </div>

            </div>
          </article>
        ))
      )}
    </section>
  );
}


function MessageSection({
  messages,
  onRead,
}) {
  return (
    <section className="mt-6 space-y-4">

      <PanelHeader
        icon="📨"
        title="Admin Messages"
        subtitle="Private messages addressed to your account"
      />

      {messages.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Inbox is empty"
          text="Messages from administration will appear here."
        />
      ) : (
        messages.map((message) => (
          <article
            key={message.id}
            onClick={() =>
              onRead(message)
            }
            className={`bg-white rounded-3xl p-6 shadow-xl border-l-4 cursor-pointer ${
              message.read
                ? "border-slate-300"
                : "border-fuchsia-500"
            }`}
          >
            <div className="flex flex-col md:flex-row md:justify-between gap-4">

              <div>
                <div className="flex flex-wrap gap-2">

                  <span className="px-3 py-1 rounded-full bg-fuchsia-50 text-fuchsia-800 text-xs font-black">
                    {message.senderName ||
                      "School Administration"}
                  </span>

                  {!message.read && (
                    <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-black">
                      UNREAD
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black mt-3">
                  {message.subject ||
                    "Message"}
                </h3>

                <p className="text-slate-600 mt-2 whitespace-pre-wrap">
                  {message.message ||
                    ""}
                </p>
              </div>

              <div className="text-sm text-slate-500 md:text-right">
                📅{" "}
                {formatDateTime(
                  message.createdAt
                )}
              </div>

            </div>
          </article>
        ))
      )}
    </section>
  );
}


function RequestSection({
  requests,
  teacher,
  authUser,
}) {
  const [type, setType] = useState("GENERAL");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [notice, setNotice] = useState("");

  const visibleRequests = useMemo(() => {
    if (filter === "ALL") return requests;
    return requests.filter((item) => normalize(item.status) === normalize(filter));
  }, [requests, filter]);

  const submitRequest = async () => {
    if (!authUser?.uid || !teacher) return;
    if (!subject.trim() || !message.trim()) {
      setNotice("Subject and request details are required.");
      return;
    }
    try {
      setSaving(true);
      setNotice("");
      await addDoc(collection(db, "teacherRequests"), {
        teacherUid: authUser.uid,
        teacherId: teacher.id || authUser.uid,
        teacherName: teacher.name || authUser.displayName || "Teacher",
        teacherEmail: teacher.email || authUser.email || "",
        className: teacher.className || "",
        section: teacher.section || "",
        sessionId: teacher.sessionId || "",
        sessionName: teacher.sessionName || teacher.session || "",
        type,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        status: "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubject("");
      setMessage("");
      setType("GENERAL");
      setPriority("NORMAL");
      setNotice("Request submitted to administration.");
    } catch (error) {
      console.error("Teacher request error:", error);
      setNotice(error?.code === "permission-denied" ? "Permission denied. Firestore Rules must allow teacher request creation." : "Request could not be submitted.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 space-y-4">

      <PanelHeader
        icon="📩"
        title="Requests to Administration"
        subtitle="Your submitted requests and their current status"
      />

      <div className="rounded-3xl bg-white p-6 shadow-xl">

        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
          <p className="font-black text-amber-900">
            Request Center
          </p>

          <p className="text-sm text-amber-800 mt-1">
            Send attendance, result, fee, leave or general requests directly to administration.
          </p>
        </div>

        <div className="space-y-3 mt-5">

          <div className="mt-5 grid lg:grid-cols-[1.05fr_.95fr] gap-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid md:grid-cols-2 gap-3">
                <select value={type} onChange={(event) => setType(event.target.value)} className="px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold">
                  <option value="GENERAL">General</option>
                  <option value="LEAVE">Leave</option>
                  <option value="ATTENDANCE">Attendance Correction</option>
                  <option value="RESULT">Result Correction</option>
                  <option value="FEE">Fee Issue</option>
                </select>
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold">
                  <option value="LOW">Low Priority</option>
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Request subject" className="mt-3 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold" />
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows="5" placeholder="Write complete request details..." className="mt-3 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white" />
              {notice && <div className="mt-3 rounded-2xl bg-cyan-50 border border-cyan-100 px-4 py-3 text-cyan-800 font-bold">{notice}</div>}
              <button type="button" onClick={submitRequest} disabled={saving} className="mt-3 w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-black disabled:opacity-50">{saving ? "Submitting..." : "📤 Submit Request"}</button>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs uppercase tracking-widest text-slate-400 font-black">Request history</p><p className="text-xl font-black mt-1">Track administration response</p></div>
                <select value={filter} onChange={(event) => setFilter(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 font-bold"><option value="ALL">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select>
              </div>
              <div className="mt-4 space-y-3 max-h-[430px] overflow-y-auto">
                {visibleRequests.length === 0 ? <EmptyState icon="📝" title="No requests" text="Your requests will appear here." /> : visibleRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex justify-between gap-3"><div><p className="font-black">{request.subject || "Request"}</p><p className="text-xs text-slate-500 mt-1">{request.type || "GENERAL"} • {formatDateTime(request.createdAt)}</p></div><StatusBadge status={request.status} /></div>
                    <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{request.message}</p>
                    {request.adminReply && <div className="mt-3 rounded-xl bg-white border border-cyan-100 p-3"><p className="text-[11px] uppercase tracking-widest text-cyan-600 font-black">Administration reply</p><p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{request.adminReply}</p></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


function ProfileSection({
  teacher,
}) {
  const fields = [
    ["Name", teacher.name],
    ["Email", teacher.email],
    [
      "Employee ID",
      teacher.employeeId ||
        "Not configured",
    ],
    [
      "Academic Session",
      teacher.sessionName || "—",
    ],
    [
      "Assigned Class",
      teacher.className || "—",
    ],
    [
      "Section",
      teacher.section || "—",
    ],
    [
      "Class Teacher",
      teacher.isClassTeacher
        ? "Yes"
        : "No",
    ],
    [
      "Account Status",
      teacher.accountStatus ||
        "—",
    ],
  ];

  return (
    <section className="mt-6 bg-white rounded-3xl p-6 shadow-xl">

      <PanelHeader
        icon="👤"
        title="My Profile"
        subtitle="Teacher account and assignment information"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">

        {fields.map(
          ([title, value]) => (
            <div
              key={title}
              className="rounded-2xl bg-slate-50 border border-slate-100 p-4"
            >
              <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
                {title}
              </p>

              <p className="font-black text-slate-800 mt-2 break-words">
                {value || "—"}
              </p>
            </div>
          )
        )}

      </div>

      <div className="mt-6">

        <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
          Authorized Subjects
        </p>

        <div className="flex flex-wrap gap-2 mt-3">

          {(teacher.subjectNames ||
            []
          ).map(
            (
              subject,
              index
            ) => (
              <span
                key={`${subject}-${index}`}
                className="px-3 py-2 rounded-xl bg-violet-50 text-violet-800 font-black"
              >
                {subject}
              </span>
            )
          )}

        </div>
      </div>
    </section>
  );
}


function PanelHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="flex items-start gap-4">

      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white flex items-center justify-center text-xl shadow-lg">
        {icon}
      </div>

      <div>
        <h3 className="text-2xl font-black text-slate-900">
          {title}
        </h3>

        <p className="text-slate-500 text-sm mt-1">
          {subtitle}
        </p>
      </div>

    </div>
  );
}

function MiniStat({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
        {title}
      </p>

      <p className="text-2xl font-black mt-2">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}) {
  return (
    <span className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-black">
      {children}
    </span>
  );
}

function StatusBadge({
  status,
}) {
  const value =
    normalize(status);

  const styles =
    value === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : value === "rejected"
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-black ${styles}`}
    >
      {status || "PENDING"}
    </span>
  );
}


const TEACHER_RESULT_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  READY: "READY",
  VERIFIED: "VERIFIED",
  PUBLISHED: "PUBLISHED",
});

const TEACHER_FEE_TYPES = Object.freeze({
  ACADEMIC: "ACADEMIC",
  TRANSPORTATION: "TRANSPORTATION",
});

const TEACHER_PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Cheque",
  "Online",
];

const TEACHER_MARK_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LEAVE",
];

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const money = (value) =>
  `₹${safeNumber(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const resultGrade = (percentage) => {
  const p = safeNumber(percentage);

  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B+";
  if (p >= 60) return "B";
  if (p >= 50) return "C";
  if (p >= 40) return "D";
  if (p >= 33) return "E";
  return "F";
};

const resultDivision = (percentage) => {
  const p = safeNumber(percentage);

  if (p >= 60) return "First Division";
  if (p >= 45) return "Second Division";
  if (p >= 33) return "Third Division";
  return "Fail";
};

const escapeTsv = (value) =>
  String(value ?? "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();

const downloadTeacherTsv = (
  rows,
  filename = "teacher-report.xls"
) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (!safeRows.length) {
    window.alert("No records available to export.");
    return;
  }

  const columns = Array.from(
    safeRows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const lines = [
    columns.map(escapeTsv).join("\t"),
    ...safeRows.map((row) =>
      columns
        .map((column) => escapeTsv(row?.[column]))
        .join("\t")
    ),
  ];

  const blob = new Blob(
    ["\uFEFF" + lines.join("\n")],
    {
      type:
        "application/vnd.ms-excel;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};

const teacherClassLabel = (teacher) =>
  `${teacher?.className || "Class"}-${teacher?.section || "Section"}`;

const getTeacherFeeStructure = (
  feeStructures,
  feeSettings,
  student
) => {
  const className = String(
    student?.className || ""
  );

  const structure =
    feeStructures?.[`class-${className}`] ||
    feeStructures?.[className] ||
    null;

  const structureAcademic =
    safeNumber(structure?.tuitionFee) +
    safeNumber(structure?.examFee) +
    safeNumber(structure?.otherFee);

  const legacyTotal = safeNumber(
    feeSettings?.[`class${className}`]
  );

  const annualFee = structure
    ? structureAcademic
    : safeNumber(
        student?.annualFee,
        legacyTotal
      );

  const transportCharge = safeNumber(
    student?.transportFee ??
      student?.transportCharge ??
      student?.transportationFee ??
      student?.transportAmount ??
      structure?.transportFee
  );

  const academicPaid = Math.max(
    0,
    safeNumber(student?.paidFee)
  );

  const transportPaid = Math.max(
    0,
    safeNumber(student?.transportPaid)
  );

  const academicDue = Math.max(
    0,
    annualFee - academicPaid
  );

  const transportDue = Math.max(
    0,
    transportCharge - transportPaid
  );

  return {
    structure,
    annualFee,
    transportCharge,
    academicPaid,
    academicDue,
    transportPaid,
    transportDue,
    totalPaid:
      academicPaid + transportPaid,
    totalDue:
      academicDue + transportDue,
    grandTotal:
      annualFee + transportCharge,
  };
};

const getTeacherPaymentHistory = (student) =>
  Array.isArray(student?.paymentHistory)
    ? student.paymentHistory
        .slice()
        .sort(
          (a, b) =>
            safeNumber(b?.timestamp) -
            safeNumber(a?.timestamp)
        )
    : [];

const makeTeacherReceiptNo = (student) => {
  const year = new Date().getFullYear();
  const enrollment = String(
    student?.enrollmentNo || "NA"
  ).replace(/[^a-zA-Z0-9]/g, "");

  return (
    `XYZ-T-${year}-${enrollment}-` +
    `${Date.now().toString(36).toUpperCase()}`
  );
};

const buildTeacherReceiptHtml = (receipt) => {
  const safe = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const feeLabel = String(receipt.feeType || "ACADEMIC").toUpperCase() === "TRANSPORTATION" ? "Transportation Fee" : "Academic Fee";
  const totalAfter = safe(receipt.totalPaidAfter);
  const dueAfter = safe(receipt.totalDueAfter);
  const token = safe(`${receipt.receiptNo || "RECEIPT"}-${receipt.enrollmentNo || "NA"}`);
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safe(receipt.receiptNo)} | XYZ School</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#edf2f7;color:#0f172a;font-family:Inter,Arial,sans-serif;padding:28px}.sheet{width:900px;max-width:100%;margin:auto;background:#fff;border:1px solid #dbe4ee;border-radius:30px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.18)}.top{padding:30px 34px;background:linear-gradient(135deg,#042f2e,#0f766e 48%,#2563eb);color:#fff;position:relative}.top:after{content:"";position:absolute;right:-80px;top:-90px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.08)}.brand{display:flex;align-items:center;justify-content:space-between;gap:20px;position:relative;z-index:1}.seal{width:68px;height:68px;border:2px solid rgba(255,255,255,.65);border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:30px;background:rgba(255,255,255,.08)}h1{margin:0;font-size:30px;letter-spacing:.02em}.sub{margin-top:6px;color:#d1fae5;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.receiptNo{margin-top:16px;display:inline-flex;padding:8px 12px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.1);font-weight:900}.body{padding:32px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{border:1px solid #e2e8f0;border-radius:18px;padding:16px;background:#f8fafc}.label{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#64748b;font-weight:900}.value{font-size:16px;font-weight:900;margin-top:6px;word-break:break-word}.heroAmount{margin-top:22px;padding:22px;border-radius:22px;background:linear-gradient(135deg,#ecfeff,#eff6ff);border:1px solid #bae6fd;display:flex;align-items:center;justify-content:space-between;gap:18px}.heroAmount span:first-child{font-weight:900;color:#334155}.amount{font-size:30px;font-weight:950;color:#047857}.sectionTitle{margin:28px 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#64748b;font-weight:950}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:13px;border-bottom:1px solid #e2e8f0;text-align:left}.table th{background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.status{display:inline-flex;padding:7px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:10px;font-weight:950}.verify{margin-top:22px;padding:16px;border:1px dashed #94a3b8;border-radius:18px;display:flex;justify-content:space-between;gap:16px;align-items:center}.verifyCode{font-family:monospace;font-size:11px;color:#475569;word-break:break-all}.signatures{display:grid;grid-template-columns:repeat(2,1fr);gap:30px;margin-top:42px}.sign{padding-top:30px;border-top:1px solid #94a3b8;text-align:center;font-size:11px;color:#64748b;font-weight:800}.footer{margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;line-height:1.7}@media(max-width:700px){body{padding:8px}.body{padding:18px}.grid,.signatures{grid-template-columns:1fr}.brand{align-items:flex-start}.heroAmount{align-items:flex-start;flex-direction:column}}@media print{body{padding:0;background:#fff}.sheet{width:100%;border:0;box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="sheet">
<div class="top"><div class="brand"><div><h1>XYZ SCHOOL</h1><div class="sub">Official Fee Collection Receipt</div><div class="receiptNo">${safe(receipt.receiptNo)}</div></div><div class="seal">✓</div></div></div>
<div class="body">
<div class="grid"><div class="card"><div class="label">Student</div><div class="value">${safe(receipt.studentName)}</div></div><div class="card"><div class="label">Enrollment No.</div><div class="value">${safe(receipt.enrollmentNo)}</div></div><div class="card"><div class="label">Class & Section</div><div class="value">${safe(receipt.className)} • ${safe(receipt.section)}</div></div><div class="card"><div class="label">Payment Date</div><div class="value">${safe(receipt.date)} • ${safe(receipt.time || "")}</div></div></div>
<div class="heroAmount"><span>Amount Collected • ${feeLabel}</span><span class="amount">${money(receipt.amount)}</span></div>
<div class="sectionTitle">Transaction details</div>
<table class="table"><thead><tr><th>Fee Head</th><th>Method</th><th>Collected By</th><th>Status</th><th>Amount</th></tr></thead><tbody><tr><td>${feeLabel}</td><td>${safe(receipt.method || "Cash")}</td><td>${safe(receipt.receivedBy || "Teacher")}</td><td><span class="status">SUCCESS</span></td><td><strong>${money(receipt.amount)}</strong></td></tr></tbody></table>
<div class="sectionTitle">Account position after payment</div>
<div class="grid"><div class="card"><div class="label">Academic Paid</div><div class="value">${money(receipt.academicPaidAfter)}</div></div><div class="card"><div class="label">Academic Due</div><div class="value">${money(receipt.academicDueAfter)}</div></div><div class="card"><div class="label">Transport Paid</div><div class="value">${money(receipt.transportPaidAfter)}</div></div><div class="card"><div class="label">Transport Due</div><div class="value">${money(receipt.transportDueAfter)}</div></div><div class="card"><div class="label">Total Paid</div><div class="value">${money(totalAfter)}</div></div><div class="card"><div class="label">Total Due</div><div class="value">${money(dueAfter)}</div></div></div>
${receipt.remarks ? `<div class="sectionTitle">Remarks</div><div class="card">${safe(receipt.remarks)}</div>` : ""}
<div class="verify"><div><div class="label">Receipt verification reference</div><div class="verifyCode">${token}</div></div><div class="status">AUTHENTICATED</div></div>
<div class="signatures"><div class="sign">Authorized Collector</div><div class="sign">Parent / Student Acknowledgement</div></div>
<div class="footer">This receipt records a successful fee collection from the authenticated teacher dashboard. Fee structure administration, verification and cancellation controls remain restricted to authorized school administration. Keep this receipt for future reference.</div>
</div></div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`;
};

const openTeacherReceipt = (receipt) => {
  const popup = window.open(
    "",
    "_blank",
    "width=960,height=900"
  );

  if (!popup) {
    window.alert(
      "Popup blocked. Please allow popups to print the receipt."
    );
    return;
  }

  popup.document.open();
  popup.document.write(
    buildTeacherReceiptHtml(receipt)
  );
  popup.document.close();
};

const calculateTeacherResult = (
  subjects,
  formData
) => {
  let obtainedMarks = 0;
  let maximumMarks = 0;
  let failedSubjects = [];

  const normalizedSubjects = subjects.map(
    (subject) => {
      const theory = safeNumber(
        formData?.[subject.subjectCode]?.theory
      );

      const practical = safeNumber(
        formData?.[subject.subjectCode]?.practical
      );

      const theoryMaximum = safeNumber(
        subject.theoryMarks
      );

      const practicalMaximum = safeNumber(
        subject.practicalMarks
      );

      const totalMaximum =
        theoryMaximum + practicalMaximum;

      const total = theory + practical;

      const theoryPass =
        theoryMaximum <= 0 ||
        theory >= safeNumber(
          subject.passingTheory
        );

      const practicalPass =
        practicalMaximum <= 0 ||
        practical >= safeNumber(
          subject.passingPractical
        );

      const pass =
        theoryPass && practicalPass;

      if (!pass) {
        failedSubjects.push(
          subject.subjectName ||
            subject.subjectCode
        );
      }

      obtainedMarks += total;
      maximumMarks += totalMaximum;

      return {
        ...subject,
        theory,
        practical,
        total,
        totalMaximum,
        pass,
      };
    }
  );

  const percentage =
    maximumMarks > 0
      ? Number(
          (
            (obtainedMarks /
              maximumMarks) *
            100
          ).toFixed(2)
        )
      : 0;

  const status =
    failedSubjects.length === 0 &&
    percentage >= 33
      ? "PASS"
      : "FAIL";

  return {
    subjects: normalizedSubjects,
    obtainedMarks,
    maximumMarks,
    percentage,
    grade: resultGrade(percentage),
    division: resultDivision(percentage),
    status,
    failedSubjects,
    failedCount:
      failedSubjects.length,
    totalSubjects:
      normalizedSubjects.length,
  };
};

function ResultsSection({
  teacher,
  students,
  authUser,
}) {
  const [subjects, setSubjects] =
    useState([]);

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [resultsLoading, setResultsLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [formData, setFormData] =
    useState({});

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [examName, setExamName] =
    useState("Annual Examination");

  const [sessionName, setSessionName] =
    useState(
      teacher?.sessionName ||
        teacher?.session ||
        "2026-27"
    );

  const [message, setMessage] =
    useState("");

  const [activeResult, setActiveResult] =
    useState(null);

  const [showPreview, setShowPreview] =
    useState(false);

  const [savingDraft, setSavingDraft] =
    useState(false);

  const [lastSavedAt, setLastSavedAt] =
    useState("");

  const className =
    String(teacher?.className || "");

  const section =
    String(teacher?.section || "");

  useEffect(() => {
    if (!className) {
      setSubjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let subjectRows = [];
    let distributionRows = [];

    const rebuild = () => {
      const teacherSubjectIds = Array.isArray(teacher?.subjectIds)
        ? teacher.subjectIds.map(String)
        : [];
      const teacherSessionId = String(teacher?.sessionId || "");
      const teacherClassId = String(teacher?.classId || teacher?.classTeacherClassId || "");
      const distribution = distributionRows.find((item) =>
        String(item.classId || "") === teacherClassId &&
        String(item.sessionId || "") === teacherSessionId
      ) || distributionRows.find((item) =>
        normalize(item.className) === normalize(className) &&
        (!teacherSessionId || String(item.sessionId || "") === teacherSessionId)
      ) || null;
      const distributedIds = Array.isArray(distribution?.subjectIds)
        ? distribution.subjectIds.map(String)
        : [];
      const allowedIds = teacherSubjectIds.length
        ? new Set(teacherSubjectIds)
        : new Set(distributedIds);
      const hasScopeIds = allowedIds.size > 0;
      const list = subjectRows
        .filter((item) => normalize(item.status) !== "inactive")
        .filter((item) => !teacherSessionId || !item.sessionId || String(item.sessionId) === teacherSessionId)
        .filter((item) => !hasScopeIds || allowedIds.has(String(item.id)))
        .map((item) => ({
          ...item,
          subjectName: item.subjectName || item.name || "Subject",
          subjectCode: item.subjectCode || item.code || item.id,
          theoryMarks: safeNumber(item.theoryMarks ?? item.maxTheoryMarks ?? item.maxMarks ?? 0),
          practicalMarks: safeNumber(item.practicalMarks ?? item.maxPracticalMarks ?? 0),
          passingTheory: safeNumber(item.passingTheory ?? item.passingMarks ?? 33),
          passingPractical: safeNumber(item.passingPractical ?? 0),
          totalMarks: safeNumber(item.totalMarks ?? item.maxMarks ?? (safeNumber(item.theoryMarks) + safeNumber(item.practicalMarks))),
        }))
        .sort((a, b) => String(a.subjectName).localeCompare(String(b.subjectName)));
      setSubjects(list);
      setLoading(false);
      if (!list.length) {
        setMessage("No subjects are assigned to this teacher/class for the selected academic session.");
      }
    };

    const unsubscribeSubjects = onSnapshot(
      query(collection(db, "subjects"), limit(1000)),
      (snapshot) => {
        subjectRows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        rebuild();
      },
      (error) => {
        console.error("Teacher subject listener:", error);
        setSubjects([]);
        setLoading(false);
        setMessage(error?.code === "permission-denied" ? "Permission denied while loading subjects." : "Unable to load subjects.");
      }
    );

    const unsubscribeDistribution = onSnapshot(
      query(collection(db, "classSubjects"), limit(1000)),
      (snapshot) => {
        distributionRows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        rebuild();
      },
      () => rebuild()
    );

    return () => {
      unsubscribeSubjects();
      unsubscribeDistribution();
    };
  }, [className, teacher?.classId, teacher?.classTeacherClassId, teacher?.sessionId, teacher?.subjectIds]);

  useEffect(() => {
    if (!className) {
      setResults([]);
      setResultsLoading(false);
      return;
    }

    setResultsLoading(true);

    const resultsQuery = query(
      collection(db, "results"),
      where(
        "className",
        "==",
        className
      ),
      limit(1000)
    );

    const unsubscribe = onSnapshot(
      resultsQuery,
      (snapshot) => {
        const list =
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .filter(
              (item) =>
                normalize(item.section) ===
                normalize(section)
            )
            .sort((a, b) =>
              String(
                b.updatedAt?.toDate?.() ||
                  b.updatedAt ||
                  ""
              ).localeCompare(
                String(
                  a.updatedAt?.toDate?.() ||
                    a.updatedAt ||
                    ""
                )
              )
            );

        setResults(list);
        setResultsLoading(false);
      },
      (error) => {
        console.error(
          "Teacher result listener:",
          error
        );
        setResults([]);
        setResultsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [className, section]);

  const resultMap = useMemo(
    () =>
      results.reduce(
        (map, result) => {
          const key =
            `${result.studentId || result.enrollmentNo || ""}__` +
            `${result.sessionId || result.session || ""}__` +
            `${result.examName || result.exam || ""}`;

          map[key] = result;

          return map;
        },
        {}
      ),
    [results]
  );

  const filteredStudents =
    useMemo(() => {
      const q = normalize(search);

      return students.filter(
        (student) => {
          const value =
            `${student.name || ""} ` +
            `${student.enrollmentNo || ""} ` +
            `${student.fatherName || ""}`;

          if (
            q &&
            !normalize(value).includes(q)
          ) {
            return false;
          }

          const key =
            `${student.id}__${teacher.sessionId || sessionName || ""}__${examName}`;

          const result =
            resultMap[key];

          if (
            statusFilter !== "ALL"
          ) {
            if (
              statusFilter === "NOT_ENTERED" &&
              result
            ) {
              return false;
            }

            if (
              statusFilter !== "NOT_ENTERED" &&
              normalize(
                result?.status
              ) !== normalize(
                statusFilter
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      students,
      search,
      examName,
      resultMap,
      statusFilter,
    ]);

  const summary = useMemo(() => {
    const entered = students.filter(
      (student) =>
        Boolean(
          resultMap[
            `${student.id}__${teacher.sessionId || sessionName || ""}__${examName}`
          ]
        )
    );

    const passed = entered.filter(
      (resultStudent) =>
        normalize(
          resultMap[
            `${resultStudent.id}__${teacher.sessionId || sessionName || ""}__${examName}`
          ]?.status
        ) === "pass"
    );

    const published = entered.filter(
      (resultStudent) =>
        normalize(
          resultMap[
            `${resultStudent.id}__${teacher.sessionId || sessionName || ""}__${examName}`
          ]?.publishStatus
        ) === "published"
    );

    return {
      total: students.length,
      entered: entered.length,
      pending:
        Math.max(
          0,
          students.length -
            entered.length
        ),
      passed: passed.length,
      published: published.length,
    };
  }, [
    students,
    resultMap,
    examName,
  ]);

  const resetForm = () => {
    const blank = {};

    subjects.forEach((subject) => {
      blank[subject.subjectCode] = {
        theory: "",
        practical: "",
      };
    });

    setFormData(blank);
  };

  const loadStudentResult = (
    student
  ) => {
    const key =
      `${student.id}__${teacher.sessionId || sessionName || ""}__${examName}`;

    const existing =
      resultMap[key];

    if (
      existing?.publishStatus ===
      "PUBLISHED"
    ) {
      setMessage(
        "This result is already published. Teachers cannot edit published results."
      );
    } else {
      setMessage("");
    }

    const next = {};

    subjects.forEach((subject) => {
      const savedSubject =
        Array.isArray(
          existing?.subjects
        )
          ? existing.subjects.find(
              (item) =>
                String(
                  item.subjectCode
                ) ===
                String(
                  subject.subjectCode
                )
            )
          : null;

      const savedForm =
        existing?.formData?.[
          subject.subjectCode
        ];

      next[subject.subjectCode] = {
        theory:
          savedSubject?.theory ??
          savedForm?.theory ??
          "",
        practical:
          savedSubject?.practical ??
          savedForm?.practical ??
          "",
      };
    });

    setSelectedStudent({
      ...student,
      existing,
    });

    setActiveResult(existing || null);
    setFormData(next);
    setShowPreview(false);
  };

  const updateMark = (
    subjectCode,
    field,
    value
  ) => {
    if (
      activeResult?.publishStatus ===
      "PUBLISHED"
    ) {
      return;
    }

    const cleanValue =
      value === ""
        ? ""
        : Math.max(
            0,
            safeNumber(value)
          );

    setFormData(
      (current) => ({
        ...current,
        [subjectCode]: {
          ...(current[
            subjectCode
          ] || {}),
          [field]: cleanValue,
        },
      })
    );
  };

  const generated =
    useMemo(
      () =>
        calculateTeacherResult(
          subjects,
          formData
        ),
      [subjects, formData]
    );

  useEffect(() => {
    if (!selectedStudent) {
      return undefined;
    }

    const key =
      `xyz_teacher_result_draft_` +
      `${selectedStudent.id}_` +
      `${examName}`;

    const timer = window.setTimeout(
      () => {
        try {
          window.localStorage.setItem(
            key,
            JSON.stringify({
              formData,
              examName,
              sessionName,
              savedAt:
                new Date().toISOString(),
            })
          );

          setLastSavedAt(
            new Date().toLocaleTimeString(
              "en-IN"
            )
          );
        } catch (error) {
          console.warn(
            "Draft save skipped:",
            error
          );
        }
      },
      700
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    formData,
    examName,
    sessionName,
    selectedStudent,
  ]);

  const restoreDraft = () => {
    if (!selectedStudent) {
      return;
    }

    const key =
      `xyz_teacher_result_draft_` +
      `${selectedStudent.id}_` +
      `${examName}`;

    try {
      const raw =
        window.localStorage.getItem(
          key
        );

      if (!raw) {
        setMessage(
          "No local draft found."
        );
        return;
      }

      const parsed =
        JSON.parse(raw);

      if (
        parsed?.formData
      ) {
        setFormData(
          parsed.formData
        );
        setMessage(
          "Local draft restored."
        );
      }
    } catch (error) {
      console.error(
        "Draft restore error:",
        error
      );
      setMessage(
        "Unable to restore local draft."
      );
    }
  };

  const clearDraft = () => {
    if (!selectedStudent) {
      return;
    }

    const key =
      `xyz_teacher_result_draft_` +
      `${selectedStudent.id}_` +
      `${examName}`;

    try {
      window.localStorage.removeItem(
        key
      );
      setLastSavedAt("");
      setMessage(
        "Local draft cleared."
      );
    } catch (error) {
      console.error(
        "Draft clear error:",
        error
      );
    }
  };

  const validateMarks = () => {
    for (
      const subject of subjects
    ) {
      const theory =
        safeNumber(
          formData?.[
            subject.subjectCode
          ]?.theory
        );

      const practical =
        safeNumber(
          formData?.[
            subject.subjectCode
          ]?.practical
        );

      if (
        theory >
        safeNumber(
          subject.theoryMarks
        )
      ) {
        return (
          `${subject.subjectName}: ` +
          `Theory marks cannot exceed ` +
          `${subject.theoryMarks}.`
        );
      }

      if (
        practical >
        safeNumber(
          subject.practicalMarks
        )
      ) {
        return (
          `${subject.subjectName}: ` +
          `Practical marks cannot exceed ` +
          `${subject.practicalMarks}.`
        );
      }
    }

    return "";
  };

  const saveResult = async () => {
    if (
      !authUser?.uid ||
      !teacher?.className ||
      !teacher?.section ||
      !selectedStudent
    ) {
      setMessage(
        "Teacher class scope or student is unavailable."
      );
      return;
    }

    if (
      activeResult?.publishStatus ===
      "PUBLISHED"
    ) {
      setMessage(
        "Published results cannot be edited by teachers."
      );
      return;
    }

    if (!subjects.length) {
      setMessage(
        "No active subjects configured for this class."
      );
      return;
    }

    const validation =
      validateMarks();

    if (validation) {
      setMessage(validation);
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const existing =
        activeResult;

      const resultId =
        existing?.id ||
        [
          teacher.sessionId ||
            sessionName ||
            "session",
          examName,
          selectedStudent.id,
        ]
          .join("_")
          .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

      const payload = {
        studentId:
          selectedStudent.id,

        studentName:
          selectedStudent.name ||
          "",

        enrollmentNo:
          String(
            selectedStudent.enrollmentNo ??
              ""
          ),

        classId:
          teacher.classId ||
          teacher.classTeacherClassId ||
          "",

        className:
          String(
            teacher.className
          ),

        section:
          String(
            teacher.section
          ),

        fatherName:
          selectedStudent.fatherName ||
          "",

        mobile:
          selectedStudent.mobile ||
          "",

        email:
          selectedStudent.email ||
          "",

        schoolName:
          "XYZ School ERP",

        session:
          sessionName,

        sessionId:
          teacher.sessionId ||
          "",

        examName,

        exam:
          examName,

        formData,

        result: generated,

        performance:
          generated.percentage >= 75
            ? "Excellent"
            : generated.percentage >= 60
            ? "Very Good"
            : generated.percentage >= 45
            ? "Good"
            : generated.percentage >= 33
            ? "Needs Improvement"
            : "Requires Attention",

        teacherRemarks:
          generated.status === "PASS"
            ? "Result entered successfully. Continue consistent preparation."
            : "Academic improvement is recommended in the failed subjects.",

        subjects:
          generated.subjects.map(
            (subject) => ({
              subjectCode:
                subject.subjectCode,
              subjectName:
                subject.subjectName,
              theoryMarks:
                safeNumber(
                  subject.theoryMarks
                ),
              practicalMarks:
                safeNumber(
                  subject.practicalMarks
                ),
              totalMarks:
                safeNumber(
                  subject.totalMaximum
                ),
              passingTheory:
                safeNumber(
                  subject.passingTheory
                ),
              passingPractical:
                safeNumber(
                  subject.passingPractical
                ),
              theory:
                safeNumber(
                  subject.theory
                ),
              practical:
                safeNumber(
                  subject.practical
                ),
              total:
                safeNumber(
                  subject.total
                ),
              pass:
                Boolean(
                  subject.pass
                ),
            })
          ),

        totalSubjects:
          generated.totalSubjects,

        obtainedMarks:
          generated.obtainedMarks,

        maximumMarks:
          generated.maximumMarks,

        percentage:
          generated.percentage,

        grade:
          generated.grade,

        division:
          generated.division,

        status:
          generated.status,

        failedSubjects:
          generated.failedSubjects,

        failedCount:
          generated.failedCount,

        publishStatus:
          existing?.publishStatus ||
          "DRAFT",

        verified:
          existing?.verified ||
          false,

        verifiedBy:
          existing?.verifiedBy ||
          null,

        publishedBy:
          existing?.publishedBy ||
          null,

        updatedBy:
          authUser.uid,

        updatedByName:
          teacher.name ||
          authUser.displayName ||
          "Teacher",

        updatedByRole:
          "teacher",

        teacherScopeClass:
          String(
            teacher.className
          ),

        teacherScopeSection:
          String(
            teacher.section
          ),

        updatedAt:
          serverTimestamp(),
      };

      const resultRef = doc(db, "results", resultId);
      if (existing?.id) {
        await updateDoc(resultRef, payload);
      } else {
        await setDoc(resultRef, {
          ...payload,
          verified: false,
          verifiedBy: null,
          publishedBy: null,
          publishedAt: null,
          createdAt: serverTimestamp(),
        });
      }

      try {
        const draftKey =
          `xyz_teacher_result_draft_` +
          `${selectedStudent.id}_` +
          `${examName}`;

        window.localStorage.removeItem(
          draftKey
        );
      } catch (error) {
        console.warn(
          "Draft cleanup skipped:",
          error
        );
      }

      setMessage(
        "Marks saved successfully. Verification and publishing remain Admin-only."
      );

      setActiveResult({
        ...payload,
        id: resultId,
      });

      setLastSavedAt(
        new Date().toLocaleTimeString(
          "en-IN"
        )
      );
    } catch (error) {
      console.error(
        "Teacher result save error:",
        error
      );

      setMessage(
        error?.code ===
          "permission-denied"
          ? "Permission denied. Firestore Rules are blocking this teacher/class operation."
          : error?.message ||
              "Unable to save result."
      );
    } finally {
      setSaving(false);
    }
  };

  const exportResults = () => {
    const rows =
      results.map(
        (result) => ({
          "Student Name":
            result.studentName ||
            "",
          "Enrollment No":
            result.enrollmentNo ||
            "",
          Class:
            result.className ||
            "",
          Section:
            result.section ||
            "",
          Exam:
            result.examName ||
            result.exam ||
            "",
          "Obtained Marks":
            result.obtainedMarks ||
            0,
          "Maximum Marks":
            result.maximumMarks ||
            0,
          Percentage:
            result.percentage ||
            0,
          Grade:
            result.grade ||
            "",
          Status:
            result.status ||
            "",
          "Publish Status":
            result.publishStatus ||
            "DRAFT",
          "Updated By":
            result.updatedByName ||
            "",
        })
      );

    downloadTeacherTsv(
      rows,
      `results_${className}_${section}.xls`
    );
  };

  const previewResult = (student) => {
    loadStudentResult(student);
    setShowPreview(true);
  };

  const enteredResult =
    selectedStudent
      ? resultMap[
          `${selectedStudent.id}__${examName}`
        ]
      : null;

  return (
    <section className="mt-6 space-y-5">
      <div className="rounded-[2rem] overflow-hidden bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950 border border-white/10 shadow-2xl p-6 md:p-8 text-white">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <p className="text-violet-300 text-xs uppercase tracking-[.25em] font-black">
              Teacher Result Studio
            </p>
            <h3 className="text-3xl md:text-4xl font-black mt-2">
              📝 {teacherClassLabel(teacher)}
            </h3>
            <p className="text-slate-300 mt-3 max-w-3xl">
              Enter and update marks only for students
              in your assigned class and section.
              Teachers can prepare results, but cannot
              verify or publish them.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 font-black">
              Session {sessionName}
            </span>
            <span className="px-3 py-2 rounded-xl bg-amber-400/15 text-amber-200 border border-amber-300/10 font-black">
              🔐 Admin Publish Only
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-cyan-900 font-bold">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniStat
          title="Students"
          value={summary.total}
        />
        <MiniStat
          title="Marks Entered"
          value={summary.entered}
        />
        <MiniStat
          title="Pending"
          value={summary.pending}
        />
        <MiniStat
          title="Passed"
          value={summary.passed}
        />
        <MiniStat
          title="Published"
          value={summary.published}
        />
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-xl">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="xl:col-span-2">
            <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Search Student
            </label>
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Name / enrollment / father name"
              className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Exam
            </label>
            <input
              value={examName}
              onChange={(event) =>
                setExamName(
                  event.target.value
                )
              }
              className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Session
            </label>
            <input
              value={sessionName}
              onChange={(event) =>
                setSessionName(
                  event.target.value
                )
              }
              className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Filter
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold"
            >
              <option value="ALL">
                All Students
              </option>
              <option value="PASS">
                Passed
              </option>
              <option value="FAIL">
                Failed
              </option>
              <option value="NOT_ENTERED">
                Not Entered
              </option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={exportResults}
            className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800"
          >
            📥 Export Class Results
          </button>

          <span className="px-4 py-3 rounded-2xl bg-violet-50 text-violet-800 font-black">
            {subjects.length} active subjects
          </span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_1.4fr] gap-5">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-violet-500 font-black">
                  Student List
                </p>
                <h4 className="text-xl font-black mt-1">
                  {filteredStudents.length} students
                </h4>
              </div>

              {resultsLoading && (
                <span className="text-xs font-black text-slate-400">
                  Syncing…
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[720px] overflow-y-auto divide-y divide-slate-100">
            {filteredStudents.map(
              (student, index) => {
                const result =
                  resultMap[
                    `${student.id}__${teacher.sessionId || sessionName || ""}__${examName}`
                  ];

                const selected =
                  selectedStudent?.id ===
                  student.id;

                return (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() =>
                      loadStudentResult(
                        student
                      )
                    }
                    className={`w-full text-left p-4 transition ${
                      selected
                        ? "bg-violet-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white flex items-center justify-center font-black">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-900 truncate">
                          {student.name ||
                            "Student"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {student.enrollmentNo ||
                            "No enrollment"}
                        </p>
                      </div>

                      <div className="text-right">
                        {result ? (
                          <>
                            <p className="font-black text-violet-700">
                              {safeNumber(
                                result.percentage
                              )}%
                            </p>
                            <p className="text-[10px] font-black text-slate-400">
                              {result.publishStatus ||
                                "DRAFT"}
                            </p>
                          </>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black">
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}

            {!filteredStudents.length && (
              <EmptyState
                icon="🔎"
                title="No student found"
                text="Try another search or filter."
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-5 md:p-6">
          {!selectedStudent ? (
            <EmptyState
              icon="📝"
              title="Select a student"
              text="Choose a student from the class list to enter or review marks."
            />
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-violet-500 font-black">
                    Mark Entry
                  </p>
                  <h4 className="text-2xl font-black mt-1">
                    {selectedStudent.name}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedStudent.enrollmentNo ||
                      "—"}{" "}
                    • {teacherClassLabel(teacher)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={restoreDraft}
                    className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-800 font-black text-sm"
                  >
                    ↩ Restore Draft
                  </button>

                  <button
                    type="button"
                    onClick={clearDraft}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm"
                  >
                    Clear Draft
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPreview(
                        true
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-violet-50 text-violet-800 font-black text-sm"
                  >
                    👁 Preview
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                <MiniStat
                  title="Obtained"
                  value={
                    generated.obtainedMarks
                  }
                />
                <MiniStat
                  title="Maximum"
                  value={
                    generated.maximumMarks
                  }
                />
                <MiniStat
                  title="Percentage"
                  value={`${generated.percentage}%`}
                />
                <MiniStat
                  title="Grade"
                  value={
                    generated.grade
                  }
                />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs uppercase font-black text-slate-500">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-center text-xs uppercase font-black text-slate-500">
                          Theory
                        </th>
                        <th className="px-4 py-3 text-center text-xs uppercase font-black text-slate-500">
                          Practical
                        </th>
                        <th className="px-4 py-3 text-center text-xs uppercase font-black text-slate-500">
                          Total
                        </th>
                        <th className="px-4 py-3 text-center text-xs uppercase font-black text-slate-500">
                          Result
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {subjects.map(
                        (subject) => {
                          const value =
                            formData[
                              subject.subjectCode
                            ] || {};

                          const theory =
                            safeNumber(
                              value.theory
                            );

                          const practical =
                            safeNumber(
                              value.practical
                            );

                          const generatedSubject =
                            generated.subjects.find(
                              (item) =>
                                item.subjectCode ===
                                subject.subjectCode
                            );

                          const locked =
                            activeResult?.publishStatus ===
                            "PUBLISHED";

                          return (
                            <tr
                              key={
                                subject.id ||
                                subject.subjectCode
                              }
                            >
                              <td className="px-4 py-3">
                                <p className="font-black">
                                  {subject.subjectName ||
                                    subject.subjectCode}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {subject.subjectCode}
                                  {" • "}
                                  Max{" "}
                                  {safeNumber(
                                    subject.theoryMarks
                                  ) +
                                    safeNumber(
                                      subject.practicalMarks
                                    )}
                                </p>
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  max={safeNumber(
                                    subject.theoryMarks
                                  )}
                                  value={
                                    value.theory
                                  }
                                  disabled={
                                    locked
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateMark(
                                      subject.subjectCode,
                                      "theory",
                                      event.target.value
                                    )
                                  }
                                  className="w-24 mx-auto block px-3 py-2 rounded-xl border border-slate-200 text-center font-black disabled:bg-slate-100"
                                />
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  max={safeNumber(
                                    subject.practicalMarks
                                  )}
                                  value={
                                    value.practical
                                  }
                                  disabled={
                                    locked
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateMark(
                                      subject.subjectCode,
                                      "practical",
                                      event.target.value
                                    )
                                  }
                                  className="w-24 mx-auto block px-3 py-2 rounded-xl border border-slate-200 text-center font-black disabled:bg-slate-100"
                                />
                              </td>

                              <td className="px-4 py-3 text-center font-black">
                                {theory +
                                  practical}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2.5 py-1.5 rounded-full text-xs font-black ${
                                    generatedSubject?.pass
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {generatedSubject?.pass
                                    ? "PASS"
                                    : "FAIL"}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 grid md:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-xs uppercase font-black text-emerald-600">
                    Overall Status
                  </p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">
                    {generated.status}
                  </p>
                </div>

                <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                  <p className="text-xs uppercase font-black text-violet-600">
                    Division
                  </p>
                  <p className="font-black text-violet-900 mt-1">
                    {generated.division}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-xs uppercase font-black text-amber-600">
                    Failed Subjects
                  </p>
                  <p className="font-black text-amber-900 mt-1">
                    {generated.failedCount}
                  </p>
                </div>
              </div>

              {activeResult?.publishStatus ===
                "PUBLISHED" && (
                <div className="mt-5 rounded-2xl bg-red-50 border border-red-100 p-4 text-red-800 font-black">
                  🔒 Published result is locked.
                  Teacher cannot modify, verify or
                  publish it.
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
                <div className="text-xs text-slate-400 font-bold">
                  {lastSavedAt
                    ? `Local draft: ${lastSavedAt}`
                    : "Draft autosave is active"}
                </div>

                <button
                  type="button"
                  onClick={saveResult}
                  disabled={
                    saving ||
                    activeResult?.publishStatus ===
                      "PUBLISHED"
                  }
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-black shadow-lg disabled:opacity-50"
                >
                  {saving
                    ? "Saving Marks..."
                    : "💾 Save Result Draft"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showPreview && selectedStudent && (
        <ResultPreviewModal
          student={selectedStudent}
          teacher={teacher}
          subjects={subjects}
          generated={generated}
          examName={examName}
          sessionName={sessionName}
          result={enteredResult}
          onClose={() =>
            setShowPreview(false)
          }
        />
      )}
    </section>
  );
}

function ResultPreviewModal({
  student,
  teacher,
  subjects,
  generated,
  examName,
  sessionName,
  result,
  onClose,
}) {
  const print = () => {
    const popup =
      window.open(
        "",
        "_blank",
        "width=1000,height=900"
      );

    if (!popup) {
      window.alert(
        "Popup blocked. Allow popups to print the result."
      );
      return;
    }

    const rows =
      generated.subjects
        .map(
          (subject) => `
          <tr>
            <td>${subject.subjectName || ""}</td>
            <td>${safeNumber(subject.theory)}</td>
            <td>${safeNumber(subject.practical)}</td>
            <td>${safeNumber(subject.total)}</td>
          </tr>
        `
        )
        .join("");

    popup.document.write(`
      <!doctype html>
      <html>
      <head>
      <meta charset="utf-8" />
      <title>${student.name || "Student"} Result</title>
      <style>
        body{font-family:Arial;margin:30px;color:#0f172a}
        .head{text-align:center;border-bottom:3px solid #4f46e5;padding-bottom:18px}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}
        .box{padding:12px;background:#f8fafc;border:1px solid #e2e8f0}
        table{width:100%;border-collapse:collapse;margin-top:24px}
        th,td{border:1px solid #cbd5e1;padding:10px}
        th{background:#f1f5f9}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}
        .stat{padding:14px;background:#eef2ff}
        @media print{button{display:none}}
      </style>
      </head>
      <body>
        <div class="head">
          <h1>XYZ SCHOOL</h1>
          <h2>Student Result</h2>
          <p>${examName} • Session ${sessionName}</p>
        </div>

        <div class="meta">
          <div class="box"><b>Student</b><br/>${student.name || ""}</div>
          <div class="box"><b>Enrollment</b><br/>${student.enrollmentNo || ""}</div>
          <div class="box"><b>Class</b><br/>${teacher.className || ""} - ${teacher.section || ""}</div>
          <div class="box"><b>Teacher</b><br/>${teacher.name || ""}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Theory</th>
              <th>Practical</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="stats">
          <div class="stat"><b>Obtained</b><br/>${generated.obtainedMarks}</div>
          <div class="stat"><b>Maximum</b><br/>${generated.maximumMarks}</div>
          <div class="stat"><b>Percentage</b><br/>${generated.percentage}%</div>
          <div class="stat"><b>Grade</b><br/>${generated.grade}</div>
        </div>

        <p style="margin-top:24px">
          <b>Status:</b> ${generated.status}
          &nbsp;&nbsp;
          <b>Division:</b> ${generated.division}
        </p>

        <p style="margin-top:40px;color:#64748b;font-size:12px">
          ${result?.publishStatus === "PUBLISHED"
            ? "Published result"
            : "Teacher-prepared result draft — Admin verification/publishing required."}
        </p>

        <button onclick="window.print()">Print / Save PDF</button>
      </body>
      </html>
    `);

    popup.document.close();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-500 font-black">
              Result Preview
            </p>
            <h3 className="text-2xl font-black mt-1">
              {student.name}
            </h3>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={print}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black"
            >
              🖨 Print / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 font-black"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-4 gap-3">
            <MiniStat
              title="Obtained"
              value={
                generated.obtainedMarks
              }
            />
            <MiniStat
              title="Maximum"
              value={
                generated.maximumMarks
              }
            />
            <MiniStat
              title="Percentage"
              value={`${generated.percentage}%`}
            />
            <MiniStat
              title="Grade"
              value={
                generated.grade
              }
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Subject
                  </th>
                  <th className="px-4 py-3">
                    Theory
                  </th>
                  <th className="px-4 py-3">
                    Practical
                  </th>
                  <th className="px-4 py-3">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {generated.subjects.map(
                  (subject) => (
                    <tr
                      key={
                        subject.subjectCode
                      }
                    >
                      <td className="px-4 py-3 font-bold">
                        {subject.subjectName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {subject.theory}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {subject.practical}
                      </td>
                      <td className="px-4 py-3 text-center font-black">
                        {subject.total}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeesSection({
  teacher,
  students,
  authUser,
}) {
  const [feeSettings, setFeeSettings] =
    useState({});

  const [feeStructures, setFeeStructures] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [paymentType, setPaymentType] =
    useState(
      TEACHER_FEE_TYPES.ACADEMIC
    );

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [paymentRemarks, setPaymentRemarks] =
    useState("");

  const [savingPayment, setSavingPayment] =
    useState(false);

  const [historyStudent, setHistoryStudent] =
    useState(null);

  const [lastReceipt, setLastReceipt] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [showStructure, setShowStructure] =
    useState(true);

  const [historySearch, setHistorySearch] =
    useState("");

  const className =
    String(teacher?.className || "");

  const section =
    String(teacher?.section || "");

  useEffect(() => {
    const unsubSettings =
      onSnapshot(
        doc(
          db,
          "settings",
          "feeSettings"
        ),
        (snapshot) => {
          setFeeSettings(
            snapshot.exists()
              ? snapshot.data() || {}
              : {}
          );
        },
        (error) => {
          console.error(
            "Teacher fee settings:",
            error
          );
        }
      );

    const unsubStructures =
      onSnapshot(
        collection(
          db,
          "feeStructures"
        ),
        (snapshot) => {
          const next = {};

          snapshot.forEach(
            (item) => {
              next[item.id] = {
                id: item.id,
                ...item.data(),
              };
            }
          );

          setFeeStructures(next);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Teacher fee structures:",
            error
          );
          setFeeStructures({});
          setLoading(false);
        }
      );

    return () => {
      unsubSettings();
      unsubStructures();
    };
  }, []);

  const scopedStudents =
    useMemo(
      () =>
        students.filter(
          (student) =>
            normalize(
              student.className
            ) ===
              normalize(className) &&
            normalize(
              student.section
            ) ===
              normalize(section)
        ),
      [students, className, section]
    );

  const feeRows =
    useMemo(
      () =>
        scopedStudents.map(
          (student) => {
            const fee =
              getTeacherFeeStructure(
                feeStructures,
                feeSettings,
                student
              );

            const status =
              fee.totalDue <= 0
                ? "PAID"
                : fee.totalPaid > 0
                ? "PARTIAL"
                : "UNPAID";

            return {
              student,
              fee,
              status,
            };
          }
        ),
      [
        scopedStudents,
        feeStructures,
        feeSettings,
      ]
    );

  const filteredRows =
    useMemo(() => {
      const q =
        normalize(search);

      return feeRows.filter(
        (row) => {
          const student =
            row.student;

          const value =
            `${student.name || ""} ` +
            `${student.enrollmentNo || ""} ` +
            `${student.fatherName || ""}`;

          if (
            q &&
            !normalize(value).includes(q)
          ) {
            return false;
          }

          if (
            statusFilter !== "ALL" &&
            row.status !==
              statusFilter
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      feeRows,
      search,
      statusFilter,
    ]);

  const feeSummary =
    useMemo(
      () =>
        feeRows.reduce(
          (acc, row) => {
            acc.annual +=
              row.fee.annualFee;

            acc.transport +=
              row.fee.transportCharge;

            acc.paid +=
              row.fee.totalPaid;

            acc.due +=
              row.fee.totalDue;

            return acc;
          },
          {
            annual: 0,
            transport: 0,
            paid: 0,
            due: 0,
          }
        ),
      [feeRows]
    );

  const paymentDue =
    selectedStudent
      ? getTeacherFeeStructure(
          feeStructures,
          feeSettings,
          selectedStudent
        )
      : null;

  const selectedDue =
    paymentDue
      ? paymentType ===
        TEACHER_FEE_TYPES.TRANSPORTATION
        ? paymentDue.transportDue
        : paymentDue.academicDue
      : 0;

  const openPayment =
    (student) => {
      setSelectedStudent(
        student
      );

      setPaymentAmount("");
      setPaymentMethod(
        "Cash"
      );
      setPaymentRemarks("");
      setPaymentType(
        TEACHER_FEE_TYPES.ACADEMIC
      );
      setMessage("");
    };

  const collectPayment =
    async () => {
      if (
        !authUser?.uid ||
        !teacher ||
        !selectedStudent
      ) {
        setMessage(
          "Teacher or student scope unavailable."
        );
        return;
      }

      const amount =
        Number(
          paymentAmount
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setMessage(
          "Enter a valid payment amount."
        );
        return;
      }

      if (
        amount >
        selectedDue
      ) {
        setMessage(
          `Maximum current due is ${money(
            selectedDue
          )}.`
        );
        return;
      }

      try {
        setSavingPayment(
          true
        );
        setMessage("");

        const studentRef =
          doc(
            db,
            "students",
            selectedStudent.id
          );

        let receipt = null;

        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const snapshot =
              await transaction.get(
                studentRef
              );

            if (
              !snapshot.exists()
            ) {
              throw new Error(
                "Student record was not found."
              );
            }

            const current =
              snapshot.data();

            
            const fee =
              getTeacherFeeStructure(
                feeStructures,
                feeSettings,
                current
              );

            const currentDue =
              paymentType ===
              TEACHER_FEE_TYPES.TRANSPORTATION
                ? fee.transportDue
                : fee.academicDue;

            if (
              amount >
              currentDue
            ) {
              throw new Error(
                `Current due is ${money(
                  currentDue
                )}. Payment exceeds due amount.`
              );
            }

            const academicPaid =
              fee.academicPaid +
              (
                paymentType ===
                TEACHER_FEE_TYPES.ACADEMIC
                  ? amount
                  : 0
              );

            const transportPaid =
              fee.transportPaid +
              (
                paymentType ===
                TEACHER_FEE_TYPES.TRANSPORTATION
                  ? amount
                  : 0
              );

            const academicDue =
              Math.max(
                0,
                fee.annualFee -
                  academicPaid
              );

            const transportDue =
              Math.max(
                0,
                fee.transportCharge -
                  transportPaid
              );

            const totalPaid =
              academicPaid +
              transportPaid;

            const totalDue =
              academicDue +
              transportDue;

            const now =
              new Date();

            const receiptNo =
              makeTeacherReceiptNo(
                current
              );

            const payment = {
              amount,
              feeType:
                paymentType,
              date:
                now.toLocaleDateString(
                  "en-GB"
                ),
              day:
                now.toLocaleDateString(
                  "en-IN",
                  {
                    weekday:
                      "long",
                  }
                ),
              method:
                paymentMethod,
              receiptNo,
              receivedBy:
                teacher.name ||
                authUser.displayName ||
                "Teacher",
              receivedByUid:
                authUser.uid,
              receivedByRole:
                "teacher",
              className:
                current.className ||
                "",
              section:
                current.section ||
                "",
              remarks:
                paymentRemarks.trim(),
              status:
                "SUCCESS",
              timestamp:
                Date.now(),
              time:
                now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
              academicPaidBefore:
                fee.academicPaid,
              transportPaidBefore:
                fee.transportPaid,
              academicPaidAfter:
                academicPaid,
              academicDueAfter:
                academicDue,
              transportPaidAfter:
                transportPaid,
              transportDueAfter:
                transportDue,
              totalPaidAfter:
                totalPaid,
              totalDueAfter:
                totalDue,
            };

            const history =
              Array.isArray(
                current.paymentHistory
              )
                ? current.paymentHistory
                : [];

            transaction.update(
              studentRef,
              {
                annualFee:
                  fee.annualFee,

                paidFee:
                  academicPaid,

                dueFee:
                  academicDue,

                transportFee:
                  fee.transportCharge,

                transportPaid:
                  transportPaid,

                transportDue:
                  transportDue,

                totalPaid:
                  totalPaid,

                totalDue:
                  totalDue,

                paymentHistory: [
                  ...history,
                  payment,
                ],

                lastPayment:
                  payment.date,

                lastPaymentMethod:
                  payment.method,

                lastPaymentReceipt:
                  receiptNo,

                updatedAt:
                  serverTimestamp(),
              }
            );

            receipt = {
              ...payment,
              studentName:
                current.name ||
                "",
              enrollmentNo:
                current.enrollmentNo ||
                "",
              className:
                current.className ||
                "",
              section:
                current.section ||
                "",
              annualFee:
                fee.annualFee,
              transportCharge:
                fee.transportCharge,
              totalPaidAfter:
                totalPaid,
              totalDueAfter:
                totalDue,
            };
          }
        );

        setLastReceipt(
          receipt
        );

        setSelectedStudent(
          null
        );

        setPaymentAmount(
          ""
        );

        setPaymentRemarks(
          ""
        );

        setPaymentMethod(
          "Cash"
        );

        if (receipt) {
          openTeacherReceipt(
            receipt
          );
        }

        setMessage(
          `Payment collected successfully. Receipt ${receipt?.receiptNo || ""}`
        );
      } catch (error) {
        console.error(
          "Teacher payment error:",
          error
        );

        setMessage(
          error?.code ===
            "permission-denied"
            ? "Permission denied. Firestore Rules must allow only authorized teacher fee collection."
            : error?.message ||
                "Payment could not be saved."
        );
      } finally {
        setSavingPayment(
          false
        );
      }
    };

  const exportFees =
    () => {
      const rows =
        filteredRows.map(
          (row) => ({
            "Student Name":
              row.student.name ||
              "",
            "Enrollment No":
              row.student.enrollmentNo ||
              "",
            Class:
              row.student.className ||
              "",
            Section:
              row.student.section ||
              "",
            "Annual Academic Fee":
              row.fee.annualFee,
            "Academic Paid":
              row.fee.academicPaid,
            "Academic Due":
              row.fee.academicDue,
            "Transport Fee":
              row.fee.transportCharge,
            "Transport Paid":
              row.fee.transportPaid,
            "Transport Due":
              row.fee.transportDue,
            "Total Paid":
              row.fee.totalPaid,
            "Total Due":
              row.fee.totalDue,
            Status:
              row.status,
            "Last Payment":
              row.student.lastPayment ||
              "",
          })
        );

      downloadTeacherTsv(
        rows,
        `fees_${className}_${section}.xls`
      );
    };

  const openHistory =
    (student) => {
      setHistoryStudent(
        student
      );
      setHistorySearch("");
    };

  const historyRows =
    useMemo(() => {
      const history =
        getTeacherPaymentHistory(
          historyStudent
        );

      const q =
        normalize(
          historySearch
        );

      return history.filter(
        (item) => {
          if (!q) return true;

          const value =
            `${item.receiptNo || ""} ` +
            `${item.method || ""} ` +
            `${item.feeType || ""} ` +
            `${item.amount || ""}`;

          return normalize(
            value
          ).includes(q);
        }
      );
    }, [
      historyStudent,
      historySearch,
    ]);

  return (
    <section className="mt-6 space-y-5">
      <div className="rounded-[2rem] overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950 border border-white/10 shadow-2xl p-6 md:p-8 text-white">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <p className="text-emerald-300 text-xs uppercase tracking-[.25em] font-black">
              Teacher Fee Collection
            </p>

            <h3 className="text-3xl md:text-4xl font-black mt-2">
              💰 {teacherClassLabel(teacher)}
            </h3>

            <p className="text-slate-300 mt-3 max-w-3xl">
              View fee structure, collect academic or
              transportation payments, print receipts,
              inspect payment history and export your
              assigned class fee report.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 font-black">
              Class Scoped
            </span>
            <span className="px-3 py-2 rounded-xl bg-emerald-400/15 text-emerald-200 border border-emerald-300/10 font-black">
              🔐 Teacher Collection
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-cyan-900 font-bold">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          title="Students"
          value={scopedStudents.length}
        />
        <MiniStat
          title="Total Fee"
          value={money(
            feeSummary.annual +
              feeSummary.transport
          )}
        />
        <MiniStat
          title="Collected"
          value={money(
            feeSummary.paid
          )}
        />
        <MiniStat
          title="Outstanding"
          value={money(
            feeSummary.due
          )}
        />
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500 font-black">
              Fee Structure
            </p>

            <h4 className="text-xl font-black mt-1">
              {className} • {section}
            </h4>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowStructure(
                (value) => !value
              )
            }
            className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-black"
          >
            {showStructure
              ? "Hide Structure"
              : "Show Structure"}
          </button>
        </div>

        {showStructure && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <FeeSummaryCard
              label="Academic Fee"
              value={feeRows[0]
                ? feeRows[0].fee.annualFee
                : 0}
            />

            <FeeSummaryCard
              label="Transportation Charge"
              value={feeRows[0]
                ? feeRows[0].fee.transportCharge
                : 0}
              accent="cyan"
            />

            <FeeSummaryCard
              label="Academic Paid"
              value={feeSummary.paid}
            />

            <FeeSummaryCard
              label="Class Due"
              value={feeSummary.due}
              danger
            />
          </div>
        )}

        <div className="mt-5 grid md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search student..."
            className="px-4 py-3 rounded-2xl border border-slate-200 font-bold"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="px-4 py-3 rounded-2xl border border-slate-200 font-bold"
          >
            <option value="ALL">
              All Fee Status
            </option>
            <option value="PAID">
              Fully Paid
            </option>
            <option value="PARTIAL">
              Partially Paid
            </option>
            <option value="UNPAID">
              Unpaid
            </option>
          </select>

          <button
            type="button"
            onClick={exportFees}
            className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black"
          >
            📥 Export Fee Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider">
                  Academic
                </th>
                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider">
                  Transport
                </th>
                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider">
                  Due
                </th>
                <th className="px-4 py-4 text-left text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-right text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(
                (row) => (
                  <tr
                    key={row.student.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-black">
                        {row.student.name ||
                          "Student"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {row.student.enrollmentNo ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-black">
                        {money(
                          row.fee.annualFee
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Paid{" "}
                        {money(
                          row.fee.academicPaid
                        )}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-black">
                        {money(
                          row.fee.transportCharge
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Paid{" "}
                        {money(
                          row.fee.transportPaid
                        )}
                      </p>
                    </td>

                    <td className="px-4 py-4 font-black text-emerald-700">
                      {money(
                        row.fee.totalPaid
                      )}
                    </td>

                    <td className="px-4 py-4 font-black text-red-600">
                      {money(
                        row.fee.totalDue
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-black ${
                          row.status ===
                          "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : row.status ===
                              "PARTIAL"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openPayment(
                              row.student
                            )
                          }
                          disabled={
                            row.fee.totalDue <=
                            0
                          }
                          className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm disabled:opacity-40"
                        >
                          Collect
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openHistory(
                              row.student
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 font-black text-sm"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {!filteredRows.length && (
                <tr>
                  <td
                    colSpan="7"
                    className="p-10 text-center"
                  >
                    <EmptyState
                      icon="💰"
                      title="No fee records"
                      text="No students match the current filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <FeePaymentModal
          student={
            selectedStudent
          }
          fee={
            paymentDue
          }
          paymentType={
            paymentType
          }
          setPaymentType={
            setPaymentType
          }
          paymentAmount={
            paymentAmount
          }
          setPaymentAmount={
            setPaymentAmount
          }
          paymentMethod={
            paymentMethod
          }
          setPaymentMethod={
            setPaymentMethod
          }
          paymentRemarks={
            paymentRemarks
          }
          setPaymentRemarks={
            setPaymentRemarks
          }
          selectedDue={
            selectedDue
          }
          saving={
            savingPayment
          }
          onSave={
            collectPayment
          }
          onClose={() =>
            setSelectedStudent(
              null
            )
          }
        />
      )}

      {historyStudent && (
        <FeeHistoryModal
          student={
            historyStudent
          }
          history={
            historyRows
          }
          search={
            historySearch
          }
          setSearch={
            setHistorySearch
          }
          onClose={() =>
            setHistoryStudent(
              null
            )
          }
          onReceipt={
            (payment) => {
              const receipt = {
                ...payment,
                studentName:
                  historyStudent.name ||
                  "",
                enrollmentNo:
                  historyStudent.enrollmentNo ||
                  "",
                className:
                  historyStudent.className ||
                  "",
                section:
                  historyStudent.section ||
                  "",
                totalPaidAfter:
                  payment.totalPaidAfter ||
                  0,
                totalDueAfter:
                  payment.totalDueAfter ||
                  0,
              };

              openTeacherReceipt(
                receipt
              );
            }
          }
        />
      )}

      {lastReceipt && (
        <div className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-2xl bg-slate-950 text-white p-5 shadow-2xl">
          <p className="text-xs uppercase tracking-widest text-emerald-300 font-black">
            Last Receipt
          </p>
          <p className="font-black mt-1">
            {lastReceipt.receiptNo}
          </p>
          <p className="text-sm text-slate-300 mt-1">
            {money(
              lastReceipt.amount
            )} collected
          </p>
          <button
            type="button"
            onClick={() =>
              openTeacherReceipt(
                lastReceipt
              )
            }
            className="mt-3 px-4 py-2 rounded-xl bg-white text-slate-950 font-black"
          >
            Print Again
          </button>
        </div>
      )}
    </section>
  );
}

function FeeSummaryCard({
  label,
  value,
  danger = false,
  accent = "slate",
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        danger
          ? "bg-red-50 border-red-100"
          : "bg-slate-50 border-slate-100"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-widest font-black ${
          danger
            ? "text-red-500"
            : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-black mt-2 ${
          danger
            ? "text-red-700"
            : "text-slate-900"
        }`}
      >
        {money(value)}
      </p>
    </div>
  );
}

function FeePaymentModal({
  student,
  fee,
  paymentType,
  setPaymentType,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentRemarks,
  setPaymentRemarks,
  selectedDue,
  saving,
  onSave,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl">
        <div className="p-6 bg-gradient-to-br from-emerald-700 to-cyan-700 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-100 font-black">
                Collect Fee
              </p>
              <h3 className="text-2xl font-black mt-1">
                {student.name}
              </h3>
              <p className="text-emerald-100 text-sm mt-1">
                {student.enrollmentNo ||
                  "—"}{" "}
                •{" "}
                {student.className ||
                  "—"}-
                {student.section ||
                  "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/15 font-black"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            <FeeSummaryCard
              label="Academic Due"
              value={
                fee?.academicDue ||
                0
              }
              danger
            />

            <FeeSummaryCard
              label="Transport Due"
              value={
                fee?.transportDue ||
                0
              }
              danger
            />
          </div>

          <div className="mt-5">
            <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Fee Type
            </label>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() =>
                  setPaymentType(
                    TEACHER_FEE_TYPES.ACADEMIC
                  )
                }
                className={`p-4 rounded-2xl border text-left font-black ${
                  paymentType ===
                  TEACHER_FEE_TYPES.ACADEMIC
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200"
                }`}
              >
                Academic Fee
                <span className="block text-sm mt-1 opacity-70">
                  Due{" "}
                  {money(
                    fee?.academicDue
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaymentType(
                    TEACHER_FEE_TYPES.TRANSPORTATION
                  )
                }
                className={`p-4 rounded-2xl border text-left font-black ${
                  paymentType ===
                  TEACHER_FEE_TYPES.TRANSPORTATION
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200"
                }`}
              >
                Transportation
                <span className="block text-sm mt-1 opacity-70">
                  Due{" "}
                  {money(
                    fee?.transportDue
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-5 grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
                Amount
              </label>

              <input
                type="number"
                min="1"
                max={selectedDue}
                value={
                  paymentAmount
                }
                onChange={(
                  event
                ) =>
                  setPaymentAmount(
                    event.target.value
                  )
                }
                placeholder={`Max ${selectedDue}`}
                className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 text-lg font-black"
              />
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[0.25, 0.5, 1].map((ratio) => (
                  <button key={ratio} type="button" onClick={() => setPaymentAmount(String(Math.round(selectedDue * ratio)))} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 font-black text-xs">{ratio === 1 ? "Full Due" : `${ratio * 100}%`}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
                Payment Method
              </label>

              <select
                value={
                  paymentMethod
                }
                onChange={(
                  event
                ) =>
                  setPaymentMethod(
                    event.target.value
                  )
                }
                className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold"
              >
                {TEACHER_PAYMENT_METHODS.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Remarks
            </label>

            <textarea
              rows="3"
              value={
                paymentRemarks
              }
              onChange={(
                event
              ) =>
                setPaymentRemarks(
                  event.target.value
                )
              }
              placeholder="Optional payment note..."
              className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200"
            />
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">
                Selected due
              </span>
              <span className="font-black text-red-600">
                {money(
                  selectedDue
                )}
              </span>
            </div>

            <div className="flex justify-between mt-2">
              <span className="font-bold text-slate-500">
                Collection amount
              </span>
              <span className="font-black text-emerald-700">
                {money(
                  paymentAmount
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-2xl bg-slate-100 text-slate-800 font-black"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={
                saving ||
                selectedDue <=
                  0
              }
              className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-black disabled:opacity-50"
            >
              {saving
                ? "Processing..."
                : "💳 Collect & Print Receipt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeeHistoryModal({
  student,
  history,
  search,
  setSearch,
  onClose,
  onReceipt,
}) {
  const totals =
    history.reduce(
      (sum, payment) =>
        sum +
        safeNumber(
          payment.amount
        ),
      0
    );

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl">
        <div className="sticky top-0 z-10 p-6 bg-white/95 backdrop-blur border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
              Payment History
            </p>

            <h3 className="text-2xl font-black mt-1">
              {student.name}
            </h3>

            <p className="text-sm text-slate-500">
              {student.enrollmentNo ||
                "—"}
            </p>
          </div>

          <div className="flex gap-2">
            <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-black">
              Total {money(totals)}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 font-black"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6">
          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search receipt / method / fee type..."
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold"
          />

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[850px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase font-black text-slate-500">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase font-black text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase font-black text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase font-black text-slate-500">
                    Method
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase font-black text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase font-black text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {history.map(
                  (payment, index) => (
                    <tr
                      key={
                        payment.receiptNo ||
                        index
                      }
                    >
                      <td className="px-4 py-3 font-black">
                        {payment.receiptNo ||
                          "—"}
                      </td>

                      <td className="px-4 py-3">
                        {payment.date ||
                          "—"}
                      </td>

                      <td className="px-4 py-3">
                        {payment.feeType ||
                          "ACADEMIC"}
                      </td>

                      <td className="px-4 py-3">
                        {payment.method ||
                          "Cash"}
                      </td>

                      <td className="px-4 py-3 text-right font-black text-emerald-700">
                        {money(
                          payment.amount
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onReceipt(
                              payment
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-sm"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {!history.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-10 text-center text-slate-500 font-bold"
                    >
                      No payment history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


const TEACHER_DASHBOARD_FEATURES = [
  {
    id: "overview",
    label: "Class Overview",
    category: "dashboard",
    status: "active",
  },
  {
    id: "attendance-daily",
    label: "Daily Attendance",
    category: "attendance",
    status: "active",
  },
  {
    id: "attendance-history",
    label: "Student Attendance History",
    category: "attendance",
    status: "active",
  },
  {
    id: "attendance-export",
    label: "Attendance Export",
    category: "attendance",
    status: "active",
  },
  {
    id: "attendance-delegation",
    label: "Class Teacher Attendance Delegation",
    category: "attendance",
    status: "active",
  },
  {
    id: "result-mark-entry",
    label: "Result Mark Entry",
    category: "results",
    status: "active",
  },
  {
    id: "result-draft",
    label: "Result Draft Autosave",
    category: "results",
    status: "active",
  },
  {
    id: "result-preview",
    label: "Result Preview",
    category: "results",
    status: "active",
  },
  {
    id: "result-export",
    label: "Result Export",
    category: "results",
    status: "active",
  },
  {
    id: "result-publish-lock",
    label: "Published Result Lock",
    category: "security",
    status: "active",
  },
  {
    id: "fee-structure",
    label: "Fee Structure View",
    category: "fees",
    status: "active",
  },
  {
    id: "fee-collection",
    label: "Fee Collection",
    category: "fees",
    status: "active",
  },
  {
    id: "fee-transport",
    label: "Transportation Fee",
    category: "fees",
    status: "active",
  },
  {
    id: "fee-history",
    label: "Payment History",
    category: "fees",
    status: "active",
  },
  {
    id: "fee-receipt",
    label: "Professional Receipt",
    category: "fees",
    status: "active",
  },
  {
    id: "fee-export",
    label: "Fee Export",
    category: "fees",
    status: "active",
  },
  {
    id: "admin-messages",
    label: "Admin Messages",
    category: "communication",
    status: "active",
  },
  {
    id: "notices",
    label: "Notice Center",
    category: "communication",
    status: "active",
  },
  {
    id: "requests",
    label: "Admin Requests",
    category: "communication",
    status: "active",
  },
  {
    id: "profile",
    label: "Teacher Profile",
    category: "account",
    status: "active",
  },
];


function teacherCanEditResult(
  teacher,
  result
) {
  if (
    !teacher ||
    !result
  ) {
    return false;
  }

  if (
    normalize(
      teacher.role
    ) !== "teacher"
  ) {
    return false;
  }

  if (
    normalize(
      result.className
    ) !==
    normalize(
      teacher.className
    )
  ) {
    return false;
  }

  if (
    normalize(
      result.section
    ) !==
    normalize(
      teacher.section
    )
  ) {
    return false;
  }

  if (
    normalize(
      result.publishStatus
    ) === "published"
  ) {
    return false;
  }

  return true;
}

function teacherCanCollectFee(
  teacher,
  student
) {
  if (
    !teacher ||
    !student
  ) {
    return false;
  }

  return (
    normalize(
      teacher.role
    ) === "teacher" &&
    normalize(
      teacher.className
    ) ===
      normalize(
        student.className
      ) &&
    normalize(
      teacher.section
    ) ===
      normalize(
        student.section
      ) &&
    normalize(
      teacher.accountStatus
    ) !== "disabled"
  );
}

function teacherAttendanceScopeMatches(
  teacher,
  className,
  section
) {
  return (
    normalize(
      teacher?.className
    ) === normalize(className) &&
    normalize(
      teacher?.section
    ) === normalize(section)
  );
}

function teacherResultCollectionKey(
  session,
  exam,
  studentId
) {
  return [
    session || "session",
    exam || "exam",
    studentId || "student",
  ]
    .join("_")
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );
}

function teacherPaymentCollectionKey(
  studentId,
  receiptNo
) {
  return [
    studentId || "student",
    receiptNo || "receipt",
  ]
    .join("_")
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );
}


function ModuleCard({
  icon,
  title,
  text,
}) {
  return (
    <section className="mt-6 bg-white rounded-3xl p-10 shadow-xl text-center">
      <div className="text-6xl">
        {icon}
      </div>

      <h3 className="text-3xl font-black mt-4">
        {title}
      </h3>

      <p className="max-w-2xl mx-auto text-slate-500 mt-3">
        {text}
      </p>

      <div className="mt-6 inline-flex px-4 py-2 rounded-xl bg-amber-50 text-amber-800 text-sm font-black">
        🔐 Permission-controlled module
      </div>
    </section>
  );
}

function EmptyState({
  icon,
  title,
  text,
}) {
  return (
    <div className="bg-white rounded-3xl p-10 shadow-xl text-center">
      <div className="text-5xl">
        {icon}
      </div>

      <h3 className="font-black text-xl mt-3">
        {title}
      </h3>

      <p className="text-slate-500 mt-2">
        {text}
      </p>
    </div>
  );
}

export default TeacherDashboard;
