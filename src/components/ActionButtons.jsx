import { useNavigate } from "react-router-dom";
import {
  Save,
  RotateCcw,
  Printer,
  XCircle,
  FileText,
} from "lucide-react";

function ActionButtons({

  saving = false,

  onGenerate,

  onSaveDraft,

  onReset,

  draftSaved = false,

}) {

  const navigate = useNavigate();

  function handlePrint() {

    window.print();

  }

  return (

    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mt-8">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <div>

          <h2 className="text-2xl font-bold text-green-700">

            ⚙ Result Actions

          </h2>

          <p className="text-gray-500 mt-1">

            Generate Result and Save Draft

          </p>

        </div>

      </div>

      {/* Buttons */}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        {/* Generate */}

        <button

          onClick={onGenerate}

          className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl p-4 transition"

        >

          <div className="flex flex-col items-center gap-2">

            <FileText size={22} />

            <span>

              Generate

            </span>

          </div>

        </button>

        {/* Save */}

        <button

          onClick={onSaveDraft}

          disabled={saving}

          className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white rounded-xl p-4 transition"

        >

          <div className="flex flex-col items-center gap-2">

            <Save size={22} />

            <span>

              {saving ? "Saving..." : "Save Draft"}

            </span>

          </div>

        </button>

        {/* Print */}

        <button

          onClick={handlePrint}

          disabled={!draftSaved}

          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl p-4 transition"

        >

          <div className="flex flex-col items-center gap-2">

            <Printer size={22} />

            <span>

              Print

            </span>

          </div>

        </button>

        {/* Reset */}

        <button

          onClick={onReset}

          className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl p-4 transition"

        >

          <div className="flex flex-col items-center gap-2">

            <RotateCcw size={22} />

            <span>

              Reset

            </span>

          </div>

        </button>

        {/* Cancel */}

        <button

          onClick={() => navigate("/admin-dashboard")}

          className="bg-gray-700 hover:bg-black text-white rounded-xl p-4 transition"

        >

          <div className="flex flex-col items-center gap-2">

            <XCircle size={22} />

            <span>

              Cancel

            </span>

          </div>

        </button>

      </div>

      {/* Workflow */}

      <div className="mt-8 grid md:grid-cols-3 gap-4">

        <div className="bg-blue-50 border rounded-xl p-4">

          <h3 className="font-semibold text-blue-700">

            Step 1

          </h3>

          <p className="text-sm text-gray-600">

            Generate Result

          </p>

        </div>

        <div className="bg-green-50 border rounded-xl p-4">

          <h3 className="font-semibold text-green-700">

            Step 2

          </h3>

          <p className="text-sm text-gray-600">

            Save Draft

          </p>

        </div>

        <div className="bg-orange-50 border rounded-xl p-4">

          <h3 className="font-semibold text-orange-700">

            Step 3

          </h3>

          <p className="text-sm text-gray-600">

            Publish from Publish Results Module

          </p>

        </div>

      </div>

    </div>

  );

}

export default ActionButtons;