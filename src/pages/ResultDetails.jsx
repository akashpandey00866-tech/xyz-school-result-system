import { useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";

import AdminLayout from "../layouts/AdminLayout";

import {
  ArrowLeft,
  Download,
  Printer,
} from "lucide-react";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function ResultDetails() {

  const { id } = useParams();

  const navigate = useNavigate();

  const resultRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [student, setStudent] = useState(null);

  const [subjects, setSubjects] = useState([]);

  useEffect(() => {

    loadResult();

  }, []);

  async function loadResult() {

    try {

      setLoading(true);

      const snapshot = await getDoc(

        doc(db, "results", id)

      );

      if (!snapshot.exists()) {

        alert("Result not found.");

        navigate("/view-results");

        return;

      }

      const data = snapshot.data();

      setStudent(data);

      if (Array.isArray(data.subjects)) {

        setSubjects(data.subjects);

      }

      else if (data.formData) {

    const list = Object.entries(data.formData).map(
  ([code, value]) => ({
    subjectCode: code,
    theory: Number(value.theory || 0),
    practical: Number(value.practical || 0),
    total:
      Number(value.theory || 0) +
      Number(value.practical || 0),
  })
);    

        setSubjects(list);

      }

    }

    catch (error) {

      console.log(error);

      alert("Unable to load result.");

    }

    finally {

      setLoading(false);

    }

  }
  /* ===========================
    PDF DOWNLOAD
=========================== */

async function downloadPDF() {

  if (!resultRef.current) return;

  const canvas = await html2canvas(

    resultRef.current,

    {

      scale: 2,

      useCORS: true,

      backgroundColor: "#ffffff",

    }

  );

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF(

    "p",

    "mm",

    "a4"

  );

  const pdfWidth =

    pdf.internal.pageSize.getWidth();

  const pdfHeight =

    (canvas.height * pdfWidth) /

    canvas.width;

  pdf.addImage(

    imgData,

    "PNG",

    0,

    0,

    pdfWidth,

    pdfHeight

  );

  pdf.save(

    `${student.studentName}_Result.pdf`

  );

}

/* ===========================
    PRINT
=========================== */

function printResult() {

  window.print();

}

/* ===========================
    LOADING
=========================== */

if (loading) {

  return (

    <AdminLayout>

      <div className="flex justify-center items-center h-screen">

        <h2 className="text-2xl font-bold text-green-700">

          Loading Result...

        </h2>

      </div>

    </AdminLayout>

  );

}

/* ===========================
    PAGE START
=========================== */

return (

  <AdminLayout>

    <div className="max-w-5xl mx-auto p-6">

      {/* ACTION BUTTONS */}

      <div className="flex flex-wrap gap-4 justify-between mb-6">

        <button

          onClick={() =>

            navigate("/view-results")

          }

          className="bg-gray-700 hover:bg-black text-white px-5 py-3 rounded-xl flex items-center gap-2"

        >

          <ArrowLeft size={18} />

          Back

        </button>

        <div className="flex gap-3">

          <button

            onClick={downloadPDF}

            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl flex items-center gap-2"

          >

            <Download size={18} />

            Download PDF

          </button>

          <button

            onClick={printResult}

            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl flex items-center gap-2"

          >

            <Printer size={18} />

            Print

          </button>

        </div>

      </div>

      {/* RESULT CARD */}

      <div

        ref={resultRef}

        className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8"

      >

        <div className="text-center border-b pb-6">

          <h1 className="text-4xl font-bold text-green-700">

            XYZ Public School

          </h1>

          <p className="text-gray-500 mt-2">

            Academic Result Card

          </p>

        </div>

        {/* STUDENT DETAILS */}

        <div className="grid md:grid-cols-2 gap-6 mt-8">

          <Detail

            label="Student Name"

            value={student.studentName}

          />

          <Detail

            label="Enrollment No"

            value={student.enrollmentNo}

          />

          <Detail

            label="Father Name"

            value={student.fatherName}

          />

          <Detail

            label="Class"

            value={`${student.className} - ${student.section}`}

          />

          <Detail

            label="Session"

            value={student.session}

          />

          <Detail

            label="Exam"

            value={student.examName}

          />

        </div>
                {/* ===========================
            SUBJECT MARKS
        ============================ */}

        <div className="mt-10">

          <h2 className="text-2xl font-bold text-blue-700 mb-5">

            Subject Wise Marks

          </h2>

          <div className="overflow-x-auto">

            <table className="w-full border border-gray-300">

              <thead>

                <tr className="bg-green-700 text-white">

                  <th className="border p-3">

                    Subject Code

                  </th>

                  <th className="border p-3">

                    Subject Name

                  </th>

                  <th className="border p-3">

                    Theory

                  </th>

                  <th className="border p-3">

                    Practical

                  </th>

                  <th className="border p-3">

                    Total

                  </th>

                  <th className="border p-3">

                    Status

                  </th>

                </tr>

              </thead>

              <tbody>

                {subjects.map((subject, index) => {

                  const total =

                    Number(subject.theory || 0) +

                    Number(subject.practical || 0);

                  const pass =

                    subject.status === "PASS" ||

                    total >=

                      Number(subject.passingMarks || 33);

                  return (

                    <tr

                      key={index}

                      className="hover:bg-green-50"

                    >

                      <td className="border p-3 text-center">

                        {subject.subjectCode}

                      </td>

                      <td className="border p-3 font-semibold">

                        {subject.subjectName ||

                          "-"}

                      </td>

                      <td className="border p-3 text-center">

                        {subject.theory}

                      </td>

                      <td className="border p-3 text-center">

                        {subject.practical}

                      </td>

                      <td className="border p-3 text-center font-bold text-blue-700">

                        {total}

                      </td>

                      <td className="border p-3 text-center">

                        <span

                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            pass
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}

                        >

                          {pass

                            ? "PASS"

                            : "FAIL"}

                        </span>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        </div>

        {/* ===========================
            RESULT SUMMARY
        ============================ */}

        <div className="grid md:grid-cols-4 gap-5 mt-10">

          <SummaryCard

            title="Total"
         value={student.result?.obtainedMarks ?? 0}
           

            color="green"

          />

          <SummaryCard

            title="Percentage"

            value={`${student.result?.percentage ?? 0}%`}

            color="blue"

          />

          <SummaryCard

            title="Grade"
            value={student.result?.grade}

            color="purple"

          />

          <SummaryCard
  title="Result"
  value={student.result?.status}
  color={
    student.result?.status === "PASS"
      ? "green"
      : "red"
  }
/>

        </div>
                {/* ===========================
            TEACHER REMARKS
        ============================ */}

        <div className="mt-10">

          <h2 className="text-2xl font-bold text-green-700 mb-4">

            Teacher Remarks

          </h2>

          <div className="border rounded-2xl p-5 bg-gray-50 min-h-[120px]">

            <p className="text-gray-700">

              
         {student.teacherRemarks || "No Remarks"}

            </p>

          </div>

        </div>

        {/* ===========================
            SIGNATURES
        ============================ */}

        <div className="grid grid-cols-2 gap-10 mt-16">

          <div className="text-center">

            <div className="border-t-2 pt-2">

              Class Teacher

            </div>

          </div>

          <div className="text-center">

            <div className="border-t-2 pt-2">

              Principal

            </div>

          </div>

        </div>

      </div>

    </div>

  </AdminLayout>

);

}

/* ===========================
    DETAIL COMPONENT
=========================== */

function Detail({

  label,

  value,

}) {

  return (

    <div className="border rounded-xl p-4">

      <p className="text-gray-500 text-sm">

        {label}

      </p>

      <h3 className="text-lg font-semibold mt-1">

        {value || "-"}

      </h3>

    </div>

  );

}

/* ===========================
    SUMMARY CARD
=========================== */

function SummaryCard({

  title,

  value,

  color,

}) {

  const colors = {

    green:

      "bg-green-50 text-green-700",

    blue:

      "bg-blue-50 text-blue-700",

    purple:

      "bg-purple-50 text-purple-700",

    red:

      "bg-red-50 text-red-700",

  };

  return (

    <div

      className={`rounded-2xl p-5 text-center ${

        colors[color]

      }`}

    >

      <p className="text-sm">

        {title}

      </p>

      <h2 className="text-3xl font-bold mt-2">

        {value}

      </h2>

    </div>

  );

}

export default ResultDetails;