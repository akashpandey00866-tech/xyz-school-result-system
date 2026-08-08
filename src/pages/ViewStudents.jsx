import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import StudentCard from "../components/StudentCard";

function ViewStudents() {

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {

    try {

      const snapshot = await getDocs(
        collection(db, "students")
      );

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setStudents(data);

    } catch (error) {

      console.log(error);
      alert(error.message);

    }

  };

  const handleDelete = async (id) => {

    const ok = window.confirm(
      "Delete this student?"
    );

    if (!ok) return;

    try {

      await deleteDoc(
        doc(db, "students", id)
      );

      alert("Student Deleted Successfully");

      loadStudents();

    } catch (error) {

      alert(error.message);

    }

  };

  const filteredStudents = useMemo(() => {

    return students.filter((item) => {

      const text = (
        (item.name || "") +
        (item.enrollmentNo || "") +
        (item.className || "") +
        (item.section || "") +
        (item.mobile || "") +
        (item.email || "") +
        (item.fatherName || "")
      ).toLowerCase();

      return text.includes(
        search.toLowerCase()
      );

    });

  }, [students, search]);

  const groupedStudents = useMemo(() => {

    const groups = {};

    for (let i = 1; i <= 12; i++) {
      groups[i] = {};
    }

    filteredStudents.forEach((student) => {

      const cls = student.className || "Unknown";
      const sec = student.section || "A";

      if (!groups[cls]) {
        groups[cls] = {};
      }

      if (!groups[cls][sec]) {
        groups[cls][sec] = [];
      }

      groups[cls][sec].push(student);

    });

    return groups;

  }, [filteredStudents]);
    return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">

          <h1 className="text-3xl font-bold text-green-700">
            Student Records
          </h1>

          <input
            type="text"
            placeholder="🔍 Search Name / Enrollment / Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full md:w-96 focus:ring-2 focus:ring-green-600 outline-none"
          />

        </div>

        {/* Class List */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((cls) => (

          <details
            key={cls}
            className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden"
          >

            <summary className="cursor-pointer px-6 py-4 bg-green-700 text-white text-xl font-bold">

              📚 Class {cls}
              {" "}
              (
              {Object.values(groupedStudents[cls] || {}).flat().length}
              )

            </summary>

            <div className="p-6">

              {Object.keys(groupedStudents[cls] || {}).length === 0 ? (

                <div className="text-center text-gray-500 py-8">
                  No Students Found
                </div>

              ) : (

                Object.keys(groupedStudents[cls])
                  .sort()
                  .map((section) => (

                    <div
                      key={section}
                      className="mb-8"
                    >

                      <h2 className="text-xl font-bold text-blue-700 mb-4">

                        📁 Section {section}
                        {" "}
                        (
                        {groupedStudents[cls][section].length}
                        )

                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                        {groupedStudents[cls][section].map((student) => (

                          <StudentCard
                            key={student.id}
                            student={student}
                            onDelete={handleDelete}
                          />

                        ))}

                      </div>

                    </div>

                  ))

              )}

            </div>

          </details>

        ))}

      </div>

    </div>
  );
}

export default ViewStudents;