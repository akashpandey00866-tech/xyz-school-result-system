import {
  IndianRupee,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  WalletCards,
} from "lucide-react";

function CollectFee({
  student,
  annualFee = 0,
  paid = 0,
  due = 0,
  amount,
  setAmount,
  paymentMethod,
  setPaymentMethod,
  remarks,
  setRemarks,
  saving = false,
  onSave,
}) {
  const money = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

  const status =
    Number(due) <= 0
      ? "PAID"
      : Number(paid) <= 0
      ? "UNPAID"
      : "PARTIAL";

  const methods = [
    {
      value: "Cash",
      label: "Cash",
      icon: Banknote,
    },
    {
      value: "UPI",
      label: "UPI",
      icon: Smartphone,
    },
    {
      value: "Card",
      label: "Card",
      icon: CreditCard,
    },
    {
      value: "Bank Transfer",
      label: "Bank Transfer",
      icon: WalletCards,
    },
  ];

  const numericDue = Math.max(0, Number(due || 0));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Receipt size={14} />
            FEE COLLECTION
          </div>

          <h2 className="mt-3 text-2xl font-black text-slate-900">
            Collect Student Fee
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Record a payment and generate the official receipt.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold text-slate-500">
            Current Due
          </p>
          <p className="text-xl font-black text-emerald-700">
            {money(numericDue)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">

        <Summary
          title="Annual Fee"
          value={money(annualFee)}
          icon={<IndianRupee size={17} />}
        />

        <Summary
          title="Total Paid"
          value={money(paid)}
          icon={<WalletCards size={17} />}
        />

        <Summary
          title="Remaining"
          value={money(numericDue)}
          icon={<Receipt size={17} />}
        />

        <Summary
          title="Status"
          value={status}
          icon={<Receipt size={17} />}
        />

      </div>

      {student && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <p className="font-black text-slate-900">
                {student.name || "Student"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Enrollment:{" "}
                <b className="text-slate-700">
                  {student.enrollmentNo || "—"}
                </b>
              </p>
            </div>

            <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
              Class {student.className || student.class || "—"}
              {student.section
                ? ` • Section ${student.section}`
                : ""}
            </span>

          </div>
        </div>
      )}

      <div className="mt-6">

        <label className="mb-2 block text-sm font-bold text-slate-700">
          Payment Amount
        </label>

        <div className="relative">

          <IndianRupee
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600"
          />

          <input
            type="number"
            min="0"
            max={numericDue}
            step="1"
            value={amount}
            onChange={(event) => {
              const value = event.target.value;

              if (
                value === "" ||
                Number(value) <= numericDue
              ) {
                setAmount(value);
              }
            }}
            placeholder="Enter amount"
            disabled={saving || numericDue <= 0}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-lg font-bold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

        </div>

        {numericDue > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {[25, 50, 100].map((percent) => {
              const value = Math.round(
                (numericDue * percent) / 100
              );

              return (
                <button
                  key={percent}
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setAmount(String(value))
                  }
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {percent}% • {money(value)}
                </button>
              );
            })}

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                setAmount(String(numericDue))
              }
              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              Full Due • {money(numericDue)}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">

        <label className="mb-3 block text-sm font-bold text-slate-700">
          Payment Method
        </label>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {methods.map((method) => {
            const Icon = method.icon;
            const selected =
              paymentMethod === method.value;

            return (
              <button
                key={method.value}
                type="button"
                disabled={saving}
                onClick={() =>
                  setPaymentMethod(method.value)
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
                } disabled:opacity-50`}
              >
                <Icon
                  size={20}
                  className={
                    selected
                      ? "text-emerald-700"
                      : "text-slate-500"
                  }
                />

                <p className="mt-2 text-sm font-bold text-slate-800">
                  {method.label}
                </p>
              </button>
            );
          })}

        </div>
      </div>

      <div className="mt-6">

        <label className="mb-2 block text-sm font-bold text-slate-700">
          Remarks
        </label>

        <textarea
          rows={3}
          value={remarks}
          onChange={(event) =>
            setRemarks(event.target.value)
          }
          disabled={saving}
          placeholder="Optional payment note..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
        />

      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={
          saving ||
          numericDue <= 0 ||
          !amount ||
          Number(amount) <= 0 ||
          Number(amount) > numericDue
        }
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-green-800 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
      >
        {saving ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Saving Payment...
          </>
        ) : (
          <>
            <Receipt size={20} />
            Collect Fee & Generate Receipt
          </>
        )}
      </button>

      {numericDue <= 0 && (
        <p className="mt-3 text-center text-sm font-semibold text-emerald-700">
          ✓ This student's fee is fully paid.
        </p>
      )}

    </section>
  );
}

function Summary({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-semibold">
          {title}
        </span>
      </div>

      <p className="mt-2 text-base sm:text-lg font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default CollectFee;