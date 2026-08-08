import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";

const colors = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#f59e0b",
  "#ef4444",
];

const Loader = () => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]">
      <motion.div
        animate={{
          rotate: 360,
          borderColor: colors,
        }}
        transition={{
          rotate: {
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          },
          borderColor: {
            repeat: Infinity,
            duration: 3,
          },
        }}
        className="w-16 h-16 rounded-full border-4 border-t-transparent"
      />

      <motion.p
        className="mt-6 text-xl font-bold"
        animate={{
          color: colors,
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
        }}
      >
        Loading...
      </motion.p>
    </div>
  );
};

export default Loader;