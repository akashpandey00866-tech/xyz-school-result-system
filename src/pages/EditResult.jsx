import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import resultUtils from "../utils/resultUtils";

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../config/firebase";

import AdminLayout from "../layouts/AdminLayout";

import {
  ArrowLeft,
  Save,
  RefreshCcw,
} from "lucide-react";


function EditResult() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [subjects, setSubjects] = useState([]);

  const [student, setStudent] = useState({});

  const [formData, setFormData] = useState({});

  const [message, setMessage] = useState("");

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

      setFormData(

        data.formData || {}

      );

      await loadSubjects(

        data.className

      );

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
    LOAD SUBJECTS
=========================== */

async function loadSubjects(className) {

  try {

    const snapshot = await getDocs(

      collection(db, "subjects")

    );

    const list = snapshot.docs

      .map((doc) => ({

        id: doc.id,

        ...doc.data(),

      }))

      .filter(

        (item) =>

          item.className === className &&

          item.status === "Active"

      );

    setSubjects(list);

  }

  catch (error) {

    console.log(error);

  }

}

/* ===========================
    HANDLE CHANGE
=========================== */

function handleChange(

  subjectCode,

  field,

  value

) {

  const number = Number(value);

  const subject = subjects.find(

    (item) =>

      item.subjectCode === subjectCode

  );

  if (!subject) return;

  if (

    field === "theory" &&

    number > Number(subject.theoryMarks)

  ) {

    alert(

      `Maximum Theory Marks : ${subject.theoryMarks}`

    );

    return;

  }

  if (

    field === "practical" &&

    number > Number(subject.practicalMarks)

  ) {

    alert(

      `Maximum Practical Marks : ${subject.practicalMarks}`

    );

    return;

  }

  setFormData((prev) => ({

    ...prev,

    [subjectCode]: {

      ...prev[subjectCode],

      [field]: value,

    },

  }));

}

/* ===========================
    RESET MARKS
=========================== */

function resetMarks() {

  if (

    !window.confirm(

      "Reset all marks?"

    )

  ) {

    return;

  }

  setFormData({});

}

/* ===========================
    GENERATE RESULT
=========================== */

const result = resultUtils.generateResult(
  subjects,
  formData
);



/* ===========================
    SAVE RESULT
=========================== */

async function saveResult() {

  try {

    setSaving(true);

    const result = resultUtils.generateResult(subjects, formData);


    await updateDoc(

      doc(db, "results", id),

      {

        formData,

        subjects:

          updatedResult.subjects,

        obtainedMarks:

          updatedResult.obtainedMarks,

        maximumMarks:

          updatedResult.maximumMarks,

        percentage:

          updatedResult.percentage,

        grade:

          updatedResult.grade,

        division:

          updatedResult.division,

        status:

          updatedResult.status,

        failedSubjects:

          updatedResult.failedSubjects,

        updatedAt:

          serverTimestamp(),

      }

    );

    setMessage(

      "Result Updated Successfully."

    );

    setTimeout(() => {

      navigate("/view-results");

    }, 1200);

  }

  catch (error) {

    console.log(error);

    alert(

      "Unable to update result."

    );

  }

  finally {

    setSaving(false);

  }

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

    <div className="max-w-7xl mx-auto p-6">

      <div className="flex justify-between items-center mb-8">

        <div>

          <h1 className="text-4xl font-bold text-green-700">

            Edit Result

          </h1>

          <p className="text-gray-500 mt-2">

            Update Student Result

          </p>

        </div>

        <button

          onClick={() =>

            navigate("/view-results")

          }

          className="bg-gray-700 hover:bg-black text-white px-5 py-3 rounded-xl flex items-center gap-2"

        >

          <ArrowLeft size={18} />

          Back

        </button>

      </div>

      {

        message && (

          <div className="mb-6 bg-green-100 border border-green-300 rounded-xl p-4 text-green-700 font-semibold">

            {message}

          </div>

        )

      }
            {/* ===========================
          STUDENT DETAILS
      ============================ */}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">

        <div className="grid md:grid-cols-3 gap-6">

          <InfoCard
            title="Student Name"
            value={student.studentName}
          />

          <InfoCard
            title="Enrollment No"
            value={student.enrollmentNo}
          />

          <InfoCard
            title="Class"
            value={`${student.className} - ${student.section}`}
          />

        </div>

      </div>

      {/* ===========================
          SUBJECT TABLE
      ============================ */}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-x-auto mb-8">

        <table className="w-full">

          <thead className="bg-green-700 text-white">

            <tr>

              <th className="p-4">Subject</th>

              <th className="p-4">Theory</th>

              <th className="p-4">Practical</th>

              <th className="p-4">Total</th>

            </tr>

          </thead>

          <tbody>

            {subjects.map((subject) => (

              <tr
                key={subject.id}
                className="border-b hover:bg-green-50"
              >

                <td className="p-4 font-semibold">

                  {subject.subjectName}

                </td>

                <td className="p-4">

                  <input

                    type="number"

                    min="0"

                    max={subject.theoryMarks}

                    value={
                      formData?.[subject.subjectCode]?.theory || ""
                    }

                    onChange={(e) =>
                      handleChange(
                        subject.subjectCode,
                        "theory",
                        e.target.value
                      )
                    }

                    className="border rounded-lg w-24 p-2 text-center"

                  />

                </td>

                <td className="p-4">

                  <input

                    type="number"

                    min="0"

                    max={subject.practicalMarks}

                    value={
                      formData?.[subject.subjectCode]?.practical || ""
                    }

                    onChange={(e) =>
                      handleChange(
                        subject.subjectCode,
                        "practical",
                        e.target.value
                      )
                    }

                    className="border rounded-lg w-24 p-2 text-center"

                  />

                </td>

                <td className="p-4 font-bold text-blue-700">

                  {

                    Number(
                      formData?.[subject.subjectCode]?.theory || 0
                    ) +

                    Number(
                      formData?.[subject.subjectCode]?.practical || 0
                    )

                  }

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* ===========================
          RESULT SUMMARY
      ============================ */}

      <div className="grid md:grid-cols-4 gap-5 mb-8">

        <InfoCard
          title="Obtained"
          value={result.obtainedMarks}
        />

        <InfoCard
          title="Percentage"
          value={`${result.percentage}%`}
        />

        <InfoCard
          title="Grade"
          value={result.grade}
        />

        <InfoCard
          title="Status"
          value={result.status}
        />

      </div>

      {/* ===========================
          ACTIONS
      ============================ */}

      <div className="flex flex-wrap gap-4">

        <button

          onClick={saveResult}

          disabled={saving}

          className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl flex items-center gap-2"

        >

          <Save size={18} />

          {saving ? "Saving..." : "Update Result"}

        </button>

        <button

          onClick={resetMarks}

          className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl flex items-center gap-2"

        >

          <RefreshCcw size={18} />

          Reset

        </button>

      </div>

    </div>

  </AdminLayout>

);

}

/* ===========================
    INFO CARD
=========================== */

function InfoCard({

  title,

  value,

}) {

  return (

    <div className="bg-gray-50 border rounded-xl p-5">

      <p className="text-gray-500 text-sm">

        {title}

      </p>

      <h2 className="text-xl font-bold mt-2">

        {value || "-"}

      </h2>

    </div>

  );

}

export default EditResult;