import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../config/firebase";

import AdminLayout from "../layouts/AdminLayout";

import {
  Search,
  RefreshCcw,
  Send,
  Trash2,
} from "lucide-react";

import {
  calculateRanks,
  generateMeritList,
  generateClassStatistics,
} from "../utils/resultUtils";

function PublishResults() {

  /* ===========================
      STATES
  ============================ */

  const [results, setResults] = useState([]);

  const [filteredResults, setFilteredResults] = useState([]);

  const [selectedRows, setSelectedRows] = useState([]);

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");

  /* ===========================
      FILTERS
  ============================ */

  const [search, setSearch] = useState("");

  const [classFilter, setClassFilter] = useState("All");

  const [sectionFilter, setSectionFilter] = useState("All");

  const [sessionFilter, setSessionFilter] = useState("All");

  const [examFilter, setExamFilter] = useState("All");

  /* ===========================
      LOAD
  ============================ */

  useEffect(() => {

    loadResults();

  }, []);
  /* ===========================
    LOAD RESULTS
=========================== */

async function loadResults() {

  try {

    setLoading(true);

    const snapshot = await getDocs(

      collection(db, "results")

    );

    let data = snapshot.docs.map((item) => ({

      id: item.id,

      ...item.data(),

    }));

    /* Only Draft & Published */

    data = data.filter(

      (item) =>

        item.publishStatus === "DRAFT" ||

        item.publishStatus === "PUBLISHED"

    );

    /* Sort */

    data.sort((a, b) => {

      if (a.className !== b.className) {

        return String(a.className).localeCompare(

          String(b.className),

          undefined,

          { numeric: true }

        );

      }

      return String(

        a.studentName || ""

      ).localeCompare(

        String(

          b.studentName || ""

        )

      );

    });

    setResults(data);

    setFilteredResults(data);

  }

  catch (error) {

    console.log(error);

    setMessage(

      "Unable to load results."

    );

  }

  finally {

    setLoading(false);

  }

}

/* ===========================
    FILTER
=========================== */

useEffect(() => {

  let data = [...results];

  if (search.trim()) {

    const keyword =

      search

        .trim()

        .toLowerCase();

    data = data.filter(

      (item) =>

        String(item.studentName || "")

          .toLowerCase()

          .includes(keyword)

        ||

        String(item.enrollmentNo || "")

          .includes(keyword)

        ||

        String(item.mobile || "")

          .includes(keyword)

    );

  }

  if (classFilter !== "All") {

    data = data.filter(

      (item) =>

        item.className ===

        classFilter

    );

  }

  if (sectionFilter !== "All") {

    data = data.filter(

      (item) =>

        item.section ===

        sectionFilter

    );

  }

  if (sessionFilter !== "All") {

    data = data.filter(

      (item) =>

        item.session ===

        sessionFilter

    );

  }

  if (examFilter !== "All") {

    data = data.filter(

      (item) =>

        item.examName ===

        examFilter

    );

  }

  setFilteredResults(data);

}, [

  results,

  search,

  classFilter,

  sectionFilter,

  sessionFilter,

  examFilter,

]);

/* ===========================
    FILTER OPTIONS
=========================== */

const classes = [

  "All",

  ...new Set(

    results.map(

      (item) =>

        item.className

    )

  ),

];

const sections = [

  "All",

  ...new Set(

    results.map(

      (item) =>

        item.section

    )

  ),

];

const sessions = [

  "All",

  ...new Set(

    results.map(

      (item) =>

        item.session

    )

  ),

];

const exams = [

  "All",

  ...new Set(

    results.map(

      (item) =>

        item.examName

    )

  ),

];
/* ===========================
    STATISTICS
=========================== */

const totalResults = results.length;

const draftResults = results.filter(

  (item) =>

    item.publishStatus === "DRAFT"

).length;

const publishedResults = results.filter(

  (item) =>

    item.publishStatus === "PUBLISHED"

).length;

const meritList = useMemo(

  () => generateMeritList(results),

  [results]

);

const classStatistics = useMemo(

  () => generateClassStatistics(results),

  [results]

);

/* ===========================
    SELECT ROW
=========================== */

function toggleRow(id) {

  if (selectedRows.includes(id)) {

    setSelectedRows(

      selectedRows.filter(

        (item) => item !== id

      )

    );

    return;

  }

  setSelectedRows([

    ...selectedRows,

    id,

  ]);

}

/* ===========================
    SELECT ALL
=========================== */

function selectAllRows() {

  const draftIds = filteredResults

    .filter(

      (item) =>

        item.publishStatus ===

        "DRAFT"

    )

    .map(

      (item) => item.id

    );

  if (

    selectedRows.length ===

    draftIds.length

  ) {

    setSelectedRows([]);

    return;

  }

  setSelectedRows(draftIds);

}

/* ===========================
    REFRESH
=========================== */

async function handleRefresh() {

  setSearch("");

  setClassFilter("All");

  setSectionFilter("All");

  setSessionFilter("All");

  setExamFilter("All");

  setSelectedRows([]);

  setMessage("");

  await loadResults();

}
/* ===========================
    PUBLISH SELECTED
=========================== */

async function publishSelected() {

  if (selectedRows.length === 0) {

    alert("Please select draft results.");

    return;

  }

  try {

    setProcessing(true);

    const selectedResults = results.filter(

      item => selectedRows.includes(item.id)

    );

    const rankedResults = calculateRanks(selectedResults);

    const batch = writeBatch(db);

    rankedResults.forEach((student) => {

      batch.update(

        doc(db, "results", student.id),

        {

          rank: student.rank,

          publishStatus: "PUBLISHED",

          published: true,

          publishedAt: serverTimestamp(),

          publishedBy: "Admin",

          updatedAt: serverTimestamp(),

        }

      );

    });

    await batch.commit();

    setSelectedRows([]);

    await loadResults();

    setMessage(

      "Selected Results Published Successfully."

    );

  }

  catch (error) {

    console.log(error);

    setMessage(

      "Unable To Publish Results."

    );

  }

  finally {

    setProcessing(false);

  }

}

/* ===========================
    PUBLISH ALL DRAFT RESULTS
=========================== */

async function publishAllDraftResults() {

  const drafts = results.filter(

    item =>

      item.publishStatus === "DRAFT"

  );

  if (drafts.length === 0) {

    alert("No Draft Results Found.");

    return;

  }

  const ok = window.confirm(

    `Publish ${drafts.length} Draft Results?`

  );

  if (!ok) return;

  try {

    setProcessing(true);

    const rankedResults = calculateRanks(drafts);

    const batch = writeBatch(db);

    rankedResults.forEach((student) => {

      batch.update(

        doc(db, "results", student.id),

        {

          rank: student.rank,

          publishStatus: "PUBLISHED",

          published: true,

          publishedAt: serverTimestamp(),

          publishedBy: "Admin",

          updatedAt: serverTimestamp(),

        }

      );

    });

    await batch.commit();

    await loadResults();

    setMessage(

      "All Draft Results Published Successfully."

    );

  }

  catch (error) {

    console.log(error);

    setMessage(

      "Publish Failed."

    );

  }

  finally {

    setProcessing(false);

  }

}

/* ===========================
    DELETE SELECTED
=========================== */

async function deleteSelected() {

  if (selectedRows.length === 0) {

    alert("Please select results.");

    return;

  }

  const ok = window.confirm(

    `Delete ${selectedRows.length} Results?`

  );

  if (!ok) return;

  try {

    setProcessing(true);

    const batch = writeBatch(db);

    selectedRows.forEach((id) => {

      batch.delete(

        doc(db, "results", id)

      );

    });

    await batch.commit();

    setSelectedRows([]);

    await loadResults();

    setMessage(

      "Selected Results Deleted."

    );

  }

  catch (error) {

    console.log(error);

    setMessage(

      "Delete Failed."

    );

  }

  finally {

    setProcessing(false);

  }

}
/* ===========================
    DELETE SINGLE RESULT
=========================== */

async function deleteResult(id) {

  const ok = window.confirm(

    "Delete this result permanently?"

  );

  if (!ok) return;

  try {

    setProcessing(true);

    await deleteDoc(

      doc(db, "results", id)

    );

    await loadResults();

    setMessage(

      "Result Deleted Successfully."

    );

  }

  catch (error) {

    console.log(error);

    setMessage(

      "Unable To Delete Result."

    );

  }

  finally {

    setProcessing(false);

  }

}

/* ===========================
    STAT CARDS
=========================== */

const cards = [

  {

    title: "Total Results",

    value: totalResults,

    color: "green",

  },

  {

    title: "Draft",

    value: draftResults,

    color: "yellow",

  },

  {

    title: "Published",

    value: publishedResults,

    color: "blue",

  },

  {

    title: "Topper",

    value:

      meritList.topper?.studentName ||

      "-",

    color: "purple",

  },

  {

    title: "Average",

    value:

      `${classStatistics.averagePercentage}%`,

    color: "orange",

  },

];

/* ===========================
    PAGE UI
=========================== */

return (

  <AdminLayout>

    <div className="max-w-7xl mx-auto p-6">

      {/* HEADER */}

      <div className="flex flex-col lg:flex-row justify-between items-center gap-5 mb-8">

        <div>

          <h1 className="text-4xl font-bold text-green-700">

            Publish Results

          </h1>

          <p className="text-gray-500 mt-2">

            Publish Draft Results To Student Portal

          </p>

        </div>

        <button

          onClick={handleRefresh}

          disabled={processing}

          className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl flex items-center gap-2"

        >

          <RefreshCcw size={18} />

          Refresh

        </button>

      </div>

      {/* MESSAGE */}

      {

        message && (

          <div className="mb-6 bg-green-50 border-l-4 border-green-700 rounded-xl p-4">

            <p className="text-green-700">

              {message}

            </p>

          </div>

        )

      }

      {/* STATISTICS */}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">

        {

          cards.map((card) => (

            <StatCard

              key={card.title}

              {...card}

            />

          ))

        }

      </div>
            {/* ===========================
          SEARCH & FILTER
      ============================ */}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">

        <div className="grid md:grid-cols-5 gap-4">

          <div className="relative md:col-span-2">

            <Search

              size={18}

              className="absolute left-4 top-4 text-gray-400"

            />

            <input

              type="text"

              value={search}

              onChange={(e) =>

                setSearch(

                  e.target.value

                )

              }

              placeholder="Search Student..."

              className="w-full border rounded-xl pl-11 p-3"

            />

          </div>

          <select

            value={classFilter}

            onChange={(e) =>

              setClassFilter(

                e.target.value

              )

            }

            className="border rounded-xl p-3"

          >

            {

              classes.map((item) => (

                <option

                  key={item}

                >

                  {item}

                </option>

              ))

            }

          </select>

          <select

            value={sectionFilter}

            onChange={(e) =>

              setSectionFilter(

                e.target.value

              )

            }

            className="border rounded-xl p-3"

          >

            {

              sections.map((item) => (

                <option

                  key={item}

                >

                  {item}

                </option>

              ))

            }

          </select>

          <select

            value={examFilter}

            onChange={(e) =>

              setExamFilter(

                e.target.value

              )

            }

            className="border rounded-xl p-3"

          >

            {

              exams.map((item) => (

                <option

                  key={item}

                >

                  {item}

                </option>

              ))

            }

          </select>

        </div>

      </div>

      {/* ===========================
          BULK ACTIONS
      ============================ */}

      <div className="flex flex-wrap gap-4 mb-8">

        <button

          onClick={publishSelected}

          disabled={

            processing ||

            selectedRows.length === 0

          }

          className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl flex items-center gap-2"

        >

          <Send size={18} />

          Publish Selected

        </button>

        <button

          onClick={publishAllDraftResults}

          disabled={

            processing ||

            draftResults === 0

          }

          className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl"

        >

          Publish All

        </button>

        <button

          onClick={deleteSelected}

          disabled={

            processing ||

            selectedRows.length === 0

          }

          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl flex items-center gap-2"

        >

          <Trash2 size={18} />

          Delete Selected

        </button>

      </div>

      {/* ===========================
          RESULT TABLE
      ============================ */}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-x-auto">

        <table className="w-full">

          <thead className="bg-green-700 text-white">

            <tr>

              <th className="p-4">

                <input

                  type="checkbox"

                  checked={

                    filteredResults.length > 0 &&

                    selectedRows.length ===

                    filteredResults.filter(

                      (item) =>

                        item.publishStatus ===

                        "DRAFT"

                    ).length

                  }

                  onChange={selectAllRows}

                />

              </th>

              <th className="p-4">

                Student

              </th>

              <th className="p-4">

                Enrollment

              </th>

              <th className="p-4">

                Class

              </th>

              <th className="p-4">

                %

              </th>

              <th className="p-4">

                Grade

              </th>

              <th className="p-4">

                Rank

              </th>

              <th className="p-4">

                Status

              </th>

              <th className="p-4">

                Action

              </th>

            </tr>

          </thead>

          <tbody>            {

              loading ? (

                <tr>

                  <td

                    colSpan="9"

                    className="text-center p-10"

                  >

                    Loading Results...

                  </td>

                </tr>

              ) : filteredResults.length === 0 ? (

                <tr>

                  <td

                    colSpan="9"

                    className="text-center p-10"

                  >

                    No Results Found

                  </td>

                </tr>

              ) : (

                filteredResults.map((item) => (

                  <tr

                    key={item.id}

                    className="border-b hover:bg-green-50"

                  >

                    <td className="p-4 text-center">

                      <input

                        type="checkbox"

                        disabled={

                          item.publishStatus ===

                          "PUBLISHED"

                        }

                        checked={

                          selectedRows.includes(

                            item.id

                          )

                        }

                        onChange={() =>

                          toggleRow(item.id)

                        }

                      />

                    </td>

                    <td className="p-4 font-semibold">

                      {item.studentName}

                    </td>

                    <td className="p-4 text-center">

                      {item.enrollmentNo}

                    </td>

                    <td className="p-4 text-center">

                      {item.className}

                      {

                        item.section

                          ? `-${item.section}`

                          : ""

                      }

                    </td>

                    <td className="p-4 text-center font-semibold">

                      {item.percentage}%

                    </td>

                    <td className="p-4 text-center">

                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">

                        {item.grade}

                      </span>

                    </td>

                    <td className="p-4 text-center font-bold">

                      {item.rank || "-"}

                    </td>

                    <td className="p-4 text-center">

                      {

                        item.publishStatus ===

                        "PUBLISHED"

                        ? (

                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700">

                            Published

                          </span>

                        )

                        : (

                          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">

                            Draft

                          </span>

                        )

                      }

                    </td>

                    <td className="p-4 text-center">

                      <button

                        onClick={() =>

                          deleteResult(item.id)

                        }

                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"

                      >

                        <Trash2 size={16} />

                      </button>

                    </td>

                  </tr>

                ))

              )

            }

          </tbody>

        </table>

      </div>

    </div>

  </AdminLayout>

);

}

/* ===========================
    STAT CARD
=========================== */

function StatCard({

  title,

  value,

  color,

}) {

  const colors = {

    green:

      "text-green-700 bg-green-50 border-green-200",

    blue:

      "text-blue-700 bg-blue-50 border-blue-200",

    yellow:

      "text-yellow-700 bg-yellow-50 border-yellow-200",

    purple:

      "text-purple-700 bg-purple-50 border-purple-200",

    orange:

      "text-orange-700 bg-orange-50 border-orange-200",

  };

  return (

    <div

      className={`rounded-2xl border p-5 shadow-sm ${

        colors[color] ||

        colors.green

      }`}

    >

      <p className="text-sm text-gray-500">

        {title}

      </p>

      <h2 className="text-3xl font-bold mt-3">

        {value}

      </h2>

    </div>

  );

}

export default PublishResults;
