import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import AdminLayout from "../layouts/AdminLayout";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";

function ExcelExport() {
  const [type, setType] = useState("results");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const collectionName =
        type === "results" ? "results" : "students";

      const snapshot = await getDocs(
        collection(db, collectionName)
      );

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setRows(data);
    } catch (error) {
      console.error("Excel export loading error:", error);
      setRows([]);
      setMessage("Unable to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [type]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatValue(value) {
    if (value && typeof value === "object") {
      if (typeof value.toDate === "function") {
        return value.toDate().toLocaleString();
      }

      return JSON.stringify(value);
    }

    return value ?? "";
  }

  function downloadExcel() {
    if (!rows.length) {
      setMessage("No data available to export.");
      return;
    }

    const keys = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row)))
    );

    const header = keys
      .map((key) => `<th>${escapeHtml(key)}</th>`)
      .join("");

    const body = rows
      .map(
        (row) =>
          `<tr>${keys
            .map(
              (key) =>
                `<td>${escapeHtml(formatValue(row[key]))}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

    const table = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>${header}</tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(
      [`\ufeff${table}`],
      { type: "application/vnd.ms-excel;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const date = new Date()
      .toISOString()
      .slice(0, 10);

    link.href = url;
    link.download =
      type === "results"
        ? `Student_Results_${date}.xls`
        : `Students_${date}.xls`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setMessage(
      `${rows.length} ${type} record(s) exported successfully.`
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6">

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
                  <FileSpreadsheet size={23} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Excel Export
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Download live Firebase records in an Excel-compatible file.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">

          <div className="flex flex-wrap gap-3 mb-6">

            <button
              type="button"
              onClick={() => setType("results")}
              className={`px-5 py-3 rounded-xl font-semibold transition ${
                type === "results"
                  ? "bg-green-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Student Results
            </button>

            <button
              type="button"
              onClick={() => setType("students")}
              className={`px-5 py-3 rounded-xl font-semibold transition ${
                type === "students"
                  ? "bg-green-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Student List
            </button>

          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Selected Data</p>
              <p className="font-bold mt-1">
                {type === "results" ? "Results" : "Students"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Records</p>
              <p className="font-bold mt-1">{rows.length}</p>
            </div>

            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <p className="text-xs text-green-700">Database</p>
              <p className="font-bold text-green-700 mt-1">
                Live Firebase
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={downloadExcel}
            disabled={loading || rows.length === 0}
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            <Download size={18} />
            Download Excel
          </button>

          {message && (
            <div className="mt-5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 p-4 text-sm">
              {message}
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}

export default ExcelExport;