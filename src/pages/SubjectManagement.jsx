import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../config/firebase";
import AdminLayout from "../layouts/AdminLayout";

function SubjectManagement() {

  const initialForm = {

    className: "",

    subjectName: "",

    subjectCode: "",

    theoryMarks: "",

    practicalMarks: "",

    passingTheory: "",

    passingPractical: "",

    totalMarks: 0,

    status: "Active",

  };

  const [form, setForm] = useState(initialForm);

  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {

    loadSubjects();

  }, []);

  useEffect(() => {

    const theory = Number(form.theoryMarks || 0);

    const practical = Number(form.practicalMarks || 0);

    setForm((prev) => ({

      ...prev,

      totalMarks: theory + practical,

    }));

  }, [

    form.theoryMarks,

    form.practicalMarks,

  ]);

  async function loadSubjects() {

    try {

      setLoading(true);

      const snapshot = await getDocs(

        collection(db, "subjects")

      );

      const list = [];

      snapshot.forEach((item) => {

        list.push({

          id: item.id,

          ...item.data(),

        });

      });

      list.sort((a, b) =>

        a.className.localeCompare(b.className)

      );

      setSubjects(list);

    }

    catch (error) {

      console.log(error);

      alert("Unable to load subjects.");

    }

    finally {

      setLoading(false);

    }

  }

  function handleChange(e) {

    const { name, value } = e.target;

    setForm((prev) => ({

      ...prev,

      [name]: value,

    }));

  }
    async function handleSubmit(e) {

    e.preventDefault();

    if (

      !form.className ||

      !form.subjectName ||

      !form.subjectCode ||

      form.theoryMarks === "" ||

      form.practicalMarks === ""

    ) {

      alert("Please fill all required fields.");

      return;

    }

    try {

      setSaving(true);

      const payload = {

        ...form,

        theoryMarks: Number(form.theoryMarks),

        practicalMarks: Number(form.practicalMarks),

        passingTheory: Number(form.passingTheory),

        passingPractical: Number(form.passingPractical),

        totalMarks: Number(form.totalMarks),

        updatedAt: serverTimestamp(),

      };

      if (editingId) {

        await updateDoc(

          doc(db, "subjects", editingId),

          payload

        );

        alert("Subject Updated Successfully.");

      }

      else {

        await addDoc(

          collection(db, "subjects"),

          {

            ...payload,

            createdAt: serverTimestamp(),

          }

        );

        alert("Subject Added Successfully.");

      }

      setEditingId(null);

      setForm(initialForm);

      loadSubjects();

    }

    catch (error) {

      console.log(error);

      alert("Unable to save subject.");

    }

    finally {

      setSaving(false);

    }

  }

  function handleEdit(subject) {

    setEditingId(subject.id);

    setForm({

      className: subject.className,

      subjectName: subject.subjectName,

      subjectCode: subject.subjectCode,

      theoryMarks: subject.theoryMarks,

      practicalMarks: subject.practicalMarks,

      passingTheory: subject.passingTheory,

      passingPractical: subject.passingPractical,

      totalMarks: subject.totalMarks,

      status: subject.status,

    });

    window.scrollTo({

      top: 0,

      behavior: "smooth",

    });

  }

  async function handleDelete(id) {

    const ok = window.confirm(

      "Delete this subject?"

    );

    if (!ok) return;

    try {

      await deleteDoc(

        doc(db, "subjects", id)

      );

      loadSubjects();

    }

    catch (error) {

      console.log(error);

      alert("Unable to delete subject.");

    }

  }
    return (

    <AdminLayout>

      <div className="p-8">

        {/* Header */}

        <div className="flex justify-between items-center mb-8">

          <div>

            <h1 className="text-4xl font-bold text-green-700">

              📚 Subject Management

            </h1>

            <p className="text-gray-500 mt-2">

              Create and manage class wise subjects.

            </p>

          </div>

          <button

            onClick={() => {

              setEditingId(null);

              setForm(initialForm);

            }}

            className="bg-gray-700 hover:bg-black text-white px-5 py-3 rounded-xl"

          >

            New Subject

          </button>

        </div>

        {/* Form */}

        <form

          onSubmit={handleSubmit}

          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"

        >

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">

            <div>

              <label className="font-medium">

                Class

              </label>

              <select

                name="className"

                value={form.className}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              >

                <option value="">

                  Select Class

                </option>

                {

                  Array.from(

                    { length: 12 },

                    (_, i) => i + 1

                  ).map((cls) => (

                    <option

                      key={cls}

                      value={cls}

                    >

                      Class {cls}

                    </option>

                  ))

                }

              </select>

            </div>

            <div>

              <label className="font-medium">

                Subject Name

              </label>

              <input

                name="subjectName"

                value={form.subjectName}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              />

            </div>

            <div>

              <label className="font-medium">

                Subject Code

              </label>

              <input

                name="subjectCode"

                value={form.subjectCode}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              />

            </div>

            <div>

              <label className="font-medium">

                Status

              </label>

              <select

                name="status"

                value={form.status}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              >

                <option>

                  Active

                </option>

                <option>

                  Inactive

                </option>

              </select>

            </div>

            <div>

              <label className="font-medium">

                Theory Marks

              </label>

              <input

                type="number"

                name="theoryMarks"

                value={form.theoryMarks}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              />

            </div>

            <div>

              <label className="font-medium">

                Practical Marks

              </label>

              <input

                type="number"

                name="practicalMarks"

                value={form.practicalMarks}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              />

            </div>

            <div>

              <label className="font-medium">

                Passing Theory

              </label>

              <input

                type="number"

                name="passingTheory"

                value={form.passingTheory}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              />

            </div>

            <div>

              <label className="font-medium">

                Passing Practical

              </label>

              <input

                type="number"

                name="passingPractical"

                value={form.passingPractical}

                onChange={handleChange}

                className="w-full mt-2 border rounded-xl p-3"

              />

            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-6">

            <div>

              <label className="font-medium">

                Total Marks

              </label>

              <input

                disabled

                value={form.totalMarks}

                className="w-full mt-2 border rounded-xl p-3 bg-gray-100"

              />

            </div>

            <div className="flex items-end gap-4">

              <button

                type="submit"

                disabled={saving}

                className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded-xl"

              >

                {

                  saving

                    ? "Saving..."

                    : editingId

                    ? "Update Subject"

                    : "Add Subject"

                }

              </button>

              <button

                type="button"

                onClick={() => {

                  setEditingId(null);

                  setForm(initialForm);

                }}

                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-xl"

              >

                Reset

              </button>

            </div>

          </div>

        </form>
      </div>
              {/* Subject List */}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mt-8 overflow-hidden">

          <div className="flex justify-between items-center p-6 border-b">

            <div>

              <h2 className="text-2xl font-bold text-blue-700">

                📋 Subject List

              </h2>

              <p className="text-gray-500 mt-1">

                Total Subjects : {subjects.length}

              </p>

            </div>

          </div>

          {

            loading ? (

              <div className="p-10 text-center">

                Loading Subjects...

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-green-700 text-white">

                    <tr>

                      <th className="p-4">Class</th>

                      <th className="p-4">Subject</th>

                      <th className="p-4">Code</th>

                      <th className="p-4">Theory</th>

                      <th className="p-4">Practical</th>

                      <th className="p-4">Total</th>

                      <th className="p-4">Status</th>

                      <th className="p-4">Action</th>

                    </tr>

                  </thead>

                  <tbody>

                    {

                      subjects.length === 0 ? (

                        <tr>

                          <td

                            colSpan="8"

                            className="text-center p-10"

                          >

                            No Subjects Found

                          </td>

                        </tr>

                      ) : (

                        subjects.map((subject) => (

                          <tr

                            key={subject.id}

                            className="border-b hover:bg-gray-50"

                          >

                            <td className="p-4">

                              {subject.className}

                            </td>

                            <td className="p-4 font-semibold">

                              {subject.subjectName}

                            </td>

                            <td className="p-4">

                              {subject.subjectCode}

                            </td>

                            <td className="p-4">

                              {subject.theoryMarks}

                            </td>

                            <td className="p-4">

                              {subject.practicalMarks}

                            </td>

                            <td className="p-4 font-bold text-blue-700">

                              {subject.totalMarks}

                            </td>

                            <td className="p-4">

                              <span

                                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  subject.status === "Active"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}

                              >

                                {subject.status}

                              </span>

                            </td>

                            <td className="p-4">

                              <div className="flex gap-2">

                                <button

                                  onClick={() => handleEdit(subject)}

                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"

                                >

                                  Edit

                                </button>

                                <button

                                  onClick={() =>

                                    handleDelete(subject.id)

                                  }

                                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"

                                >

                                  Delete

                                </button>

                              </div>

                            </td>

                          </tr>

                        ))

                      )

                    }

                  </tbody>

                </table>

              </div>

            )

          }

        </div>

      

    </AdminLayout>

  );

}

export default SubjectManagement;