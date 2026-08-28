import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import StudentLayout from "../layouts/StudentLayout";

import {
  createReceiptPdf,
  enrollmentDisplay,
  formatINR,
  getFeeSnapshot,
  normalizePayment,
  studentDisplayName,
  studentClass,
} from "../utils/studentAcademicUtils";

function ReceiptPreview({
  student,
  payment,
  fee,
  onClose,
}) {
  const data = useMemo(
    () =>
      normalizePayment(
        payment,
        student,
        fee
      ),
    [payment, student, fee]
  );

  const download = () => {
    createReceiptPdf(
      student,
      payment,
      fee
    ).save(
      `fee-receipt-${data.receiptNo}.pdf`
    );
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[95vh] w-full max-w-4xl overflow-auto rounded-[30px] bg-white shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-5 text-white">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-100">
              Official Fee Receipt
            </p>

            <h2 className="mt-1 text-xl font-black">
              {data.receiptNo}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl font-black"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-8">
          <div className="rounded-[30px] border-4 border-emerald-700 bg-white p-5 sm:p-8">
            <div className="text-center">
              <h1 className="text-3xl font-black text-emerald-800">
                XYZ PUBLIC SCHOOL
              </h1>

              <p className="mt-1 text-[9px] font-black uppercase tracking-[.3em] text-slate-500">
                Official Fee Payment Receipt
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Student
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {studentDisplayName(
                    student
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Enrollment
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {enrollmentDisplay(
                    student
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Class
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {studentClass(
                    student
                  )}{" "}
                  -{" "}
                  {student?.section ||
                    "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1fr_auto] bg-emerald-800 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-white">
                <span>Particular</span>
                <span>Amount</span>
              </div>

              <div className="divide-y divide-slate-100">
                {[
                  [
                    "Receipt Number",
                    data.receiptNo,
                  ],
                  [
                    "Payment Date",
                    data.date,
                  ],
                  [
                    "Payment Time",
                    data.time,
                  ],
                  [
                    "Payment Method",
                    data.method,
                  ],
                  [
                    "Fee Category",
                    data.feeType ===
                    "TRANSPORTATION"
                      ? "Transportation"
                      : "Academic",
                  ],
                  [
                    "Academic Fee",
                    formatINR(
                      data.annualFee
                    ),
                  ],
                  [
                    "Transportation Charge",
                    formatINR(
                      data.transportCharge
                    ),
                  ],
                  [
                    "Current Payment",
                    formatINR(
                      data.amount
                    ),
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-xs"
                    >
                      <span className="font-semibold text-slate-600">
                        {label}
                      </span>

                      <span className="font-black text-slate-900">
                        {value}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-[9px] font-black uppercase text-emerald-600">
                  Total Paid
                </p>

                <p className="mt-1 text-2xl font-black text-emerald-800">
                  {formatINR(
                    data.totalPaidAfter
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[9px] font-black uppercase text-blue-600">
                  Outstanding Due
                </p>

                <p className="mt-1 text-2xl font-black text-blue-900">
                  {formatINR(
                    data.totalDueAfter
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[9px] font-black uppercase text-slate-400">
                  Academic Account
                </p>

                <p className="mt-1 text-xs font-black text-slate-700">
                  Paid{" "}
                  {formatINR(
                    data.academicPaidAfter
                  )}{" "}
                  • Due{" "}
                  {formatINR(
                    data.academicDueAfter
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-[9px] font-black uppercase text-violet-500">
                  Transport Account
                </p>

                <p className="mt-1 text-xs font-black text-violet-900">
                  Paid{" "}
                  {formatINR(
                    data.transportPaidAfter
                  )}{" "}
                  • Due{" "}
                  {formatINR(
                    data.transportDueAfter
                  )}
                </p>
              </div>
            </div>

            {payment?.remarks && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-[9px] font-black uppercase text-slate-400">
                  Remarks
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {payment.remarks}
                </p>
              </div>
            )}

            <div className="mt-8 border-t border-slate-200 pt-5 text-center">
              <p className="text-[9px] text-slate-400">
                Computer-generated official school fee receipt.
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white"
          >
            Print
          </button>

          <button
            type="button"
            onClick={download}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptCard({
  student,
  payment,
  fee,
  onView,
}) {
  const data =
    normalizePayment(
      payment,
      student,
      fee
    );

  const transport =
    data.feeType ===
    "TRANSPORTATION";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${
              transport
                ? "bg-violet-50 text-violet-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {transport
              ? "Transportation"
              : "Academic"}
          </span>

          <h3 className="mt-3 text-sm font-black text-slate-900">
            {data.receiptNo}
          </h3>

          <p className="mt-1 text-[10px] text-slate-500">
            {data.date} •{" "}
            {data.method}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-[8px] font-black uppercase text-slate-400">
            Payment
          </p>

          <p className="mt-1 text-base font-black text-emerald-700">
            {formatINR(
              data.amount
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[8px] font-black uppercase text-slate-400">
            Category
          </p>
          <p className="mt-1 text-xs font-black">
            {transport
              ? "Transportation"
              : "Academic"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[8px] font-black uppercase text-slate-400">
            Total Paid
          </p>
          <p className="mt-1 text-xs font-black text-emerald-700">
            {formatINR(
              data.totalPaidAfter
            )}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-[8px] font-black uppercase text-blue-500">
            Due
          </p>
          <p className="mt-1 text-xs font-black text-blue-900">
            {formatINR(
              data.totalDueAfter
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() =>
            onView(payment)
          }
          className="flex-1 rounded-xl bg-slate-900 py-3 text-[10px] font-black text-white"
        >
          View Receipt
        </button>

        <button
          type="button"
          onClick={() =>
            createReceiptPdf(
              student,
              payment,
              fee
            ).save(
              `fee-receipt-${data.receiptNo}.pdf`
            )
          }
          className="flex-1 rounded-xl bg-emerald-600 py-3 text-[10px] font-black text-white"
        >
          Download PDF
        </button>
      </div>
    </article>
  );
}

export default function StudentFeeReceipts() {
  const navigate =
    useNavigate();

  const [student, setStudent] =
    useState(null);

  const [feeSettings, setFeeSettings] =
    useState({});

  const [feeStructures, setFeeStructures] =
    useState({});

  const [payments, setPayments] =
    useState([]);

  const [filter, setFilter] =
    useState("ALL");

  const [search, setSearch] =
    useState("");

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe =
      () => {};

    async function start() {
      try {
        const user =
          auth.currentUser;

        if (!user) {
          navigate(
            "/student-login",
            {
              replace: true,
            }
          );
          return;
        }

        const snapshot =
          await getDocs(
            query(
              collection(
                db,
                "students"
              ),
              limit(500)
            )
          );

        const profile =
          snapshot.docs
            .map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            )
            .find(
              (item) =>
                String(
                  item.uid ||
                    item.authUid ||
                    ""
                ) ===
                  String(
                    user.uid
                  ) ||
                String(
                  item.email ||
                    item.accountEmail ||
                    ""
                ).toLowerCase() ===
                  String(
                    user.email ||
                      ""
                  ).toLowerCase()
            );

        if (!profile) {
          throw new Error(
            "Student profile not found."
          );
        }

        if (!mounted) return;

        setStudent(
          profile
        );

        unsubscribe =
          onSnapshot(
            doc(
              db,
              "students",
              profile.id
            ),
            (snap) => {
              if (!mounted) return;

              if (!snap.exists()) {
                setPayments([]);
                return;
              }

              const data =
                snap.data();

              setStudent({
                id: snap.id,
                ...data,
              });

              const history =
                Array.isArray(
                  data.paymentHistory
                )
                  ? data.paymentHistory
                  : [];

              setPayments(
                history
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(
                        b.timestamp ||
                          0
                      ) -
                      Number(
                        a.timestamp ||
                          0
                      )
                  )
              );
            }
          );
      } catch (err) {
        console.error(
          "Student receipt page:",
          err
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    start();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!auth.currentUser) return;

    return onSnapshot(
      doc(
        db,
        "settings",
        "feeSettings"
      ),
      (snapshot) => {
        setFeeSettings(
          snapshot.exists()
            ? snapshot.data()
            : {}
        );
      }
    );
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    return onSnapshot(
      collection(
        db,
        "feeStructures"
      ),
      (snapshot) => {
        const data = {};

        snapshot.forEach(
          (item) => {
            data[item.id] = {
              id: item.id,
              ...item.data(),
            };
          }
        );

        setFeeStructures(
          data
        );
      }
    );
  }, []);

  const fee =
    useMemo(
      () =>
        getFeeSnapshot(
          student || {},
          feeSettings,
          feeStructures
        ),
      [
        student,
        feeSettings,
        feeStructures,
      ]
    );

  const filtered =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      return payments.filter(
        (payment) => {
          const type =
            payment?.feeType ||
            "ACADEMIC";

          if (
            filter !==
              "ALL" &&
            type !==
              filter
          ) {
            return false;
          }

          if (!q) return true;

          return [
            payment?.receiptNo,
            payment?.date,
            payment?.method,
            payment?.remarks,
            payment?.feeType,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
        }
      );
    }, [
      payments,
      filter,
      search,
    ]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[75vh] items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="mt-4 text-sm font-black">
              Loading Fee Receipts
            </p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1450px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-[30px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider">
                  Finance Centre
                </span>

                <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                  Official Fee Receipts
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                  Your academic and{" "}
                  <span className="font-black text-cyan-200">
                    transportation payments
                  </span>{" "}
                  are structured in one official receipt centre.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/student-dashboard"
                  )
                }
                className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900"
              >
                ← Dashboard
              </button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[9px] font-black uppercase text-slate-400">
                Receipts
              </p>
              <p className="mt-1 text-2xl font-black">
                {payments.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-[9px] font-black uppercase text-emerald-600">
                Total Payment History
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-800">
                {formatINR(
                  payments.reduce(
                    (sum, payment) =>
                      sum +
                      Number(
                        payment.amount ||
                          0
                      ),
                    0
                  )
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-[9px] font-black uppercase text-blue-600">
                Total Paid
              </p>
              <p className="mt-1 text-2xl font-black text-blue-900">
                {formatINR(
                  fee.totalPaid
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
              <p className="text-[9px] font-black uppercase text-violet-600">
                Current Due
              </p>
              <p className="mt-1 text-2xl font-black text-violet-900">
                {formatINR(
                  fee.totalDue
                )}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search receipt, date, method or remarks…"
                className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold outline-none focus:border-emerald-500"
              />

              <div className="flex flex-wrap gap-2">
                {[
                  ["ALL", "All"],
                  [
                    "ACADEMIC",
                    "Academic",
                  ],
                  [
                    "TRANSPORTATION",
                    "Transportation",
                  ],
                ].map(
                  ([value, label]) => (
                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          value
                        )
                      }
                      className={`rounded-xl px-4 py-3 text-[10px] font-black ${
                        filter ===
                        value
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">
                  Payment Ledger
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Receipt History
                </h2>
              </div>

              <span className="text-[10px] font-bold text-slate-400">
                {filtered.length} record(s)
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {filtered.length ? (
                filtered.map(
                  (
                    payment,
                    index
                  ) => (
                    <ReceiptCard
                      key={
                        payment.receiptNo ||
                        `${payment.timestamp}-${index}`
                      }
                      student={
                        student
                      }
                      payment={
                        payment
                      }
                      fee={fee}
                      onView={
                        setSelected
                      }
                    />
                  )
                )
              ) : (
                <div className="lg:col-span-2 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <p className="text-sm font-black text-slate-800">
                    No Receipt Found
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    Successful payments recorded by the school will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {selected &&
          student && (
            <ReceiptPreview
              student={
                student
              }
              payment={
                selected
              }
              fee={fee}
              onClose={() =>
                setSelected(
                  null
                )
              }
            />
          )}
      </div>
    </StudentLayout>
  );
}
