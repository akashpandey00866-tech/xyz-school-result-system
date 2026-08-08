import { useEffect, useRef, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";

function CollectFee() {

  const { id } = useParams();

  const navigate = useNavigate();

  const receiptRef = useRef(null);

  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [annualFee, setAnnualFee] = useState(0);

  const [amount, setAmount] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [remarks, setRemarks] =
    useState("");

  const [lastReceipt, setLastReceipt] =
    useState(null);

  useEffect(() => {

    loadStudent();

  }, []);

  const loadStudent = async () => {

    try {

      const snap = await getDoc(
        doc(db, "students", id)
      );

      if (!snap.exists()) {

        alert("Student Not Found");

        navigate("/fee-management");

        return;

      }

      const data = snap.data();

      setStudent(data);

      setAnnualFee(
        Number(data.annualFee || 0)
      );

      if (
        data.paymentHistory &&
        data.paymentHistory.length > 0
      ) {

        const latest =
          data.paymentHistory[
            data.paymentHistory.length - 1
          ];

        setLastReceipt({

          ...latest,

          studentName: data.name,

          enrollmentNo:
            data.enrollmentNo,

          className:
            data.className,

          section:
            data.section,

          annualFee:
            Number(data.annualFee || 0),

          totalPaid:
            Number(data.paidFee || 0),

          dueFee:
            Number(data.dueFee || 0),

        });

      }

    }

    catch (error) {

      console.log(error);

      alert(error.message);

    }

    finally {

      setLoading(false);

    }

  };

  const formatMoney = (value) => {

    return `₹ ${Number(
      value || 0
    ).toLocaleString("en-IN")}`;

  };

  const getCurrentDateTime = () => {

    const now = new Date();

    return {

      date: now.toLocaleDateString(
        "en-IN"
      ),

      day: now.toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
        }
      ),

      time: now.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }
      ),

      timestamp: now.getTime(),

    };

  };

  const getReceiptNumber = (
    enrollmentNo
  ) => {

    const year =
      new Date().getFullYear();

    const random = crypto
      .randomUUID()
      .replace(/-/g, "")
      .substring(0, 10)
      .toUpperCase();

    return `XYZ-${year}-${enrollmentNo}-${random}`;

  };

  const createReceiptObject = (

    receiptNo,

    amount,

    paymentMethod,

    remarks,

    date,

    day,

    time,

    timestamp

  ) => ({

    receiptNo,

    amount: Number(amount),

    method: paymentMethod,

    remarks,

    date,

    day,

    time,

    timestamp,

    receivedBy: "Admin",

    status: "SUCCESS",

  });
    const handleSave = async () => {

    if (!student) {

      alert("Student not found.");

      return;

    }

    if (!amount || Number(amount) <= 0) {

      alert("Enter valid amount.");

      return;

    }

    const paid = Number(student.paidFee || 0);

    const due = annualFee - paid;

    if (Number(amount) > due) {

      alert("Amount cannot be greater than Due Fee.");

      return;

    }

    try {

      setSaving(true);

      const newPaid = paid + Number(amount);

      const newDue = annualFee - newPaid;

      const receiptNo =
        getReceiptNumber(
          student.enrollmentNo
        );

      const {

        date,

        day,

        time,

        timestamp,

      } = getCurrentDateTime();

      const payment = createReceiptObject(

        receiptNo,

        amount,

        paymentMethod,

        remarks,

        date,

        day,

        time,

        timestamp

      );

      await updateDoc(

        doc(db, "students", id),

        {

          paidFee: newPaid,

          dueFee: newDue,

          annualFee,

          lastPayment: date,

          lastPaymentMethod:
            paymentMethod,

          paymentHistory:
            arrayUnion(payment),

        }

      );

      const updatedStudent = {

        ...student,

        paidFee: newPaid,

        dueFee: newDue,

        lastPayment: date,

        lastPaymentMethod:
          paymentMethod,

        paymentHistory: [

          ...(student.paymentHistory || []),

          payment,

        ],

      };

      setStudent(updatedStudent);

      setLastReceipt({

        ...payment,

        studentName:
          student.name,

        enrollmentNo:
          student.enrollmentNo,

        className:
          student.className,

        section:
          student.section,

        annualFee,

        totalPaid:
          newPaid,

        dueFee:
          newDue,

      });

      setAmount("");

      setRemarks("");

      setPaymentMethod("Cash");

      alert(

        `Payment Collected Successfully

Receipt No :
${receiptNo}`

      );

    }

    catch (error) {

      console.log(error);

      alert(error.message);

    }

    finally {

      setSaving(false);

    }

  };

  const generateQRCode =
    async (receiptNo) => {

      return await QRCode.toDataURL(

        `https://xyzschool.in/verify/${receiptNo}`,

        {

          width: 180,

          margin: 1,

        }

      );

    };
    const downloadReceipt = async () => {

  if (!lastReceipt) {

    alert("Please collect fee first.");

    return;

  }

  const pdf = new jsPDF("p", "mm", "a4");

  /* ---------- HEADER ---------- */

  pdf.setFillColor(22, 163, 74);

  pdf.rect(0, 0, 210, 35, "F");

  pdf.setTextColor(255);

  pdf.setFont("helvetica", "bold");

  pdf.setFontSize(22);

  pdf.text(
    "XYZ PUBLIC SCHOOL",
    105,
    15,
    { align: "center" }
  );

  pdf.setFontSize(11);

  pdf.text(
    "OFFICIAL FEE PAYMENT RECEIPT",
    105,
    24,
    { align: "center" }
  );

  pdf.text(
    "Academic Session : 2026-2027",
    105,
    31,
    { align: "center" }
  );

  pdf.setTextColor(0);

  /* ---------- WATERMARK ---------- */

  pdf.setFontSize(34);

  pdf.setTextColor(235);

  pdf.text(
    "XYZ PUBLIC SCHOOL",
    105,
    165,
    {
      align: "center",
      angle: 45,
    }
  );

  pdf.setTextColor(0);

  /* ---------- TABLE ---------- */

  autoTable(pdf, {

    startY: 45,

    theme: "grid",

    head: [["Field", "Details"]],

    headStyles: {

      fillColor: [22,163,74],

      textColor: 255,

      halign: "center",

      fontStyle: "bold",

    },

    styles: {

      fontSize: 10,

      cellPadding: 4,

    },

    alternateRowStyles: {

      fillColor: [245,255,245],

    },

    body: [

      ["Receipt No", lastReceipt.receiptNo],

      ["Date", lastReceipt.date],

      ["Day", lastReceipt.day],

      ["Time", lastReceipt.time],

      ["Student Name", student.name],

      ["Enrollment", student.enrollmentNo],

      ["Father Name", student.fatherName],

      ["Class", `${student.className}-${student.section}`],

      ["Annual Fee", formatMoney(annualFee)],

      ["Current Payment", formatMoney(lastReceipt.amount)],

      ["Total Paid", formatMoney(lastReceipt.totalPaid)],

      ["Remaining Due", formatMoney(lastReceipt.dueFee)],

      ["Payment Mode", lastReceipt.method],

      ["Received By", lastReceipt.receivedBy],

      ["Status", lastReceipt.status],

      ["Remarks", lastReceipt.remarks || "-"],

    ],

  });

  const qr = await generateQRCode(
    lastReceipt.receiptNo
  );

  const y = Math.min(
  pdf.lastAutoTable.finalY + 8,
  210
);

 pdf.addImage(
  qr,
  "PNG",
  25,
  y + 8,
  32,
  32
);

  pdf.setFontSize(9);

  pdf.text(
"Scan to Verify Receipt",
25,
y + 45
);
pdf.setFontSize(8);

pdf.text(
lastReceipt.receiptNo,
25,
y + 51
);
  
    /* ---------- FOOTER ---------- */

  pdf.setDrawColor(22,163,74);

  pdf.line(
140,
y + 55,
195,
y + 55
);

  pdf.setFontSize(10);

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.text(
    "Thank You For Your Payment",
    105,
    y + 68,
    {
      align:"center",
    }
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(9);

  pdf.text(
    "This is a computer generated receipt.",
    105,
    y + 76,
    {
      align:"center",
    }
  );

  pdf.text(
    "Generated from XYZ Public School ERP",
    105,
    y + 82,
    {
      align:"center",
    }
  );

  /* ---------- SIGNATURE ---------- */

 /* ---------- SCHOOL STAMP ---------- */



pdf.setLineWidth(1);

pdf.circle(
40,
y + 98,
14
);

pdf.setFont("helvetica","bold");

pdf.setFontSize(8);

pdf.text(
"XYZ SCHOOL",
40,
y + 94,
{
align:"center"
}
);

pdf.text(
"OFFICIAL",
40,
y + 90,
{
align:"center"
}
);

pdf.text(
"STAMP",
40,
y + 104,
{
align:"center"
}
);

pdf.setFont("helvetica","normal");

pdf.setFontSize(8);

pdf.text(
"(School Office)",
152,
y + 61
);

  /* ---------- SCHOOL STAMP ---------- */

  pdf.setDrawColor(22,163,74);

  pdf.circle(
40,
y + 55,
16
);

  pdf.setFontSize(8);

  pdf.text(
    "XYZ SCHOOL",
    40,
    y + 53,
    {
      align:"center",
    }
  );

  pdf.text(
    "OFFICIAL",
    40,
    y + 58,
    {
      align:"center",
    }
  );

  pdf.text(
    "STAMP",
    40,
    y + 73,
    {
      align:"center",
    }
  );

  /* ---------- SAVE PDF ---------- */

  pdf.save(
    `${lastReceipt.receiptNo}.pdf`
  );

};

const paid =
  Number(student?.paidFee || 0);

const due =
  annualFee - paid;

const status =
  due <= 0
    ? "Paid"
    : paid === 0
    ? "Unpaid"
    : "Partial";
    if (loading) {

  return (

    <AdminLayout>

      <div className="min-h-screen flex items-center justify-center">

        <div className="text-center">

          <div className="w-16 h-16 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>

          <h2 className="text-2xl font-bold text-green-700 mt-6">

            Loading Student...

          </h2>

        </div>

      </div>

    </AdminLayout>

  );

}

return (

<AdminLayout>

<div className="max-w-7xl mx-auto px-6 py-8">

<div className="bg-white rounded-3xl shadow-xl p-8 mb-8">

<h1 className="text-4xl font-bold text-green-700">

💰 Collect Student Fee

</h1>

<p className="text-gray-500 mt-2">

Professional School ERP Fee Collection System

</p>

</div>

<div className="grid lg:grid-cols-2 gap-8">

{/* LEFT */}

<div className="bg-white rounded-3xl shadow-xl p-8">

<div className="space-y-5">

<input
disabled
value={student.name}
className="w-full border rounded-xl p-4 bg-gray-100"
/>

<input
disabled
value={student.enrollmentNo}
className="w-full border rounded-xl p-4 bg-gray-100"
/>

<input
disabled
value={`${student.className}-${student.section}`}
className="w-full border rounded-xl p-4 bg-gray-100"
/>

<input
disabled
value={formatMoney(annualFee)}
className="w-full border rounded-xl p-4 bg-gray-100"
/>

<div className="grid grid-cols-3 gap-4">

<div className="bg-blue-100 rounded-xl p-4 text-center">

<p>Paid</p>

<h2 className="font-bold text-blue-700">

{formatMoney(paid)}

</h2>

</div>

<div className="bg-red-100 rounded-xl p-4 text-center">

<p>Due</p>

<h2 className="font-bold text-red-700">

{formatMoney(due)}

</h2>

</div>

<div className="bg-green-100 rounded-xl p-4 text-center">

<p>Status</p>

<h2 className="font-bold text-green-700">

{status}

</h2>

</div>

</div>

<input
type="number"
placeholder="Enter Amount"
value={amount}
onChange={(e)=>setAmount(e.target.value)}
className="w-full border rounded-xl p-4"
/>

<select
value={paymentMethod}
onChange={(e)=>setPaymentMethod(e.target.value)}
className="w-full border rounded-xl p-4"
>

<option>Cash</option>
<option>UPI</option>
<option>Card</option>
<option>Cheque</option>
<option>Bank Transfer</option>

</select>

<textarea
rows="4"
placeholder="Remarks"
value={remarks}
onChange={(e)=>setRemarks(e.target.value)}
className="w-full border rounded-xl p-4"
/>

<button
onClick={handleSave}
disabled={saving}
className="w-full bg-green-700 hover:bg-green-800 text-white py-4 rounded-xl font-bold"
>

{saving ? "Saving..." : "Collect Fee"}

</button>

</div>

</div>

{/* RIGHT */}

<div

  id="receipt"
  ref={receiptRef}
  className="bg-white rounded-3xl shadow-xl border-4 border-green-700 p-8"
>

<h2 className="text-3xl font-bold text-center">

XYZ PUBLIC SCHOOL

</h2>

<p className="text-center text-gray-500">

OFFICIAL FEE RECEIPT

</p>

<hr className="my-5"/>

{lastReceipt ? (

<>

<div className="grid grid-cols-2 gap-4">

<p><b>Receipt No</b><br/>{lastReceipt.receiptNo}</p>

<p><b>Date</b><br/>{lastReceipt.date}</p>

<p><b>Day</b><br/>{lastReceipt.day}</p>

<p><b>Time</b><br/>{lastReceipt.time}</p>

<p><b>Student</b><br/>{student.name}</p>

<p><b>Enrollment</b><br/>{student.enrollmentNo}</p>

<p><b>Class</b><br/>{student.className}-{student.section}</p>

<p><b>Payment</b><br/>{lastReceipt.method}</p>

</div>

<table className="w-full border mt-6">

<thead className="bg-green-700 text-white">

<tr>

<th className="border p-3">Description</th>

<th className="border p-3">Amount</th>

</tr>

</thead>

<tbody>

<tr>

<td className="border p-3">Annual Fee</td>

<td className="border p-3">{formatMoney(annualFee)}</td>

</tr>

<tr>

<td className="border p-3">Current Payment</td>

<td className="border p-3">{formatMoney(lastReceipt.amount)}</td>

</tr>

<tr>

<td className="border p-3">Total Paid</td>

<td className="border p-3">{formatMoney(lastReceipt.totalPaid)}</td>

</tr>

<tr>

<td className="border p-3">Remaining Due</td>

<td className="border p-3">{formatMoney(lastReceipt.dueFee)}</td>

</tr>

</tbody>

</table>
{lastReceipt && (

<div className="flex justify-center mt-6">

<img

src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
`${window.location.origin}/verify/${lastReceipt.receiptNo}`
)}`}

alt="QR Code"

className="w-32 h-32"

/>

</div>

)}

<div className="mt-8 flex justify-between">

<button
onClick={downloadReceipt}
className="bg-purple-700 text-white px-6 py-3 rounded-xl"
>

📄 Download PDF

</button>

<button
onClick={()=>window.print()}
className="bg-blue-700 text-white px-6 py-3 rounded-xl"
>

🖨 Print

</button>

</div>

</>

) : (

<div className="text-center py-24">

<h2 className="text-2xl text-gray-400">

No Receipt Generated

</h2>

<p className="mt-2 text-gray-500">

Collect Fee to Generate Receipt

</p>

</div>

)}

</div>

</div>

</div>

</AdminLayout>

);

}

export default CollectFee;