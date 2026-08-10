import { motion } from "framer-motion";
import { GraduationCap, LoaderCircle, ShieldCheck } from "lucide-react";

function FullScreenLoader({
  text = "Loading School ERP...",
  subText = "Please wait while we prepare your workspace.",
}) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-slate-950"
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative w-[min(92vw,430px)] rounded-[32px] border border-white/10 bg-white/[0.07] px-7 py-8 text-center shadow-2xl backdrop-blur-xl">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-green-800 text-white">
            <GraduationCap size={30} />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "linear",
              }}
              className="absolute -inset-1 rounded-2xl border-2 border-transparent border-t-emerald-300"
            />
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-black text-white">
          XYZ School
        </h1>

        <p className="mt-2 text-sm font-semibold text-emerald-200">
          ERP Management System
        </p>

        <div className="mt-7 flex items-center justify-center gap-3">
          <LoaderCircle
            size={20}
            className="animate-spin text-emerald-300"
          />

          <span className="text-sm font-bold text-white">
            {text}
          </span>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-300">
          {subText}
        </p>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              ease: "easeInOut",
            }}
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500"
          />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <ShieldCheck size={14} />
          Secure workspace
        </div>
      </div>
    </div>
  );
}

export default FullScreenLoader;