import StudentLayout from "../layouts/StudentLayout";

function StudentDashboard() {

  const student = JSON.parse(
    localStorage.getItem("student")
  ) || {};

  const initials = student.name
    ? student.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "ST";

  return (

<StudentLayout>

<div className="max-w-7xl mx-auto">

<div className="bg-gradient-to-r from-green-700 to-green-600 rounded-3xl shadow-xl p-8 text-white">

<div className="flex flex-col md:flex-row items-center justify-between gap-6">

<div>

<h1 className="text-4xl font-bold">

Welcome,

{student.name || "Student"} 👋

</h1>

<p className="text-green-100 mt-3">

Student Portal Dashboard

</p>

<p className="text-green-100 mt-1">

Academic Session 2026 - 2027

</p>

</div>

<div className="w-28 h-28 rounded-full bg-white text-green-700 flex items-center justify-center text-5xl font-bold shadow-lg">

{initials}

</div>

</div>

</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"></div>
{/* Result Card */}

<div className="bg-white rounded-3xl shadow-lg p-8 hover:shadow-2xl transition">

<div className="text-5xl">

📊

</div>

<h2 className="text-2xl font-bold text-green-700 mt-5">

Result

</h2>

<p className="text-gray-500 mt-2">

View your latest exam results

</p>

<button

className="mt-6 w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition"

>

View Result

</button>

</div>

{/* Fee History Card */}

<div className="bg-white rounded-3xl shadow-lg p-8 hover:shadow-2xl transition">

<div className="text-5xl">

💰

</div>

<h2 className="text-2xl font-bold text-blue-700 mt-5">

Fee History

</h2>

<p className="text-gray-500 mt-2">

Check payments and receipts

</p>

<button

className="mt-6 w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl font-semibold transition"

>

View Fees

</button>

</div>

{/* Notice Card */}

<div className="bg-white rounded-3xl shadow-lg p-8 hover:shadow-2xl transition">

<div className="text-5xl">

📢

</div>

<h2 className="text-2xl font-bold text-orange-600 mt-5">

Notice

</h2>

<p className="text-gray-500 mt-2">

Latest school announcements

</p>

<button

className="mt-6 w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-semibold transition"

>

View Notice

</button>

</div>

</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
    {/* Student Information */}

<div className="bg-white rounded-3xl shadow-lg p-8">

<h2 className="text-2xl font-bold text-green-700 mb-6">

Student Information

</h2>

<div className="space-y-5">

<div className="flex justify-between border-b pb-3">

<span className="text-gray-500">

Name

</span>

<strong>

{student.name || "-"}

</strong>

</div>

<div className="flex justify-between border-b pb-3">

<span className="text-gray-500">

Enrollment

</span>

<strong>

{student.enrollmentNo || "-"}

</strong>

</div>

<div className="flex justify-between border-b pb-3">

<span className="text-gray-500">

Class

</span>

<strong>

Class {student.className || "-"} - {student.section || "-"}

</strong>

</div>

<div className="flex justify-between border-b pb-3">

<span className="text-gray-500">

Session

</span>

<strong>

2026 - 2027

</strong>

</div>

<div className="flex justify-between">

<span className="text-gray-500">

Status

</span>

<span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-semibold">

Active

</span>

</div>

</div>

</div>

{/* Fee Summary */}

<div className="bg-white rounded-3xl shadow-lg p-8">

<h2 className="text-2xl font-bold text-blue-700 mb-6">

Fee Summary

</h2>

<div className="space-y-5">

<div className="flex justify-between border-b pb-3">

<span className="text-gray-500">

Annual Fee

</span>

<strong>

₹ {Number(student.annualFee || 0).toLocaleString()}

</strong>

</div>

<div className="flex justify-between border-b pb-3">

<span className="text-gray-500">

Paid Fee

</span>

<strong className="text-green-700">

₹ {Number(student.paidFee || 0).toLocaleString()}

</strong>

</div>

<div className="flex justify-between border-b pb-3">

<span className="text-gray-500">

Due Fee

</span>

<strong className="text-red-600">

₹ {Number(student.dueFee || 0).toLocaleString()}

</strong>

</div>

<div className="flex justify-between">

<span className="text-gray-500">

Last Payment

</span>

<strong>

{student.lastPayment || "Not Available"}

</strong>

</div>

</div>

</div>

</div>

<div className="bg-white rounded-3xl shadow-lg p-8 mt-8">

<h2 className="text-2xl font-bold text-orange-600 mb-6">

Latest School Notice

</h2>

<div className="space-y-4">

<div className="border-l-4 border-green-700 pl-4">

<h3 className="font-semibold">

Half Yearly Examination

</h3>

<p className="text-gray-500 text-sm">

Exams will start from 15 September 2026.

</p>

</div>

<div className="border-l-4 border-blue-700 pl-4">

<h3 className="font-semibold">

Fee Submission

</h3>

<p className="text-gray-500 text-sm">

Submit pending fees before 10 August.

</p>

</div>

<div className="border-l-4 border-orange-600 pl-4">

<h3 className="font-semibold">

Independence Day

</h3>

<p className="text-gray-500 text-sm">

School will remain closed on 15 August.

</p>

</div>

</div>

</div>
{/* Quick Actions */}

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

<div className="bg-green-700 rounded-3xl text-white p-8">

<h2 className="text-2xl font-bold">

Academic Session

</h2>

<p className="mt-4 text-green-100">

2026 - 2027

</p>

</div>

<div className="bg-blue-700 rounded-3xl text-white p-8">

<h2 className="text-2xl font-bold">

Student Portal

</h2>

<p className="mt-4 text-blue-100">

Welcome to your dashboard.

</p>

</div>

<div className="bg-orange-600 rounded-3xl text-white p-8">

<h2 className="text-2xl font-bold">

Support

</h2>

<p className="mt-4 text-orange-100">

Contact School Office

</p>

</div>

</div>

{/* Footer */}

<div className="mt-10 text-center border-t pt-6">

<p className="text-gray-600">

© 2026 XYZ PUBLIC SCHOOL

</p>

<p className="text-sm text-gray-400 mt-2">

Student ERP Portal • Version 1.0

</p>

</div>

</StudentLayout>

);

}

export default StudentDashboard;