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
  GraduationCap,
  IndianRupee,
  Save,
  RefreshCw,
  Search,
  CheckCircle2,
  Settings2,
  Info,
  Sparkles,
} from "lucide-react";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";
import FullScreenLoader from "../components/FullScreenLoader";


/* =========================================================
   HELPERS
========================================================= */

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function getFeeKey(className) {

  const value =
    String(className || "")
      .trim()
      .toLowerCase();

  const numberMatch =
    value.match(/\d+/);

  if (numberMatch) {
    return `class${numberMatch[0]}`;
  }

  return value
    .replace(/^class\s*/i, "")
    .replace(/[^a-z0-9]/g, "");
}


function compareClasses(a, b) {

  const aName =
    String(a?.name || "").trim();

  const bName =
    String(b?.name || "").trim();

  const specialOrder = {
    "pre nursery": 0,
    "pre-nursery": 0,
    "play group": 1,
    "playgroup": 1,
    nursery: 2,
    lkg: 3,
    ukg: 4,
  };

  const aNormalized =
    aName.toLowerCase();

  const bNormalized =
    bName.toLowerCase();

  const aSpecial =
    specialOrder[aNormalized];

  const bSpecial =
    specialOrder[bNormalized];

  if (
    aSpecial !== undefined &&
    bSpecial !== undefined
  ) {
    return aSpecial - bSpecial;
  }

  if (
    aSpecial !== undefined
  ) {
    return -1;
  }

  if (
    bSpecial !== undefined
  ) {
    return 1;
  }

  const aNumber =
    aName.match(/\d+/);

  const bNumber =
    bName.match(/\d+/);

  if (aNumber && bNumber) {

    const difference =
      Number(aNumber[0]) -
      Number(bNumber[0]);

    if (difference !== 0) {
      return difference;
    }
  }

  if (aNumber && !bNumber) {
    return -1;
  }

  if (!aNumber && bNumber) {
    return 1;
  }

  return aName.localeCompare(
    bName,
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    }
  );
}


function money(value) {

  return `₹ ${Number(
    value || 0
  ).toLocaleString("en-IN")}`;

}


/* =========================================================
   COMPONENT
========================================================= */

function FeeSettings() {

  const [classes, setClasses] =
    useState([]);

  const [fees, setFees] =
    useState({});

  const [session, setSession] =
    useState("");

  const [updatedBy, setUpdatedBy] =
    useState("Admin");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /* =======================================================
     LOAD CLASSES
  ======================================================= */

  async function loadClasses() {

    try {

      setLoading(true);
      setError("");

      const snapshot =
        await getDocs(
          collection(
            db,
            "classes"
          )
        );

      const list = [];

      snapshot.forEach(
        (classDoc) => {

          const data =
            classDoc.data();

          if (
            data.status === false
          ) {
            return;
          }

          const name =
            data.name ||
            data.className ||
            data.title ||
            "";

          if (!name) {
            return;
          }

          list.push({

            id: classDoc.id,

            name,

            sessionId:
              data.sessionId ||
              "",

            sessionName:
              data.sessionName ||
              "",

            sections:
              Array.isArray(
                data.sections
              )
                ? data.sections
                : [],

          });

        }
      );

      list.sort(
        compareClasses
      );

      setClasses(list);

    }

    catch (err) {

      console.error(
        "Class loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load classes."
      );

    }

    finally {

      setLoading(false);

    }

  }


  /* =======================================================
     LOAD FEE SETTINGS REALTIME
  ======================================================= */

  useEffect(() => {

    loadClasses();

    const unsubscribe =
      onSnapshot(
        doc(
          db,
          "settings",
          "feeSettings"
        ),

        (snapshot) => {

          if (
            snapshot.exists()
          ) {

            const data =
              snapshot.data();

            /* ---------------------------------------------
               NEW DYNAMIC STRUCTURE
            --------------------------------------------- */

            if (
              data.classFees &&
              typeof data.classFees ===
                "object"
            ) {

              setFees(
                data.classFees
              );

            }

            else {

              /* -------------------------------------------
                 OLD CLASS1-CLASS12 STRUCTURE
                 Convert it into dynamic structure later
              ------------------------------------------- */

              const oldFees = {};

              Object.keys(data)
                .filter(
                  (key) =>
                    key.startsWith(
                      "class"
                    )
                )
                .forEach(
                  (key) => {

                    oldFees[key] =
                      Number(
                        data[key] || 0
                      );

                  }
                );

              setFees(
                oldFees
              );

            }

            setSession(
              data.session ||
                ""
            );

            setUpdatedBy(
              data.updatedBy ||
                "Admin"
            );

          }

          else {

            setFees({});

          }

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

        }
      );

    return () =>
      unsubscribe();

  }, []);


  /* =======================================================
     FILTER CLASSES
  ======================================================= */

  const filteredClasses =
    useMemo(() => {

      const query =
        normalize(search);

      if (!query) {
        return classes;
      }

      return classes.filter(
        (item) =>
          normalize(
            item.name
          ).includes(query)
      );

    }, [
      classes,
      search,
    ]);


  /* =======================================================
     UPDATE FEE
  ======================================================= */

  function handleFeeChange(
    classId,
    value
  ) {

    const numericValue =
      value === ""
        ? ""
        : Math.max(
            0,
            Number(value)
          );

    setFees(
      (previous) => ({

        ...previous,

        [classId]:
          numericValue,

      })
    );

  }


  /* =======================================================
     TOTAL
  ======================================================= */

  const totalFee =
    useMemo(() => {

      return classes.reduce(
        (sum, classItem) => {

          return (
            sum +
            Number(
              fees[
                classItem.id
              ] || 0
            )
          );

        },
        0
      );

    }, [
      classes,
      fees,
    ]);


  const configuredCount =
    classes.filter(
      (item) =>
        Number(
          fees[item.id] || 0
        ) > 0
    ).length;


  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSave() {

    try {

      setSaving(true);
      setMessage("");
      setError("");

      const dynamicFees = {};

      classes.forEach(
        (classItem) => {

          dynamicFees[
            classItem.id
          ] =
            Number(
              fees[
                classItem.id
              ] || 0
            );

        }
      );


      /* ===================================================
         LEGACY COMPATIBILITY

         Existing AddStudent / old records may still
         understand class1, class2 etc.

         So we keep both structures.
      =================================================== */

      const legacyFees = {};

      classes.forEach(
        (classItem) => {

          const fee =
            Number(
              fees[
                classItem.id
              ] || 0
            );

          const feeKey =
            getFeeKey(
              classItem.name
            );

          if (feeKey) {

            legacyFees[
              feeKey
            ] = fee;

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

          /* NEW */

          classFees:
            dynamicFees,

          /* OLD COMPATIBILITY */

          ...legacyFees,

          session,

          updatedBy,

          lastUpdated:
            serverTimestamp(),

        },

        {
          merge: true,
        }

      );


      setMessage(
        "✅ Fee structure saved successfully."
      );

      window.setTimeout(
        () =>
          setMessage(""),
        3500
      );

    }

    catch (err) {

      console.error(
        "Fee save error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save fee structure."
      );

    }

    finally {

      setSaving(false);

    }

  }


  /* =======================================================
     RESET
  ======================================================= */

  function handleReset() {

    loadClasses();

  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (

      <FullScreenLoader
        message="Loading fee management..."
      />

    );

  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <AdminLayout>

      <div className="max-w-[1450px] mx-auto p-4 sm:p-6 lg:p-8">


        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-950 via-green-800 to-emerald-600 text-white shadow-xl">

          <div className="absolute -right-24 -top-28 w-96 h-96 rounded-full bg-white/10 blur-3xl" />

          <div className="relative p-6 sm:p-8">

            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

              <div className="flex items-start gap-4">

                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">

                  <WalletCards
                    size={29}
                  />

                </div>

                <div>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold">

                    <Sparkles
                      size={13}
                    />

                    Dynamic Fee Management

                  </span>

                  <h1 className="text-3xl sm:text-4xl font-black mt-3">

                    Fee Management

                  </h1>

                  <p className="text-emerald-100 mt-2 max-w-2xl">

                    Configure annual fees for every
                    class created in Academic Configuration.

                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-green-800 font-bold hover:bg-emerald-50"
              >

                <RefreshCw
                  size={18}
                />

                Refresh Classes

              </button>

            </div>

          </div>

        </section>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">


          <SummaryCard
            icon={
              <GraduationCap
                size={21}
              />
            }
            title="Total Classes"
            value={classes.length}
            text="From Academic Configuration"
          />


          <SummaryCard
            icon={
              <CheckCircle2
                size={21}
              />
            }
            title="Configured"
            value={configuredCount}
            text="Classes with fee"
          />


          <SummaryCard
            icon={
              <IndianRupee
                size={21}
              />
            }
            title="Total Fee Value"
            value={money(totalFee)}
            text="Configured class total"
          />


          <SummaryCard
            icon={
              <WalletCards
                size={21}
              />
            }
            title="Database"
            value="LIVE"
            text="Firebase realtime"
          />

        </div>


        {/* =================================================
            SESSION
        ================================================= */}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 mt-6">

          <div className="grid md:grid-cols-2 gap-5">

            <div>

              <label className="text-sm font-bold text-slate-700">

                Academic Session

              </label>

              <input
                type="text"
                value={session}
                onChange={(e) =>
                  setSession(
                    e.target.value
                  )
                }
                placeholder="2026-2027"
                className="w-full h-12 mt-2 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none"
              />

            </div>


            <div>

              <label className="text-sm font-bold text-slate-700">

                Updated By

              </label>

              <input
                type="text"
                value={updatedBy}
                onChange={(e) =>
                  setUpdatedBy(
                    e.target.value
                  )
                }
                placeholder="Admin"
                className="w-full h-12 mt-2 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none"
              />

            </div>

          </div>

        </section>


        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 mt-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <h2 className="text-xl font-black">

                Class-wise Annual Fee

              </h2>

              <p className="text-sm text-slate-500 mt-1">

                Classes are automatically loaded
                from Academic Configuration.

              </p>

            </div>


            <div className="relative w-full md:max-w-md">

              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search LKG, UKG, Nursery, Class 1..."
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none"
              />

            </div>

          </div>

        </section>


        {/* =================================================
            CLASS CARDS
        ================================================= */}

        <section className="mt-6">

          {filteredClasses.length === 0 ? (

            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">

              <GraduationCap
                size={44}
                className="mx-auto text-slate-300"
              />

              <h2 className="text-xl font-black mt-4">

                No Classes Found

              </h2>

              <p className="text-sm text-slate-500 mt-2">

                Create a class in Academic Configuration
                first.

              </p>

            </div>

          ) : (

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">

              {filteredClasses.map(
                (classItem) => {

                  const fee =
                    fees[
                      classItem.id
                    ] ?? "";

                  const configured =
                    Number(
                      fee || 0
                    ) > 0;


                  return (

                    <div
                      key={
                        classItem.id
                      }
                      className={`bg-white border rounded-3xl p-5 shadow-sm hover:shadow-lg transition ${
                        configured
                          ? "border-green-200"
                          : "border-slate-200"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-center gap-3">

                          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center">

                            <GraduationCap
                              size={23}
                            />

                          </div>

                          <div>

                            <h3 className="text-xl font-black">

                              {classItem.name}

                            </h3>

                            <p className="text-xs text-slate-500 mt-1">

                              {classItem.sections?.length
                                ? `${classItem.sections.length} section${classItem.sections.length > 1 ? "s" : ""}`
                                : "No sections configured"}

                            </p>

                          </div>

                        </div>


                        {configured && (

                          <CheckCircle2
                            size={21}
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
                            value={fee}
                            onChange={(e) =>
                              handleFeeChange(
                                classItem.id,
                                e.target.value
                              )
                            }
                            placeholder="Enter annual fee"
                            className="w-full h-14 pl-11 pr-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none text-lg font-black"
                          />

                        </div>

                      </div>


                      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3">

                        <div className="flex items-center justify-between">

                          <span className="text-xs text-slate-500">

                            Current Fee

                          </span>

                          <strong className="text-green-700">

                            {money(fee)}

                          </strong>

                        </div>

                      </div>


                      <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">

                        <Info
                          size={13}
                        />

                        Automatically connected to
                        student admission.

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </section>


        {/* =================================================
            MESSAGE
        ================================================= */}

        {(message || error) && (

          <div
            className={`mt-6 rounded-2xl p-4 border font-semibold ${
              error
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >

            {error ||
              message}

          </div>

        )}


        {/* =================================================
            SAVE BAR
        ================================================= */}

        <section className="sticky bottom-4 z-30 mt-8">

          <div className="bg-slate-950 text-white rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-start gap-3">

              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">

                <Settings2
                  size={19}
                />

              </div>

              <div>

                <p className="font-black">

                  Fee structure ready

                </p>

                <p className="text-xs text-slate-400 mt-1">

                  {configuredCount} of{" "}
                  {classes.length} classes configured

                </p>

              </div>

            </div>


            <button
              type="button"
              onClick={handleSave}
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
                  <Save
                    size={18}
                  />

                  Save Fee Structure

                </>

              )}

            </button>

          </div>

        </section>


        {/* =================================================
            INFORMATION
        ================================================= */}

        <section className="grid lg:grid-cols-2 gap-5 mt-8">

          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">

            <h3 className="font-black text-blue-800">

              How it works

            </h3>

            <ul className="mt-4 space-y-2 text-sm text-blue-900">

              <li>
                ✓ Classes come directly from Academic Configuration.
              </li>

              <li>
                ✓ LKG, UKG, Nursery and custom classes are supported.
              </li>

              <li>
                ✓ Fee is stored in Firebase.
              </li>

              <li>
                ✓ Student admission can use the configured fee automatically.
              </li>

            </ul>

          </div>


          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">

            <h3 className="font-black text-emerald-800">

              Live Connection

            </h3>

            <p className="text-sm text-emerald-900 mt-3">

              Fee settings are stored in:

            </p>

            <code className="block mt-2 bg-white rounded-xl px-4 py-3 text-sm font-bold">

              settings / feeSettings

            </code>

          </div>

        </section>

      </div>

    </AdminLayout>

  );

}


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon,
  title,
  value,
  text,
}) {

  return (

    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">

          {icon}

        </div>

        <p className="text-xl font-black text-slate-900">

          {value}

        </p>

      </div>

      <p className="font-bold mt-4">

        {title}

      </p>

      <p className="text-xs text-slate-500 mt-1">

        {text}

      </p>

    </div>

  );

}


export default FeeSettings;