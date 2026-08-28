import { Link } from "react-router-dom";
import StudentLayout from "../layouts/StudentLayout";

function Home() {
  const features = [
    {
      icon: "🔐",
      title: "One Secure Login",
      text: "A single portal automatically opens the dashboard allowed for your role.",
    },
    {
      icon: "🎓",
      title: "Student ERP",
      text: "Results, internal marks, practical marks, profile, fees and academic information.",
    },
    {
      icon: "👨‍🏫",
      title: "Teacher Portal",
      text: "Assigned-class attendance, authorized results, notices and teacher requests.",
    },
    {
      icon: "👑",
      title: "Admin Control",
      text: "Manage students, teachers, results, fees, subjects, publishing and verification.",
    },
    {
      icon: "📊",
      title: "Live Academic Data",
      text: "Connected to Firebase for structured and real-time school information.",
    },
    {
      icon: "📄",
      title: "Digital Documents",
      text: "View, print and download official academic information where permitted.",
    },
  ];

  const roles = [
    {
      icon: "🎓",
      title: "Student",
      text: "Results • Fees • Profile • Academic performance",
    },
    {
      icon: "👨‍🏫",
      title: "Teacher",
      text: "Attendance • Marks • Notices • Assigned class",
    },
    {
      icon: "👑",
      title: "Administrator",
      text: "ERP management • Verification • Publishing • Control",
    },
  ];

  return (
    <StudentLayout>
      <div className="min-h-screen bg-slate-950 text-white overflow-hidden">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative min-h-[calc(100vh-70px)] flex items-center">

          {/* Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(6,182,212,.22),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(99,102,241,.22),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#082f49)]" />

          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-48 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 w-full">

            <div className="grid lg:grid-cols-2 gap-14 items-center">

              {/* LEFT */}

              <div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-300/20 text-cyan-200 text-xs sm:text-sm font-black tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                  SMART SCHOOL ERP • SECURE PORTAL
                </div>

                <h1 className="mt-7 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[.95]">
                  XYZ
                  <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                    School ERP
                  </span>
                </h1>

                <h2 className="mt-6 text-xl sm:text-2xl font-bold text-slate-200">
                  One portal for Students, Teachers & Administration
                </h2>

                <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-400 leading-8">
                  A modern, role-based school management portal for
                  academic results, attendance, fees, profiles,
                  communication and administrative operations.
                </p>

                {/* CTA */}

                <div className="flex flex-wrap gap-3 mt-9">

                  <Link
                    to="/login"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-black shadow-xl shadow-cyan-950/30 hover:scale-[1.02] hover:shadow-cyan-500/20 transition-all"
                  >
                    🔐 Open Secure Portal
                    <span className="group-hover:translate-x-1 transition">
                      →
                    </span>
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md font-black text-slate-100 hover:bg-white/15 transition-all"
                  >
                    👤 Login
                  </Link>

                </div>

                <p className="mt-4 text-xs text-slate-500">
                  One login • Automatic role detection • Firebase Authentication
                </p>

                {/* QUICK STATS */}

                <div className="grid grid-cols-3 gap-3 max-w-xl mt-10">

                  <Stat
                    value="3+"
                    label="Core Roles"
                  />

                  <Stat
                    value="24/7"
                    label="Portal Access"
                  />

                  <Stat
                    value="🔒"
                    label="Secure Auth"
                  />

                </div>

              </div>

              {/* RIGHT */}

              <div className="relative">

                {/* Main card */}

                <div className="relative rounded-[2rem] bg-white/[0.07] border border-white/10 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl">

                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <p className="text-[10px] uppercase tracking-[.25em] text-cyan-300 font-black">
                        Portal Access
                      </p>

                      <h3 className="text-2xl font-black mt-1">
                        Choose nothing.
                      </h3>

                      <p className="text-slate-400 text-sm mt-1">
                        Your role decides your dashboard.
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl shadow-lg">
                      🏫
                    </div>

                  </div>

                  <div className="space-y-3 mt-7">

                    {roles.map((role) => (
                      <RoleCard
                        key={role.title}
                        {...role}
                      />
                    ))}

                  </div>

                  <div className="mt-5 p-4 rounded-2xl bg-emerald-400/10 border border-emerald-300/10">
                    <div className="flex gap-3">

                      <span className="text-xl">
                        🛡️
                      </span>

                      <div>
                        <p className="font-black text-emerald-200 text-sm">
                          Role-based access
                        </p>

                        <p className="text-xs text-slate-400 mt-1 leading-5">
                          Users only receive the portal access
                          assigned to their authenticated account.
                        </p>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Floating badge */}

                <div className="hidden sm:flex absolute -right-5 -top-5 items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl">
                  <span className="text-lg">
                    ⚡
                  </span>

                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-black">
                      Smart
                    </p>

                    <p className="text-xs font-black">
                      Connected ERP
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* =================================================
            FEATURES
        ================================================= */}

        <section className="relative border-t border-white/5 bg-slate-950 py-20">

          <div className="max-w-7xl mx-auto px-5 sm:px-6">

            <div className="max-w-2xl">

              <p className="text-xs uppercase tracking-[.25em] text-cyan-300 font-black">
                Built for the complete school ecosystem
              </p>

              <h2 className="text-3xl sm:text-4xl font-black mt-3">
                Everything connected in one place.
              </h2>

              <p className="text-slate-400 mt-4 leading-7">
                The portal is designed so each role sees the tools
                relevant to its responsibilities while sensitive
                administrative functions remain protected.
              </p>

            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">

              {features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  {...feature}
                />
              ))}

            </div>

          </div>
        </section>

        {/* =================================================
            SECURITY
        ================================================= */}

        <section className="relative py-16 border-t border-white/5 bg-[#07111f]">

          <div className="max-w-5xl mx-auto px-5 sm:px-6">

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 sm:p-10">

              <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">

                <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-300/10 flex items-center justify-center text-3xl">
                  🔐
                </div>

                <div>

                  <p className="text-cyan-300 text-xs uppercase tracking-[.25em] font-black">
                    Security First
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black mt-2">
                    Your account decides what you can access.
                  </h2>

                  <p className="text-slate-400 mt-3 leading-7">
                    Authentication, role detection and database
                    permissions work together. Passwords should remain
                    inside Firebase Authentication rather than being
                    stored as normal Firestore profile data.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-5">

                    <SecurityPill>
                      🔒 Firebase Authentication
                    </SecurityPill>

                    <SecurityPill>
                      👤 Role Based Access
                    </SecurityPill>

                    <SecurityPill>
                      🛡️ Protected Admin Area
                    </SecurityPill>

                    <SecurityPill>
                      📊 Controlled Data Access
                    </SecurityPill>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* =================================================
            FINAL CTA
        ================================================= */}

        <section className="relative py-20 bg-gradient-to-r from-cyan-950 via-blue-950 to-violet-950 border-t border-white/5">

          <div className="max-w-4xl mx-auto px-5 text-center">

            <div className="text-5xl">
              🚀
            </div>

            <h2 className="text-3xl sm:text-5xl font-black mt-5">
              Ready to enter the portal?
            </h2>

            <p className="text-slate-300 mt-4 max-w-2xl mx-auto leading-7">
              Sign in with your authorized school account.
              Your dashboard will be selected automatically.
            </p>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-2xl bg-white text-slate-950 font-black hover:scale-[1.02] transition shadow-2xl"
            >
              Open Secure Login →
            </Link>

          </div>
        </section>

        {/* FOOTER */}

        <footer className="bg-slate-950 border-t border-white/5 py-8">

          <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3">

            <p className="text-xs text-slate-500">
              © 2026 XYZ Public School ERP
            </p>

            <p className="text-xs text-slate-600">
              Secure • Role Based • Connected
            </p>

          </div>

        </footer>

      </div>
    </StudentLayout>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Stat({
  value,
  label,
}) {
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
      <p className="text-xl sm:text-2xl font-black text-white">
        {value}
      </p>

      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
        {label}
      </p>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  text,
}) {
  return (
    <div className="group rounded-2xl bg-white/[0.06] border border-white/10 p-4 hover:bg-white/[0.10] hover:border-cyan-300/20 transition-all">

      <div className="flex items-center gap-4">

        <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-950/70 flex items-center justify-center text-xl">
          {icon}
        </div>

        <div className="min-w-0">

          <div className="flex items-center gap-2">
            <h4 className="font-black">
              {title}
            </h4>

            <span className="text-cyan-300 opacity-0 group-hover:opacity-100 transition">
              →
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 leading-5">
            {text}
          </p>

        </div>

      </div>

    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}) {
  return (
    <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6 hover:bg-white/[0.07] hover:-translate-y-1 transition-all">

      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-400/20 border border-white/10 flex items-center justify-center text-xl">
        {icon}
      </div>

      <h3 className="font-black text-lg mt-5">
        {title}
      </h3>

      <p className="text-sm text-slate-400 mt-2 leading-6">
        {text}
      </p>

    </div>
  );
}

function SecurityPill({
  children,
}) {
  return (
    <span className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-bold text-slate-300">
      {children}
    </span>
  );
}

export default Home;