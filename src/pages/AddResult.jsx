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

/* ===========================================
   DEFAULT SETTINGS
=========================================== */

const DEFAULT_SETTINGS = {

  schoolName: "SS Public School",

  session: "2026-27",

  examName: "Annual Examination",

};

/* ===========================================
   PAGE
=========================================== */

function AddResult() {

  /* ---------- Settings ---------- */

  const [settings] = useState(DEFAULT_SETTINGS);

  /* ---------- Search ---------- */

  const [searchText, setSearchText] = useState("");

  const [studentList, setStudentList] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ---------- Subjects ---------- */

  const [subjects, setSubjects] = useState([]);

  /* ---------- Form ---------- */

  const [formData, setFormData] = useState({});

  /* ---------- Result ---------- */

  const [result, setResult] = useState(null);

  const [performance, setPerformance] = useState(null);

  const [remarks, setRemarks] = useState("");

  /* ---------- UI ---------- */

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  /* ===========================================
   LOAD SUBJECTS
=========================================== */

async function loadSubjects(className) {

  try {

    const snapshot = await getDocs(

      query(

        collection(db, "subjects"),

        where("className", "==", className),

        where("status", "==", "Active")

      )

    );

    const list = [];

    snapshot.forEach((item) => {

      const data = item.data();

      list.push({

        id: item.id,

        subjectName: data.subjectName,

        subjectCode: data.subjectCode,

        theoryMarks: Number(data.theoryMarks || 0),

        practicalMarks: Number(data.practicalMarks || 0),

        totalMarks: Number(data.totalMarks || 0),

        passingTheory: Number(data.passingTheory || 0),

        passingPractical: Number(data.passingPractical || 0),

      });

    });

    list.sort((a, b) =>

      a.subjectName.localeCompare(

        b.subjectName

      )

    );

    setSubjects(list);

    setFormData(

      resetResultForm(list)

    );

  }

  catch (error) {

    console.log(error);

    setSubjects([]);

  }

}

/* ===========================================
   LIVE STUDENT SEARCH
=========================================== */

useEffect(() => {

  if (searchText.trim() === "") {

    setStudentList([]);

    return;

  }

  searchStudents();

}, [searchText]);

/* ===========================================
   SEARCH STUDENTS
=========================================== */

async function searchStudents() {

  try {

    setLoading(true);

    const snapshot = await getDocs(

      collection(db, "students")

    );

    const keyword =

      searchText

        .trim()

        .toLowerCase();

    const list = [];

    snapshot.forEach((doc) => {

      const student = {

        id: doc.id,

        ...doc.data(),

      };

      const name =

        String(

          student.name || ""

        ).toLowerCase();

      const enrollment =

        String(

          student.enrollmentNo || ""

        ).toLowerCase();

      const mobile =

        String(

          student.mobile || ""

        ).toLowerCase();

      if (

        name.startsWith(keyword) ||

        enrollment.startsWith(keyword) ||

        mobile.startsWith(keyword)

      ) {

        list.push(student);

      }

    });

    list.sort((a, b) =>

      (a.name || "").localeCompare(

        b.name || ""

      )

    );

    setStudentList(list);

  }

  catch (error) {

    console.log(error);

  }

  finally {

    setLoading(false);

  }

}
/* ===========================================
   SELECT STUDENT
=========================================== */

async function selectStudent(student) {

  setSelectedStudent(student);

  setStudentList([]);

  setSearchText(

    student.name

  );

  setMessage("");

  await loadSubjects(

    student.className

  );

  await loadExistingResult(

    student

  );

}

/* ===========================================
   LOAD EXISTING RESULT
=========================================== */

async function loadExistingResult(

  student

) {

  try {

    const snapshot = await getDocs(

      query(

        collection(db, "results"),

        where(

          "enrollmentNo",

          "==",

          student.enrollmentNo

        ),

        where(

          "session",

          "==",

          settings.session

        ),

        where(

          "examName",

          "==",

          settings.examName

        )

      )

    );

    if (snapshot.empty) {

      setResult(null);

      setPerformance(null);

      setRemarks("");

      return;

    }

    const data = snapshot.docs[0].data();

    setFormData(

      data.formData ||

      resetResultForm(subjects)

    );

    setResult(

      data.result || null

    );

    setPerformance(

      data.performance || null

    );

    setRemarks(

      data.teacherRemarks || ""

    );

    setMessage(

      "Draft Loaded Successfully."

    );

  }

  catch (error) {

    console.log(error);

  }

}

/* ===========================================
   MARKS CHANGE
=========================================== */

function handleMarksChange(

  subjectCode,

  type,

  value

) {

  setFormData((prev) => ({

    ...prev,

    [subjectCode]: {

      ...prev[subjectCode],

      [type]: value,

    },

  }));

}
/* ===========================================
   AUTO RESULT GENERATION
=========================================== */

useEffect(() => {

  if (

    !selectedStudent ||

    subjects.length === 0

  ) {

    return;

  }

  const generatedResult = generateResult(

    subjects,

    formData

  );

  setResult(generatedResult);

}, [

  formData,

  subjects,

  selectedStudent,

]);

/* ===========================================
   PERFORMANCE
=========================================== */

useEffect(() => {

  if (!result) return;

  const performanceData =

    calculatePerformance(

      result.percentage

    );

  setPerformance(

    performanceData

  );

}, [result]);

/* ===========================================
   TEACHER REMARKS
=========================================== */

useEffect(() => {

  if (!result) return;

  const autoRemarks =

    generateTeacherRemarks(

      result

    );

  setRemarks(

    autoRemarks

  );

}, [result]);

/* ===========================================
   GENERATE BUTTON
=========================================== */

function handleGenerate() {

  const check = validateResult(

    subjects,

    formData

  );

  if (!check.valid) {

    setMessage(

      check.errors.join("\n")

    );

    return;

  }

  const generated = generateResult(

    subjects,

    formData

  );

  setResult(generated);

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

  setMessage(

    "Result Generated Successfully."

  );

}
/* ===========================================
   SAVE DRAFT
=========================================== */

async function handleSaveDraft() {

  if (!selectedStudent) {

    setMessage(

      "Please Select Student."

    );

    return;

  }

  const check = validateResult(

    subjects,

    formData

  );

  if (!check.valid) {

    setMessage(

      check.errors.join("\n")

    );

    return;

  }

  try {

    setSaving(true);

    const resultData = {

      studentId:

        selectedStudent.id,

      studentName:

        selectedStudent.name,

      enrollmentNo:

        selectedStudent.enrollmentNo,

      className:

        selectedStudent.className,

      section:

        selectedStudent.section,

      fatherName:

        selectedStudent.fatherName || "",

      mobile:

        selectedStudent.mobile || "",

      schoolName:

        settings.schoolName,

      session:

        settings.session,

      examName:

        settings.examName,

      publishStatus:

        "DRAFT",

      formData,
      subjects: subjects.map((subject) => ({
  subjectCode: subject.subjectCode,
  subjectName: subject.subjectName,
  theory: Number(
    formData[subject.subjectCode]?.theory || 0
  ),
  practical: Number(
    formData[subject.subjectCode]?.practical || 0
  ),
  total:
    Number(formData[subject.subjectCode]?.theory || 0) +
    Number(formData[subject.subjectCode]?.practical || 0),
  passingTheory: subject.passingTheory,
  passingPractical: subject.passingPractical,
})),

      result,

      performance,

      teacherRemarks:

        remarks,

      updatedAt:

        serverTimestamp(),

    };

    const snapshot = await getDocs(

      query(

        collection(db, "results"),

        where(

          "enrollmentNo",

          "==",

          selectedStudent.enrollmentNo

        ),

        where(

          "session",

          "==",

          settings.session

        ),

        where(

          "examName",

          "==",

          settings.examName

        )

      )

    );

    if (snapshot.empty) {

      await addDoc(

        collection(

          db,

          "results"

        ),

        {

          ...resultData,

          createdAt:

            serverTimestamp(),

        }

      );

    }

    else {

      await updateDoc(

        doc(

          db,

          "results",

          snapshot.docs[0].id

        ),

        resultData

      );

    }

    setMessage(

      "Draft Saved Successfully."

    );

  }

  catch (error) {

    console.log(error);

    setMessage(

      "Unable To Save Draft."

    );

  }

  finally {

    setSaving(false);

  }

}
/* ===========================================
   RESET FORM
=========================================== */

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

}

/* ===========================================
   COMPONENT PROPS
=========================================== */

const searchProps = {

  searchText,

  setSearchText,

  students: studentList,

  loading,

  onSelectStudent: selectStudent,

  message,

};

const profileProps = {

  student: selectedStudent,

  session: settings.session,

  examName: settings.examName,

};

const tableProps = {

  subjects,

  formData,

  handleChange: handleMarksChange,

};

const summaryProps = {

  result,

  performance,

  remarks,

  settings,

};

const actionProps = {

  saving,

  draftSaved:

    result !== null,

  onGenerate:

    handleGenerate,

  onSaveDraft:

    handleSaveDraft,

  onReset:

    resetPage,

};
/* ===========================================
   PAGE UI
=========================================== */

return (

  <AdminLayout>

    <div className="max-w-7xl mx-auto p-6">

      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">

        <div>

          <h1 className="text-4xl font-bold text-green-700">

            Result Management

          </h1>

          <p className="text-gray-500 mt-2">

            Generate and Save Student Results

          </p>

        </div>

        <div className="bg-green-50 border rounded-2xl px-6 py-4">

          <h2 className="text-xl font-bold text-green-700">

            {settings.schoolName}

          </h2>

          <p className="text-gray-600">

            Session : {settings.session}

          </p>

          <p className="text-gray-600">

            Exam : {settings.examName}

          </p>

        </div>

      </div>

      {/* =====================================
          STUDENT SEARCH
      ===================================== */}

      <StudentSearch

        {...searchProps}

      />

      {/* =====================================
          STUDENT PROFILE
      ===================================== */}

      {

        selectedStudent && (

          <StudentProfile

            {...profileProps}

          />

        )

      }
            {/* =====================================
          RESULT TABLE
      ===================================== */}

      {

        selectedStudent &&

        subjects.length > 0 && (

          <ResultTable

            {...tableProps}

          />

        )

      }

      {/* =====================================
          RESULT SUMMARY
      ===================================== */}

      {

        result && (

          <ResultSummary

            {...summaryProps}

          />

        )

      }

      {/* =====================================
          ACTION BUTTONS
      ===================================== */}

      {

        selectedStudent && (

          <ActionButtons

            {...actionProps}

          />

        )

      }

      {/* =====================================
          STATUS MESSAGE
      ===================================== */}

      {

        message && (

          <div className="mt-6 rounded-xl border-l-4 border-green-600 bg-green-50 p-4">

            <p className="text-green-700 font-medium">

              {message}

            </p>

          </div>

        )

      }

    </div>

  </AdminLayout>

);

}

export default AddResult;