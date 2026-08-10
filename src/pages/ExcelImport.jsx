import { useState } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";

import { db } from "../config/firebase";
import AdminLayout from "../layouts/AdminLayout";

function ExcelImport() {
  const [importType, setImportType] = useState("students");

  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [validation, setValidation] = useState({
    valid: [],
    invalid: [],
    duplicate: [],
  });

  /* =====================================================
     COLLECTION
  ===================================================== */

  const getCollectionName = () => {
    if (importType === "students") {
      return "students";
    }

    if (importType === "results") {
      return "results";
    }

    return "fees";
  };

  /* =====================================================
     FILE SELECT
  ===================================================== */

  const handleFile = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setRows([]);
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const buffer = await selectedFile.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const sheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[sheetName];

      const jsonData =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: "",
          }
        );

      if (!jsonData.length) {
        setError(
          "The selected Excel file is empty."
        );

        return;
      }

      setRows(jsonData);

      await validateRows(jsonData);
    } catch (err) {
      console.error(
        "Excel reading error:",
        err
      );

      setError(
        "Unable to read this Excel file."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateRows = async (data) => {
    const valid = [];
    const invalid = [];
    const duplicate = [];

    const existingSnapshot =
      await getDocs(
        collection(
          db,
          getCollectionName()
        )
      );

    const existing =
      existingSnapshot.docs.map(
        (doc) => doc.data()
      );

    const seen = new Set();

    data.forEach((row, index) => {
      const rowNumber = index + 2;

      let key = "";

      /* ================= STUDENTS ================= */

      if (importType === "students") {
        key =
          String(
            row.enrollmentNo ||
              row.EnrollmentNo ||
              row["Enrollment Number"] ||
              ""
          )
            .trim()
            .toLowerCase();

        if (!key) {
          invalid.push({
            row: rowNumber,
            reason:
              "Enrollment Number is required.",
            data: row,
          });

          return;
        }
      }

      /* ================= RESULTS ================= */

      if (importType === "results") {
        key =
          String(
            row.enrollmentNo ||
              row.EnrollmentNo ||
              ""
          )
            .trim()
            .toLowerCase();

        if (!key) {
          invalid.push({
            row: rowNumber,
            reason:
              "Enrollment Number is required.",
            data: row,
          });

          return;
        }
      }

      /* ================= FEES ================= */

      if (importType === "fees") {
        key =
          String(
            row.enrollmentNo ||
              row.EnrollmentNo ||
              ""
          )
            .trim()
            .toLowerCase();

        if (!key) {
          invalid.push({
            row: rowNumber,
            reason:
              "Enrollment Number is required.",
            data: row,
          });

          return;
        }
      }

      /* ================= DUPLICATE ================= */

      if (seen.has(key)) {
        duplicate.push({
          row: rowNumber,
          reason:
            "Duplicate record inside Excel file.",
          data: row,
        });

        return;
      }

      seen.add(key);

      const alreadyExists =
        existing.some(
          (item) =>
            String(
              item.enrollmentNo || ""
            )
              .trim()
              .toLowerCase() === key
        );

      if (alreadyExists) {
        duplicate.push({
          row: rowNumber,
          reason:
            "Enrollment Number already exists.",
          data: row,
        });

        return;
      }

      valid.push({
        row: rowNumber,
        data: row,
      });
    });

    setValidation({
      valid,
      invalid,
      duplicate,
    });
  };

  /* =====================================================
     IMPORT
  ===================================================== */

  const handleImport = async () => {
    if (!validation.valid.length) {
      setError(
        "There are no valid records to import."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Import ${validation.valid.length} record(s) into ${getCollectionName()}?`
      );

    if (!confirmed) return;

    try {
      setImporting(true);
      setError("");
      setSuccess("");

      const collectionRef =
        collection(
          db,
          getCollectionName()
        );

      let imported = 0;

      for (const item of validation.valid) {
        const cleanedData =
          cleanRow(item.data);

        await addDoc(
          collectionRef,
          {
            ...cleanedData,

            importedFromExcel: true,

            importedAt:
              serverTimestamp(),

            createdAt:
              serverTimestamp(),
          }
        );

        imported++;
      }

      setSuccess(
        `${imported} record(s) imported successfully.`
      );

      setRows([]);
      setFile(null);

      setValidation({
        valid: [],
        invalid: [],
        duplicate: [],
      });
    } catch (err) {
      console.error(
        "Excel import error:",
        err
      );

      setError(
        err?.message ||
          "Unable to import records."
      );
    } finally {
      setImporting(false);
    }
  };

  /* =====================================================
     CLEAN DATA
  ===================================================== */

  const cleanRow = (row) => {
    const cleaned = {};

    Object.entries(row).forEach(
      ([key, value]) => {
        const cleanKey = key
          .trim()
          .replace(/\s+/g, "");

        cleaned[cleanKey] =
          typeof value === "string"
            ? value.trim()
            : value;
      }
    );

    return cleaned;
  };

  /* =====================================================
     RESET
  ===================================================== */

  const resetImport = () => {
    setFile(null);
    setRows([]);

    setError("");
    setSuccess("");

    setValidation({
      valid: [],
      invalid: [],
      duplicate: [],
    });
  };

  return (
    <AdminLayout>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">

        {/* HEADER */}

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center">

              <FileSpreadsheet
                size={25}
              />

            </div>

            <div>

              <h1 className="text-2xl font-bold text-slate-900">

                Excel Data Import

              </h1>

              <p className="text-sm text-slate-500 mt-1">

                Upload and safely import school records.

              </p>

            </div>

          </div>

        </div>

        {/* TYPE */}

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 mt-6">

          <h2 className="font-bold text-lg">

            Select Data Type

          </h2>

          <p className="text-sm text-slate-500 mt-1">

            Choose where the Excel records should be imported.

          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-5">

            <ImportType
              active={
                importType ===
                "students"
              }
              title="Students"
              description="Student admission records"
              onClick={() => {
                setImportType(
                  "students"
                );
                resetImport();
              }}
            />

            <ImportType
              active={
                importType ===
                "results"
              }
              title="Results"
              description="Student result records"
              onClick={() => {
                setImportType(
                  "results"
                );
                resetImport();
              }}
            />

            <ImportType
              active={
                importType ===
                "fees"
              }
              title="Fees"
              description="Fee/payment records"
              onClick={() => {
                setImportType("fees");
                resetImport();
              }}
            />

          </div>

        </div>

        {/* UPLOAD */}

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 mt-6">

          <label
            htmlFor="excel-file"
            className="border-2 border-dashed border-green-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition"
          >

            <Upload
              size={34}
              className="text-green-700"
            />

            <h3 className="font-bold mt-4">

              Upload Excel File

            </h3>

            <p className="text-sm text-slate-500 mt-1">

              .xlsx, .xls or .csv

            </p>

            <span className="mt-4 bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold">

              Choose File

            </span>

            <input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
            />

          </label>

          {file && (

            <div className="mt-5 p-4 rounded-xl bg-green-50 border border-green-200">

              <p className="font-semibold text-green-800">

                {file.name}

              </p>

              <p className="text-xs text-green-700 mt-1">

                {rows.length} record(s) detected

              </p>

            </div>

          )}

        </div>

        {/* STATUS */}

        {loading && (

          <StatusBox
            type="loading"
            text="Reading and validating Excel..."
          />

        )}

        {error && (

          <StatusBox
            type="error"
            text={error}
          />

        )}

        {success && (

          <StatusBox
            type="success"
            text={success}
          />

        )}

        {/* VALIDATION SUMMARY */}

        {rows.length > 0 && !loading && (

          <div className="grid md:grid-cols-3 gap-4 mt-6">

            <CountCard
              title="Valid"
              value={
                validation.valid.length
              }
              className="text-green-700 bg-green-50"
            />

            <CountCard
              title="Duplicate"
              value={
                validation.duplicate.length
              }
              className="text-orange-700 bg-orange-50"
            />

            <CountCard
              title="Invalid"
              value={
                validation.invalid.length
              }
              className="text-red-700 bg-red-50"
            />

          </div>

        )}

        {/* ERROR LIST */}

        {(validation.invalid.length >
          0 ||
          validation.duplicate.length >
            0) && (

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 mt-6">

            <h2 className="font-bold text-lg">

              Import Issues

            </h2>

            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">

              {[
                ...validation.invalid,
                ...validation.duplicate,
              ].map(
                (item, index) => (

                  <div
                    key={index}
                    className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm"
                  >

                    <b>
                      Row {item.row}
                    </b>

                    <span className="ml-2 text-red-700">
                      {item.reason}
                    </span>

                  </div>

                )
              )}

            </div>

          </div>

        )}

        {/* PREVIEW */}

        {validation.valid.length >
          0 && (

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm mt-6 overflow-hidden">

            <div className="p-6 border-b">

              <h2 className="font-bold text-lg">

                Import Preview

              </h2>

              <p className="text-sm text-slate-500 mt-1">

                Only valid records will be imported.

              </p>

            </div>

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-4 py-3 text-left">
                      #
                    </th>

                    {Object.keys(
                      validation.valid[0].data
                    )
                      .slice(0, 8)
                      .map(
                        (key) => (

                          <th
                            key={key}
                            className="px-4 py-3 text-left whitespace-nowrap"
                          >
                            {key}
                          </th>

                        )
                      )}

                  </tr>

                </thead>

                <tbody>

                  {validation.valid
                    .slice(0, 10)
                    .map(
                      (item, index) => (

                        <tr
                          key={index}
                          className="border-t hover:bg-slate-50"
                        >

                          <td className="px-4 py-3">
                            {item.row}
                          </td>

                          {Object.values(
                            item.data
                          )
                            .slice(0, 8)
                            .map(
                              (
                                value,
                                valueIndex
                              ) => (

                                <td
                                  key={
                                    valueIndex
                                  }
                                  className="px-4 py-3 max-w-[220px] truncate"
                                >
                                  {String(
                                    value
                                  )}
                                </td>

                              )
                            )}

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          </div>

        )}

        {/* ACTION */}

        {validation.valid.length >
          0 && (

          <div className="flex flex-wrap gap-3 mt-6">

            <button
              type="button"
              onClick={
                handleImport
              }
              disabled={importing}
              className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-bold"
            >

              {importing ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={18}
                />
              )}

              {importing
                ? "Importing..."
                : `Import ${validation.valid.length} Records`}

            </button>

            <button
              type="button"
              onClick={resetImport}
              className="inline-flex items-center gap-2 border border-slate-200 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50"
            >

              <XCircle
                size={18}
              />

              Cancel

            </button>

          </div>

        )}

      </div>

    </AdminLayout>
  );
}

/* =====================================================
   TYPE CARD
===================================================== */

function ImportType({
  active,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-left p-5 rounded-2xl border-2 transition
        ${
          active
            ? "border-green-600 bg-green-50"
            : "border-slate-200 hover:border-green-300"
        }
      `}
    >

      <p className="font-bold">
        {title}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        {description}
      </p>

      {active && (
        <p className="text-xs text-green-700 font-semibold mt-3">
          Selected
        </p>
      )}

    </button>
  );
}

/* =====================================================
   STATUS
===================================================== */

function StatusBox({
  type,
  text,
}) {
  const config = {
    loading: {
      className:
        "bg-blue-50 border-blue-200 text-blue-700",
      icon: (
        <Loader2
          size={18}
          className="animate-spin"
        />
      ),
    },

    error: {
      className:
        "bg-red-50 border-red-200 text-red-700",
      icon: (
        <AlertCircle
          size={18}
        />
      ),
    },

    success: {
      className:
        "bg-green-50 border-green-200 text-green-700",
      icon: (
        <CheckCircle2
          size={18}
        />
      ),
    },
  };

  const item = config[type];

  return (
    <div
      className={`mt-6 border rounded-2xl p-4 flex items-center gap-3 ${item.className}`}
    >
      {item.icon}
      <span className="text-sm font-semibold">
        {text}
      </span>
    </div>
  );
}

/* =====================================================
   COUNT CARD
===================================================== */

function CountCard({
  title,
  value,
  className,
}) {
  return (
    <div
      className={`rounded-2xl p-5 border ${className}`}
    >
      <p className="text-sm font-medium">
        {title}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>
    </div>
  );
}

export default ExcelImport;