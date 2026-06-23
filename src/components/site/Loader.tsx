import { motion } from "framer-motion";
import logo from "@/assets/bharatone-logo.png";

export function Loader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
    >
      {/* tricolor sweeping bands */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
          className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-r from-transparent via-saffron/15 to-transparent"
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: "-100%" }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.4 }}
          className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-r from-transparent via-india-green/15 to-transparent"
        />
      </motion.div>

      <div className="relative flex flex-col items-center gap-7">
        {/* rotating ashoka-style ring around logo */}
        <div className="relative h-32 w-32 flex items-center justify-center">
          <motion.svg
            className="absolute inset-0"
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.19 48)" />
                <stop offset="50%" stopColor="oklch(0.45 0.13 250)" />
                <stop offset="100%" stopColor="oklch(0.52 0.15 152)" />
              </linearGradient>
            </defs>
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="url(#ring)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.6"
            />
            {/* 24 spokes — Ashoka chakra reference */}
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1="50" y1="6" x2="50" y2="14"
                stroke="oklch(0.45 0.13 250)"
                strokeWidth="1.2"
                strokeLinecap="round"
                transform={`rotate(${i * 15} 50 50)`}
                opacity="0.55"
              />
            ))}
          </motion.svg>

          {/* counter-rotating outer arc */}
          <motion.svg
            className="absolute inset-0"
            viewBox="0 0 100 100"
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="oklch(0.7 0.19 48)"
              strokeWidth="2"
              strokeDasharray="60 200"
              strokeLinecap="round"
            />
          </motion.svg>

          {/* logo with subtle breathing */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.95, 1, 0.95], opacity: 1 }}
            transition={{
              opacity: { duration: 0.6 },
              scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative h-16 w-16 rounded-2xl bg-card shadow-soft flex items-center justify-center p-2"
          >
            <img
              src={logo}
              alt="BharatOne"
              className="h-full w-full object-contain"
              style={{ filter: "drop-shadow(0 2px 8px oklch(0.7 0.19 48 / 0.3))" }}
            />
          </motion.div>
        </div>

        {/* wordmark + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="font-display font-bold text-2xl tracking-tight">
            <span className="text-saffron">Bharat</span>
            <span>One</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mt-1">
            For Serving Indian Citizens
          </div>
        </motion.div>

        {/* tricolor progress bar */}
        <div className="relative h-1 w-48 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-saffron via-white to-india-green"
          />
        </div>
      </div>
    </motion.div>
  );
}
