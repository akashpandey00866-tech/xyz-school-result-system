import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  WalletCards,
  Save,
  RefreshCw,
  IndianRupee,
  GraduationCap,
  CheckCircle2,
  Search,
  Sparkles,
  Settings2,
  Info,
} from "lucide-react";

import AdminLayout from "../layouts/AdminLayout";
import FullScreenLoader from "../components/FullScreenLoader";
import { db } from "../config/firebase";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function compareClasses(a, b) {
  const aName = String(a?.name || "").trim();
  const bName = String(b?.name || "").trim();

  const aNumber = aName.match(/\d+/);
  const bNumber = bName.match(/\d+/);

  if (aNumber && bNumber) {
    const difference =
      Number(aNumber[0]) - Number(bNumber[0]);

    if (difference !== 0) return difference;
  }

  if (aNumber && !bNumber) return -1;
  if (!aNumber && bNumber) return 1;

  return aName.localeCompare(
    bName,
    undefined,
    { numeric: true, sensitivity: "base" }
  );
}

function money(value) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

function StudentFee() {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fees, setFees] = useState({});
  const [selectedSessionId, setSelectedSessionId] =
    useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* =========================================================
     LOAD ACADEMIC CLASSES
  ========================================================= */

  useEffect(() => {
    loadAcademicData();
  }, []);

  async function loadAcademicData() {
    try {
      setLoading(true);
      setError("");

      const [
        sessionSnap,
        classSnap,
      ] = await Promise.all([
        getDocs(collection(db, "academicSessions")),
        getDocs(collection(db, "classes")),
      ]);

      const sessionData = sessionSnap.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      const classData = classSnap.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      setSessions(sessionData);

      const active =
        sessionData.find(
          (item) => item.active === true
        ) ||
        sessionData[
          sessionData.length - 1
        ];

      setSelectedSessionId(
        active?.id || ""
      );

      setClasses(classData);
    } catch (err) {
      console.error(
        "Student fee academic data error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load academic classes."
      );
    }
  }

  /* =========================================================
     REAL-TIME FEE SETTINGS
  ========================================================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "feeSettings"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setFees(
            data.classFees || {}
          );
        } else {
          setFees({});
        }

        setLoading(false);
      },
      (err) => {
        console.error(
          "Fee settings listener error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load fee settings."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================================
     SESSION CLASSES
  ========================================================= */

  const selectedSession = sessions.find(
    (session) =>
      session.id === selectedSessionId
  );

  const sessionClasses = useMemo(() => {
    return classes
      .filter(
        (item) =>
          !item.sessionId ||
          item.sessionId === selectedSessionId
      )
      .sort(compareClasses);
  }, [
    classes,
    selectedSessionId,
  ]);

  const filteredClasses = useMemo(() => {
    const query = normalize(search);

    if (!query) {
      return sessionClasses;
    }

    return sessionClasses.filter(
      (item) =>
        normalize(item.name).includes(query) ||
        normalize(item.id).includes(query)
    );
  }, [
    sessionClasses,
    search,
  ]);

  /* =========================================================
     UPDATE FEE
  ========================================================= */

  function changeFee(classId, value) {
    const numericValue =
      value === ""
        ? ""
        : Math.max(
            0,
            Number(value)
          );

    setFees((previous) => ({
      ...previous,
      [classId]: numericValue,
    }));
  }

  /* =========================================================
     SAVE
  ========================================================= */

  async function saveFees() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const activeFees = {};

      Object.entries(fees).forEach(
        ([classId, amount]) => {
          activeFees[classId] =
            Number(amount || 0);
        }
      );

      const legacyFields = {};

      /*
        Keep compatibility with the existing
        class1/class2/... fee system.
      */

      sessionClasses.forEach(
        (classItem) => {
          const match =
            String(
              classItem.name || ""
            ).match(/\d+/);

          if (match) {
            legacyFields[
              `class${match[0]}`
            ] =
              Number(
                activeFees[
                  classItem.id
                ] || 0
              );
          }
        }
      );

      await setDoc(
        doc(
          db,
          "settings",
          "feeSettings"
        ),
        {
          classFees: activeFees,
          ...legacyFields,

          session:
            selectedSession?.name ||
            "Current Session",

          updatedBy: "Admin",

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setMessage(
        "Fee structure saved successfully."
      );

      window.setTimeout(
        () => setMessage(""),
        3500
      );
    } catch (err) {
      console.error(
        "Student fee save error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save fee structure."
      );
    } finally {
      setSaving(false);
    }
  }

  const totalConfiguredFee =
    filteredClasses.reduce(
      (sum, item) =>
        sum +
        Number(
          fees[item.id] || 0
        ),
      0
    );

  if (loading) {
    return (
      <FullScreenLoader
        message="Loading academic fee structure..."
      />
    );
  }

  return (
    <AdminLayout>

      <div className="max-w-[1450px] mx-auto p-4 sm:p-6 lg:p-8">

        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-950 via-green-800 to-emerald-600 text-white shadow-xl">

          <div className="absolute -right-24 -top-28 w-96 h-96 rounded-full bg-white/10 blur-3xl" />

          <div className="relative p-6 sm:p-8">

            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

              <div className="flex items-start gap-4">

                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <WalletCards size={28} />
                </div>

                <div>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold">
                    <Sparkles size={13} />
                    Dynamic Fee Control
                  </span>

                  <h1 className="text-3xl sm:text-4xl font-black mt-3">
                    Student Fee Setup
                  </h1>

                  <p className="text-emerald-100 mt-2 max-w-2xl">
                    Configure annual fees class-wise.
                    Numeric classes and custom classes such
                    as LKG, UKG, Nursery or Pre-Nursery are
                    supported automatically.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={loadAcademicData}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-green-800 font-bold hover:bg-emerald-50"
              >
                <RefreshCw size={18} />
                Refresh Classes
              </button>

            </div>

          </div>

        </section>

        {/* =====================================================
            SESSION + SUMMARY
        ====================================================== */}

        <section className="grid lg:grid-cols-[1fr_auto] gap-4 mt-6">

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">

            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
              <Settings2 size={15} />
              Academic Session
            </div>

            <select
              value={selectedSessionId}
              onChange={(event) =>
                setSelectedSessionId(
                  event.target.value
                )
              }
              className="mt-3 w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
            >
              <option value="">
                Select Session
              </option>

              {sessions.map(
                (session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {session.name}
                    {session.active
                      ? " • Active"
                      : ""}
                  </option>
                )
              )}
            </select>

          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 min-w-[240px]">

            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase">
              <IndianRupee size={15} />
              Configured Total
            </div>

            <p className="text-3xl font-black text-emerald-800 mt-2">
              {money(
                totalConfiguredFee
              )}
            </p>

            <p className="text-xs text-emerald-700 mt-1">
              Based on visible class entries
            </p>

          </div>

        </section>

        {/* =====================================================
            SEARCH
        ====================================================== */}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 mt-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <h2 className="text-xl font-black">
                Class Fee Structure
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Set the annual fee for every class.
              </p>
            </div>

            <div className="relative w-full md:max-w-md">

              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search class e.g. LKG, UKG, 4..."
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none"
              />

            </div>

          </div>

        </section>

        {/* =====================================================
            CLASS CARDS
        ====================================================== */}

        <section className="mt-6">

          {filteredClasses.length === 0 ? (

            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">

              <GraduationCap
                size={42}
                className="mx-auto text-slate-300"
              />

              <h2 className="text-xl font-black mt-4">
                No Classes Found
              </h2>

              <p className="text-sm text-slate-500 mt-2">
                Create the class first in Academic Setup.
              </p>

            </div>

          ) : (

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">

              {filteredClasses.map(
                (classItem) => {

                  const amount =
                    fees[
                      classItem.id
                    ] ?? "";

                  return (
                    <div
                      key={classItem.id}
                      className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-lg hover:border-green-200 transition"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-center gap-3">

                          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center">
                            <GraduationCap size={23} />
                          </div>

                          <div>

                            <h3 className="text-xl font-black text-slate-900">
                              {classItem.name}
                            </h3>

                            <p className="text-xs text-slate-500 mt-1">
                              {classItem.sections?.length
                                ? `${classItem.sections.length} section${classItem.sections.length > 1 ? "s" : ""}`
                                : "No sections"}
                            </p>

                          </div>

                        </div>

                        {Number(amount || 0) > 0 && (
                          <CheckCircle2
                            size={20}
                            className="text-green-600"
                          />
                        )}

                      </div>

                      <div className="mt-6">

                        <label className="text-sm font-bold text-slate-700">
                          Annual Fee
                        </label>

                        <div className="relative mt-2">

                          <IndianRupee
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600"
                          />

                          <input
                            type="number"
                            min="0"
                            value={amount}
                            onChange={(event) =>
                              changeFee(
                                classItem.id,
                                event.target.value
                              )
                            }
                            placeholder="Enter annual fee"
                            className="w-full h-14 pl-11 pr-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none text-lg font-black"
                          />

                        </div>

                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3">

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            Current setup
                          </span>

                          <b className="text-slate-800">
                            {money(amount)}
                          </b>
                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* =====================================================
            MESSAGE
        ====================================================== */}

        {(message || error) && (
          <div
            className={`mt-6 rounded-2xl p-4 border font-semibold ${
              error
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {error || message}
          </div>
        )}

        {/* =====================================================
            SAVE BAR
        ====================================================== */}

        <section className="sticky bottom-4 z-30 mt-8">

          <div className="bg-slate-950 text-white rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-start gap-3">

              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Info size={19} />
              </div>

              <div>
                <p className="font-black">
                  Ready to save fee structure?
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  {selectedSession?.name ||
                    "Select an academic session"}{" "}
                  • {filteredClasses.length} class
                  {filteredClasses.length !== 1
                    ? "es"
                    : ""}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={saveFees}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black hover:from-green-400 hover:to-emerald-400 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Fee Structure
                </>
              )}
            </button>

          </div>

        </section>

      </div>

    </AdminLayout>
  );
}

export default StudentFee;