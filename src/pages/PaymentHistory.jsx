import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import AdminLayout from "../layouts/AdminLayout";

function PaymentHistory() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    loadStudent();

  }, []);

  const loadStudent = async () => {

    try {

      const docRef = doc(db, "students", id);

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {

        setStudent({

          id: docSnap.id,

          ...docSnap.data(),

        });

      }

    } catch (error) {

      console.log(error);

      alert(error.message);

    } finally {

      setLoading(false);

    }

  };

  if (loading) {

    return (

      <AdminLayout>

        <div className="p-10 text-center text-xl">

          Loading Payment History...

        </div>

      </AdminLayout>

    );

  }

  if (!student) {

    return (

      <AdminLayout>

        <div className="p-10 text-center text-red-600 text-xl">

          Student Not Found

        </div>

      </AdminLayout>

    );

  }

  return (

    <AdminLayout>

      <div className="max-w-7xl mx-auto p-8">

        <div className="bg-white rounded-2xl shadow-lg p-8">

          <h1 className="text-4xl font-bold text-green-700">

            Payment History

          </h1>

          <p className="text-gray-500 mt-2">

            Student Fee Transactions

          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

  <div className="bg-green-100 rounded-xl p-5">

    <h3 className="text-gray-600">Student Name</h3>

    <h2 className="text-2xl font-bold text-green-700 mt-2">

      {student.name}

    </h2>

  </div>

  <div className="bg-blue-100 rounded-xl p-5">

    <h3 className="text-gray-600">Enrollment No.</h3>

    <h2 className="text-2xl font-bold text-blue-700 mt-2">

      {student.enrollmentNo}

    </h2>

  </div>

  <div className="bg-purple-100 rounded-xl p-5">

    <h3 className="text-gray-600">Class</h3>

    <h2 className="text-2xl font-bold text-purple-700 mt-2">

      {student.className} - {student.section}

    </h2>

  </div>

</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

  <div className="bg-green-50 rounded-xl p-6 border">

    <h3 className="text-gray-500">

      Annual Fee

    </h3>

    <h2 className="text-3xl font-bold text-green-700 mt-2">

      ₹ {Number(student.annualFee || 0).toLocaleString()}

    </h2>

  </div>

  <div className="bg-blue-50 rounded-xl p-6 border">

    <h3 className="text-gray-500">

      Paid Fee

    </h3>

    <h2 className="text-3xl font-bold text-blue-700 mt-2">

      ₹ {Number(student.paidFee || 0).toLocaleString()}

    </h2>

  </div>

  <div className="bg-red-50 rounded-xl p-6 border">

    <h3 className="text-gray-500">

      Due Fee

    </h3>

    <h2 className="text-3xl font-bold text-red-600 mt-2">

      ₹ {Number(student.dueFee || 0).toLocaleString()}

    </h2>

  </div>

</div>

<div className="mt-10">

  <h2 className="text-2xl font-bold mb-5">

    Payment Records

  </h2>

  <div className="overflow-x-auto">

    <table className="w-full border border-gray-200">

      <thead className="bg-green-700 text-white">

        <tr>

          <th className="p-3">#</th>

          <th className="p-3">Date</th>

          <th className="p-3">Amount</th>

          <th className="p-3">Mode</th>

          <th className="p-3">Remark</th>

        </tr>

      </thead>

      <tbody>

        {(student.paymentHistory || []).length === 0 ? (

          <tr>

            <td
              colSpan="5"
              className="text-center py-10 text-gray-500"
            >

              No Payment History Found

            </td>

          </tr>

        ) : (

          student.paymentHistory.map((payment, index) => (

            <tr
              key={index}
              className="border-b hover:bg-gray-50"
            >

              <td className="p-3 text-center">

                {index + 1}

              </td>

              <td className="p-3">

                {payment.date}

              </td>

              <td className="p-3 font-bold text-green-700">

                ₹ {Number(payment.amount).toLocaleString()}

              </td>

              <td className="p-3">

                {payment.mode}

              </td>

              <td className="p-3">

                {payment.remark || "-"}

              </td>

            </tr>

          ))

        )}

      </tbody>

    </table>

  </div>

</div>
<div className="flex gap-4 mt-8">

  <button
    onClick={() => navigate(-1)}
    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl"
  >
    ← Back
  </button>

  <button
    onClick={() => window.print()}
    className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl"
  >
    🖨 Print
  </button>

</div>

        </div>

      </div>

    </AdminLayout>

  );

}

export default PaymentHistory;