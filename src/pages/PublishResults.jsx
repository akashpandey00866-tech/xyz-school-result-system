import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import * as XLSX from "xlsx";

import { db } from "../config/firebase";
import AdminLayout from "../layouts/AdminLayout";

import {
  Search,
  RefreshCcw,
  CheckCircle2,
  Send,
  Lock,
  Trash2,
  Printer,
  Download,
  Users,
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  BarChart3,
  Eye,
  X,
  AlertTriangle,
  Clock3,
} from "lucide-react";


/* =========================================================
   PUBLISH RESULTS
   Advanced Result Publishing & Management
========================================================= */

function PublishResults() {

  /* =======================================================
     STATES
  ======================================================= */

  const [results, setResults] =
    useState([]);

  const [filteredResults, setFilteredResults] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("success");

  const [search, setSearch] =
    useState("");

  const [classFilter, setClassFilter] =
    useState("All");

  const [sectionFilter, setSectionFilter] =
    useState("All");

  const [sessionFilter, setSessionFilter] =
    useState("All");

  const [examFilter, setExamFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedRows, setSelectedRows] =
    useState([]);

  const [previewResult, setPreviewResult] =
    useState(null);


  /* =======================================================
     LOAD RESULTS
  ======================================================= */

  useEffect(() => {
    loadResults();
  }, []);


  async function loadResults() {

    try {

      setLoading(true);

      const snapshot =
        await getDocs(
          collection(db, "results")
        );

      const data =
        snapshot.docs.map(
          (resultDoc) => ({
            id: resultDoc.id,
            ...resultDoc.data(),
          })
        );

      setResults(data);
      setFilteredResults(data);

      setSelectedRows([]);

    }

    catch (error) {

      console.error(
        "Load Results Error:",
        error
      );

      showMessage(
        "Unable to load results.",
        "error"
      );

    }

    finally {

      setLoading(false);

    }

  }


  /* =======================================================
     MESSAGE SYSTEM
  ======================================================= */

  function showMessage(
    text,
    type = "success"
  ) {

    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
    }, 4000);

  }


  /* =======================================================
     FILTER DATA
  ======================================================= */

  useEffect(() => {

    let data = [
      ...results,
    ];


    /* SEARCH */

    if (search.trim()) {

      const keyword =
        search
          .trim()
          .toLowerCase();

      data =
        data.filter(
          (item) => {

            const name =
              String(
                item.studentName || ""
              ).toLowerCase();

            const enrollment =
              String(
                item.enrollmentNo || ""
              ).toLowerCase();

            const mobile =
              String(
                item.mobile || ""
              ).toLowerCase();

            const className =
              String(
                item.className || ""
              ).toLowerCase();

            return (
              name.includes(keyword) ||
              enrollment.includes(keyword) ||
              mobile.includes(keyword) ||
              className.includes(keyword)
            );

          }
        );

    }


    /* CLASS */

    if (
      classFilter !== "All"
    ) {

      data =
        data.filter(
          (item) =>
            item.className ===
            classFilter
        );

    }


    /* SECTION */

    if (
      sectionFilter !== "All"
    ) {

      data =
        data.filter(
          (item) =>
            item.section ===
            sectionFilter
        );

    }


    /* SESSION */

    if (
      sessionFilter !== "All"
    ) {

      data =
        data.filter(
          (item) =>
            item.session ===
            sessionFilter
        );

    }


    /* EXAM */

    if (
      examFilter !== "All"
    ) {

      data =
        data.filter(
          (item) =>
            item.examName ===
            examFilter
        );

    }


    /* STATUS */

    if (
      statusFilter !== "All"
    ) {

      data =
        data.filter(
          (item) =>
            item.publishStatus ===
            statusFilter
        );

    }


    /* SORT */

    data.sort(
      (a, b) => {

        const percentageA =
          Number(
            a.percentage || 0
          );

        const percentageB =
          Number(
            b.percentage || 0
          );

        return (
          percentageB -
          percentageA
        );

      }
    );


    setFilteredResults(data);

  }, [
    results,
    search,
    classFilter,
    sectionFilter,
    sessionFilter,
    examFilter,
    statusFilter,
  ]);


  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(() => {

      const total =
        results.length;

      const published =
        results.filter(
          (item) =>
            item.publishStatus ===
            "PUBLISHED"
        ).length;

      const draft =
        results.filter(
          (item) =>
            item.publishStatus ===
            "DRAFT"
        ).length;

      const verified =
        results.filter(
          (item) =>
            item.publishStatus ===
            "VERIFIED"
        ).length;

      const locked =
        results.filter(
          (item) =>
            item.publishStatus ===
            "LOCKED"
        ).length;


      const percentages =
        results
          .map(
            (item) =>
              Number(
                item.percentage || 0
              )
          )
          .filter(
            (value) =>
              !Number.isNaN(value)
          );


      const average =
        percentages.length
          ? (
              percentages.reduce(
                (
                  sum,
                  value
                ) =>
                  sum + value,
                0
              ) /
              percentages.length
            ).toFixed(2)
          : "0";


      const topper =
        [...results]
          .sort(
            (a, b) =>
              Number(
                b.percentage || 0
              ) -
              Number(
                a.percentage || 0
              )
          )[0] || null;


      return {
        total,
        published,
        draft,
        verified,
        locked,
        average,
        topper,
      };

    }, [results]);


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const classes =
    useMemo(
      () => uniqueOptions(
        results.map(
          (item) =>
            item.className
        )
      ),
      [results]
    );

  const sections =
    useMemo(
      () => uniqueOptions(
        results.map(
          (item) =>
            item.section
        )
      ),
      [results]
    );

  const sessions =
    useMemo(
      () => uniqueOptions(
        results.map(
          (item) =>
            item.session
        )
      ),
      [results]
    );

  const exams =
    useMemo(
      () => uniqueOptions(
        results.map(
          (item) =>
            item.examName
        )
      ),
      [results]
    );


  /* =======================================================
     SELECT ROW
  ======================================================= */

  function toggleRow(
    id
  ) {

    setSelectedRows(
      (previous) => {

        if (
          previous.includes(id)
        ) {

          return previous.filter(
            (item) =>
              item !== id
          );

        }

        return [
          ...previous,
          id,
        ];

      }
    );

  }


  /* =======================================================
     SELECT ALL
  ======================================================= */

  function selectAllRows() {

    const selectableIds =
      filteredResults
        .filter(
          (item) =>
            item.publishStatus !==
            "LOCKED"
        )
        .map(
          (item) =>
            item.id
        );


    if (
      selectedRows.length ===
      selectableIds.length
    ) {

      setSelectedRows([]);

    }

    else {

      setSelectedRows(
        selectableIds
      );

    }

  }


  /* =======================================================
     GET SELECTED RESULTS
  ======================================================= */

  function getSelectedResults() {

    return results.filter(
      (item) =>
        selectedRows.includes(
          item.id
        )
    );

  }


  /* =======================================================
     VERIFY SINGLE RESULT
  ======================================================= */

  async function verifyResult(
    id
  ) {

    const item =
      results.find(
        (result) =>
          result.id === id
      );


    if (!item) return;


    if (
      item.publishStatus ===
      "LOCKED"
    ) {

      showMessage(
        "Locked results cannot be verified.",
        "error"
      );

      return;

    }


    try {

      setProcessing(true);

      await updateDoc(
        doc(
          db,
          "results",
          id
        ),
        {
          publishStatus:
            "VERIFIED",

          verified: true,

          verifiedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );


      await loadResults();

      showMessage(
        "Result verified successfully."
      );

    }

    catch (error) {

      console.error(
        "Verify Error:",
        error
      );

      showMessage(
        "Verification failed.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     PUBLISH SINGLE RESULT
  ======================================================= */

  async function publishResult(
    id
  ) {

    const item =
      results.find(
        (result) =>
          result.id === id
      );


    if (!item) return;


    if (
      item.publishStatus ===
      "LOCKED"
    ) {

      showMessage(
        "Locked result cannot be published again.",
        "error"
      );

      return;

    }


    if (
      item.publishStatus ===
      "PUBLISHED"
    ) {

      showMessage(
        "This result is already published.",
        "info"
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Publish result for ${
          item.studentName ||
          "this student"
        }?`
      );


    if (!confirmed) return;


    try {

      setProcessing(true);


      await updateDoc(
        doc(
          db,
          "results",
          id
        ),
        {
          publishStatus:
            "PUBLISHED",

          published: true,

          publishedAt:
            serverTimestamp(),

          publishedBy:
            "Admin",

          updatedAt:
            serverTimestamp(),
        }
      );


      await loadResults();

      showMessage(
        "Result published successfully."
      );

    }

    catch (error) {

      console.error(
        "Publish Error:",
        error
      );

      showMessage(
        "Publish failed.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     LOCK SINGLE RESULT
  ======================================================= */

  async function lockResult(
    id
  ) {

    const item =
      results.find(
        (result) =>
          result.id === id
      );


    if (!item) return;


    if (
      item.publishStatus !==
      "PUBLISHED"
    ) {

      showMessage(
        "Only published results can be locked.",
        "error"
      );

      return;

    }


    const confirmed =
      window.confirm(
        "Lock this published result? Locked results cannot be modified from this module."
      );


    if (!confirmed) return;


    try {

      setProcessing(true);


      await updateDoc(
        doc(
          db,
          "results",
          id
        ),
        {
          publishStatus:
            "LOCKED",

          locked: true,

          lockedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );


      await loadResults();

      showMessage(
        "Result locked successfully."
      );

    }

    catch (error) {

      console.error(
        "Lock Error:",
        error
      );

      showMessage(
        "Unable to lock result.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     DELETE SINGLE RESULT
     Only DRAFT is deletable
  ======================================================= */

  async function deleteResult(
    id
  ) {

    const item =
      results.find(
        (result) =>
          result.id === id
      );


    if (!item) return;


    if (
      item.publishStatus !==
      "DRAFT"
    ) {

      showMessage(
        "Only draft results can be deleted. Published/verified/locked results are protected.",
        "error"
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Delete draft result for ${
          item.studentName ||
          "this student"
        } permanently?`
      );


    if (!confirmed) return;


    try {

      setProcessing(true);


      await deleteDoc(
        doc(
          db,
          "results",
          id
        )
      );


      await loadResults();

      showMessage(
        "Draft result deleted."
      );

    }

    catch (error) {

      console.error(
        "Delete Error:",
        error
      );

      showMessage(
        "Delete failed.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     BULK VERIFY
  ======================================================= */

  async function bulkVerify() {

    const selected =
      getSelectedResults();


    if (
      selected.length === 0
    ) {

      showMessage(
        "Select at least one result.",
        "error"
      );

      return;

    }


    const eligible =
      selected.filter(
        (item) =>
          item.publishStatus !==
          "LOCKED"
      );


    if (
      eligible.length === 0
    ) {

      showMessage(
        "No eligible results selected.",
        "error"
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Verify ${eligible.length} selected result(s)?`
      );


    if (!confirmed) return;


    try {

      setProcessing(true);

      await runBatchUpdate(
        eligible,
        (batch, item) => {

          batch.update(
            doc(
              db,
              "results",
              item.id
            ),
            {
              publishStatus:
                "VERIFIED",

              verified: true,

              verifiedAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            }
          );

        }
      );


      setSelectedRows([]);

      await loadResults();

      showMessage(
        `${eligible.length} result(s) verified successfully.`
      );

    }

    catch (error) {

      console.error(
        "Bulk Verify Error:",
        error
      );

      showMessage(
        "Bulk verification failed.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     BULK PUBLISH
  ======================================================= */

  async function bulkPublish() {

    const selected =
      getSelectedResults();


    if (
      selected.length === 0
    ) {

      showMessage(
        "Select at least one result.",
        "error"
      );

      return;

    }


    const eligible =
      selected.filter(
        (item) =>
          item.publishStatus !==
          "PUBLISHED" &&
          item.publishStatus !==
          "LOCKED"
      );


    if (
      eligible.length === 0
    ) {

      showMessage(
        "No unpublished eligible results selected.",
        "error"
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Publish ${eligible.length} selected result(s)? Students will be able to view published results.`
      );


    if (!confirmed) return;


    try {

      setProcessing(true);


      await runBatchUpdate(
        eligible,
        (batch, item) => {

          batch.update(
            doc(
              db,
              "results",
              item.id
            ),
            {
              publishStatus:
                "PUBLISHED",

              published: true,

              publishedAt:
                serverTimestamp(),

              publishedBy:
                "Admin",

              updatedAt:
                serverTimestamp(),
            }
          );

        }
      );


      setSelectedRows([]);

      await loadResults();

      showMessage(
        `${eligible.length} result(s) published successfully.`
      );

    }

    catch (error) {

      console.error(
        "Bulk Publish Error:",
        error
      );

      showMessage(
        "Bulk publishing failed.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     BULK LOCK
  ======================================================= */

  async function bulkLock() {

    const selected =
      getSelectedResults();


    if (
      selected.length === 0
    ) {

      showMessage(
        "Select at least one result.",
        "error"
      );

      return;

    }


    const eligible =
      selected.filter(
        (item) =>
          item.publishStatus ===
          "PUBLISHED"
      );


    if (
      eligible.length === 0
    ) {

      showMessage(
        "Only published results can be locked.",
        "error"
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Lock ${eligible.length} published result(s)?`
      );


    if (!confirmed) return;


    try {

      setProcessing(true);


      await runBatchUpdate(
        eligible,
        (batch, item) => {

          batch.update(
            doc(
              db,
              "results",
              item.id
            ),
            {
              publishStatus:
                "LOCKED",

              locked: true,

              lockedAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            }
          );

        }
      );


      setSelectedRows([]);

      await loadResults();

      showMessage(
        `${eligible.length} result(s) locked successfully.`
      );

    }

    catch (error) {

      console.error(
        "Bulk Lock Error:",
        error
      );

      showMessage(
        "Bulk lock failed.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     BULK DELETE
     ONLY DRAFTS
  ======================================================= */

  async function bulkDelete() {

    const selected =
      getSelectedResults();


    if (
      selected.length === 0
    ) {

      showMessage(
        "Select at least one result.",
        "error"
      );

      return;

    }


    const drafts =
      selected.filter(
        (item) =>
          item.publishStatus ===
          "DRAFT"
      );


    if (
      drafts.length === 0
    ) {

      showMessage(
        "Only draft results can be deleted.",
        "error"
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Permanently delete ${drafts.length} draft result(s)?`
      );


    if (!confirmed) return;


    try {

      setProcessing(true);


      await runBatchDelete(
        drafts
      );


      setSelectedRows([]);

      await loadResults();

      showMessage(
        `${drafts.length} draft result(s) deleted.`
      );

    }

    catch (error) {

      console.error(
        "Bulk Delete Error:",
        error
      );

      showMessage(
        "Bulk delete failed.",
        "error"
      );

    }

    finally {

      setProcessing(false);

    }

  }


  /* =======================================================
     BATCH UPDATE HELPER
     Firestore batch limit handled safely
  ======================================================= */

  async function runBatchUpdate(
    items,
    updater
  ) {

    const CHUNK_SIZE = 450;

    for (
      let start = 0;
      start < items.length;
      start += CHUNK_SIZE
    ) {

      const chunk =
        items.slice(
          start,
          start + CHUNK_SIZE
        );

      const batch =
        writeBatch(db);

      chunk.forEach(
        (item) => {
          updater(
            batch,
            item
          );
        }
      );

      await batch.commit();

    }

  }


  /* =======================================================
     BATCH DELETE HELPER
  ======================================================= */

  async function runBatchDelete(
    items
  ) {

    const CHUNK_SIZE = 450;

    for (
      let start = 0;
      start < items.length;
      start += CHUNK_SIZE
    ) {

      const chunk =
        items.slice(
          start,
          start + CHUNK_SIZE
        );

      const batch =
        writeBatch(db);

      chunk.forEach(
        (item) => {

          batch.delete(
            doc(
              db,
              "results",
              item.id
            )
          );

        }
      );

      await batch.commit();

    }

  }


  /* =======================================================
     EXCEL EXPORT
  ======================================================= */

  function exportExcel() {

    if (
      filteredResults.length ===
      0
    ) {

      showMessage(
        "There are no results to export.",
        "error"
      );

      return;

    }


    try {

      /* -----------------------------------------------
         Prepare clean Excel data
      ------------------------------------------------ */

      const excelData =
        filteredResults.map(
          (item, index) => ({

            "S.No.":
              index + 1,

            "Student Name":
              item.studentName ||
              "",

            "Enrollment Number":
              item.enrollmentNo ||
              "",

            "Mobile":
              item.mobile ||
              "",

            "Class":
              item.className ||
              "",

            "Section":
              item.section ||
              "",

            "Academic Session":
              item.session ||
              "",

            "Examination":
              item.examName ||
              "",

            "Obtained Marks":
              Number(
                item.obtainedMarks || 0
              ),

            "Maximum Marks":
              Number(
                item.maximumMarks || 0
              ),

            "Percentage":
              Number(
                item.percentage || 0
              ),

            "Grade":
              item.grade ||
              "",

            "Division":
              item.division ||
              "",

            "Rank":
              item.rank ??
              "",

            "Result Status":
              item.status ||
              "",

            "Publish Status":
              item.publishStatus ||
              "",

          })
        );


      /* -----------------------------------------------
         Worksheet
      ------------------------------------------------ */

      const worksheet =
        XLSX.utils.json_to_sheet(
          excelData
        );


      /* -----------------------------------------------
         Column widths
      ------------------------------------------------ */

      worksheet["!cols"] = [

        { wch: 7 },
        { wch: 24 },
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 18 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 10 },
        { wch: 14 },
        { wch: 10 },
        { wch: 16 },
        { wch: 18 },

      ];


      /* -----------------------------------------------
         Freeze first row
      ------------------------------------------------ */

      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1,
      };


      /* -----------------------------------------------
         Workbook
      ------------------------------------------------ */

      const workbook =
        XLSX.utils.book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Results"
      );


      /* -----------------------------------------------
         Filename
      ------------------------------------------------ */

      const safeSession =
        cleanFilenamePart(
          sessionFilter
        );

      const safeExam =
        cleanFilenamePart(
          examFilter
        );

      const safeClass =
        cleanFilenamePart(
          classFilter
        );


      const filename =
        `XYZ_School_Results_${safeSession}_${safeExam}_${safeClass}_${getDateString()}.xlsx`;


      /* -----------------------------------------------
         Download
      ------------------------------------------------ */

      XLSX.writeFile(
        workbook,
        filename
      );


      showMessage(
        `${filteredResults.length} result(s) exported to Excel.`
      );

    }

    catch (error) {

      console.error(
        "Excel Export Error:",
        error
      );

      showMessage(
        "Excel export failed.",
        "error"
      );

    }

  }


  /* =======================================================
     PRINT
  ======================================================= */

  function printResults() {

    if (
      filteredResults.length ===
      0
    ) {

      showMessage(
        "No results available for printing.",
        "error"
      );

      return;

    }

    window.print();

  }


  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearFilters() {

    setSearch("");
    setClassFilter("All");
    setSectionFilter("All");
    setSessionFilter("All");
    setExamFilter("All");
    setStatusFilter("All");
    setSelectedRows([]);

  }


  /* =======================================================
     PREVIEW
  ======================================================= */

  function openPreview(
    item
  ) {

    setPreviewResult(
      item
    );

  }


  function closePreview() {

    setPreviewResult(
      null
    );

  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <AdminLayout>

      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[10px] font-extrabold text-green-700">

              <ShieldCheck
                size={13}
              />

              RESULT CONTROL CENTER

            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900">

              Publish Results

            </h1>

            <p className="mt-1 text-sm text-slate-500">

              Verify, publish, lock and export student results.

            </p>

          </div>


          <button

            type="button"

            onClick={
              loadResults
            }

            disabled={
              loading ||
              processing
            }

            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"

          >

            <RefreshCcw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh

          </button>

        </div>


        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (

          <div
            className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 ${
              messageType ===
              "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : messageType ===
                  "info"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >

            <CheckCircle2
              size={18}
            />

            <p className="text-sm font-bold">
              {message}
            </p>

          </div>

        )}


        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">

          <StatCard
            title="Total Results"
            value={
              statistics.total
            }
            icon={
              <Users
                size={19}
              />
            }
            color="green"
          />

          <StatCard
            title="Published"
            value={
              statistics.published
            }
            icon={
              <Send
                size={19}
              />
            }
            color="blue"
          />

          <StatCard
            title="Verified"
            value={
              statistics.verified
            }
            icon={
              <FileCheck2
                size={19}
              />
            }
            color="purple"
          />

          <StatCard
            title="Locked"
            value={
              statistics.locked
            }
            icon={
              <Lock
                size={19}
              />
            }
            color="red"
          />

          <StatCard
            title="Draft"
            value={
              statistics.draft
            }
            icon={
              <Clock3
                size={19}
              />
            }
            color="yellow"
          />

        </div>


        {/* =================================================
            ANALYTICS STRIP
        ================================================= */}

        <div className="mb-6 grid gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700">

                <BarChart3
                  size={21}
                />

              </div>

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">

                  Overall Average

                </p>

                <p className="text-2xl font-black text-blue-800">

                  {statistics.average}%

                </p>

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-700">

                🏆

              </div>

              <div className="min-w-0">

                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">

                  Top Performer

                </p>

                <p className="truncate text-sm font-black text-amber-900">

                  {
                    statistics.topper
                      ?.studentName ||
                    "No data"
                  }

                </p>

                {statistics.topper && (

                  <p className="text-[10px] font-bold text-amber-700">

                    {
                      statistics.topper
                        .percentage
                    }%

                  </p>

                )}

              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            FILTER PANEL
        ================================================= */}

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700">

                  <Search
                    size={17}
                  />

                </div>

                <h2 className="text-lg font-extrabold text-slate-900">

                  Find Results

                </h2>

              </div>

              <p className="mt-1 text-xs text-slate-500">

                Filter the result list before managing or exporting.

              </p>

            </div>


            <button

              type="button"

              onClick={
                clearFilters
              }

              className="text-xs font-bold text-slate-500 hover:text-green-700"

            >

              Clear Filters

            </button>

          </div>


          <div className="grid gap-3 lg:grid-cols-6">

            {/* SEARCH */}

            <div className="relative lg:col-span-2">

              <Search
                size={17}
                className="absolute left-4 top-3.5 text-slate-400"
              />

              <input

                type="text"

                value={search}

                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }

                placeholder="Search name, enrollment, mobile..."

                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"

              />

            </div>


            <FilterSelect
              value={
                classFilter
              }
              onChange={
                setClassFilter
              }
              options={
                classes
              }
              placeholder="Class"
            />


            <FilterSelect
              value={
                sectionFilter
              }
              onChange={
                setSectionFilter
              }
              options={
                sections
              }
              placeholder="Section"
            />


            <FilterSelect
              value={
                sessionFilter
              }
              onChange={
                setSessionFilter
              }
              options={
                sessions
              }
              placeholder="Session"
            />


            <FilterSelect
              value={
                examFilter
              }
              onChange={
                setExamFilter
              }
              options={
                exams
              }
              placeholder="Exam"
            />

          </div>


          {/* STATUS FILTER */}

          <div className="mt-4 flex flex-wrap gap-2">

            <StatusFilterButton
              label="All"
              value="All"
              current={
                statusFilter
              }
              onClick={
                setStatusFilter
              }
            />

            <StatusFilterButton
              label="Draft"
              value="DRAFT"
              current={
                statusFilter
              }
              onClick={
                setStatusFilter
              }
            />

            <StatusFilterButton
              label="Verified"
              value="VERIFIED"
              current={
                statusFilter
              }
              onClick={
                setStatusFilter
              }
            />

            <StatusFilterButton
              label="Published"
              value="PUBLISHED"
              current={
                statusFilter
              }
              onClick={
                setStatusFilter
              }
            />

            <StatusFilterButton
              label="Locked"
              value="LOCKED"
              current={
                statusFilter
              }
              onClick={
                setStatusFilter
              }
            />

          </div>

        </section>


        {/* =================================================
            ACTION BAR
        ================================================= */}

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>

              <p className="text-xs font-bold text-slate-500">

                Showing

                <span className="mx-1 font-black text-slate-900">

                  {
                    filteredResults.length
                  }

                </span>

                of

                <span className="mx-1 font-black text-slate-900">

                  {
                    results.length
                  }

                </span>

                results

              </p>

              {selectedRows.length >
                0 && (

                <p className="mt-1 text-xs font-bold text-green-700">

                  {selectedRows.length} selected

                </p>

              )}

            </div>


            <div className="flex flex-wrap gap-2">

              <ActionButton
                onClick={
                  bulkVerify
                }
                disabled={
                  processing ||
                  selectedRows.length ===
                    0
                }
                icon={
                  <CheckCircle2
                    size={16}
                  />
                }
                label="Verify"
                className="bg-cyan-600 hover:bg-cyan-700"
              />


              <ActionButton
                onClick={
                  bulkPublish
                }
                disabled={
                  processing ||
                  selectedRows.length ===
                    0
                }
                icon={
                  <Send
                    size={16}
                  />
                }
                label="Publish"
                className="bg-blue-700 hover:bg-blue-800"
              />


              <ActionButton
                onClick={
                  bulkLock
                }
                disabled={
                  processing ||
                  selectedRows.length ===
                    0
                }
                icon={
                  <Lock
                    size={16}
                  />
                }
                label="Lock"
                className="bg-red-600 hover:bg-red-700"
              />


              <ActionButton
                onClick={
                  bulkDelete
                }
                disabled={
                  processing ||
                  selectedRows.length ===
                    0
                }
                icon={
                  <Trash2
                    size={16}
                  />
                }
                label="Delete Draft"
                className="bg-slate-800 hover:bg-black"
              />


              {/* EXCEL */}

              <ActionButton
                onClick={
                  exportExcel
                }
                disabled={
                  processing ||
                  filteredResults.length ===
                    0
                }
                icon={
                  <FileSpreadsheet
                    size={16}
                  />
                }
                label="Excel"
                className="bg-purple-700 hover:bg-purple-800"
              />


              {/* PRINT */}

              <ActionButton
                onClick={
                  printResults
                }
                disabled={
                  processing ||
                  filteredResults.length ===
                    0
                }
                icon={
                  <Printer
                    size={16}
                  />
                }
                label="Print"
                className="bg-orange-600 hover:bg-orange-700"
              />

            </div>

          </div>

        </section>


        {/* =================================================
            RESULTS TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="min-w-[1100px] w-full">

              <thead className="bg-slate-900 text-white">

                <tr>

                  <th className="px-4 py-4 text-center">

                    <input

                      type="checkbox"

                      checked={
                        filteredResults.length >
                          0 &&
                        selectedRows.length ===
                          filteredResults.filter(
                            (item) =>
                              item.publishStatus !==
                              "LOCKED"
                          ).length
                      }

                      onChange={
                        selectAllRows
                      }

                      className="h-4 w-4 accent-green-600"

                    />

                  </th>

                  <th className="px-4 py-4 text-left text-xs">
                    Student
                  </th>

                  <th className="px-4 py-4 text-left text-xs">
                    Enrollment
                  </th>

                  <th className="px-4 py-4 text-center text-xs">
                    Class
                  </th>

                  <th className="px-4 py-4 text-center text-xs">
                    Percentage
                  </th>

                  <th className="px-4 py-4 text-center text-xs">
                    Grade
                  </th>

                  <th className="px-4 py-4 text-center text-xs">
                    Rank
                  </th>

                  <th className="px-4 py-4 text-center text-xs">
                    Status
                  </th>

                  <th className="px-4 py-4 text-center text-xs">
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <LoadingRows />

                ) : filteredResults.length ===
                  0 ? (

                  <EmptyState />

                ) : (

                  filteredResults.map(
                    (item) => (

                      <ResultRow
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        selected={
                          selectedRows.includes(
                            item.id
                          )
                        }
                        processing={
                          processing
                        }
                        onToggle={() =>
                          toggleRow(
                            item.id
                          )
                        }
                        onPreview={() =>
                          openPreview(
                            item
                          )
                        }
                        onVerify={() =>
                          verifyResult(
                            item.id
                          )
                        }
                        onPublish={() =>
                          publishResult(
                            item.id
                          )
                        }
                        onLock={() =>
                          lockResult(
                            item.id
                          )
                        }
                        onDelete={() =>
                          deleteResult(
                            item.id
                          )
                        }
                      />

                    )
                  )

                )}

              </tbody>

            </table>

          </div>


          {/* TABLE FOOTER */}

          {!loading &&
            filteredResults.length >
              0 && (

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">

                <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">

                  <span>
                    Showing{" "}
                    <b>
                      {
                        filteredResults.length
                      }
                    </b>{" "}
                    result(s)
                  </span>

                  <span className="font-semibold">
                    Export uses the currently filtered results.
                  </span>

                </div>

              </div>

            )}

        </section>

      </div>


      {/* =================================================
          PREVIEW MODAL
      ================================================= */}

      {previewResult && (

        <ResultPreviewModal

          result={
            previewResult
          }

          onClose={
            closePreview
          }

        />

      )}

    </AdminLayout>

  );

}


/* =========================================================
   RESULT ROW
========================================================= */

function ResultRow({
  item,
  selected,
  processing,
  onToggle,
  onPreview,
  onVerify,
  onPublish,
  onLock,
  onDelete,
}) {

  const status =
    item.publishStatus ||
    "DRAFT";


  const percentage =
    Number(
      item.percentage || 0
    );


  return (

    <tr
      className={`border-b border-slate-100 transition ${
        selected
          ? "bg-green-50"
          : "hover:bg-slate-50"
      }`}
    >

      {/* SELECT */}

      <td className="px-4 py-4 text-center">

        <input

          type="checkbox"

          checked={
            selected
          }

          disabled={
            status ===
            "LOCKED"
          }

          onChange={
            onToggle
          }

          className="h-4 w-4 accent-green-600"

        />

      </td>


      {/* STUDENT */}

      <td className="px-4 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-xs font-black text-green-700">

            {getInitials(
              item.studentName
            )}

          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-extrabold text-slate-800">

              {
                item.studentName ||
                "Unknown Student"
              }

            </p>

            <p className="text-[10px] text-slate-400">

              {
                item.section
                  ? `Section ${item.section}`
                  : "Section -"
              }

            </p>

          </div>

        </div>

      </td>


      {/* ENROLLMENT */}

      <td className="px-4 py-4">

        <span className="font-mono text-xs font-bold text-slate-600">

          {
            item.enrollmentNo ||
            "-"
          }

        </span>

      </td>


      {/* CLASS */}

      <td className="px-4 py-4 text-center">

        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

          {
            item.className ||
            "-"
          }

        </span>

      </td>


      {/* PERCENTAGE */}

      <td className="px-4 py-4">

        <div className="min-w-[110px]">

          <div className="mb-1 flex items-center justify-between">

            <span className="text-xs font-extrabold text-slate-700">

              {
                percentage
              }%

            </span>

          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">

            <div
              className={`h-full rounded-full ${
                percentage >= 60
                  ? "bg-green-500"
                  : percentage >= 40
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{
                width:
                  `${Math.min(
                    Math.max(
                      percentage,
                      0
                    ),
                    100
                  )}%`,
              }}
            />

          </div>

        </div>

      </td>


      {/* GRADE */}

      <td className="px-4 py-4 text-center">

        <span className="font-bold text-slate-700">

          {
            item.grade ||
            "-"
          }

        </span>

      </td>


      {/* RANK */}

      <td className="px-4 py-4 text-center">

        <span className="font-bold text-slate-700">

          {
            item.rank ??
            "-"
          }

        </span>

      </td>


      {/* STATUS */}

      <td className="px-4 py-4 text-center">

        <StatusBadge
          status={
            status
          }
        />

      </td>


      {/* ACTIONS */}

      <td className="px-4 py-4">

        <div className="flex items-center justify-center gap-1">

          {/* PREVIEW */}

          <IconButton
            title="Preview result"
            onClick={
              onPreview
            }
            disabled={
              processing
            }
            icon={
              <Eye
                size={16}
              />
            }
            className="text-slate-600 hover:bg-slate-100"
          />


          {/* VERIFY */}

          {status !==
            "LOCKED" &&
            status !==
              "PUBLISHED" && (

              <IconButton
                title="Verify result"
                onClick={
                  onVerify
                }
                disabled={
                  processing
                }
                icon={
                  <CheckCircle2
                    size={16}
                  />
                }
                className="text-cyan-600 hover:bg-cyan-50"
              />

            )}


          {/* PUBLISH */}

          {status !==
            "PUBLISHED" &&
            status !==
              "LOCKED" && (

              <IconButton
                title="Publish result"
                onClick={
                  onPublish
                }
                disabled={
                  processing
                }
                icon={
                  <Send
                    size={16}
                  />
                }
                className="text-blue-600 hover:bg-blue-50"
              />

            )}


          {/* LOCK */}

          {status ===
            "PUBLISHED" && (

            <IconButton
              title="Lock published result"
              onClick={
                onLock
              }
              disabled={
                processing
              }
              icon={
                <Lock
                  size={16}
                />
              }
              className="text-red-600 hover:bg-red-50"
            />

          )}


          {/* DELETE */}

          {status ===
            "DRAFT" && (

            <IconButton
              title="Delete draft"
              onClick={
                onDelete
              }
              disabled={
                processing
              }
              icon={
                <Trash2
                  size={16}
                />
              }
              className="text-red-600 hover:bg-red-50"
            />

          )}

        </div>

      </td>

    </tr>

  );

}


/* =========================================================
   RESULT PREVIEW MODAL
========================================================= */

function ResultPreviewModal({
  result,
  onClose,
}) {

  if (!result) return null;


  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 p-5">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">
              Result Preview
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">

              {
                result.studentName ||
                "Student Result"
              }

            </h2>

          </div>


          <button

            type="button"

            onClick={
              onClose
            }

            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"

          >

            <X
              size={20}
            />

          </button>

        </div>


        {/* CONTENT */}

        <div className="space-y-5 p-5 sm:p-6">

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <PreviewItem
              label="Enrollment"
              value={
                result.enrollmentNo ||
                "-"
              }
            />

            <PreviewItem
              label="Class"
              value={
                result.className ||
                "-"
              }
            />

            <PreviewItem
              label="Section"
              value={
                result.section ||
                "-"
              }
            />

            <PreviewItem
              label="Session"
              value={
                result.session ||
                "-"
              }
            />

          </div>


          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">

              <PreviewStat
                label="Obtained"
                value={
                  result.obtainedMarks ??
                  0
                }
              />

              <PreviewStat
                label="Maximum"
                value={
                  result.maximumMarks ??
                  0
                }
              />

              <PreviewStat
                label="Percentage"
                value={`${Number(
                  result.percentage ||
                    0
                ).toFixed(2)}%`}
              />

              <PreviewStat
                label="Grade"
                value={
                  result.grade ||
                  "-"
                }
              />

            </div>

          </div>


          <div className="flex flex-wrap gap-3">

            <StatusBadge
              status={
                result.publishStatus
              }
            />

            {result.status && (
              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
                  result.status ===
                  "PASS"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                Result:{" "}
                {
                  result.status
                }
              </span>
            )}

          </div>


          {result.failedSubjects?.length >
            0 && (

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">

              <p className="text-xs font-extrabold text-red-700">

                Failed Subjects

              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                {result.failedSubjects.map(
                  (
                    subject,
                    index
                  ) => (

                    <span
                      key={
                        subject.subjectCode ||
                        index
                      }
                      className="rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white"
                    >

                      {
                        subject.subjectName ||
                        "Subject"
                      }

                    </span>

                  )
                )}

              </div>

            </div>

          )}

        </div>


        {/* FOOTER */}

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-5">

          <button

            type="button"

            onClick={
              onClose
            }

            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-black"

          >

            Close

          </button>

        </div>

      </div>

    </div>

  );

}


/* =========================================================
   PREVIEW ITEM
========================================================= */

function PreviewItem({
  label,
  value,
}) {

  return (

    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">

        {label}

      </p>

      <p className="mt-1 truncate text-sm font-extrabold text-slate-800">

        {value}

      </p>

    </div>

  );

}


/* =========================================================
   PREVIEW STAT
========================================================= */

function PreviewStat({
  label,
  value,
}) {

  return (

    <div>

      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">

        {label}

      </p>

      <p className="mt-1 text-xl font-black text-slate-800">

        {value}

      </p>

    </div>

  );

}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {

  const config = {

    DRAFT: {
      label: "Draft",
      className:
        "bg-yellow-100 text-yellow-700",
    },

    VERIFIED: {
      label: "Verified",
      className:
        "bg-cyan-100 text-cyan-700",
    },

    PUBLISHED: {
      label: "Published",
      className:
        "bg-green-100 text-green-700",
    },

    LOCKED: {
      label: "Locked",
      className:
        "bg-red-100 text-red-700",
    },

  };


  const current =
    config[status] ||
    config.DRAFT;


  return (

    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${current.className}`}
    >

      {status ===
        "LOCKED"
        ? "🔒"
        : status ===
          "PUBLISHED"
        ? "✓"
        : status ===
          "VERIFIED"
        ? "✓"
        : "○"}

      {
        current.label
      }

    </span>

  );

}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  icon,
  color,
}) {

  const colors = {

    green:
      "border-green-100 bg-green-50 text-green-700",

    blue:
      "border-blue-100 bg-blue-50 text-blue-700",

    purple:
      "border-purple-100 bg-purple-50 text-purple-700",

    red:
      "border-red-100 bg-red-50 text-red-700",

    yellow:
      "border-yellow-100 bg-yellow-50 text-yellow-700",

  };


  return (

    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        colors[color] ||
        colors.green
      }`}
    >

      <div className="flex items-center justify-between">

        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">

          {title}

        </p>

        <span className="opacity-80">

          {icon}

        </span>

      </div>

      <h2 className="mt-3 text-3xl font-black">

        {value}

      </h2>

    </div>

  );

}


/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}) {

  return (

    <select

      value={
        value
      }

      onChange={(e) =>
        onChange(
          e.target.value
        )
      }

      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"

      aria-label={
        placeholder
      }

    >

      {options.map(
        (option) => (

          <option
            key={
              option
            }
            value={
              option
            }
          >

            {option ===
            "All"
              ? `All ${placeholder}`
              : option}

          </option>

        )
      )}

    </select>

  );

}


/* =========================================================
   STATUS FILTER BUTTON
========================================================= */

function StatusFilterButton({
  label,
  value,
  current,
  onClick,
}) {

  const active =
    current ===
    value;


  return (

    <button

      type="button"

      onClick={() =>
        onClick(
          value
        )
      }

      className={`rounded-full border px-4 py-2 text-[10px] font-extrabold transition ${
        active
          ? "border-green-700 bg-green-700 text-white"
          : "border-slate-200 bg-white text-slate-500 hover:border-green-300 hover:text-green-700"
      }`}

    >

      {label}

    </button>

  );

}


/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  className,
}) {

  return (

    <button

      type="button"

      onClick={
        onClick
      }

      disabled={
        disabled
      }

      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${className}`}

    >

      {icon}

      {label}

    </button>

  );

}


/* =========================================================
   ICON BUTTON
========================================================= */

function IconButton({
  title,
  onClick,
  disabled,
  icon,
  className,
}) {

  return (

    <button

      type="button"

      title={
        title
      }

      aria-label={
        title
      }

      onClick={
        onClick
      }

      disabled={
        disabled
      }

      className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-30 ${className}`}

    >

      {icon}

    </button>

  );

}


/* =========================================================
   LOADING ROWS
========================================================= */

function LoadingRows() {

  return (

    <>

      {Array.from({
        length: 6,
      }).map(
        (_, index) => (

          <tr
            key={
              index
            }
            className="border-b border-slate-100"
          >

            {Array.from({
              length: 9,
            }).map(
              (
                __,
                column
              ) => (

                <td
                  key={
                    column
                  }
                  className="px-4 py-5"
                >

                  <div className="h-4 animate-pulse rounded bg-slate-100" />

                </td>

              )
            )}

          </tr>

        )
      )}

    </>

  );

}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {

  return (

    <tr>

      <td
        colSpan="9"
        className="p-14 text-center"
      >

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

          <FileCheck2
            size={28}
          />

        </div>

        <h3 className="mt-4 text-lg font-extrabold text-slate-800">

          No Results Found

        </h3>

        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">

          No result matches the current search or filters.

          Try clearing the filters or creating a result first.

        </p>

      </td>

    </tr>

  );

}


/* =========================================================
   HELPERS
========================================================= */

function uniqueOptions(
  values
) {

  const clean =
    values
      .filter(
        (value) =>
          value !==
            undefined &&
          value !==
            null &&
          String(
            value
          ).trim() !==
            ""
      )
      .map(
        (value) =>
          String(value)
      );


  return [
    "All",
    ...[
      ...new Set(
        clean
      ),
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          undefined,
          {
            numeric: true,
          }
        )
    ),
  ];

}


function getInitials(
  name
) {

  if (!name) {
    return "ST";
  }


  return name
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();

}


function cleanFilenamePart(
  value
) {

  if (
    !value ||
    value === "All"
  ) {

    return "All";

  }


  return String(
    value
  )
    .replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    );

}


function getDateString() {

  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;

}


export default PublishResults;