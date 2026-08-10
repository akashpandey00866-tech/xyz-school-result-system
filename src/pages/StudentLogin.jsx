import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
} from "firebase/auth";

import { auth, db } from "../config/firebase";

/* =========================================================
   STUDENT LOGIN
========================================================= */

function StudentLogin() {
  const navigate = useNavigate();

  /* =======================================================
     LOGIN STATE
  ======================================================= */

  const [loginValue, setLoginValue] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [remember, setRemember] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     FORGOT PASSWORD STATE
  ======================================================= */

  const [showForgotPassword, setShowForgotPassword] =
    useState(false);

  const [resetValue, setResetValue] =
    useState("");

  const [resetLoading, setResetLoading] =
    useState(false);

  const [resetMessage, setResetMessage] =
    useState("");

  const [resetError, setResetError] =
    useState("");

  /* =======================================================
     FIRST LOGIN PASSWORD CHANGE
  ======================================================= */

  const [showChangePassword, setShowChangePassword] =
    useState(false);

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [currentStudent, setCurrentStudent] =
    useState(null);

  /* =======================================================
     FORM HANDLERS
  ======================================================= */

  const handleLoginValueChange = (event) => {
    setLoginValue(event.target.value);

    if (error) {
      setError("");
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    if (error) {
      setError("");
    }
  };

  /* =======================================================
     FIND STUDENT PROFILE
     
     Student can enter:
     - Enrollment Number
     - Mobile Number
     - Email
     
     We find the Firestore profile first,
     then use the accountEmail to login to Firebase Auth.
  ======================================================= */

  const findStudent = async (value) => {
    const cleanValue =
      value.trim();

    const lowerValue =
      cleanValue.toLowerCase();

    /* -------------------------------------------------------
       1. EMAIL
    ------------------------------------------------------- */

    let snapshot = await getDocs(
      query(
        collection(db, "students"),
        where(
          "email",
          "==",
          lowerValue
        )
      )
    );

    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };
    }

    /* -------------------------------------------------------
       2. ACCOUNT EMAIL
    ------------------------------------------------------- */

    snapshot = await getDocs(
      query(
        collection(db, "students"),
        where(
          "accountEmail",
          "==",
          lowerValue
        )
      )
    );

    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };
    }

    /* -------------------------------------------------------
       3. ENROLLMENT NUMBER
       
       Support both:
       enrollmentNo
       enrollmentNumber
    ------------------------------------------------------- */

    snapshot = await getDocs(
      query(
        collection(db, "students"),
        where(
          "enrollmentNo",
          "==",
          cleanValue
        )
      )
    );

    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };
    }

    snapshot = await getDocs(
      query(
        collection(db, "students"),
        where(
          "enrollmentNumber",
          "==",
          cleanValue
        )
      )
    );

    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };
    }

    /* -------------------------------------------------------
       4. MOBILE NUMBER
       
       Support common field names.
    ------------------------------------------------------- */

    const mobileFields = [
      "mobile",
      "mobileNumber",
      "phone",
      "phoneNumber",
    ];

    for (const field of mobileFields) {
      snapshot = await getDocs(
        query(
          collection(db, "students"),
          where(
            field,
            "==",
            cleanValue
          )
        )
      );

      if (!snapshot.empty) {
        return {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
      }
    }

    return null;
  };

  /* =======================================================
     GET LOGIN EMAIL
  ======================================================= */

  const getStudentLoginEmail = (
    student
  ) => {
    return (
      student?.accountEmail ||
      student?.email ||
      student?.studentEmail ||
      ""
    )
      .trim()
      .toLowerCase();
  };

  /* =======================================================
     STUDENT LOGIN
  ======================================================= */

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    const identifier =
      loginValue.trim();

    if (!identifier) {
      setError(
        "Enter your enrollment number, mobile number or registered email."
      );
      return;
    }

    if (!password.trim()) {
      setError(
        "Enter your password."
      );
      return;
    }

    try {
      setLoading(true);

      /* -----------------------------------------------
         FIND STUDENT PROFILE
      ----------------------------------------------- */

      const student =
        await findStudent(
          identifier
        );

      if (!student) {
        setError(
          "Student account was not found. Please check your login details."
        );
        return;
      }

      /* -----------------------------------------------
         ACCOUNT CHECK
      ----------------------------------------------- */

      if (
        student.accountStatus !==
        "ACTIVE"
      ) {
        setError(
          "Your student account is not active yet. Please contact the school administration."
        );
        return;
      }

      /* -----------------------------------------------
         AUTH EMAIL
      ----------------------------------------------- */

      const email =
        getStudentLoginEmail(
          student
        );

      if (!email) {
        setError(
          "No login email is linked with this student account. Please contact the school administration."
        );
        return;
      }

      /* -----------------------------------------------
         FIREBASE AUTH LOGIN
      ----------------------------------------------- */

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const firebaseUser =
        credential.user;

      /* -----------------------------------------------
         STORE SAFE STUDENT SESSION
         
         DO NOT STORE PASSWORD.
      ----------------------------------------------- */

      const safeStudent = {
        id: student.id,

        authUid:
          firebaseUser.uid,

        name:
          student.name ||
          student.fullName ||
          student.studentName ||
          "",

        enrollmentNo:
          student.enrollmentNo ||
          student.enrollmentNumber ||
          "",

        className:
          student.className ||
          student.class ||
          "",

        section:
          student.section ||
          "",

        email,

        mobile:
          student.mobile ||
          student.mobileNumber ||
          student.phone ||
          student.phoneNumber ||
          "",

        accountStatus:
          student.accountStatus,

        mustChangePassword:
          student.mustChangePassword ===
          true,
      };

      /* -----------------------------------------------
         REMEMBER ME
      ----------------------------------------------- */

      if (remember) {
        localStorage.setItem(
          "student",
          JSON.stringify(
            safeStudent
          )
        );

        localStorage.setItem(
          "studentLoggedIn",
          "true"
        );
      } else {
        sessionStorage.setItem(
          "student",
          JSON.stringify(
            safeStudent
          )
        );

        sessionStorage.setItem(
          "studentLoggedIn",
          "true"
        );

        /*
         * Remove old persistent session
         * if Remember Me was previously selected.
         */
        localStorage.removeItem(
          "student"
        );

        localStorage.removeItem(
          "studentLoggedIn"
        );
      }

      /* -----------------------------------------------
         FIRST LOGIN
      ----------------------------------------------- */

      if (
        student.mustChangePassword ===
        true
      ) {
        setCurrentStudent(
          safeStudent
        );

        setShowChangePassword(
          true
        );

        return;
      }

      /* -----------------------------------------------
         NORMAL LOGIN
      ----------------------------------------------- */

      navigate(
        "/student-dashboard",
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error(
        "Student Login Error:",
        err
      );

      if (
        err?.code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Incorrect login details or password."
        );
      } else if (
        err?.code ===
        "auth/user-not-found"
      ) {
        setError(
          "Student account does not exist."
        );
      } else if (
        err?.code ===
        "auth/wrong-password"
      ) {
        setError(
          "Incorrect password."
        );
      } else if (
        err?.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many login attempts. Please try again later."
        );
      } else if (
        err?.code ===
        "auth/network-request-failed"
      ) {
        setError(
          "Network error. Please check your internet connection."
        );
      } else {
        setError(
          "Unable to login. Please check your details and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     PASSWORD STRENGTH
  ======================================================= */

  const getPasswordStrength = () => {
    if (!newPassword) {
      return {
        text: "Enter a new password",
        level: 0,
      };
    }

    let score = 0;

    if (
      newPassword.length >= 8
    ) {
      score++;
    }

    if (
      /[A-Z]/.test(
        newPassword
      )
    ) {
      score++;
    }

    if (
      /[0-9]/.test(
        newPassword
      )
    ) {
      score++;
    }

    if (
      /[^A-Za-z0-9]/.test(
        newPassword
      )
    ) {
      score++;
    }

    if (score <= 1) {
      return {
        text: "Weak password",
        level: 1,
      };
    }

    if (score === 2) {
      return {
        text: "Fair password",
        level: 2,
      };
    }

    if (score === 3) {
      return {
        text: "Good password",
        level: 3,
      };
    }

    return {
      text: "Strong password",
      level: 4,
    };
  };

  /* =======================================================
     FIRST LOGIN PASSWORD CHANGE
  ======================================================= */

  const handleCreateNewPassword =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        newPassword.length <
        8
      ) {
        setError(
          "New password must contain at least 8 characters."
        );
        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          "New password and confirm password do not match."
        );
        return;
      }

      if (
        newPassword ===
        password
      ) {
        setError(
          "New password must be different from your temporary password."
        );
        return;
      }

      try {
        setChangingPassword(
          true
        );

        const user =
          auth.currentUser;

        if (!user) {
          setError(
            "Your login session expired. Please login again."
          );
          return;
        }

        /* -----------------------------------------------
           UPDATE FIREBASE AUTH PASSWORD
        ----------------------------------------------- */

        await updatePassword(
          user,
          newPassword
        );

        /* -----------------------------------------------
           UPDATE FIRESTORE PROFILE
        ----------------------------------------------- */

        if (
          currentStudent?.id
        ) {
          await updateDoc(
            doc(
              db,
              "students",
              currentStudent.id
            ),
            {
              mustChangePassword:
                false,

              accountUpdatedAt:
                new Date(),
            }
          );
        }

        /* -----------------------------------------------
           UPDATE LOCAL SESSION
        ----------------------------------------------- */

        const updatedStudent = {
          ...currentStudent,

          mustChangePassword:
            false,
        };

        if (remember) {
          localStorage.setItem(
            "student",
            JSON.stringify(
              updatedStudent
            )
          );
        } else {
          sessionStorage.setItem(
            "student",
            JSON.stringify(
              updatedStudent
            )
          );
        }

        /* -----------------------------------------------
           CLEAN PASSWORD STATES
        ----------------------------------------------- */

        setPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setShowChangePassword(
          false
        );

        /* -----------------------------------------------
           GO DASHBOARD
        ----------------------------------------------- */

        navigate(
          "/student-dashboard",
          {
            replace: true,
          }
        );
      } catch (err) {
        console.error(
          "Password Update Error:",
          err
        );

        if (
          err?.code ===
          "auth/requires-recent-login"
        ) {
          setError(
            "For security, please login again before changing your password."
          );

          await signOut(
            auth
          );

          localStorage.removeItem(
            "student"
          );

          localStorage.removeItem(
            "studentLoggedIn"
          );

          sessionStorage.removeItem(
            "student"
          );

          sessionStorage.removeItem(
            "studentLoggedIn"
          );

          setShowChangePassword(
            false
          );
        } else if (
          err?.code ===
          "auth/weak-password"
        ) {
          setError(
            "Password is too weak. Use at least 8 characters with letters, numbers and symbols."
          );
        } else {
          setError(
            "Unable to update password. Please try again."
          );
        }
      } finally {
        setChangingPassword(
          false
        );
      }
    };

  /* =======================================================
     FORGOT PASSWORD
  ======================================================= */

  const handleForgotPassword =
    async (event) => {
      event.preventDefault();

      setResetError("");
      setResetMessage("");

      const value =
        resetValue.trim();

      if (!value) {
        setResetError(
          "Enter your registered email, mobile number or enrollment number."
        );
        return;
      }

      try {
        setResetLoading(
          true
        );

        /* -----------------------------------------------
           FIND STUDENT
        ----------------------------------------------- */

        const student =
          await findStudent(
            value
          );

        if (!student) {
          setResetError(
            "No student account was found with these details."
          );
          return;
        }

        if (
          student.accountStatus !==
          "ACTIVE"
        ) {
          setResetError(
            "This student account is not active."
          );
          return;
        }

        const email =
          getStudentLoginEmail(
            student
          );

        if (!email) {
          setResetError(
            "No registered email is linked with this account. Please contact the school."
          );
          return;
        }

        /* -----------------------------------------------
           SEND FIREBASE RESET EMAIL
        ----------------------------------------------- */

        await sendPasswordResetEmail(
          auth,
          email
        );

        setResetMessage(
          `Password reset instructions have been sent to ${email}. Please check your inbox and spam folder.`
        );
      } catch (err) {
        console.error(
          "Forgot Password Error:",
          err
        );

        if (
          err?.code ===
          "auth/invalid-email"
        ) {
          setResetError(
            "The registered email address is invalid."
          );
        } else if (
          err?.code ===
          "auth/too-many-requests"
        ) {
          setResetError(
            "Too many reset requests. Please try again later."
          );
        } else {
          setResetError(
            "Unable to send password reset email. Please try again."
          );
        }
      } finally {
        setResetLoading(
          false
        );
      }
    };

  /* =======================================================
     PASSWORD STRENGTH DATA
  ======================================================= */

  const passwordStrength =
    getPasswordStrength();

  /* =======================================================
     FIRST LOGIN PASSWORD SCREEN
  ======================================================= */

  if (showChangePassword) {
    return (
      <div
        style={
          pageStyle
        }
      >
        <div
          style={
            loginContainerStyle
          }
        >
          <div
            style={
              schoolHeaderStyle
            }
          >
            <div
              style={
                schoolLogoStyle
              }
            >
              🏫
            </div>

            <div>
              <h1
                style={
                  schoolNameStyle
                }
              >
                XYZ PUBLIC SCHOOL
              </h1>

              <p
                style={
                  schoolSubtitleStyle
                }
              >
                Student Portal
              </p>
            </div>
          </div>

          <div
            style={
              cardStyle
            }
          >
            <div
              style={{
                textAlign:
                  "center",
                marginBottom:
                  "23px",
              }}
            >
              <div
                style={{
                  width:
                    "55px",
                  height:
                    "55px",
                  borderRadius:
                    "50%",
                  background:
                    "#fef3c7",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize:
                    "26px",
                  margin:
                    "0 auto 12px",
                }}
              >
                🔐
              </div>

              <h2
                style={{
                  margin:
                    0,
                  fontSize:
                    "24px",
                  fontWeight:
                    "800",
                  color:
                    "#0f172a",
                }}
              >
                Create New Password
              </h2>

              <p
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "13px",
                  lineHeight:
                    "1.6",
                  margin:
                    "8px 0 0",
                }}
              >
                Welcome{" "}
                <strong>
                  {currentStudent?.name ||
                    "Student"}
                </strong>
                . For your security,
                create a new password
                before entering your
                dashboard.
              </p>
            </div>

            {error && (
              <div
                style={
                  errorStyle
                }
              >
                ⚠️ {error}
              </div>
            )}

            <form
              onSubmit={
                handleCreateNewPassword
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                NEW PASSWORD
              </label>

              <div
                style={
                  passwordWrapperStyle
                }
              >
                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    newPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  style={
                    passwordInputStyle
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      (
                        value
                      ) =>
                        !value
                    )
                  }
                  style={
                    showButtonStyle
                  }
                >
                  {showNewPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              <div
                style={{
                  marginTop:
                    "8px",
                  fontSize:
                    "12px",
                  color:
                    passwordStrength.level >=
                    3
                      ? "#15803d"
                      : "#64748b",
                  fontWeight:
                    "700",
                }}
              >
                {passwordStrength.text}
              </div>

              <div
                style={{
                  marginTop:
                    "7px",
                  height:
                    "5px",
                  background:
                    "#e2e8f0",
                  borderRadius:
                    "99px",
                  overflow:
                    "hidden",
                }}
              >
                <div
                  style={{
                    width:
                      `${passwordStrength.level * 25}%`,
                    height:
                      "100%",
                    background:
                      passwordStrength.level >=
                      3
                        ? "#16a34a"
                        : "#f59e0b",
                    transition:
                      "0.25s",
                  }}
                />
              </div>

              <label
                style={{
                  ...labelStyle,
                  marginTop:
                    "19px",
                }}
              >
                CONFIRM PASSWORD
              </label>

              <div
                style={
                  passwordWrapperStyle
                }
              >
                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  style={
                    passwordInputStyle
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (
                        value
                      ) =>
                        !value
                    )
                  }
                  style={
                    showButtonStyle
                  }
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              <div
                style={
                  securityInfoStyle
                }
              >
                <strong>
                  Password tips
                </strong>

                <div
                  style={{
                    marginTop:
                      "5px",
                  }}
                >
                  • At least 8 characters
                  <br />
                  • Use uppercase and lowercase
                  letters
                  <br />
                  • Add numbers and a symbol
                  <br />
                  • Do not share your password
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  changingPassword
                }
                style={{
                  ...loginButtonStyle,
                  marginTop:
                    "20px",
                  opacity:
                    changingPassword
                      ? 0.65
                      : 1,
                }}
              >
                {changingPassword
                  ? "Updating Password..."
                  : "Create Password & Continue"}
              </button>
            </form>
          </div>

          <p
            style={
              footerStyle
            }
          >
            © 2026 XYZ PUBLIC SCHOOL
            <br />
            Secure Student ERP Portal
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     NORMAL LOGIN SCREEN
  ======================================================= */

  return (
    <div
      style={
        pageStyle
      }
    >
      <div
        style={
          loginContainerStyle
        }
      >
        {/* SCHOOL HEADER */}

        <div
          style={
            schoolHeaderStyle
          }
        >
          <div
            style={
              schoolLogoStyle
            }
          >
            🏫
          </div>

          <div>
            <h1
              style={
                schoolNameStyle
              }
            >
              XYZ PUBLIC SCHOOL
            </h1>

            <p
              style={
                schoolSubtitleStyle
              }
            >
              Student ERP Portal
            </p>
          </div>
        </div>

        {/* LOGIN CARD */}

        <div
          style={
            cardStyle
          }
        >
          <div
            style={{
              marginBottom:
                "22px",
            }}
          >
            <h2
              style={{
                margin:
                  0,
                fontSize:
                  "25px",
                fontWeight:
                  "800",
                color:
                  "#0f172a",
              }}
            >
              Student Login
            </h2>

            <p
              style={{
                margin:
                  "7px 0 0",
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              Access your results,
              fees and academic
              information.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div
              style={
                errorStyle
              }
            >
              ⚠️ {error}
            </div>
          )}

          {/* FORM */}

          <form
            onSubmit={
              handleLogin
            }
          >
            {/* LOGIN IDENTIFIER */}

            <label
              style={
                labelStyle
              }
            >
              ENROLLMENT / MOBILE / EMAIL
            </label>

            <input
              type="text"
              value={
                loginValue
              }
              onChange={
                handleLoginValueChange
              }
              placeholder="Enrollment No., mobile or email"
              autoComplete="username"
              style={
                inputStyle
              }
            />

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "#94a3b8",
                fontSize:
                  "11px",
              }}
            >
              You can use any one of
              your registered login
              details.
            </div>

            {/* PASSWORD */}

            <label
              style={{
                ...labelStyle,
                marginTop:
                  "19px",
              }}
            >
              PASSWORD
            </label>

            <div
              style={
                passwordWrapperStyle
              }
            >
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={
                  handlePasswordChange
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                style={
                  passwordInputStyle
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      value
                    ) =>
                      !value
                  )
                }
                style={
                  showButtonStyle
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>

            {/* REMEMBER + FORGOT */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap:
                  "10px",
                marginTop:
                  "15px",
              }}
            >
              <label
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "7px",
                  fontSize:
                    "12px",
                  color:
                    "#475569",
                  cursor:
                    "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    remember
                  }
                  onChange={(
                    event
                  ) =>
                    setRemember(
                      event.target
                        .checked
                    )
                  }
                  style={{
                    accentColor:
                      "#15803d",
                  }}
                />

                Remember me
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(
                    true
                  );
                  setResetValue(
                    loginValue
                  );
                  setResetError("");
                  setResetMessage("");
                }}
                style={
                  forgotButtonStyle
                }
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN */}

            <button
              type="submit"
              disabled={
                loading
              }
              style={{
                ...loginButtonStyle,
                marginTop:
                  "21px",
                opacity:
                  loading
                    ? 0.65
                    : 1,
              }}
            >
              {loading ? (
                <span
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap:
                      "9px",
                  }}
                >
                  <span
                    style={
                      spinnerStyle
                    }
                  />

                  Signing In...
                </span>
              ) : (
                "Student Login →"
              )}
            </button>
          </form>

          {/* QUICK FEATURES */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "9px",
              marginTop:
                "18px",
            }}
          >
            <FeatureCard
              icon="📊"
              title="Results"
              description="View published marks"
            />

            <FeatureCard
              icon="💰"
              title="Fees"
              description="View fee status"
            />
          </div>

          {/* HELP */}

          <div
            style={
              helpBoxStyle
            }
          >
            <div
              style={{
                fontWeight:
                  "800",
                color:
                  "#334155",
                marginBottom:
                  "7px",
              }}
            >
              🔐 Login Help
            </div>

            <div
              style={{
                lineHeight:
                  "1.7",
              }}
            >
              • Use your registered
              enrollment number,
              mobile or email.
              <br />
              • Use the password
              provided by the school.
              <br />
              • First-time users must
              create a new password.
              <br />
              • Forgot your password?
              Use the reset option
              above.
            </div>
          </div>

          {/* BACK HOME */}

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            style={
              backButtonStyle
            }
          >
            ← Back to Home
          </button>
        </div>

        {/* FOOTER */}

        <p
          style={
            footerStyle
          }
        >
          © 2026 XYZ PUBLIC SCHOOL
          <br />
          Secure Student ERP Portal
        </p>
      </div>

      {/* ===================================================
          FORGOT PASSWORD MODAL
      =================================================== */}

      {showForgotPassword && (
        <div
          style={
            overlayStyle
          }
          onMouseDown={() =>
            setShowForgotPassword(
              false
            )
          }
        >
          <div
            style={
              forgotModalStyle
            }
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div
              style={{
                textAlign:
                  "center",
                marginBottom:
                  "20px",
              }}
            >
              <div
                style={{
                  width:
                    "55px",
                  height:
                    "55px",
                  borderRadius:
                    "50%",
                  background:
                    "#fee2e2",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize:
                    "25px",
                  margin:
                    "0 auto 11px",
                }}
              >
                🔑
              </div>

              <h2
                style={{
                  margin:
                    0,
                  fontSize:
                    "22px",
                  fontWeight:
                    "800",
                }}
              >
                Forgot Password?
              </h2>

              <p
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "12px",
                  lineHeight:
                    "1.5",
                  margin:
                    "7px 0 0",
                }}
              >
                Enter your enrollment
                number, registered
                mobile or email. We
                will send a secure
                password reset link to
                your registered email.
              </p>
            </div>

            {resetError && (
              <div
                style={
                  errorStyle
                }
              >
                ⚠️ {resetError}
              </div>
            )}

            {resetMessage && (
              <div
                style={
                  successStyle
                }
              >
                ✓ {resetMessage}
              </div>
            )}

            <form
              onSubmit={
                handleForgotPassword
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                STUDENT DETAILS
              </label>

              <input
                type="text"
                value={
                  resetValue
                }
                onChange={(
                  event
                ) =>
                  setResetValue(
                    event.target
                      .value
                  )
                }
                placeholder="Enrollment, mobile or email"
                autoFocus
                style={
                  inputStyle
                }
              />

              <button
                type="submit"
                disabled={
                  resetLoading
                }
                style={{
                  ...loginButtonStyle,
                  marginTop:
                    "15px",
                  opacity:
                    resetLoading
                      ? 0.65
                      : 1,
                }}
              >
                {resetLoading
                  ? "Sending Reset Link..."
                  : "Send Password Reset Link"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowForgotPassword(
                    false
                  )
                }
                style={{
                  ...backButtonStyle,
                  marginTop:
                    "9px",
                }}
              >
                Cancel
              </button>
            </form>

            <div
              style={{
                marginTop:
                  "15px",
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius:
                  "10px",
                padding:
                  "10px",
                fontSize:
                  "11px",
                color:
                  "#64748b",
                lineHeight:
                  "1.5",
              }}
            >
              🔒 For security, the
              school cannot see or
              retrieve your old
              password. A secure reset
              link is used instead.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  icon,
  title,
  description,
}) {
  return (
    <div
      style={{
        background:
          "#f8fafc",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          "11px",
        padding:
          "11px",
        display:
          "flex",
        alignItems:
          "center",
        gap:
          "9px",
      }}
    >
      <div
        style={{
          fontSize:
            "20px",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize:
              "12px",
            fontWeight:
              "800",
            color:
              "#334155",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize:
              "10px",
            color:
              "#94a3b8",
            marginTop:
              "2px",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight:
    "100vh",
  background:
    "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 45%, #f8fafc 100%)",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  padding:
    "25px 16px",
  boxSizing:
    "border-box",
  fontFamily:
    "Inter, Arial, sans-serif",
};

const loginContainerStyle = {
  width:
    "100%",
  maxWidth:
    "475px",
};

const schoolHeaderStyle = {
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "13px",
  marginBottom:
    "19px",
};

const schoolLogoStyle = {
  width:
    "54px",
  height:
    "54px",
  borderRadius:
    "15px",
  background:
    "#15803d",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  fontSize:
    "27px",
  boxShadow:
    "0 8px 18px rgba(21,128,61,0.22)",
};

const schoolNameStyle = {
  margin:
    0,
  color:
    "#14532d",
  fontSize:
    "20px",
  fontWeight:
    "850",
  letterSpacing:
    "-0.02em",
};

const schoolSubtitleStyle = {
  margin:
    "3px 0 0",
  color:
    "#64748b",
  fontSize:
    "11px",
};

const cardStyle = {
  background:
    "#ffffff",
  border:
    "1px solid #e2e8f0",
  borderRadius:
    "20px",
  padding:
    "27px",
  boxShadow:
    "0 20px 55px rgba(15,23,42,0.10)",
};

const inputStyle = {
  width:
    "100%",
  boxSizing:
    "border-box",
  border:
    "1px solid #cbd5e1",
  borderRadius:
    "11px",
  padding:
    "12px 13px",
  outline:
    "none",
  fontSize:
    "13px",
  color:
    "#0f172a",
  background:
    "#ffffff",
};

const labelStyle = {
  display:
    "block",
  color:
    "#475569",
  fontSize:
    "11px",
  fontWeight:
    "800",
  letterSpacing:
    "0.04em",
  marginBottom:
    "7px",
};

const passwordWrapperStyle = {
  position:
    "relative",
};

const passwordInputStyle = {
  ...inputStyle,
  paddingRight:
    "65px",
};

const showButtonStyle = {
  position:
    "absolute",
  right:
    "10px",
  top:
    "50%",
  transform:
    "translateY(-50%)",
  border:
    "none",
  background:
    "transparent",
  color:
    "#15803d",
  fontWeight:
    "750",
  cursor:
    "pointer",
  fontSize:
    "11px",
};

const forgotButtonStyle = {
  border:
    "none",
  background:
    "transparent",
  color:
    "#15803d",
  cursor:
    "pointer",
  fontWeight:
    "750",
  fontSize:
    "12px",
  padding:
    0,
};

const loginButtonStyle = {
  width:
    "100%",
  border:
    "none",
  borderRadius:
    "11px",
  background:
    "#15803d",
  color:
    "#ffffff",
  padding:
    "13px",
  fontSize:
    "13px",
  fontWeight:
    "800",
  cursor:
    "pointer",
  boxShadow:
    "0 7px 16px rgba(21,128,61,0.18)",
};

const backButtonStyle = {
  width:
    "100%",
  border:
    "none",
  background:
    "transparent",
  color:
    "#64748b",
  padding:
    "9px",
  cursor:
    "pointer",
  fontSize:
    "12px",
  fontWeight:
    "650",
};

const errorStyle = {
  background:
    "#fef2f2",
  border:
    "1px solid #fecaca",
  color:
    "#b91c1c",
  borderRadius:
    "10px",
  padding:
    "11px 12px",
  fontSize:
    "12px",
  lineHeight:
    "1.5",
  marginBottom:
    "15px",
};

const successStyle = {
  background:
    "#ecfdf5",
  border:
    "1px solid #a7f3d0",
  color:
    "#047857",
  borderRadius:
    "10px",
  padding:
    "11px 12px",
  fontSize:
    "12px",
  lineHeight:
    "1.5",
  marginBottom:
    "15px",
};

const helpBoxStyle = {
  marginTop:
    "17px",
  background:
    "#f8fafc",
  border:
    "1px solid #e2e8f0",
  borderRadius:
    "11px",
  padding:
    "12px",
  color:
    "#64748b",
  fontSize:
    "11px",
  lineHeight:
    "1.6",
};

const securityInfoStyle = {
  marginTop:
    "14px",
  background:
    "#eff6ff",
  border:
    "1px solid #bfdbfe",
  borderRadius:
    "10px",
  padding:
    "11px",
  color:
    "#1e40af",
  fontSize:
    "11px",
  lineHeight:
    "1.55",
};

const footerStyle = {
  textAlign:
    "center",
  color:
    "#94a3b8",
  fontSize:
    "10px",
  lineHeight:
    "1.6",
  marginTop:
    "17px",
};

const spinnerStyle = {
  width:
    "14px",
  height:
    "14px",
  border:
    "2px solid rgba(255,255,255,0.4)",
  borderTop:
    "2px solid #ffffff",
  borderRadius:
    "50%",
  display:
    "inline-block",
  animation:
    "studentLoginSpin 0.7s linear infinite",
};

const overlayStyle = {
  position:
    "fixed",
  inset:
    0,
  background:
    "rgba(15,23,42,0.60)",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  padding:
    "20px",
  zIndex:
    3000,
  boxSizing:
    "border-box",
};

const forgotModalStyle = {
  width:
    "100%",
  maxWidth:
    "440px",
  background:
    "#ffffff",
  borderRadius:
    "18px",
  padding:
    "25px",
  boxSizing:
    "border-box",
  boxShadow:
    "0 25px 70px rgba(0,0,0,0.25)",
};

export default StudentLogin;