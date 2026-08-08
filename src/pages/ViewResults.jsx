import { useEffect, useState } from "react";
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

function ViewResults() {

  const navigate = useNavigate();

  const [results, setResults] = useState([]);

  const [filteredResults, setFilteredResults] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("All");

  useEffect(() => {

    loadResults();

  }, []);

  useEffect(() => {

    filterResults();

  }, [search, filter, results]);

  const loadResults = async () => {

    try {

      setLoading(true);

      const snapshot =
        await getDocs(
          collection(
  db,
  "results"
)
        );

      const data = snapshot.docs.map(
        (doc) => ({

          id: doc.id,

          ...doc.data(),

        })
      );

      setResults(data);

    } catch (error) {

      console.log(error);

      alert(error.message);

    } finally {

      setLoading(false);

    }

  };

  const filterResults = () => {

    let data = [...results];

    if (search.trim()) {

      data = data.filter(

        (item) =>

          item.studentName
            ?.toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||

          item.enrollmentNo
            ?.toString()
            .includes(search)

      );

    }

    if (filter === "Published") {

      data = data.filter(
        (item) => item.publish
      );

    }

    if (filter === "Unpublished") {

      data = data.filter(
        (item) => !item.publish
      );

    }

    setFilteredResults(data);

  };
    const handlePublish = async (id, currentStatus) => {

    try {

      await updateDoc(

        doc(db, "studentResults", id),

        {

          publish: !currentStatus,

          publishedAt: new Date(),

          publishedBy: "Admin",

        }

      );

      loadResults();

    } catch (error) {

      console.log(error);

      alert(error.message);

    }

  };

  const handleDelete = async (id) => {

    const ok = window.confirm(

      "Delete this Result?"

    );

    if (!ok) return;

    try {

      await deleteDoc(

        doc(db, "studentResults", id)

      );

      loadResults();

    } catch (error) {

      console.log(error);

      alert(error.message);

    }

  };

  const totalResults = results.length;

  const publishedResults =

    results.filter(

      (item) => item.publish

    ).length;

  const unpublishedResults =

    results.filter(

      (item) => !item.publish

    ).length;

  if (loading) {

    return (

      <AdminLayout>

        <div className="flex justify-center items-center h-screen">

          <div className="text-center">

            <div className="w-16 h-16 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>

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

        <div className="grid md:grid-cols-3 gap-5 mb-8">

          <div className="bg-green-600 text-white rounded-2xl p-6">

            <h2 className="text-lg font-semibold">

              Total Results

            </h2>

            <p className="text-4xl font-bold mt-3">

              {totalResults}

            </p>

          </div>

          <div className="bg-blue-600 text-white rounded-2xl p-6">

            <h2 className="text-lg font-semibold">

              Published

            </h2>

            <p className="text-4xl font-bold mt-3">

              {publishedResults}

            </p>

          </div>

          <div className="bg-red-600 text-white rounded-2xl p-6">

            <h2 className="text-lg font-semibold">

              Unpublished

            </h2>

            <p className="text-4xl font-bold mt-3">

              {unpublishedResults}

            </p>

          </div>

        </div>
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">

          <div className="flex flex-col md:flex-row gap-5 justify-between">

            <input
              type="text"
              placeholder="🔍 Search Student Name / Enrollment"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="border rounded-xl px-5 py-3 w-full md:w-96"
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              className="border rounded-xl px-5 py-3"
            >
              <option>All</option>
              <option>Published</option>
              <option>Unpublished</option>
            </select>

          </div>

        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-green-700 text-white">

                <tr>

                  <th className="p-4 text-left">Student</th>

                  <th className="p-4">Enrollment</th>

                  <th className="p-4">Class</th>

                  <th className="p-4">Total</th>

                  <th className="p-4">Percentage</th>

                  <th className="p-4">Grade</th>

                  <th className="p-4">Status</th>

                  <th className="p-4">Publish</th>

                  <th className="p-4">Action</th>

                </tr>

              </thead>

              <tbody>

                {filteredResults.length === 0 ? (

                  <tr>

                    <td
                      colSpan="9"
                      className="text-center py-12 text-gray-500"
                    >

                      No Results Found

                    </td>

                  </tr>

                ) : (

                  filteredResults.map((item) => (

                    <tr
                      key={item.id}
                      className="border-b hover:bg-gray-50 transition"
                    >

                      <td className="p-4 font-semibold">

                        {item.studentName}

                      </td>

                      <td className="p-4 text-center">

                        {item.enrollmentNo}

                      </td>

                      <td className="p-4 text-center">

                        {item.className}-{item.section}

                      </td>

                      <td className="p-4 text-center">

                        {item.grandTotal}

                      </td>

                      <td className="p-4 text-center">

                        {item.percentage}%

                      </td>

                      <td className="p-4 text-center font-bold">

                        {item.grade}

                      </td>

                      <td className="p-4 text-center">

                        {item.status}

                      </td>
                                            <td className="p-4 text-center">

                        <button
                          onClick={() =>
                            handlePublish(
                              item.id,
                              item.publish
                            )
                          }
                          className={`px-4 py-2 rounded-lg text-white font-semibold ${
                            item.publish
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {item.publish
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                      </td>

                      <td className="p-4">

                        <div className="flex justify-center gap-2">

                          <button
                            onClick={() =>
                              navigate(
                                `/edit-result/${item.id}`
                              )
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `/result/${item.id}`
                              )
                            }
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                          >
                            View
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(item.id)
                            }
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>
              </div>

    </AdminLayout>

  );

}

export default ViewResults;