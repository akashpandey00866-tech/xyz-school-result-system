import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";

function StudentPaymentHistory() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [student, setStudent] = useState(null);

  const [history, setHistory] = useState([]);

  const [search, setSearch] = useState("");

  useEffect(() => {

    loadStudent();

  }, []);

  const loadStudent = async () => {

    try {

      const snap = await getDoc(

        doc(db, "students", id)

      );

      if (snap.exists()) {

        const data = snap.data();

        setStudent(data);

        setHistory(data.paymentHistory || []);

      }

    }

    catch (error) {

      console.log(error);

    }

    finally {

      setLoading(false);

    }

  };

  const filteredHistory = useMemo(() => {

    return history.filter((item) => {

      const value = (

        (item.receiptNo || "") +

        (item.method || "") +

        (item.date || "") +

        (item.status || "")

      ).toLowerCase();

      return value.includes(

        search.toLowerCase()

      );

    });

  }, [history, search]);

  const totalCollection = filteredHistory.reduce(

    (sum, item) =>

      sum + Number(item.amount || 0),

    0

  );

  const totalPayments = filteredHistory.length;

  const dueFee = Number(student?.dueFee || 0);

  const annualFee = Number(student?.annualFee || 0);

  const paidFee = Number(student?.paidFee || 0);

  if (loading) {

    return (

      <AdminLayout>

        <div className="flex items-center justify-center h-screen">

          <h2 className="text-3xl font-bold text-green-700">

            Loading Payment History...

          </h2>

        </div>

      </AdminLayout>

    );

  }
    const downloadReceipt = (item) => {

    const pdf = new jsPDF();

    pdf.setFontSize(18);

    pdf.text("XYZ SCHOOL ERP", 70, 15);

    pdf.setFontSize(11);

    pdf.text("Student Fee Receipt", 75, 24);

    autoTable(pdf, {

      startY: 35,

      head: [["Field", "Value"]],

      body: [

        ["Student Name", student.name],

        ["Enrollment", student.enrollmentNo],

        ["Class", `Class ${student.className}-${student.section}`],

        ["Receipt No", item.receiptNo],

        ["Amount", `₹ ${item.amount}`],

        ["Payment Method", item.method],

        ["Date", item.date],

        ["Time", item.time],

        ["Status", item.status],

        ["Remarks", item.remarks || "-"],

      ],

    });

    pdf.save(`${item.receiptNo}.pdf`);

  };

  const printReceipt = (item) => {

    const receipt = window.open("", "_blank");

    receipt.document.write(`

      <html>

      <head>

      <title>Fee Receipt</title>

      <style>

      body{

      font-family:Arial;

      padding:40px;

      }

      table{

      width:100%;

      border-collapse:collapse;

      margin-top:20px;

      }

      td,th{

      border:1px solid #ddd;

      padding:10px;

      }

      h1,h2{

      text-align:center;

      }

      </style>

      </head>

      <body>

      <h1>XYZ SCHOOL ERP</h1>

      <h2>Fee Payment Receipt</h2>

      <table>

      <tr><th>Student</th><td>${student.name}</td></tr>

      <tr><th>Enrollment</th><td>${student.enrollmentNo}</td></tr>

      <tr><th>Class</th><td>${student.className}-${student.section}</td></tr>

      <tr><th>Receipt</th><td>${item.receiptNo}</td></tr>

      <tr><th>Amount</th><td>₹ ${item.amount}</td></tr>

      <tr><th>Method</th><td>${item.method}</td></tr>

      <tr><th>Date</th><td>${item.date}</td></tr>

      <tr><th>Time</th><td>${item.time}</td></tr>

      <tr><th>Status</th><td>${item.status}</td></tr>

      <tr><th>Remarks</th><td>${item.remarks || "-"}</td></tr>

      </table>

      </body>

      </html>

    `);

    receipt.document.close();

    receipt.print();

  };

  return (

    <AdminLayout>

      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="flex justify-between items-center mb-8">

          <div>

            <h1 className="text-4xl font-bold text-green-700">

              Payment History

            </h1>

            <p className="text-gray-500 mt-2">

              Student Payment Records

            </p>

          </div>

          <button

            onClick={() => navigate(-1)}

            className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-xl"

          >

            ← Back

          </button>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">

  <p className="text-gray-500">

    Total Payments

  </p>

  <h2 className="text-4xl font-bold text-blue-700 mt-3">

    {totalPayments}

  </h2>

</div>

<div className="bg-white rounded-2xl shadow-lg p-6">

  <p className="text-gray-500">

    Total Collection

  </p>

  <h2 className="text-3xl font-bold text-green-700 mt-3">

    ₹ {totalCollection.toLocaleString()}

  </h2>

</div>

<div className="bg-white rounded-2xl shadow-lg p-6">

  <p className="text-gray-500">

    Paid Fee

  </p>

  <h2 className="text-3xl font-bold text-purple-700 mt-3">

    ₹ {paidFee.toLocaleString()}

  </h2>

</div>

<div className="bg-white rounded-2xl shadow-lg p-6">

  <p className="text-gray-500">

    Due Fee

  </p>

  <h2 className="text-3xl font-bold text-red-700 mt-3">

    ₹ {dueFee.toLocaleString()}

  </h2>

</div>

</div>

<div className="bg-white rounded-2xl shadow-lg p-6 mb-8">

  <div className="flex flex-col lg:flex-row gap-4 justify-between">

    <input

      type="text"

      placeholder="Search Receipt / Date / Method"

      value={search}

      onChange={(e) => setSearch(e.target.value)}

      className="border rounded-xl px-5 py-4 lg:w-96"

    />

    <div className="bg-green-100 px-5 py-4 rounded-xl">

      <p className="text-sm text-gray-600">

        Records

      </p>

      <h2 className="text-2xl font-bold text-green-700">

        {filteredHistory.length}

      </h2>

    </div>

  </div>

</div>

<div className="bg-white rounded-2xl shadow-lg overflow-hidden">

  <div className="bg-green-700 text-white px-6 py-5">

    <h2 className="text-2xl font-bold">

      Payment History

    </h2>

  </div>

  <div className="overflow-x-auto">

    <table className="w-full">

      <thead className="bg-gray-100">

        <tr>

          <th className="p-4">Receipt</th>

          <th className="p-4">Date</th>

          <th className="p-4">Time</th>

          <th className="p-4">Amount</th>

          <th className="p-4">Method</th>

          <th className="p-4">Status</th>

          <th className="p-4">Action</th>

        </tr>

      </thead>

      <tbody>

        {filteredHistory.length === 0 ? (

          <tr>

            <td
              colSpan="7"
              className="text-center py-12"
            >

              No Payment History Found

            </td>

          </tr>

        ) : (

          filteredHistory.map((item, index) => (

            <tr

              key={index}

              className="border-b hover:bg-gray-50"

            ><td className="p-4 font-semibold">

  {item.receiptNo}

</td>

<td className="p-4">

  {item.date}

</td>

<td className="p-4">

  {item.time}

</td>

<td className="p-4 font-bold text-green-700">

  ₹ {Number(item.amount).toLocaleString()}

</td>

<td className="p-4">

  {item.method}

</td>

<td className="p-4">

  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm">

    {item.status}

  </span>

</td>

<td className="p-4">

  <div className="flex gap-2">

    <button

      onClick={() => downloadReceipt(item)}

      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg"

    >

      📄 PDF

    </button>

    <button

      onClick={() => printReceipt(item)}

      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"

    >

      🖨 Print

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

<div className="mt-8 bg-white rounded-2xl shadow-lg p-6">

  <div className="flex flex-col md:flex-row justify-between items-center">

    <div>

      <h2 className="text-xl font-bold">

        Payment Summary

      </h2>

      <p className="text-gray-500">

        Student payment records synced with Firebase.

      </p>

    </div>

    <div>

      <span className="bg-green-100 text-green-700 px-6 py-3 rounded-xl font-semibold">

        🟢 Live Database

      </span>

    </div>

  </div>

</div>
<div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">

  <button
    onClick={() => navigate("/fee-management")}
    className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-xl"
  >

    ← Back to Fee Management

  </button>

  <div className="flex gap-3">

    <button
      onClick={() => window.print()}
      className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl"
    >

      🖨 Print Page

    </button>

  </div>

</div>

<div className="mt-8 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl text-white p-8">

  <div className="flex flex-col lg:flex-row justify-between items-center gap-6">

    <div>

      <h2 className="text-3xl font-bold">

        XYZ School ERP

      </h2>

      <p className="mt-2 text-green-100">

        Student Fee Payment History

      </p>

    </div>

    <div className="text-center">

      <div className="text-4xl">

        💳

      </div>

      <p className="mt-2">

        Total Collection

      </p>

      <h2 className="text-3xl font-bold">

        ₹ {totalCollection.toLocaleString()}

      </h2>

    </div>

    <div className="text-center">

      <div className="text-4xl">

        📄

      </div>

      <p className="mt-2">

        Total Receipts

      </p>

      <h2 className="text-3xl font-bold">

        {totalPayments}

      </h2>

    </div>

  </div>

</div>

</div>

</AdminLayout>

);

}

export default StudentPaymentHistory;