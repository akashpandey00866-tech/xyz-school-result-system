import { useEffect, useState } from "react";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../config/firebase";

import AdminLayout from "../layouts/AdminLayout";

import StudentSearch from "../components/StudentSearch";
import StudentProfile from "../components/StudentProfile";
import ResultTable from "../components/ResultTable";
import ResultSummary from "../components/ResultSummary";
import ActionButtons from "../components/ActionButtons";

import {
  generateResult,
  calculatePerformance,
  generateTeacherRemarks,
  resetResultForm,
  validateResult,
} from "../utils/resultUtils";


/* =========================================================
   DEFAULT CONFIGURATION
========================================================= */

const SCHOOL_NAME = "SS Public School";


/* =========================================================
   NORMALIZE CLASS
========================================================= */

function normalizeClass(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^class[\s-]*/i, "")
    .replace(/[^a-z0-9]/g, "");

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function isActiveStatus(value) {

  const status =
    String(value ?? "")
      .trim()
      .toLowerCase();

  return (
    status === "" ||
    status === "active" ||
    status === "enabled"
  );

}


/* =========================================================
   EXAM MATCH
========================================================= */

function isSameExam(data, sessionName, examName, sessionId = "", examId = "") {
  if (sessionId && data?.sessionId && data.sessionId !== sessionId) return false;
  if (examId && data?.examId && data.examId !== examId) return false;

  const savedSession = String(data?.sessionName ?? data?.session ?? "").trim();
  const savedExam = String(data?.examName ?? data?.exam ?? "").trim();

  return (
    savedSession === String(sessionName ?? "").trim() &&
    savedExam === String(examName ?? "").trim()
  );
}


/* =========================================================
   COMPONENT
========================================================= */

function AddResult() {

  /* -------------------------------------------------------
     STUDENT
  ------------------------------------------------------- */

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    studentList,
    setStudentList,
  ] = useState([]);

  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState(null);


  /* -------------------------------------------------------
     SUBJECTS
  ------------------------------------------------------- */

  const [
    subjects,
    setSubjects,
  ] = useState([]);


  /* -------------------------------------------------------
     MARKS
  ------------------------------------------------------- */

  const [
    formData,
    setFormData,
  ] = useState({});


  /* -------------------------------------------------------
     RESULT
  ------------------------------------------------------- */

  const [
    result,
    setResult,
  ] = useState(null);

  const [
    performance,
    setPerformance,
  ] = useState(null);

  const [
    remarks,
    setRemarks,
  ] = useState("");


  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState("info");


  /* -------------------------------------------------------
     ACADEMIC CONFIGURATION CONNECTION
  ------------------------------------------------------- */
  const [academicSessions, setAcademicSessions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const selectedSession = academicSessions.find((item) => item.id === selectedSessionId) || academicSessions.find((item) => item.active === true) || academicSessions[0] || null;
  const sessionAssessments = assessments.filter((item) => !item.sessionId || item.sessionId === selectedSession?.id);
  const selectedExam = sessionAssessments.find((item) => item.id === selectedExamId) || sessionAssessments.find((item) => item.active !== false) || sessionAssessments[0] || null;
  const currentSessionName = selectedSession?.name || "";
  const currentExamName = selectedExam?.name || "";

  /* =======================================================
     MESSAGE
  ======================================================= */

  function showMessage(
    text,
    type = "info"
  ) {

    setMessage(text);
    setMessageType(type);

  }


  /* =======================================================
     ACADEMIC CONFIGURATION + SUBJECT LOADER
  ======================================================= */
  useEffect(() => {
    let cancelled = false;
    async function loadAcademicConfiguration() {
      try {
        const [sessionSnapshot, assessmentSnapshot] = await Promise.all([
          getDocs(collection(db, "academicSessions")),
          getDocs(collection(db, "assessments")),
        ]);
        if (cancelled) return;
        const sessions = sessionSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a,b) => String(b.startDate||"").localeCompare(String(a.startDate||"")));
        const exams = assessmentSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setAcademicSessions(sessions);
        setAssessments(exams);
        const activeSession = sessions.find((item) => item.active === true) || sessions[0] || null;
        if (activeSession) {
          setSelectedSessionId(activeSession.id);
          const examsForSession = exams.filter((item) => !item.sessionId || item.sessionId === activeSession.id);
          const firstExam = examsForSession.find((item) => item.active !== false) || examsForSession[0] || null;
          setSelectedExamId(firstExam?.id || "");
        }
      } catch (error) {
        console.error("Academic Configuration Load Error:", error);
        showMessage("Unable to load Academic Configuration.", "error");
      }
    }
    loadAcademicConfiguration();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    const examsForSession = assessments.filter((item) => !item.sessionId || item.sessionId === selectedSession.id);
    if (!examsForSession.some((item) => item.id === selectedExamId)) {
      const firstExam = examsForSession.find((item) => item.active !== false) || examsForSession[0] || null;
      setSelectedExamId(firstExam?.id || "");
    }
  }, [selectedSession?.id, assessments]);

  async function loadSubjects(studentClass) {
    const targetClass = normalizeClass(studentClass);
    if (!targetClass) throw new Error("Student class is missing.");
    if (!selectedSession?.id) throw new Error("No academic session is selected.");

    const [subjectSnapshot, distributionSnapshot] = await Promise.all([
      getDocs(collection(db, "subjects")),
      getDocs(collection(db, "classSubjects")),
    ]);

    const subjectsById = new Map();
    subjectSnapshot.forEach((subjectDoc) => {
      const data = subjectDoc.data();
      if (!isActiveStatus(data.status)) return;
      if (data.sessionId && data.sessionId !== selectedSession.id) return;
      const subjectCode = String(data.code ?? data.subjectCode ?? subjectDoc.id ?? "").trim();
      const subjectName = String(data.name ?? data.subjectName ?? "Subject").trim();
      if (!subjectCode || !subjectName) return;
      const theoryMarks = Math.max(0, Number(data.theoryMarks ?? 0));
      const practicalMarks = Math.max(0, Number(data.practicalMarks ?? 0));
      const configuredMax = Number(data.maxMarks ?? data.totalMarks ?? 0);
      subjectsById.set(subjectDoc.id, {
        id: subjectDoc.id, subjectName, subjectCode, theoryMarks, practicalMarks,
        totalMarks: Math.max(theoryMarks + practicalMarks, configuredMax),
        passingTheory: Math.max(0, Number(data.passingTheory ?? data.passingMarks ?? 0)),
        passingPractical: Math.max(0, Number(data.passingPractical ?? 0)),
        internalMarks: Math.max(0, Number(data.internalMarks ?? 0)),
        projectMarks: Math.max(0, Number(data.projectMarks ?? 0)),
      });
    });

    const assignedIds = new Set();
    distributionSnapshot.forEach((distributionDoc) => {
      const data = distributionDoc.data();
      if (data.sessionId && data.sessionId !== selectedSession.id) return;
      const distributionClass = normalizeClass(data.className ?? data.class ?? data.studentClass ?? data.grade ?? data.standard);
      if (distributionClass !== targetClass) return;
      if (Array.isArray(data.subjectIds)) data.subjectIds.forEach((id) => { const value = String(id ?? "").trim(); if (value) assignedIds.add(value); });
    });

    const matchedSubjects = [...subjectsById.entries()]
      .filter(([id]) => assignedIds.has(id))
      .map(([, subject]) => subject)
      .sort((a,b) => String(a.subjectName).localeCompare(String(b.subjectName), undefined, { sensitivity: "base" }));

    setSubjects(matchedSubjects);
    setFormData(resetResultForm(matchedSubjects));
    return matchedSubjects;
  }

  /* =======================================================
     SEARCH STUDENTS
  ======================================================= */

  useEffect(() => {

    const keyword =
      searchText
        .trim()
        .toLowerCase();


    if (!keyword) {

      setStudentList([]);

      return;

    }


    let cancelled = false;


    async function search() {

      try {

        setLoading(true);

        const snapshot =
          await getDocs(
            collection(
              db,
              "students"
            )
          );


        const students = [];


        snapshot.forEach(
          (studentDoc) => {

            const student = {

              id:
                studentDoc.id,

              ...studentDoc.data(),

            };


            const name =
              String(
                student.name ?? ""
              ).toLowerCase();


            const enrollment =
              String(
                student.enrollmentNo ??
                ""
              ).toLowerCase();


            const mobile =
              String(
                student.mobile ??
                ""
              ).toLowerCase();


            const email =
              String(
                student.email ??
                ""
              ).toLowerCase();


            if (

              name.includes(
                keyword
              ) ||

              enrollment.includes(
                keyword
              ) ||

              mobile.includes(
                keyword
              ) ||

              email.includes(
                keyword
              )

            ) {

              students.push(
                student
              );

            }

          }
        );


        students.sort(
          (a, b) =>
            String(
              a.name ?? ""
            ).localeCompare(
              String(
                b.name ?? ""
              )
            )
        );


        if (!cancelled) {

          setStudentList(
            students
          );

        }

      } catch (error) {

        console.error(
          "Student Search Error:",
          error
        );

        if (!cancelled) {

          showMessage(
            "Unable to search students.",
            "error"
          );

        }

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }


    search();


    return () => {

      cancelled = true;

    };

  }, [searchText]);


  /* =======================================================
     LOAD EXISTING RESULT
  ======================================================= */

  async function loadExistingResult(
    student,
    loadedSubjects,
    sessionName,
    examName,
    sessionId,
    examId
  ) {

    const enrollment =
      String(
        student.enrollmentNo ??
        ""
      ).trim();


    if (!enrollment) {

      return;

    }


    const snapshot =
      await getDocs(

        query(

          collection(
            db,
            "results"
          ),

          where(
            "enrollmentNo",
            "==",
            enrollment
          )

        )

      );


    let existing = null;


    snapshot.forEach(
      (resultDoc) => {

        if (existing) return;


        const data =
          resultDoc.data();


        if (
          isSameExam(
            data,
            sessionName,
            examName,
            sessionId,
            examId
          )
        ) {

          existing = {

            id:
              resultDoc.id,

            ...data,

          };

        }

      }
    );


    if (!existing) {

      setResult(null);
      setPerformance(null);
      setRemarks("");

      return;

    }


    let restored =
      resetResultForm(
        loadedSubjects
      );


    if (
      existing.formData &&
      typeof existing.formData ===
        "object"
    ) {

      restored = {

        ...restored,

        ...existing.formData,

      };

    }


    if (
      Array.isArray(
        existing.subjects
      )
    ) {

      existing.subjects.forEach(
        (saved) => {

          if (
            !saved.subjectCode
          ) return;


          restored[
            saved.subjectCode
          ] = {

            theory:
              saved.theory ?? "",

            practical:
              saved.practical ?? "",

          };

        }
      );

    }


    setFormData(
      restored
    );


    setResult(
      existing.result ||
      null
    );


    setPerformance(
      existing.performance ||
      null
    );


    setRemarks(
      existing.teacherRemarks ||
      ""
    );


    showMessage(
      "Existing result loaded.",
      "success"
    );

  }


  /* =======================================================
     SELECT STUDENT
  ======================================================= */

  async function selectStudent(
    student
  ) {

    if (!student) {

      resetPage();

      return;

    }


    try {

      setLoading(true);

      setMessage("");


      setSelectedStudent(
        student
      );


      setStudentList([]);


      setSearchText(
        student.name || ""
      );


      const studentClass =
        student.className ??
        student.class ??
        student.grade ??
        student.standard ??
        "";


      if (!selectedSession) {
        showMessage("No academic session is configured. Create/select one in Academic Configuration.", "warning");
        return;
      }

      if (!selectedExam) {
        showMessage(`No examination is configured for ${currentSessionName}. Create one in Academic Configuration → Exams.`, "warning");
        return;
      }

      const loadedSubjects =
        await loadSubjects(
          studentClass
        );


      if (
        loadedSubjects.length ===
        0
      ) {

        setResult(null);
        setPerformance(null);
        setRemarks("");


        showMessage(
          `No active subjects found for Class ${
            studentClass || "-"
          }. Please check Subject Management.`,
          "warning"
        );


        return;

      }


      await loadExistingResult(
        student,
        loadedSubjects,
        currentSessionName,
        currentExamName,
        selectedSession?.id,
        selectedExam?.id
      );


    } catch (error) {

      console.error(
        "Student Selection Error:",
        error
      );


      showMessage(
        `Unable to load result data: ${
          error?.message ||
          "Unknown error"
        }`,
        "error"
      );

    } finally {

      setLoading(false);

    }

  }


  /* =======================================================
     MARK CHANGE
  ======================================================= */

  function handleMarksChange(
    subjectCode,
    type,
    value
  ) {

    const subject =
      subjects.find(
        (item) =>
          item.subjectCode ===
          subjectCode
      );


    if (!subject) return;


    let newValue =
      value === ""
        ? ""
        : Number(value);


    if (
      newValue !== "" &&
      Number.isNaN(
        newValue
      )
    ) {

      newValue = "";

    }


    if (
      newValue !== ""
    ) {

      const max =
        type === "theory"

          ? Number(
              subject.theoryMarks ||
              0
            )

          : Number(
              subject.practicalMarks ||
              0
            );


      newValue =
        Math.max(
          0,
          Math.min(
            newValue,
            max
          )
        );

    }


    setFormData(
      (previous) => ({

        ...previous,

        [subjectCode]: {

          ...(
            previous[
              subjectCode
            ] || {

              theory: "",
              practical: "",

            }
          ),

          [type]:
            newValue,

        },

      })
    );

  }


  /* =======================================================
     VALIDATE
  ======================================================= */

  function validateMarks() {

    if (!selectedStudent) {

      return {
        valid: false,
        message:
          "Please select a student.",
      };

    }


    if (
      subjects.length === 0
    ) {

      return {
        valid: false,
        message:
          "No subjects found for this class.",
      };

    }


    let entered =
      false;

    const errors = [];


    subjects.forEach(
      (subject) => {

        const marks =
          formData[
            subject.subjectCode
          ] || {};


        const theory =
          marks.theory;

        const practical =
          marks.practical;


        if (
          theory !== "" &&
          theory !== undefined
        ) {

          entered = true;

        }


        if (
          practical !== "" &&
          practical !== undefined
        ) {

          entered = true;

        }


        if (
          Number(
            subject.theoryMarks
          ) > 0 &&
          (
            theory === "" ||
            theory === undefined ||
            theory === null
          )
        ) {

          errors.push(
            `${subject.subjectName}: Theory marks required.`
          );

        }


        if (
          Number(
            subject.practicalMarks
          ) > 0 &&
          (
            practical === "" ||
            practical === undefined ||
            practical === null
          )
        ) {

          errors.push(
            `${subject.subjectName}: Practical marks required.`
          );

        }

      }
    );


    if (!entered) {

      return {
        valid: false,
        message:
          "Enter marks before generating the result.",
      };

    }


    if (
      errors.length
    ) {

      return {
        valid: false,
        message:
          errors.join("\n"),
      };

    }


    const utility =
      validateResult(
        subjects,
        formData
      );


    if (
      !utility.valid
    ) {

      return {
        valid: false,
        message:
          utility.errors.join(
            "\n"
          ),
      };

    }


    return {
      valid: true,
      message: "",
    };

  }


  /* =======================================================
     GENERATE
  ======================================================= */

  function handleGenerate() {

    const check =
      validateMarks();


    if (!check.valid) {

      showMessage(
        check.message,
        "warning"
      );

      return;

    }


    try {

      const generated =
        generateResult(
          subjects,
          formData
        );


      setResult(
        generated
      );


      setPerformance(
        calculatePerformance(
          generated.percentage
        )
      );


      setRemarks(
        generateTeacherRemarks(
          generated
        )
      );


      showMessage(
        "Result generated successfully.",
        "success"
      );

    } catch (error) {

      console.error(
        "Generate Result Error:",
        error
      );


      showMessage(
        `Result generation failed: ${
          error?.message ||
          "Unknown error"
        }`,
        "error"
      );

    }

  }


  /* =======================================================
     AUTO RESULT
  ======================================================= */

  useEffect(() => {

    if (
      !selectedStudent ||
      subjects.length === 0
    ) {

      return;

    }


    const hasMarks =
      subjects.some(
        (subject) => {

          const marks =
            formData[
              subject.subjectCode
            ] || {};


          return (
            marks.theory !== "" ||
            marks.practical !== ""
          );

        }
      );


    if (!hasMarks) {

      setResult(null);

      return;

    }


    try {

      const generated =
        generateResult(
          subjects,
          formData
        );


      setResult(
        generated
      );

    } catch (error) {

      console.error(
        "Auto Result Error:",
        error
      );

    }

  }, [
    formData,
    subjects,
    selectedStudent,
  ]);


  /* =======================================================
     PERFORMANCE
  ======================================================= */

  useEffect(() => {

    if (!result) {

      setPerformance(null);

      return;

    }


    setPerformance(
      calculatePerformance(
        result.percentage
      )
    );


  }, [result]);


  /* =======================================================
     REMARKS
  ======================================================= */

  useEffect(() => {

    if (!result) {

      setRemarks("");

      return;

    }


    setRemarks(
      generateTeacherRemarks(
        result
      )
    );

  }, [result]);


  /* =======================================================
     SAVE / UPDATE
  ======================================================= */

  async function handleSaveDraft() {

    const check =
      validateMarks();


    if (!check.valid) {

      showMessage(
        check.message,
        "warning"
      );

      return;

    }


    try {

      setSaving(true);
      setMessage("");


      const latestResult =
        generateResult(
          subjects,
          formData
        );


      const latestPerformance =
        calculatePerformance(
          latestResult.percentage
        );


      const latestRemarks =
        generateTeacherRemarks(
          latestResult
        );


      setResult(
        latestResult
      );

      setPerformance(
        latestPerformance
      );

      setRemarks(
        latestRemarks
      );


      const enrollment =
        String(
          selectedStudent.enrollmentNo ??
          ""
        ).trim();


      if (!enrollment) {

        throw new Error(
          "Student enrollment number is missing."
        );

      }


      /*
        Only enrollment is queried.
        Session/exam is matched locally.
      */

      const snapshot =
        await getDocs(

          query(

            collection(
              db,
              "results"
            ),

            where(
              "enrollmentNo",
              "==",
              enrollment
            )

          )

        );


      let existingDoc =
        null;


      snapshot.forEach(
        (resultDoc) => {

          if (existingDoc)
            return;


          if (
            isSameExam(
              resultDoc.data(),
              currentSessionName,
              currentExamName,
              selectedSession?.id,
              selectedExam?.id
            )
          ) {

            existingDoc =
              resultDoc;

          }

        }
      );


      const savedSubjects =
        subjects.map(
          (subject) => {

            const marks =
              formData[
                subject.subjectCode
              ] || {};


            const theory =
              Number(
                marks.theory || 0
              );


            const practical =
              Number(
                marks.practical || 0
              );


            return {

              subjectCode:
                subject.subjectCode,

              subjectName:
                subject.subjectName,

              theoryMarks:
                Number(
                  subject.theoryMarks ||
                  0
                ),

              practicalMarks:
                Number(
                  subject.practicalMarks ||
                  0
                ),

              totalMarks:
                Number(
                  subject.totalMarks ||
                  0
                ),

              theory,

              practical,

              total:
                theory +
                practical,

              passingTheory:
                Number(
                  subject.passingTheory ||
                  0
                ),

              passingPractical:
                Number(
                  subject.passingPractical ||
                  0
                ),

            };

          }
        );


      const payload = {

        studentId:
          selectedStudent.id,

        studentName:
          selectedStudent.name ||
          "",

        enrollmentNo:
          enrollment,

        className:
          selectedStudent.className ??
          selectedStudent.class ??
          selectedStudent.grade ??
          "",

        section:
          selectedStudent.section ||
          "",

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
          SCHOOL_NAME,

        session:
          currentSessionName,

        sessionId:
          selectedSession?.id || "",

        examName:
          currentExamName,

        examId:
          selectedExam?.id || "",

        /*
          Compatibility
        */

        exam:
          currentExamName,

        formData,

        subjects:
          savedSubjects,

        result:
          latestResult,

        performance:
          latestPerformance,

        teacherRemarks:
          latestRemarks,

        totalSubjects:
          latestResult.totalSubjects,

        obtainedMarks:
          latestResult.obtainedMarks,

        maximumMarks:
          latestResult.maximumMarks,

        percentage:
          latestResult.percentage,

        grade:
          latestResult.grade,

        division:
          latestResult.division,

        status:
          latestResult.status,

        failedSubjects:
          latestResult.failedSubjects,

        failedCount:
          latestResult.failedCount,

        publishStatus:
          existingDoc
            ? (
                existingDoc.data()
                  ?.publishStatus ||
                "DRAFT"
              )
            : "DRAFT",

        updatedAt:
          serverTimestamp(),

      };


      if (existingDoc) {

        await updateDoc(

          doc(
            db,
            "results",
            existingDoc.id
          ),

          payload

        );


        showMessage(
          "Result draft updated successfully.",
          "success"
        );

      } else {

        await addDoc(

          collection(
            db,
            "results"
          ),

          {

            ...payload,

            createdAt:
              serverTimestamp(),

          }

        );


        showMessage(
          "Result draft saved successfully.",
          "success"
        );

      }

    } catch (error) {

      console.error(
        "SAVE RESULT ERROR:",
        error
      );


      let text =
        error?.message ||
        "Unable to save result.";


      if (
        error?.code ===
        "permission-denied"
      ) {

        text =
          "Firestore permission denied. Check Firestore Rules.";

      }


      showMessage(
        `Save failed: ${text}`,
        "error"
      );

    } finally {

      setSaving(false);

    }

  }


  /* =======================================================
     RESET
  ======================================================= */

  function resetPage() {

    setSearchText("");
    setStudentList([]);
    setSelectedStudent(null);
    setSubjects([]);
    setFormData({});
    setResult(null);
    setPerformance(null);
    setRemarks("");
    setMessage("");
    setMessageType("info");

  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <AdminLayout>

      <div className="max-w-7xl mx-auto p-6">

        {/* HEADER */}

        <div className="mb-8">

          <div className="inline-flex px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold text-sm mb-3">

            📝 RESULT MANAGEMENT

          </div>

          <h1 className="text-4xl font-bold text-gray-900">

            Student Result

          </h1>

          <p className="text-gray-500 mt-2">

            Search student → enter marks → generate → save.

          </p>

        </div>


        {/* ACADEMIC CONFIGURATION CONTROLS */}

        <div className="mb-6 bg-white border border-green-200 rounded-3xl p-5 shadow-sm">

          <div className="flex flex-col xl:flex-row xl:items-end gap-4">

            <div className="flex-1">
              <label htmlFor="result-session" className="block text-sm font-bold text-gray-700 mb-2">
                Academic Session
              </label>

              <select
                id="result-session"
                value={selectedSessionId}
                onChange={(e) => {
                  setSelectedSessionId(e.target.value);
                  setSelectedStudent(null);
                  setSubjects([]);
                  setFormData({});
                  setResult(null);
                  setPerformance(null);
                  setRemarks("");
                }}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Academic Session</option>

                {academicSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}{session.active ? " • ACTIVE" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="result-exam" className="block text-sm font-bold text-gray-700 mb-2">
                Examination
              </label>

              <select
                id="result-exam"
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setResult(null);
                  setPerformance(null);
                  setRemarks("");
                }}
                disabled={!selectedSession}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Examination</option>

                {sessionAssessments.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs text-green-700 font-bold uppercase">
                  Academic Configuration Connected
                </p>
                <p className="font-black text-green-800">
                  {currentSessionName || "No Session"}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {currentExamName || "No Exam"}
                </p>
              </div>
            </div>

          </div>

          {selectedSession && !selectedExam && (
            <p className="mt-4 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-3">
              No examination is configured for this session. Go to Academic Configuration → Exams and create one.
            </p>
          )}

          {selectedSession && selectedExam && (
            <p className="mt-3 text-xs text-gray-500">
              Subjects are loaded from Academic Configuration: selected session → selected class → assigned subjects.
            </p>
          )}

        </div>

        {/* SEARCH */}

        <StudentSearch

          searchText={
            searchText
          }

          setSearchText={
            setSearchText
          }

          students={
            studentList
          }

          loading={
            loading
          }

          onSelectStudent={
            selectStudent
          }

          message={
            message
          }

        />


        {/* MESSAGE */}

        {message && (

          <div
            className={`mt-5 p-5 rounded-2xl border whitespace-pre-line ${
              messageType === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : messageType === "warning"
                ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                : messageType === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
            }`}
          >

            {message}

          </div>

        )}


        {/* LOADING */}

        {loading && (

          <div className="mt-5 p-5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-4">

            <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />

            <div>

              <p className="font-semibold text-blue-700">

                Loading...

              </p>

              <p className="text-sm text-blue-600">

                Preparing student and subjects.

              </p>

            </div>

          </div>

        )}


        {/* PROFILE */}

        {selectedStudent && (

          <div className="mt-6">

            <StudentProfile

              student={
                selectedStudent
              }

              session={
                currentSessionName
              }

              examName={
                currentExamName
              }

            />

          </div>

        )}


        {/* NO SUBJECT */}

        {selectedStudent &&
          !loading &&
          subjects.length === 0 && (

            <div className="mt-6 p-6 bg-orange-50 border border-orange-200 rounded-2xl">

              <h3 className="text-xl font-bold text-orange-700">

                ⚠️ No Subjects Found

              </h3>

              <p className="mt-2 text-orange-700">

                No active subjects are configured for this student's class.

              </p>

              <p className="mt-2 text-sm text-gray-600">

                Check Subject Management → Class → Status.

              </p>

            </div>

        )}


        {/* MARKS */}

        {selectedStudent &&
          subjects.length > 0 && (

            <div className="mt-6">

              <ResultTable

                subjects={
                  subjects
                }

                formData={
                  formData
                }

                handleChange={
                  handleMarksChange
                }

              />

            </div>

        )}


        {/* SUMMARY */}

        {selectedStudent &&
          result && (

            <div className="mt-6">

              <ResultSummary

                result={
                  result
                }

                performance={
                  performance
                }

                remarks={
                  remarks
                }

              />

            </div>

        )}


        {/* ACTIONS */}

        {selectedStudent &&
          subjects.length > 0 && (

            <ActionButtons

              saving={
                saving
              }

              draftSaved={
                result !== null
              }

              onGenerate={
                handleGenerate
              }

              onSaveDraft={
                handleSaveDraft
              }

              onReset={
                resetPage
              }

            />

        )}


        {/* EMPTY */}

        {!selectedStudent && (

          <div className="mt-8 bg-white border border-gray-200 rounded-3xl shadow-sm p-12 text-center">

            <div className="text-6xl mb-4">

              🎓

            </div>

            <h2 className="text-2xl font-bold text-gray-800">

              Select a Student

            </h2>

            <p className="text-gray-500 mt-2">

              Search using name, enrollment number, mobile number or email.

            </p>

          </div>

        )}

      </div>

    </AdminLayout>

  );

}


export default AddResult;