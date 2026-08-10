import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";

function Loader({
  size = "md",
  text = "Loading...",
  fullScreen = false,
}) {
  const sizes = {
    sm: 24,
    md: 36,
    lg: 52,
  };

  const spinnerSize = sizes[size] || sizes.md;

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 0.9,
          ease: "linear",
        }}
        className="rounded-full border-4 border-emerald-100 border-t-emerald-600"
        style={{
          width: spinnerSize,
          height: spinnerSize,
        }}
      />

      {text && (
        <motion.p
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.8,
          }}
          className="text-sm font-semibold text-slate-600"
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm">
        <div className="rounded-3xl bg-white px-8 py-7 shadow-2xl border border-slate-200">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export default Loader;