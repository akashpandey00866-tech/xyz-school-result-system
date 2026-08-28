import { useEffect, useRef } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export default function ProtectedStudentRoute({
  children,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const backTriggered = useRef(false);

  const {
    user,
    role,
    loading,
    profileLoading,
    isAccountActive,
  } = useAuth();

  useEffect(() => {
    if (
      loading ||
      profileLoading ||
      !user
    ) {
      return undefined;
    }

    /* Browser Back = terminate portal session. */
    const currentUrl =
      window.location.href;

    window.history.pushState(
      {
        xyzProtected: true,
      },
      "",
      currentUrl
    );

    const handlePopState = async () => {
      if (backTriggered.current) {
        return;
      }

      backTriggered.current = true;

      try {
        await signOut(auth);
      } catch (error) {
        console.warn(
          "Student back-logout cleanup:",
          error
        );
      } finally {
        navigate(
          "/login",
          {
            replace: true,
            state: {
              reason: "back",
              from:
                location.pathname,
            },
          }
        );
      }
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, [
    loading,
    profileLoading,
    user,
    navigate,
    location.pathname,
  ]);

  if (
    loading ||
    profileLoading
  ) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-white/10 border-t-cyan-400 animate-spin" />
          <p className="mt-5 text-lg font-black text-white">
            Securing Student Portal
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Verifying your school account…
          </p>
        </div>
      </div>
    );
  }

  if (
    !user ||
    role !== "student" ||
    isAccountActive === false
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  return children;
}
