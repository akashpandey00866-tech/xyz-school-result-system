import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedAdminRoute({
  children,
}) {
  const location = useLocation();

  const {
    user,
    role,
    loading,
    profileLoading,
    isAccountActive,
  } = useAuth();

  /* =========================================================
     AUTH SESSION RESTORING
     Firebase session restore hone tak redirect nahi karna.
     Isse page refresh/navigation ke time login flash nahi hoga.
  ========================================================= */

  if (
    loading ||
    profileLoading
  ) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background:
            "var(--school-bg, #f8fafc)",
          color:
            "var(--school-text, #0f172a)",
        }}
      >
        <div className="text-center">

          <div
            className="mx-auto h-12 w-12 rounded-full border-4 animate-spin"
            style={{
              borderColor:
                "var(--school-primary-light, #d1fae5)",
              borderTopColor:
                "var(--school-primary, #059669)",
            }}
          />

          <h2
            className="mt-5 text-lg font-black"
            style={{
              color:
                "var(--school-text, #0f172a)",
            }}
          >
            Securing Admin Portal
          </h2>

          <p
            className="mt-2 text-sm"
            style={{
              color:
                "var(--school-muted, #64748b)",
            }}
          >
            Restoring your secure school session…
          </p>

        </div>
      </div>
    );
  }

  /* =========================================================
     NO FIREBASE SESSION
     
     IMPORTANT:
     Protected route sirf redirect karega.
     signOut(), history manipulation ya popstate
     yahan nahi hoga.
  ========================================================= */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search +
            location.hash,
          reason:
            "authentication-required",
        }}
      />
    );
  }

  /* =========================================================
     ROLE PROTECTION
  ========================================================= */

  if (
    role !== "admin"
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search +
            location.hash,
          reason:
            "unauthorized-role",
        }}
      />
    );
  }

  /* =========================================================
     ACCOUNT STATUS
  ========================================================= */

  if (
    isAccountActive === false
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search +
            location.hash,
          reason:
            "account-inactive",
        }}
      />
    );
  }

  /* =========================================================
     AUTHORIZED ADMIN
     
     Children remain mounted through the route system.
     Internal navigation will NOT trigger logout.
  ========================================================= */

  return children;
}