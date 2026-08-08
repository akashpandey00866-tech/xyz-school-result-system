import { useEffect, useMemo, useState } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";

function FeeSettings() {

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [fees, setFees] = useState({

    class1: 0,
    class2: 0,
    class3: 0,
    class4: 0,
    class5: 0,
    class6: 0,
    class7: 0,
    class8: 0,
    class9: 0,
    class10: 0,
    class11: 0,
    class12: 0,

    session: "2026-2027",

    updatedBy: "Admin",

  });

  useEffect(() => {

    const unsubscribe = onSnapshot(

      doc(db, "settings", "feeSettings"),

      (snapshot) => {

        if (snapshot.exists()) {

          setFees(snapshot.data());

        }

        setLoading(false);

      },

      (error) => {

        console.log(error);

        setLoading(false);

      }

    );

    return () => unsubscribe();

  }, []);

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFees((prev) => ({

      ...prev,

      [name]: name.startsWith("class")
        ? Number(value)
        : value,

    }));

  };

  const handleSave = async () => {

    try {

      setSaving(true);

      await updateDoc(

        doc(db, "settings", "feeSettings"),

        {

          ...fees,

          lastUpdated: serverTimestamp(),

        }

      );

      alert("Fee Settings Updated Successfully");

    }

    catch (error) {

      console.log(error);

      alert(error.message);

    }

    finally {

      setSaving(false);

    }

  };

  const handleReset = () => {

    window.location.reload();

  };

  const totalFee = useMemo(() => {

    return Object.keys(fees)

      .filter((key) => key.startsWith("class"))

      .reduce(

        (sum, key) => sum + Number(fees[key] || 0),

        0

      );

  }, [fees]);

  if (loading) {

    return (

      <AdminLayout>

        <div className="h-screen flex items-center justify-center">

          <div className="text-center">

            <div className="w-16 h-16 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>

            <h2 className="text-2xl font-bold text-green-700 mt-6">

              Loading Fee Settings...

            </h2>

          </div>

        </div>

      </AdminLayout>

    );

  }

  return (
    <AdminLayout>

<div className="max-w-7xl mx-auto px-6 py-8">

<div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">

<div>

<h1 className="text-4xl font-bold text-green-700">

Fee Settings

</h1>

<p className="text-gray-500 mt-2">

Manage School Annual Fee Structure

</p>

</div>

<div className="bg-green-100 rounded-2xl shadow-lg px-8 py-5">

<p className="text-gray-500">

Realtime Database

</p>

<h2 className="text-xl font-bold text-green-700">

Connected

</h2>

</div>

</div>

<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

<div className="bg-white rounded-2xl shadow-lg p-6">

<p className="text-gray-500">

Total Classes

</p>

<h2 className="text-4xl font-bold text-blue-700 mt-2">

12

</h2>

</div>

<div className="bg-white rounded-2xl shadow-lg p-6">

<p className="text-gray-500">

Total Fee

</p>

<h2 className="text-3xl font-bold text-green-700 mt-2">

₹ {totalFee.toLocaleString()}

</h2>

</div>

<div className="bg-white rounded-2xl shadow-lg p-6">

<p className="text-gray-500">

Academic Session

</p>

<input
type="text"
name="session"
value={fees.session}
onChange={handleChange}
className="w-full border rounded-lg mt-2 px-3 py-2"
/>

</div>

<div className="bg-white rounded-2xl shadow-lg p-6">

<p className="text-gray-500">

Updated By

</p>

<input
type="text"
name="updatedBy"
value={fees.updatedBy}
onChange={handleChange}
className="w-full border rounded-lg mt-2 px-3 py-2"
/>

</div>

</div>

<div className="bg-white rounded-2xl shadow-xl p-8">

<h2 className="text-2xl font-bold mb-8">

Primary Classes

</h2>

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

{Array.from({ length: 6 }, (_, index) => {

const classNo = index + 1;

return (

<div
key={classNo}
className="border rounded-2xl p-6 hover:shadow-lg transition"
>

<h3 className="text-xl font-bold text-green-700 mb-4">

Class {classNo}

</h3>

<label>

Annual Fee

</label>

<input
type="number"
name={`class${classNo}`}
value={fees[`class${classNo}`]}
onChange={handleChange}
className="w-full border rounded-xl mt-3 px-4 py-3"
/>

</div>

);

})}

</div>

</div>
<div className="bg-white rounded-2xl shadow-xl p-8 mt-8">

<h2 className="text-2xl font-bold mb-8">

Higher Classes

</h2>

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

{Array.from({ length: 6 }, (_, index) => {

const classNo = index + 7;

return (

<div
key={classNo}
className="border rounded-2xl p-6 hover:shadow-lg transition"
>

<h3 className="text-xl font-bold text-green-700 mb-4">

Class {classNo}

</h3>

<label>

Annual Fee

</label>

<input
type="number"
name={`class${classNo}`}
value={fees[`class${classNo}`]}
onChange={handleChange}
className="w-full border rounded-xl mt-3 px-4 py-3"
/>

</div>

);

})}

</div>

</div>

<div className="grid md:grid-cols-3 gap-5 mt-8">

<button
onClick={handleSave}
disabled={saving}
className="bg-green-700 hover:bg-green-800 text-white py-4 rounded-xl font-semibold disabled:opacity-50"
>

{saving ? "Saving..." : "Save Changes"}

</button>

<button
onClick={handleReset}
className="bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-xl font-semibold"
>

Refresh

</button>

<button
type="button"
className="bg-purple-700 hover:bg-purple-800 text-white py-4 rounded-xl font-semibold"
>

Fee Analytics

</button>

</div>

<div className="grid lg:grid-cols-2 gap-6 mt-10">

<div className="bg-yellow-50 rounded-2xl border border-yellow-300 p-6">

<h2 className="text-xl font-bold text-yellow-700 mb-4">

Fee Guidelines

</h2>

<ul className="space-y-3 text-gray-700">

<li>All fee changes are stored in Firebase.</li>

<li>All pages automatically use updated fee.</li>

<li>Dashboard syncs automatically.</li>

<li>Fee Management syncs automatically.</li>

<li>Collect Fee uses latest class fee.</li>

<li>Realtime database is enabled.</li>

</ul>

</div>

<div className="bg-green-50 rounded-2xl border border-green-300 p-6">

<h2 className="text-xl font-bold text-green-700 mb-4">

System Information

</h2>

<div className="space-y-4">

<div className="flex justify-between">

<span>Session</span>

<strong>{fees.session}</strong>

</div>

<div className="flex justify-between">

<span>Total Classes</span>

<strong>12</strong>

</div>

<div className="flex justify-between">

<span>Updated By</span>

<strong>{fees.updatedBy}</strong>

</div>

<div className="flex justify-between">

<span>Total Fee</span>

<strong>

₹ {totalFee.toLocaleString()}

</strong>

</div>

<div className="flex justify-between">

<span>Status</span>

<strong className="text-green-700">

Connected

</strong>

</div>

</div>

</div>

</div>

</div>

</AdminLayout>

);

}

export default FeeSettings;

