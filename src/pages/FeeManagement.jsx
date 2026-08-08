import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  onSnapshot,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";

function FeeManagement() {

  const navigate = useNavigate();

  /* ===============================
            STATES
  =============================== */

  const [students, setStudents] = useState([]);

  const [feeSettings, setFeeSettings] = useState({});

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  /* ===============================
        REALTIME FIREBASE
  =============================== */

  useEffect(() => {

    const unsubscribeStudents = onSnapshot(

      collection(db, "students"),

      (snapshot) => {

        const data = snapshot.docs.map((doc) => ({

          id: doc.id,

          ...doc.data(),

        }));

        setStudents(data);

        setLoading(false);

      }

    );

    const unsubscribeFee = onSnapshot(

      doc(db, "settings", "feeSettings"),

      (snapshot) => {

        if (snapshot.exists()) {

          setFeeSettings(snapshot.data());

        }

      }

    );

    return () => {

      unsubscribeStudents();

      unsubscribeFee();

    };

  }, []);

  /* ===============================
          SEARCH FILTER
  =============================== */

  const filteredStudents = useMemo(() => {

    return students.filter((student) => {

      const value = (

        (student.name || "") +

        (student.enrollmentNo || "") +

        (student.className || "") +

        (student.section || "")

      ).toLowerCase();

      return value.includes(

        search.toLowerCase()

      );

    });

  }, [students, search]);

  /* ===============================
      LIVE SCHOOL STATISTICS
  =============================== */

  const totalStudents = students.length;

  const totalSchoolFee = students.reduce(

    (sum, student) => {

      const annualFee = Number(

        feeSettings[
          `class${student.className}`
        ] || 0

      );

      return sum + annualFee;

    },

    0

  );

  const totalCollected = students.reduce(

    (sum, student) => {

      return (

        sum +

        Number(student.paidFee || 0)

      );

    },

    0

  );

  const totalPending =

    totalSchoolFee - totalCollected;

  /* ===============================
        LOADING SCREEN
  =============================== */

  if (loading) {

    return (

      <AdminLayout>

        <div className="flex items-center justify-center h-[80vh]">

          <div className="text-center">

            <div className="w-16 h-16 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>

            <h2 className="text-2xl font-bold text-green-700 mt-6">

              Loading Fee Records...

            </h2>

          </div>

        </div>

      </AdminLayout>

    );

  }

  /* ===============================
            RETURN
  =============================== */

  return (

    <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">

  {/* =========================
          PAGE HEADER
  ========================= */}

  <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">

    <div>

      <h1 className="text-4xl font-bold text-green-700">

        💰 Fee Management

      </h1>

      <p className="text-gray-500 mt-2">

        Live Fee Collection & Student Fee Management

      </p>

    </div>

    <div className="flex gap-3">

      <button

        onClick={() => window.location.reload()}

        className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl shadow"

      >

        🔄 Refresh

      </button>

      <button

        className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl shadow"

      >

        📊 Reports

      </button>

    </div>

  </div>

  {/* =========================
          SEARCH BAR
  ========================= */}

  <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">

    <div className="flex flex-col lg:flex-row justify-between gap-5">

      <input

        type="text"

        value={search}

        onChange={(e) => setSearch(e.target.value)}

        placeholder="Search by Name / Enrollment / Class"

        className="border rounded-xl px-5 py-4 lg:w-96 outline-none focus:ring-2 focus:ring-green-600"

      />

      <div className="flex gap-4">

        <div className="bg-green-100 rounded-xl px-6 py-4">

          <p className="text-gray-500">

            Database

          </p>

          <h3 className="font-bold text-green-700">

            🟢 Live

          </h3>

        </div>

        <div className="bg-blue-100 rounded-xl px-6 py-4">

          <p className="text-gray-500">

            Showing

          </p>

          <h3 className="font-bold text-blue-700">

            {filteredStudents.length}

          </h3>

        </div>

      </div>

    </div>

  </div>

  {/* =========================
         DASHBOARD CARDS
  ========================= */}

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Total Students

      </p>

      <h2 className="text-4xl font-bold text-blue-700 mt-3">

        {totalStudents}

      </h2>

    </div>

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Total School Fee

      </p>

      <h2 className="text-3xl font-bold text-green-700 mt-3">

        ₹ {totalSchoolFee.toLocaleString()}

      </h2>

    </div>

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Collected Fee

      </p>

      <h2 className="text-3xl font-bold text-blue-700 mt-3">

        ₹ {totalCollected.toLocaleString()}

      </h2>

    </div>

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Pending Fee

      </p>

      <h2 className="text-3xl font-bold text-red-600 mt-3">

        ₹ {totalPending.toLocaleString()}

      </h2>

    </div>

  </div>

  {/* =========================
         TABLE HEADER
  ========================= */}

  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

    <div className="bg-gradient-to-r from-green-700 to-green-900 text-white px-6 py-5">

      <h2 className="text-2xl font-bold">

        Student Fee Records

      </h2>

      <p className="text-green-100 mt-2">

        All fee calculations are synced automatically with Firebase.

      </p>

    </div>

    <div className="overflow-x-auto">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-4">Student</th>

            <th className="p-4">Class</th>

            <th className="p-4">Annual Fee</th>

            <th className="p-4">Paid</th>

            <th className="p-4">Due</th>

            <th className="p-4">Status</th>

            <th className="p-4">Action</th>

          </tr>

        </thead>

        <tbody>{filteredStudents.length === 0 ? (

  <tr>

    <td
      colSpan="7"
      className="text-center py-16"
    >

      <div className="flex flex-col items-center">

        <div className="text-6xl mb-4">
          🎓
        </div>

        <h2 className="text-2xl font-bold text-gray-600">

          No Students Found

        </h2>

        <p className="text-gray-500 mt-2">

          No student matches your search.

        </p>

      </div>

    </td>

  </tr>

) : (

  filteredStudents.map((student) => {

    const annualFee =
      Number(
        feeSettings[
          `class${student.className}`
        ] || 0
      );

    const paidFee =
      Number(student.paidFee || 0);

    const dueFee =
      annualFee - paidFee;

    const status =
      dueFee <= 0
        ? "Paid"
        : paidFee === 0
        ? "Unpaid"
        : "Partial";

    return (

      <tr
        key={student.id}
        className="border-b hover:bg-green-50 transition"
      >

        {/* Student */}

        <td className="p-4">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-full bg-green-700 text-white flex items-center justify-center font-bold">

              {student.name?.charAt(0).toUpperCase()}

            </div>

            <div>

              <h3 className="font-semibold">

                {student.name}

              </h3>

              <p className="text-sm text-gray-500">

                {student.enrollmentNo}

              </p>

            </div>

          </div>

        </td>

        {/* Class */}

        <td className="p-4">

          Class {student.className}-{student.section}

        </td>

        {/* Annual Fee */}

        <td className="p-4 font-bold text-blue-700">

          ₹ {annualFee.toLocaleString()}

        </td>

        {/* Paid */}

        <td className="p-4 font-bold text-green-700">

          ₹ {paidFee.toLocaleString()}

        </td>

        {/* Due */}

        <td className="p-4 font-bold text-red-700">

          ₹ {dueFee.toLocaleString()}

        </td>

        {/* Status */}

        <td className="p-4">

          {status === "Paid" && (

            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

              ✅ Paid

            </span>

          )}

          {status === "Partial" && (

            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">

              🟡 Partial

            </span>

          )}

          {status === "Unpaid" && (

            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">

              🔴 Unpaid

            </span>

          )}

        </td>

        {/* Action */}

        <td className="p-4">

          <div className="flex gap-2">

            <button
  onClick={() => navigate(`/collect-fee/${student.id}`)}
  className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg"
>
  💰 Collect
</button>

<button
  onClick={() => navigate(`/payment-history/${student.id}`)}
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
>
  📜 History
</button>

</div>

</td>

</tr>

            );
          })
        )}
      </tbody>

      </table>

    </div>

  </div>

  {/* Footer */}

  <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">

    <div className="flex flex-col md:flex-row justify-between items-center">

      <div>

        <h2 className="text-xl font-bold">

          Fee Management Summary

        </h2>

        <p className="text-gray-500 mt-2">

          All calculations are synced automatically with Firebase.

        </p>

      </div>

      <div className="mt-4 md:mt-0">

        <span className="bg-green-100 text-green-700 px-5 py-3 rounded-xl font-semibold">

          🟢 Live Sync Enabled

        </span>

      </div>

    </div>

  </div>

</div>

</AdminLayout>

  );

}

export default FeeManagement;


    