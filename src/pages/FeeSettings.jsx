import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";
import AdvancedTransportMap from "../components/AdvancedTransportMap";

const money = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const numberValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const emptyForm = {
  tuitionFee: 0,
  examFee: 0,
  otherFee: 0,
  transportFee: 0,
};

const emptyRoute = {
  name: "",
  code: "",
  fee: 0,
  monthlyFee: 0,
  stops: "",
  active: true,
};

export default function FeeSettings() {
  const [classes, setClasses] = useState([]);
  const [feeStructures, setFeeStructures] = useState({});
  const [settings, setSettings] = useState({});
  const [routes, setRoutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const [selectedClass, setSelectedClass] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [routeForm, setRouteForm] = useState(emptyRoute);
  const [mapRouteDraft, setMapRouteDraft] = useState({
    name: "Route 01",
    code: "R01",
    fee: 0,
    monthlyFee: 0,
    stops: [],
    active: true,
  });

  const [activeTab, setActiveTab] = useState("academic");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubClasses = onSnapshot(
      collection(db, "classes"),
      (snap) => {
        const rows = snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) =>
            String(a.name || a.className || a.id).localeCompare(
              String(b.name || b.className || b.id),
              undefined,
              { numeric: true }
            )
          );

        setClasses(rows);

        if (!selectedClass && rows.length) {
          setSelectedClass(rows[0].id);
        }

        setLoading(false);
      },
      (err) => {
        console.error("Fee Settings classes:", err);
        setError(err?.message || "Unable to load classes.");
        setLoading(false);
      }
    );

    const unsubStructures = onSnapshot(
      collection(db, "feeStructures"),
      (snap) => {
        const next = {};
        snap.docs.forEach((item) => {
          next[item.id] = {
            id: item.id,
            ...item.data(),
          };
        });
        setFeeStructures(next);
      },
      (err) => {
        console.error("Fee Settings structures:", err);
        setError(err?.message || "Unable to load fee structures.");
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, "settings", "feeSettings"),
      (snap) => {
        setSettings(snap.exists() ? snap.data() : {});
      },
      (err) => {
        console.error("Fee Settings document:", err);
        setError(err?.message || "Unable to load fee settings.");
      }
    );

    const unsubRoutes = onSnapshot(
      collection(db, "transportRoutes"),
      (snap) => {
        setRoutes(
          snap.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) =>
              String(a.name || "").localeCompare(String(b.name || ""))
            )
        );
      },
      (err) => {
        console.error("Transport routes:", err);
        setRoutes([]);
      }
    );

    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snap) => {
        setStudents(
          snap.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) =>
              String(a.name || "").localeCompare(String(b.name || ""))
            )
        );
      },
      (err) => {
        console.error("Transport student mapping:", err);
        setStudents([]);
      }
    );

    return () => {
      unsubClasses();
      unsubStructures();
      unsubSettings();
      unsubRoutes();
      unsubStudents();
    };
  }, [selectedClass]);

  useEffect(() => {
    if (selectedRouteId) {
      const selected = routes.find((item) => item.id === selectedRouteId);
      if (selected) {
        setMapRouteDraft({
          ...selected,
          stops: Array.isArray(selected.stops) ? selected.stops : [],
        });
      }
    } else {
      setMapRouteDraft((previous) => ({
        ...previous,
        name: routeForm.name || previous.name,
        code: routeForm.code || previous.code,
        fee: numberValue(routeForm.fee),
        monthlyFee: numberValue(routeForm.monthlyFee),
      }));
    }
  }, [selectedRouteId, routes, routeForm.name, routeForm.code, routeForm.fee, routeForm.monthlyFee]);

  const classRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return classes
      .map((item) => {
        const name = String(
          item.name || item.className || item.label || item.id
        ).trim();

        const structure =
          feeStructures[`class-${name}`] ||
          feeStructures[item.id] ||
          {};

        const tuition = numberValue(structure.tuitionFee);
        const exam = numberValue(structure.examFee);
        const other = numberValue(structure.otherFee);
        const transport = numberValue(structure.transportFee);

        return {
          id: item.id,
          name,
          tuition,
          exam,
          other,
          transport,
          academicTotal: tuition + exam + other,
          grandTotal: tuition + exam + other + transport,
          active: structure.status !== "INACTIVE",
        };
      })
      .filter((item) =>
        query
          ? `${item.name} ${item.id}`.toLowerCase().includes(query)
          : true
      );
  }, [classes, feeStructures, search]);

  const filteredTransportStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();

    return students.filter((student) => {
      if (!q) return true;

      return `${student.name || ""} ${student.enrollmentNo || ""} ${student.className || student.class || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [students, studentSearch]);

  const selectedTransportStudent = students.find(
    (student) => student.id === selectedStudentId
  );

  const selectedTransportRoute = routes.find(
    (route) => route.id === selectedRouteId
  );

  useEffect(() => {
    if (!selectedTransportStudent) {
      setSelectedRouteId("");
      return;
    }

    setSelectedRouteId(
      selectedTransportStudent.transportRouteId ||
        selectedTransportStudent.routeId ||
        ""
    );
  }, [selectedTransportStudent]);

  const selectedClassRow = useMemo(
    () =>
      classRows.find((item) => item.id === selectedClass) ||
      classRows.find((item) => item.name === selectedClass) ||
      classRows[0] ||
      null,
    [classRows, selectedClass]
  );

  useEffect(() => {
    if (!selectedClassRow) return;

    const structure =
      feeStructures[`class-${selectedClassRow.name}`] ||
      feeStructures[selectedClassRow.id] ||
      {};

    setForm({
      tuitionFee: numberValue(structure.tuitionFee),
      examFee: numberValue(structure.examFee),
      otherFee: numberValue(structure.otherFee),
      transportFee: numberValue(structure.transportFee),
    });
  }, [selectedClassRow, feeStructures]);

  const academicTotal =
    numberValue(form.tuitionFee) +
    numberValue(form.examFee) +
    numberValue(form.otherFee);

  const grandTotal =
    academicTotal + numberValue(form.transportFee);

  async function saveClassFees() {
    if (!selectedClassRow) {
      setError("Please select a class first.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const className = selectedClassRow.name;
      const transportFee = numberValue(form.transportFee);

      const structure = {
        classId: selectedClassRow.id,
        className,
        sessionName:
          settings.sessionName ||
          settings.session ||
          "2026-27",

        tuitionFee: numberValue(form.tuitionFee),
        examFee: numberValue(form.examFee),
        otherFee: numberValue(form.otherFee),

        transportFee,

        academicTotal,
        total: grandTotal,

        transportationEnabled: transportFee > 0,
        status: "ACTIVE",
        schemaVersion: 3,

        updatedBy: "Admin",
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "feeStructures", `class-${className}`),
        structure,
        { merge: true }
      );

      const legacyKey = String(className).match(/\d+/)?.[0];

      await setDoc(
        doc(db, "settings", "feeSettings"),
        {
          classFees: {
            ...(settings.classFees || {}),
            [selectedClassRow.id]: academicTotal,
          },

          ...(legacyKey
            ? {
                [`class${legacyKey}`]: academicTotal,
              }
            : {}),

          session:
            settings.session ||
            settings.sessionName ||
            "2026-27",

          sessionName:
            settings.sessionName ||
            settings.session ||
            "2026-27",

          lastUpdated: serverTimestamp(),
          updatedBy: "Admin",
          schemaVersion: 3,
        },
        { merge: true }
      );

      setMessage(
        `${className} fee structure saved. Academic ${money(
          academicTotal
        )} + Transportation ${money(transportFee)} = ${money(
          grandTotal
        )}.`
      );
    } catch (err) {
      console.error("Fee structure save:", err);
      setError(err?.message || "Unable to save fee structure.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRoute() {
    const name = routeForm.name.trim();

    if (!name) {
      setError("Transport route name is required.");
      return;
    }

    setSavingRoute(true);
    setMessage("");
    setError("");

    try {
      const routeId =
        routeForm.id ||
        `route-${Date.now().toString(36)}`;

      await setDoc(
        doc(db, "transportRoutes", routeId),
        {
          name,
          code:
            routeForm.code.trim() ||
            name.toUpperCase().replace(/\s+/g, "-"),
          fee: numberValue(routeForm.fee),
          monthlyFee: numberValue(routeForm.monthlyFee),
          stops: Array.isArray(mapRouteDraft.stops)
            ? mapRouteDraft.stops
            : String(routeForm.stops || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
          active: routeForm.active !== false,
          updatedBy: "Admin",
          updatedAt: serverTimestamp(),
          schemaVersion: 1,
        },
        { merge: true }
      );

      setRouteForm(emptyRoute);
      setMapRouteDraft({ name: "Route 01", code: "R01", fee: 0, monthlyFee: 0, stops: [], active: true });
      setMessage("Transportation route saved successfully.");
    } catch (err) {
      console.error("Transport route save:", err);
      setError(err?.message || "Unable to save transport route.");
    } finally {
      setSavingRoute(false);
    }
  }

  async function saveStudentTransportMapping() {
    if (!selectedTransportStudent) {
      setError("Please select a student.");
      return;
    }

    if (!selectedTransportRoute) {
      setError("Please select a transportation route.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const annualRouteFee = numberValue(
        selectedTransportRoute.fee ||
          selectedTransportRoute.annualFee ||
          selectedTransportRoute.monthlyFee * 12
      );

      await setDoc(
        doc(db, "students", selectedTransportStudent.id),
        {
          transportEnabled: true,
          transportRouteId: selectedTransportRoute.id,
          transportRouteName: selectedTransportRoute.name,
          transportRouteCode: selectedTransportRoute.code || "",
          transportFee: annualRouteFee,
          transportationFee: annualRouteFee,
          transportCharge: annualRouteFee,
          transportMappedAt: serverTimestamp(),
          transportMappingUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage(
        `${selectedTransportStudent.name || "Student"} mapped to ${selectedTransportRoute.name}. Annual transport charge: ${money(annualRouteFee)}.`
      );
    } catch (err) {
      console.error("Student transport mapping:", err);
      setError(err?.message || "Unable to map transport route.");
    }
  }

  async function clearStudentTransportMapping() {
    if (!selectedTransportStudent) return;

    try {
      await setDoc(
        doc(db, "students", selectedTransportStudent.id),
        {
          transportEnabled: false,
          transportRouteId: "",
          transportRouteName: "",
          transportRouteCode: "",
          transportFee: 0,
          transportationFee: 0,
          transportCharge: 0,
          transportMappingUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSelectedRouteId("");
      setMessage(
        `${selectedTransportStudent.name || "Student"} transport mapping removed.`
      );
    } catch (err) {
      console.error("Clear transport mapping:", err);
      setError(err?.message || "Unable to remove transport mapping.");
    }
  }

  async function removeRoute(routeId) {
    if (!routeId) return;

    const ok = window.confirm(
      "Remove this transport route from Fee Settings?"
    );

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "transportRoutes", routeId));
      setMessage("Transportation route removed.");
    } catch (err) {
      console.error("Transport route delete:", err);
      setError(err?.message || "Unable to remove route.");
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
            <p className="mt-4 text-sm font-black text-slate-700">
              Loading Fee Settings…
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">
                  Finance Control Center
                </span>

                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Fee Settings
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  Manage academic fees, transportation charges and routes
                  from one place. Changes are saved to Firebase and are
                  reflected in connected fee screens.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Active Session
                </p>
                <p className="mt-1 text-lg font-black">
                  {settings.sessionName ||
                    settings.session ||
                    "2026-27"}
                </p>
              </div>
            </div>
          </header>

          {(message || error) && (
            <div
              className={`rounded-2xl border p-4 text-sm font-semibold ${
                error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Classes"
              value={classRows.length}
              icon="🏫"
            />
            <Stat
              label="Configured Academic"
              value={money(
                classRows.reduce(
                  (sum, item) => sum + item.academicTotal,
                  0
                )
              )}
              icon="🎓"
            />
            <Stat
              label="Transportation"
              value={money(
                classRows.reduce(
                  (sum, item) => sum + item.transport,
                  0
                )
              )}
              icon="🚌"
            />
            <Stat
              label="Transport Routes"
              value={routes.filter((item) => item.active !== false).length}
              icon="🗺️"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["academic", "🎓 Academic Fees", "Class-wise fee setup"],
                ["transport", "🚌 Transportation", "Routes and charges"],
                ["advanced", "⚙️ Advanced", "System controls"],
              ].map(([id, title, description]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`rounded-2xl p-4 text-left transition ${
                    activeTab === id
                      ? "bg-slate-950 text-white shadow-lg"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-sm font-black">{title}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      activeTab === id
                        ? "text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    {description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {activeTab === "academic" && (
            <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">
                      Class Fee Setup
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Select a class and configure every component.
                    </p>
                  </div>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search class…"
                    className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500 sm:w-48"
                  />
                </div>

                <div className="mt-5 space-y-2">
                  {classRows.length ? (
                    classRows.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedClass(item.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selectedClassRow?.id === item.id
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              Academic {money(item.academicTotal)}
                              {" • "}
                              Transport {money(item.transport)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[8px] font-black ${
                              item.transport > 0
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.transport > 0
                              ? "TRANSPORT SET"
                              : "NO TRANSPORT"}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-8 text-center text-xs font-semibold text-slate-500">
                      No classes found. Add classes first from the academic
                      class management module.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                {selectedClassRow ? (
                  <>
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                          Selected Class
                        </p>
                        <h2 className="mt-1 text-2xl font-black">
                          {selectedClassRow.name}
                        </h2>
                      </div>

                      <div className="rounded-2xl bg-slate-950 px-5 py-3 text-white">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Grand Annual Structure
                        </p>
                        <p className="mt-1 text-xl font-black">
                          {money(grandTotal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <MoneyInput
                        label="Tuition / Academic Fee"
                        value={form.tuitionFee}
                        onChange={(value) =>
                          setForm((p) => ({
                            ...p,
                            tuitionFee: value,
                          }))
                        }
                      />

                      <MoneyInput
                        label="Examination Fee"
                        value={form.examFee}
                        onChange={(value) =>
                          setForm((p) => ({
                            ...p,
                            examFee: value,
                          }))
                        }
                      />

                      <MoneyInput
                        label="Other / Miscellaneous Fee"
                        value={form.otherFee}
                        onChange={(value) =>
                          setForm((p) => ({
                            ...p,
                            otherFee: value,
                          }))
                        }
                      />

                      <MoneyInput
                        label="🚌 Transportation Charge"
                        value={form.transportFee}
                        onChange={(value) =>
                          setForm((p) => ({
                            ...p,
                            transportFee: value,
                          }))
                        }
                      />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Data
                        label="Academic Total"
                        value={money(academicTotal)}
                      />
                      <Data
                        label="Transport"
                        value={money(form.transportFee)}
                      />
                      <Data
                        label="Grand Total"
                        value={money(grandTotal)}
                        strong
                      />
                    </div>

                    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-black text-blue-900">
                        🚌 Transportation rule
                      </p>
                      <p className="mt-1 text-xs leading-5 text-blue-800">
                        The transportation charge is stored separately from
                        academic fees. A student with an explicit transport
                        charge uses that value; otherwise the class transport
                        structure can be used when transportation is enabled.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveClassFees}
                      className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? "Saving Fee Structure…"
                        : "Save Class Fee Structure"}
                    </button>
                  </>
                ) : (
                  <div className="flex min-h-80 items-center justify-center text-sm font-semibold text-slate-500">
                    Select a class to configure fees.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "transport" && (
            <section className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-cyan-600">
                  Transportation Setup
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Add / Manage Route
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Route configuration stays inside Fee Settings. Use the
                  class fee setup above to assign the default transportation
                  charge.
                </p>

                <div className="mt-6 space-y-4">
                  <Field
                    label="Route Name"
                    value={routeForm.name}
                    placeholder="e.g. Route 01 - City"
                    onChange={(value) =>
                      setRouteForm((p) => ({
                        ...p,
                        name: value,
                      }))
                    }
                  />

                  <Field
                    label="Route Code"
                    value={routeForm.code}
                    placeholder="e.g. R01"
                    onChange={(value) =>
                      setRouteForm((p) => ({
                        ...p,
                        code: value,
                      }))
                    }
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <MoneyInput
                      label="Annual Route Fee"
                      value={routeForm.fee}
                      onChange={(value) =>
                        setRouteForm((p) => ({
                          ...p,
                          fee: value,
                        }))
                      }
                    />

                    <MoneyInput
                      label="Monthly Route Fee"
                      value={routeForm.monthlyFee}
                      onChange={(value) =>
                        setRouteForm((p) => ({
                          ...p,
                          monthlyFee: value,
                        }))
                      }
                    />
                  </div>

                  <Field
                    label="Stops"
                    value={routeForm.stops}
                    placeholder="Stop A, Stop B, Stop C"
                    onChange={(value) =>
                      setRouteForm((p) => ({
                        ...p,
                        stops: value,
                      }))
                    }
                  />

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={routeForm.active !== false}
                      onChange={(e) =>
                        setRouteForm((p) => ({
                          ...p,
                          active: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <span>
                      <span className="block text-xs font-black">
                        Route Active
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Active routes can be used by the school transport
                        setup.
                      </span>
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={savingRoute}
                    onClick={saveRoute}
                    className="w-full rounded-2xl bg-cyan-700 px-5 py-4 text-sm font-black text-white shadow-lg hover:bg-cyan-800 disabled:opacity-60"
                  >
                    {savingRoute
                      ? "Saving Route…"
                      : "Save Transportation Route"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
                  Student Route Mapping
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Map Student → Transportation Route
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select a student and assign an active route. The route fee is
                  copied to the student's transport charge so Fee Management,
                  receipts and the student portal use the same amount.
                </p>

                <div className="mt-5 grid gap-4">
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student / enrollment / class…"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold outline-none focus:border-indigo-500"
                  />

                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="">Select student</option>
                    {filteredTransportStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name || "Unnamed"} •{" "}
                        {student.enrollmentNo || student.id} •{" "}
                        {student.className || student.class || "Class"}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="">Select active route</option>
                    {routes
                      .filter((route) => route.active !== false)
                      .map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.name} • {money(route.fee)}
                        </option>
                      ))}
                  </select>

                  {selectedTransportStudent && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Data
                        label="Student"
                        value={
                          selectedTransportStudent.name || "Unnamed"
                        }
                      />
                      <Data
                        label="Current Route"
                        value={
                          selectedTransportStudent.transportRouteName ||
                          "Not mapped"
                        }
                      />
                      <Data
                        label="Current Charge"
                        value={money(
                          selectedTransportStudent.transportFee ||
                            selectedTransportStudent.transportCharge ||
                            0
                        )}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={saveStudentTransportMapping}
                      className="flex-1 rounded-2xl bg-indigo-700 px-5 py-3.5 text-sm font-black text-white hover:bg-indigo-800"
                    >
                      🚌 Save Student Route Mapping
                    </button>

                    <button
                      type="button"
                      onClick={clearStudentTransportMapping}
                      disabled={!selectedTransportStudent}
                      className="rounded-2xl border border-red-200 bg-white px-5 py-3.5 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove Mapping
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Advanced Location Mapping</p>
                    <h2 className="mt-1 text-2xl font-black">🗺️ Ayodhya Route Map</h2>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Search villages/localities, detect the current location, click the map to create pickup stops, and save the complete route. Ayodhya has 11 blocks and 1,272 villages according to the district administration, so the map is designed for village-level route building rather than a fixed hand-written list. citeturn0search2turn0search9</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Selected Route</p>
                    <p className="mt-1 text-sm font-black">{mapRouteDraft.name || "New Route"}</p>
                  </div>
                </div>

                <AdvancedTransportMap
                  route={mapRouteDraft}
                  onRouteChange={(next) => {
                    setMapRouteDraft(next);
                    setRouteForm((previous) => ({
                      ...previous,
                      name: next.name || previous.name,
                      code: next.code || previous.code,
                      fee: numberValue(next.fee),
                      monthlyFee: numberValue(next.monthlyFee),
                    }));
                  }}
                />

                <button
                  type="button"
                  disabled={savingRoute}
                  onClick={saveRoute}
                  className="mt-5 w-full rounded-2xl bg-indigo-700 px-5 py-4 text-sm font-black text-white shadow-lg hover:bg-indigo-800 disabled:opacity-60"
                >
                  {savingRoute ? "Saving Mapped Route…" : "💾 Save Complete Map Route"}
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-cyan-600">
                      Live Routes
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      Transportation Routes
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-600">
                    ● REALTIME
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {routes.length ? (
                    routes.map((route) => (
                      <article
                        key={route.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-black">
                                🚌 {route.name}
                              </h3>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black text-slate-500">
                                {route.code || "ROUTE"}
                              </span>
                              <span
                                className={`rounded-full px-2 py-1 text-[8px] font-black ${
                                  route.active === false
                                    ? "bg-red-50 text-red-600"
                                    : "bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                {route.active === false
                                  ? "INACTIVE"
                                  : "ACTIVE"}
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              {Array.isArray(route.stops)
                                ? route.stops.join(" → ")
                                : String(route.stops || "No stops")}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <Data
                                label="Annual"
                                value={money(route.fee)}
                              />
                              <Data
                                label="Monthly"
                                value={money(route.monthlyFee)}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRouteId(route.id);
                              setMapRouteDraft({ ...route, stops: Array.isArray(route.stops) ? route.stops : [] });
                            }}
                            className="rounded-xl border border-indigo-200 px-3 py-2 text-[10px] font-black text-indigo-700 hover:bg-indigo-50"
                          >
                            Map / Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => removeRoute(route.id)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-10 text-center">
                      <p className="text-3xl">🚌</p>
                      <p className="mt-2 text-sm font-black">
                        No transport routes configured
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add your first route from the panel on the left.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "advanced" && (
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">
                  Calculation Policy
                </h2>

                <div className="mt-5 space-y-3">
                  {[
                    [
                      "Academic Fee",
                      "Tuition + Examination + Other",
                    ],
                    [
                      "Transportation",
                      "Separate from academic fee",
                    ],
                    [
                      "Grand Total",
                      "Academic + Transportation",
                    ],
                    [
                      "Due",
                      "Configured fee − recorded payments",
                    ],
                  ].map(([title, value]) => (
                    <div
                      key={title}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {title}
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-800">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
                <h2 className="text-xl font-black text-emerald-950">
                  🔄 Realtime Sync
                </h2>

                <p className="mt-3 text-sm leading-6 text-emerald-800">
                  Fee structure changes are written to the central
                  <b> feeStructures </b>
                  collection and the compatibility
                  <b> settings/feeSettings </b>
                  document. Connected dashboards listen to these values
                  and can recalculate their fee cards automatically.
                </p>

                <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/70 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                    Schema
                  </p>
                  <p className="mt-1 text-sm font-black text-emerald-950">
                    Version 3 • Academic + Transport
                  </p>
                </div>
              </div>
            </section>
          )}

          <footer className="pb-8 text-center">
            <p className="text-[10px] font-bold text-slate-400">
              XYZ PUBLIC SCHOOL • Finance Control Center
            </p>
          </footer>
        </div>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black uppercase text-slate-500">
          Live
        </span>
      </div>
      <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Data({ label, value, strong = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 ${
          strong
            ? "text-sm font-black text-blue-700"
            : "text-xs font-bold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MoneyInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-blue-500">
        <span className="flex items-center px-4 text-sm font-black text-slate-400">
          ₹
        </span>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value === ""
                ? 0
                : Math.max(0, Number(e.target.value))
            )
          }
          className="w-full bg-transparent px-2 py-3 text-sm font-black outline-none"
        />
      </div>
    </label>
  );
}

function Field({ label, value, placeholder, onChange }) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
      />
    </label>
  );
}
