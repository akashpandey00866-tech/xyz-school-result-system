import { useState } from "react";
import AdminLayout from "../layouts/AdminLayout";

function Settings() {

  const [settings, setSettings] = useState({

    /* School */

    schoolName: "XYZ PUBLIC SCHOOL",

    principal: "Principal",

    currentSession: "2026-27",

    schoolPhone: "",

    schoolEmail: "",

    schoolAddress: "",

    /* Student */

    studentLogin: true,

    studentRegistration: true,

    archiveStudent: true,

    defaultPassword: "123456",

    /* Result */

    resultModule: true,

    publishResult: true,

    allowRevaluation: true,

    allowCopyViewing: true,

    showRank: true,

    showGrade: true,

    showPercentage: true,

    /* Fee */

    feeModule: true,

    lateFee: false,

    offlinePayment: true,

    onlinePayment: false,

    revaluationFee: 100,

    copyViewingFee: 50,

    /* Notice */

    noticeBoard: true,

    /* Security */

    maintenanceMode: false,

  });

  const handleToggle = (key) => {

    setSettings((prev) => ({

      ...prev,

      [key]: !prev[key],

    }));

  };

  const handleChange = (e) => {

    const { name, value } = e.target;

    setSettings((prev) => ({

      ...prev,

      [name]: value,

    }));

  };

  const handleSave = () => {

    alert(
      "Settings Saved Successfully (Firestore Integration Next Step)"
    );

  };
  return (

<AdminLayout>

<div className="max-w-7xl mx-auto p-8">

{/* Header */}

<div className="bg-gradient-to-r from-green-700 to-blue-700 text-white rounded-2xl shadow-lg p-8 mb-8">

<h1 className="text-4xl font-bold">

⚙ ERP Control Center

</h1>

<p className="text-green-100 mt-2">

Manage your complete School ERP from one place.

</p>

</div>



{/* School Settings */}

<div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

<h2 className="text-2xl font-bold text-green-700 mb-6">

🏫 School Settings

</h2>

<div className="grid md:grid-cols-2 gap-6">

<div>

<label className="font-semibold">

School Name

</label>

<input

type="text"

name="schoolName"

value={settings.schoolName}

onChange={handleChange}

className="w-full mt-2 border rounded-xl p-3"

/>

</div>

<div>

<label className="font-semibold">

Principal Name

</label>

<input

type="text"

name="principal"

value={settings.principal}

onChange={handleChange}

className="w-full mt-2 border rounded-xl p-3"

/>

</div>

<div>

<label className="font-semibold">

Academic Session

</label>

<input

type="text"

name="currentSession"

value={settings.currentSession}

onChange={handleChange}

className="w-full mt-2 border rounded-xl p-3"

/>

</div>

<div>

<label className="font-semibold">

School Phone

</label>

<input

type="text"

name="schoolPhone"

value={settings.schoolPhone}

onChange={handleChange}

className="w-full mt-2 border rounded-xl p-3"

/>

</div>

<div>

<label className="font-semibold">

School Email

</label>

<input

type="email"

name="schoolEmail"

value={settings.schoolEmail}

onChange={handleChange}

className="w-full mt-2 border rounded-xl p-3"

/>

</div>

<div>

<label className="font-semibold">

School Address

</label>

<textarea

name="schoolAddress"

value={settings.schoolAddress}

onChange={handleChange}

rows="3"

className="w-full mt-2 border rounded-xl p-3"

/>

</div>

</div>

</div>



{/* Student Controls */}

<div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

<h2 className="text-2xl font-bold text-blue-700 mb-6">

👨‍🎓 Student Controls

</h2>

<div className="grid md:grid-cols-2 gap-6">

<label className="flex justify-between items-center border rounded-xl p-4">

Student Login

<input

type="checkbox"

checked={settings.studentLogin}

onChange={() => handleToggle("studentLogin")}

/>

</label>

<label className="flex justify-between items-center border rounded-xl p-4">

Student Registration

<input

type="checkbox"

checked={settings.studentRegistration}

onChange={() => handleToggle("studentRegistration")}

/>

</label>

<label className="flex justify-between items-center border rounded-xl p-4">

Archive Students

<input

type="checkbox"

checked={settings.archiveStudent}

onChange={() => handleToggle("archiveStudent")}

/>

</label>

<div>

<label className="font-semibold">

Default Password

</label>

<input

type="text"

name="defaultPassword"

value={settings.defaultPassword}

onChange={handleChange}

className="w-full mt-2 border rounded-xl p-3"

/>

</div>

</div>

</div>
      {/* Result Controls */}

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

        <h2 className="text-2xl font-bold text-purple-700 mb-6">

          📄 Result Controls

        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <label className="flex justify-between items-center border rounded-xl p-4">

            Result Module

            <input
              type="checkbox"
              checked={settings.resultModule}
              onChange={() => handleToggle("resultModule")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Publish Result

            <input
              type="checkbox"
              checked={settings.publishResult}
              onChange={() => handleToggle("publishResult")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Allow Revaluation

            <input
              type="checkbox"
              checked={settings.allowRevaluation}
              onChange={() => handleToggle("allowRevaluation")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Allow Copy Viewing

            <input
              type="checkbox"
              checked={settings.allowCopyViewing}
              onChange={() => handleToggle("allowCopyViewing")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Show Rank

            <input
              type="checkbox"
              checked={settings.showRank}
              onChange={() => handleToggle("showRank")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Show Grade

            <input
              type="checkbox"
              checked={settings.showGrade}
              onChange={() => handleToggle("showGrade")}
            />

          </label>

        </div>

      </div>



      {/* Fee Controls */}

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

        <h2 className="text-2xl font-bold text-green-700 mb-6">

          💰 Fee Controls

        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <label className="flex justify-between items-center border rounded-xl p-4">

            Fee Module

            <input
              type="checkbox"
              checked={settings.feeModule}
              onChange={() => handleToggle("feeModule")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Offline Payment

            <input
              type="checkbox"
              checked={settings.offlinePayment}
              onChange={() => handleToggle("offlinePayment")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Online Payment (Future)

            <input
              type="checkbox"
              checked={settings.onlinePayment}
              onChange={() => handleToggle("onlinePayment")}
            />

          </label>

          <div>

            <label className="font-semibold">

              Revaluation Fee

            </label>

            <input
              type="number"
              name="revaluationFee"
              value={settings.revaluationFee}
              onChange={handleChange}
              className="w-full mt-2 border rounded-xl p-3"
            />

          </div>

          <div>

            <label className="font-semibold">

              Copy Viewing Fee

            </label>

            <input
              type="number"
              name="copyViewingFee"
              value={settings.copyViewingFee}
              onChange={handleChange}
              className="w-full mt-2 border rounded-xl p-3"
            />

          </div>

        </div>

      </div>



      /* System Controls */

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

        <h2 className="text-2xl font-bold text-red-700 mb-6">

          🔒 System Controls

        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <label className="flex justify-between items-center border rounded-xl p-4">

            Notice Board

            <input
              type="checkbox"
              checked={settings.noticeBoard}
              onChange={() => handleToggle("noticeBoard")}
            />

          </label>

          <label className="flex justify-between items-center border rounded-xl p-4">

            Maintenance Mode

            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={() => handleToggle("maintenanceMode")}
            />

          </label>

        </div>

      </div>



      {/* Save */}

      <div className="flex justify-end">

        <button

          onClick={handleSave}

          className="bg-green-700 hover:bg-green-800 text-white px-12 py-4 rounded-xl text-lg font-bold"

        >

          💾 Save Settings

        </button>

      </div>

    </div>

  </AdminLayout>

);

}

export default Settings;