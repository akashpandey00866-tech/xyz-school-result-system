import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import {
  getApp,
  initializeApp,
} from "firebase/app";

import { db } from "../../config/firebase";

/* =========================================================
   SECONDARY FIREBASE AUTH

   Important:
   Student account is created using a secondary Firebase
   application so the currently logged-in Admin is NOT logged out.
========================================================= */

let secondaryAuth = null;

function getSecondaryAuth() {
  if (secondaryAuth) {
    return secondaryAuth;
  }

  const primaryApp = getApp();

  let secondaryApp;

  try {
    secondaryApp = initializeApp(
      primaryApp.options,
      "student-account-creator"
    );
  } catch (error) {
    if (error?.code === "app/duplicate-app") {
      secondaryApp = getApp(
        "student-account-creator"
      );
    } else {
      throw error;
    }
  }

  secondaryAuth = getAuth(secondaryApp);

  return secondaryAuth;
}

/* =========================================================
   HELPERS
========================================================= */

function getStudentName(student) {
  return (
    student?.name ||
    student?.fullName ||
    student?.studentName ||
    "Unnamed Student"
  );
}

function getEnrollment(student) {
  return (
    student?.enrollmentNumber ||
    student?.enrollmentNo ||
    student?.rollNumber ||
    student?.rollNo ||
    ""
  );
}

function getClassName(student) {
  return (
    student?.className ||
    student?.class ||
    student?.standard ||
    ""
  );
}

function getSection(student) {
  return student?.section || "";
}

function getEmail(student) {
  return (
    student?.email ||
    student?.studentEmail ||
    ""
  );
}

function getMobile(student) {
  return (
    student?.mobile ||
    student?.mobileNumber ||
    student?.phone ||
    student?.phoneNumber ||
    ""
  );
}

/* =========================================================
   AUTOMATIC PASSWORD GENERATOR

   We intentionally do NOT save this password in Firestore.
   Firebase Authentication manages the password securely.
========================================================= */

function generatePassword() {
  const upper =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lower =
    "abcdefghijkmnopqrstuvwxyz";

  const numbers =
    "23456789";

  const special =
    "@#$%&*!";

  const all =
    upper +
    lower +
    numbers +
    special;

  const randomCharacter = (characters) =>
    characters[
      Math.floor(
        Math.random() *
          characters.length
      )
    ];

  let password =
    randomCharacter(upper) +
    randomCharacter(lower) +
    randomCharacter(numbers) +
    randomCharacter(special);

  for (let i = 0; i < 10; i++) {
    password +=
      randomCharacter(all);
  }

  return password;
}

/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    if (
      typeof value?.toDate ===
      "function"
    ) {
      return value
        .toDate()
        .toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "—";
  }
}

/* =========================================================
   COMPONENT
========================================================= */

function StudentAccounts() {
  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(true);

  const [successData, setSuccessData] =
    useState(null);

  const [viewStudent, setViewStudent] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* =======================================================
     LOAD STUDENTS
  ======================================================= */

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const studentsRef =
        collection(
          db,
          "students"
        );

      const snapshot =
        await getDocs(
          studentsRef
        );

      const list =
        snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      list.sort((a, b) =>
        getStudentName(a).localeCompare(
          getStudentName(b)
        )
      );

      setStudents(list);
    } catch (err) {
      console.error(
        "Load Students Error:",
        err
      );

      setError(
        "Unable to load students. Please check your Firestore permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  /* =======================================================
     FILTERED STUDENTS
  ======================================================= */

  const filteredStudents =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          const name =
            getStudentName(
              student
            ).toLowerCase();

          const enrollment =
            String(
              getEnrollment(
                student
              )
            ).toLowerCase();

          const email =
            getEmail(
              student
            ).toLowerCase();

          const mobile =
            String(
              getMobile(
                student
              )
            ).toLowerCase();

          const className =
            String(
              getClassName(
                student
              )
            ).toLowerCase();

          const matchesSearch =
            !value ||
            name.includes(value) ||
            enrollment.includes(value) ||
            email.includes(value) ||
            mobile.includes(value) ||
            className.includes(value);

          const active =
            student.accountStatus ===
            "ACTIVE";

          const matchesStatus =
            statusFilter ===
              "ALL" ||
            (statusFilter ===
              "ACTIVE" &&
              active) ||
            (statusFilter ===
              "PENDING" &&
              !active);

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      students,
      search,
      statusFilter,
    ]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const totalStudents =
    students.length;

  const activeAccounts =
    students.filter(
      (student) =>
        student.accountStatus ===
        "ACTIVE"
    ).length;

  const pendingAccounts =
    totalStudents -
    activeAccounts;

  const firstLoginAccounts =
    students.filter(
      (student) =>
        student.mustChangePassword ===
        true
    ).length;

  /* =======================================================
     SELECT STUDENT
  ======================================================= */

  const handleSelectStudent = (
    student
  ) => {
    setSelectedStudent(student);

    setPassword(
      generatePassword()
    );

    setShowPassword(true);

    setMessage("");
    setError("");
    setSuccessData(null);
  };

  /* =======================================================
     CLOSE CREATE PANEL
  ======================================================= */

  const closeAccountPanel = () => {
    if (creating) {
      return;
    }

    setSelectedStudent(null);
    setPassword("");
    setMessage("");
    setError("");
  };

  /* =======================================================
     CREATE ACCOUNT
  ======================================================= */

  const handleCreateAccount =
    async (event) => {
      event.preventDefault();

      setMessage("");
      setError("");

      if (!selectedStudent) {
        setError(
          "Please select a student first."
        );
        return;
      }

      const email =
        getEmail(
          selectedStudent
        )
          .trim()
          .toLowerCase();

      if (!email) {
        setError(
          "This student does not have an email address. Add the student's email first."
        );
        return;
      }

      if (
        selectedStudent.accountStatus ===
        "ACTIVE"
      ) {
        setError(
          "This student account is already active."
        );
        return;
      }

      if (
        selectedStudent.authUid
      ) {
        setError(
          "This student is already linked with a Firebase account."
        );
        return;
      }

      if (
        password.length < 6
      ) {
        setError(
          "Generated password is invalid. Please generate a new password."
        );
        return;
      }

      let studentAuth = null;
      let createdUser = null;

      try {
        setCreating(true);

        /* -----------------------------------------------
           GET SECONDARY AUTH
        ----------------------------------------------- */

        studentAuth =
          getSecondaryAuth();

        /* -----------------------------------------------
           CREATE FIREBASE AUTH USER
        ----------------------------------------------- */

        const credential =
          await createUserWithEmailAndPassword(
            studentAuth,
            email,
            password
          );

        createdUser =
          credential.user;

        const authUid =
          createdUser.uid;

        /* -----------------------------------------------
           UPDATE STUDENT PROFILE

           IMPORTANT:
           Password is NOT stored here.
        ----------------------------------------------- */

        const studentRef =
          doc(
            db,
            "students",
            selectedStudent.id
          );

        await updateDoc(
          studentRef,
          {
            authUid,

            accountStatus:
              "ACTIVE",

            mustChangePassword:
              true,

            accountCreatedAt:
              serverTimestamp(),

            accountUpdatedAt:
              serverTimestamp(),

            accountEmail:
              email,
          }
        );

        /* -----------------------------------------------
           PREPARE STUDENT MESSAGE
        ----------------------------------------------- */

        const studentName =
          getStudentName(
            selectedStudent
          );

        const enrollment =
          getEnrollment(
            selectedStudent
          ) || "Not provided";

        const className =
          getClassName(
            selectedStudent
          ) || "Not provided";

        const section =
          getSection(
            selectedStudent
          );

        const classDisplay =
          section
            ? `${className} - ${section}`
            : className;

        const credentialsMessage =
`Dear ${studentName},

Your XYZ School student account has been created successfully.

Student Details
-------------------------
Name: ${studentName}
Enrollment No.: ${enrollment}
Class: ${classDisplay}
Login ID: ${email}

Temporary Password:
${password}

Login using the above temporary password.

For security, you will be asked to create a new password during your first login.

Please keep your login credentials private.

XYZ School
Student Management Portal`;

        /* -----------------------------------------------
           SUCCESS DATA
        ----------------------------------------------- */

        const accountData = {
          studentId:
            selectedStudent.id,

          studentName,

          enrollment,

          classDisplay,

          email,

          password,

          authUid,

          credentialsMessage,
        };

        setSuccessData(
          accountData
        );

        setSelectedStudent(
          (previous) => ({
            ...previous,
            authUid,
            accountStatus:
              "ACTIVE",
            mustChangePassword:
              true,
            accountEmail:
              email,
          })
        );

        setStudents(
          (previous) =>
            previous.map(
              (student) => {
                if (
                  student.id !==
                  selectedStudent.id
                ) {
                  return student;
                }

                return {
                  ...student,

                  authUid,

                  accountStatus:
                    "ACTIVE",

                  mustChangePassword:
                    true,

                  accountEmail:
                    email,
                };
              }
            )
        );

        setMessage(
          "Student account created successfully."
        );

        /* -----------------------------------------------
           SIGN OUT SECONDARY USER

           Admin remains logged in.
        ----------------------------------------------- */

        await signOut(
          studentAuth
        );

        setPassword("");
      } catch (err) {
        console.error(
          "Student Account Creation Error:",
          err
        );

        /* -----------------------------------------------
           CLEANUP ORPHAN AUTH USER

           If Auth account was created but Firestore
           update failed, remove the newly created
           user so the system doesn't become inconsistent.
        ----------------------------------------------- */

        if (createdUser) {
          try {
            await deleteUser(
              createdUser
            );
          } catch (
            cleanupError
          ) {
            console.error(
              "Account Cleanup Error:",
              cleanupError
            );
          }
        }

        if (
          err?.code ===
          "auth/email-already-in-use"
        ) {
          setError(
            "This email already has a Firebase Authentication account."
          );
        } else if (
          err?.code ===
          "auth/invalid-email"
        ) {
          setError(
            "The student's email address is invalid."
          );
        } else if (
          err?.code ===
          "auth/weak-password"
        ) {
          setError(
            "Firebase rejected the generated password. Please generate another one."
          );
        } else if (
          err?.code ===
          "auth/operation-not-allowed"
        ) {
          setError(
            "Email/Password Authentication is disabled in Firebase Authentication."
          );
        } else if (
          err?.code ===
          "permission-denied"
        ) {
          setError(
            "Firestore permission denied. Check your Firebase security rules."
          );
        } else {
          setError(
            err?.message ||
              "Unable to create student account."
          );
        }
      } finally {
        setCreating(false);

        if (studentAuth) {
          try {
            await signOut(
              studentAuth
            );
          } catch {
            // Ignore secondary logout errors.
          }
        }
      }
    };

  /* =======================================================
     COPY TEXT
  ======================================================= */

  const copyText = async (
    text,
    successMessage
  ) => {
    try {
      await navigator.clipboard.writeText(
        text
      );

      setMessage(
        successMessage
      );

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (err) {
      console.error(
        "Clipboard Error:",
        err
      );

      setError(
        "Unable to copy automatically. Please select and copy the text manually."
      );
    }
  };

  /* =======================================================
     COPY PASSWORD
  ======================================================= */

  const handleCopyPassword =
    async () => {
      if (!successData?.password) {
        return;
      }

      await copyText(
        successData.password,
        "Temporary password copied."
      );
    };

  /* =======================================================
     COPY FULL MESSAGE
  ======================================================= */

  const handleCopyMessage =
    async () => {
      if (
        !successData?.credentialsMessage
      ) {
        return;
      }

      await copyText(
        successData.credentialsMessage,
        "Complete student credentials message copied."
      );
    };

  /* =======================================================
     SHARE DETAILS

     Uses Web Share API when available.
     Otherwise copies the complete message.
  ======================================================= */

  const handleShareDetails =
    async () => {
      if (!successData) {
        return;
      }

      try {
        if (
          navigator.share
        ) {
          await navigator.share({
            title:
              "XYZ School Student Login Details",

            text:
              successData.credentialsMessage,
          });

          setMessage(
            "Student details shared successfully."
          );

          return;
        }

        await copyText(
          successData.credentialsMessage,
          "Sharing is not supported here. Details copied instead."
        );
      } catch (err) {
        if (
          err?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "Share Error:",
          err
        );

        await copyText(
          successData.credentialsMessage,
          "Details copied. You can paste them into WhatsApp, email or SMS."
        );
      }
    };

  /* =======================================================
     SEND PASSWORD RESET

     IMPORTANT:
     We cannot retrieve the old password.
     Firebase sends a secure reset link instead.
  ======================================================= */

  const handleSendPasswordReset =
    async (student) => {
      const email =
        getEmail(
          student
        )
          .trim()
          .toLowerCase();

      if (!email) {
        setError(
          "This student does not have a valid email address."
        );
        return;
      }

      const confirmed =
        window.confirm(
          `Send a secure password reset email to ${email}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setResetting(true);
        setError("");
        setMessage("");

        await sendPasswordResetEmail(
          getAuth(),
          email
        );

        setMessage(
          `Password reset email sent to ${email}.`
        );
      } catch (err) {
        console.error(
          "Password Reset Error:",
          err
        );

        if (
          err?.code ===
          "auth/user-not-found"
        ) {
          setError(
            "No Firebase account was found for this email."
          );
        } else if (
          err?.code ===
          "auth/invalid-email"
        ) {
          setError(
            "The student's email address is invalid."
          );
        } else if (
          err?.code ===
          "auth/too-many-requests"
        ) {
          setError(
            "Too many reset requests. Please try again later."
          );
        } else {
          setError(
            err?.message ||
              "Unable to send password reset email."
          );
        }
      } finally {
        setResetting(false);
      }
    };

  /* =======================================================
     GENERATE NEW PASSWORD

     Only useful before account creation.
  ======================================================= */

  const handleGeneratePassword =
    () => {
      setPassword(
        generatePassword()
      );

      setShowPassword(true);
      setError("");
    };

  /* =======================================================
     OPEN VIEW DETAILS
  ======================================================= */

  const handleViewDetails =
    (student) => {
      setViewStudent(student);
      setError("");
    };

  /* =======================================================
     CLOSE VIEW DETAILS
  ======================================================= */

  const closeViewDetails =
    () => {
      setViewStudent(null);
    };

  /* =======================================================
     CLOSE SUCCESS
  ======================================================= */

  const closeSuccess =
    () => {
      setSuccessData(null);
      setSelectedStudent(null);
      setPassword("");
      setMessage("");
      setError("");
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        padding:
          "28px",
        fontFamily:
          "Inter, Arial, sans-serif",
        color:
          "#0f172a",
        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          maxWidth:
            "1400px",
          margin:
            "0 auto",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap:
              "20px",
            marginBottom:
              "25px",
            flexWrap:
              "wrap",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#4f46e5",
                fontSize:
                  "12px",
                fontWeight:
                  "800",
                letterSpacing:
                  "0.08em",
                marginBottom:
                  "7px",
              }}
            >
              ADMINISTRATION
            </div>

            <h1
              style={{
                margin: 0,
                fontSize:
                  "32px",
                fontWeight:
                  "850",
                letterSpacing:
                  "-0.03em",
              }}
            >
              Student Accounts
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#64748b",
                fontSize:
                  "14px",
                maxWidth:
                  "680px",
                lineHeight:
                  "1.6",
              }}
            >
              Create secure student
              login accounts and
              manage password
              recovery from one
              simple place.
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadStudents
            }
            disabled={
              loading
            }
            style={{
              border:
                "1px solid #cbd5e1",
              background:
                "#ffffff",
              color:
                "#334155",
              padding:
                "11px 17px",
              borderRadius:
                "11px",
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
              fontWeight:
                "700",
              boxShadow:
                "0 4px 12px rgba(15,23,42,0.05)",
            }}
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>
        </div>

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap:
              "16px",
            marginBottom:
              "22px",
          }}
        >
          <StatCard
            icon="👨‍🎓"
            title="Total Students"
            value={
              totalStudents
            }
            description="Registered profiles"
          />

          <StatCard
            icon="🔐"
            title="Active Accounts"
            value={
              activeAccounts
            }
            description="Students can login"
          />

          <StatCard
            icon="⏳"
            title="Pending Accounts"
            value={
              pendingAccounts
            }
            description="Need login account"
          />

          <StatCard
            icon="🔄"
            title="First Login"
            value={
              firstLoginAccounts
            }
            description="Need new password"
          />
        </div>

        {/* =================================================
            GLOBAL MESSAGE
        ================================================= */}

        {message && (
          <div
            style={{
              background:
                "#ecfdf5",
              border:
                "1px solid #a7f3d0",
              color:
                "#047857",
              padding:
                "13px 16px",
              borderRadius:
                "12px",
              marginBottom:
                "18px",
              fontSize:
                "14px",
              fontWeight:
                "700",
            }}
          >
            ✓ {message}
          </div>
        )}

        {error &&
          !selectedStudent &&
          !successData && (
            <div
              style={{
                background:
                  "#fef2f2",
                border:
                  "1px solid #fecaca",
                color:
                  "#b91c1c",
                padding:
                  "13px 16px",
                borderRadius:
                  "12px",
                marginBottom:
                  "18px",
                fontSize:
                  "14px",
              }}
            >
              {error}
            </div>
          )}

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              "18px",
            padding:
              "18px",
            marginBottom:
              "18px",
            boxShadow:
              "0 8px 25px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "minmax(250px, 1fr) 190px",
              gap:
                "12px",
            }}
          >
            <div>
              <label
                style={{
                  display:
                    "block",
                  fontSize:
                    "12px",
                  fontWeight:
                    "800",
                  color:
                    "#475569",
                  marginBottom:
                    "7px",
                }}
              >
                SEARCH STUDENT
              </label>

              <input
                type="text"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Name, enrollment, email, mobile or class..."
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <label
                style={{
                  display:
                    "block",
                  fontSize:
                    "12px",
                  fontWeight:
                    "800",
                  color:
                    "#475569",
                  marginBottom:
                    "7px",
                }}
              >
                ACCOUNT STATUS
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="ALL">
                  All Students
                </option>

                <option value="ACTIVE">
                  Active Accounts
                </option>

                <option value="PENDING">
                  Pending Accounts
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* =================================================
            STUDENT TABLE
        ================================================= */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              "18px",
            overflow:
              "hidden",
            boxShadow:
              "0 10px 30px rgba(15,23,42,0.05)",
          }}
        >
          <div
            style={{
              padding:
                "18px 20px",
              borderBottom:
                "1px solid #e2e8f0",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap:
                "10px",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight:
                    "850",
                  fontSize:
                    "16px",
                }}
              >
                Student Profiles
              </div>

              <div
                style={{
                  color:
                    "#94a3b8",
                  fontSize:
                    "12px",
                  marginTop:
                    "3px",
                }}
              >
                {filteredStudents.length}{" "}
                student
                {filteredStudents.length !==
                1
                  ? "s"
                  : ""}
                {" "}shown
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredStudents.length ===
            0 ? (
            <EmptyState
              search={
                search
              }
            />
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width:
                    "100%",
                  borderCollapse:
                    "collapse",
                  minWidth:
                    "1050px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "#f8fafc",
                      textAlign:
                        "left",
                    }}
                  >
                    <th
                      style={
                        thStyle
                      }
                    >
                      Student
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Enrollment
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Class
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Login ID
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Account
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (
                      student
                    ) => {
                      const active =
                        student.accountStatus ===
                        "ACTIVE";

                      return (
                        <tr
                          key={
                            student.id
                          }
                          style={{
                            borderTop:
                              "1px solid #e2e8f0",
                          }}
                        >
                          <td
                            style={
                              tdStyle
                            }
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap:
                                  "11px",
                              }}
                            >
                              <div
                                style={{
                                  width:
                                    "38px",
                                  height:
                                    "38px",
                                  borderRadius:
                                    "50%",
                                  background:
                                    active
                                      ? "#eef2ff"
                                      : "#f1f5f9",
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "center",
                                  fontWeight:
                                    "800",
                                  color:
                                    "#4f46e5",
                                  flexShrink:
                                    0,
                                }}
                              >
                                {getStudentName(
                                  student
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontWeight:
                                      "750",
                                  }}
                                >
                                  {getStudentName(
                                    student
                                  )}
                                </div>

                                <div
                                  style={{
                                    color:
                                      "#94a3b8",
                                    fontSize:
                                      "12px",
                                    marginTop:
                                      "3px",
                                  }}
                                >
                                  {getMobile(
                                    student
                                  ) ||
                                    "No mobile"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {getEnrollment(
                              student
                            ) ||
                              "—"}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <strong>
                              {getClassName(
                                student
                              ) ||
                                "—"}
                            </strong>

                            {getSection(
                              student
                            ) && (
                              <span
                                style={{
                                  color:
                                    "#64748b",
                                  marginLeft:
                                    "5px",
                                }}
                              >
                                -
                                {" "}
                                {getSection(
                                  student
                                )}
                              </span>
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <div
                              style={{
                                maxWidth:
                                  "220px",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {getEmail(
                                student
                              ) ||
                                "No email"}
                            </div>
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <StatusBadge
                              active={
                                active
                              }
                              firstLogin={
                                student.mustChangePassword ===
                                true
                              }
                            />
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                gap:
                                  "7px",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              {!active ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSelectStudent(
                                      student
                                    )
                                  }
                                  style={
                                    primaryButton
                                  }
                                >
                                  Create Account
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleViewDetails(
                                        student
                                      )
                                    }
                                    style={
                                      secondaryButton
                                    }
                                  >
                                    View
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendPasswordReset(
                                        student
                                      )
                                    }
                                    disabled={
                                      resetting
                                    }
                                    style={
                                      resetButton
                                    }
                                  >
                                    Reset
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          CREATE ACCOUNT MODAL
      ===================================================== */}

      {selectedStudent &&
        !successData && (
          <div
            style={
              overlayStyle
            }
            onMouseDown={
              closeAccountPanel
            }
          >
            <div
              style={
                modalStyle
              }
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div
                style={
                  modalHeaderStyle
                }
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#4f46e5",
                      fontWeight:
                        "800",
                      marginBottom:
                        "5px",
                    }}
                  >
                    NEW LOGIN ACCOUNT
                  </div>

                  <h2
                    style={{
                      margin:
                        0,
                      fontSize:
                        "23px",
                      fontWeight:
                        "850",
                    }}
                  >
                    Create Student Account
                  </h2>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      color:
                        "#64748b",
                      fontSize:
                        "13px",
                    }}
                  >
                    The system will
                    automatically
                    generate a temporary
                    password.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeAccountPanel
                  }
                  disabled={
                    creating
                  }
                  style={
                    closeButton
                  }
                >
                  ×
                </button>
              </div>

              {/* STUDENT INFO */}

              <div
                style={{
                  background:
                    "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius:
                    "14px",
                  padding:
                    "16px",
                  marginBottom:
                    "18px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "12px",
                    marginBottom:
                      "12px",
                  }}
                >
                  <div
                    style={{
                      width:
                        "45px",
                      height:
                        "45px",
                      borderRadius:
                        "50%",
                      background:
                        "#e0e7ff",
                      color:
                        "#4338ca",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize:
                        "18px",
                      fontWeight:
                        "850",
                    }}
                  >
                    {getStudentName(
                      selectedStudent
                    )
                      .charAt(
                        0
                      )
                      .toUpperCase()}
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight:
                          "800",
                        fontSize:
                          "16px",
                      }}
                    >
                      {getStudentName(
                        selectedStudent
                      )}
                    </div>

                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "12px",
                        marginTop:
                          "2px",
                      }}
                    >
                      {getEnrollment(
                        selectedStudent
                      ) ||
                        "No enrollment number"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap:
                      "9px",
                    fontSize:
                      "13px",
                    color:
                      "#64748b",
                  }}
                >
                  <div>
                    Class:{" "}
                    <strong
                      style={{
                        color:
                          "#334155",
                      }}
                    >
                      {getClassName(
                        selectedStudent
                      ) ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    Section:{" "}
                    <strong
                      style={{
                        color:
                          "#334155",
                      }}
                    >
                      {getSection(
                        selectedStudent
                      ) ||
                        "—"}
                    </strong>
                  </div>

                  <div
                    style={{
                      gridColumn:
                        "1 / -1",
                    }}
                  >
                    Login Email:{" "}
                    <strong
                      style={{
                        color:
                          "#334155",
                      }}
                    >
                      {getEmail(
                        selectedStudent
                      ) ||
                        "No email"}
                    </strong>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background:
                      "#fef2f2",
                    border:
                      "1px solid #fecaca",
                    color:
                      "#b91c1c",
                    padding:
                      "11px 13px",
                    borderRadius:
                      "10px",
                    marginBottom:
                      "15px",
                    fontSize:
                      "13px",
                  }}
                >
                  {error}
                </div>
              )}

              <form
                onSubmit={
                  handleCreateAccount
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  TEMPORARY PASSWORD
                </label>

                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "8px",
                  }}
                >
                  <div
                    style={{
                      position:
                        "relative",
                      flex:
                        1,
                    }}
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
                      readOnly
                      style={{
                        ...inputStyle,
                        fontFamily:
                          "monospace",
                        paddingRight:
                          "65px",
                        background:
                          "#f8fafc",
                      }}
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
                      style={{
                        position:
                          "absolute",
                        right:
                          "8px",
                        top:
                          "50%",
                        transform:
                          "translateY(-50%)",
                        border:
                          "none",
                        background:
                          "transparent",
                        color:
                          "#475569",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleGeneratePassword
                    }
                    disabled={
                      creating
                    }
                    style={
                      secondaryButton
                    }
                  >
                    ↻ Generate
                  </button>
                </div>

                <div
                  style={{
                    marginTop:
                      "8px",
                    color:
                      "#64748b",
                    fontSize:
                      "12px",
                    lineHeight:
                      "1.5",
                  }}
                >
                  This is a temporary
                  password. The student
                  must create a new
                  password after the
                  first login.
                </div>

                <div
                  style={{
                    marginTop:
                      "16px",
                    padding:
                      "12px 13px",
                    background:
                      "#eff6ff",
                    border:
                      "1px solid #bfdbfe",
                    borderRadius:
                      "11px",
                    color:
                      "#1d4ed8",
                    fontSize:
                      "12px",
                    lineHeight:
                      "1.5",
                  }}
                >
                  🔒 Password security:
                  The password is sent
                  to Firebase
                  Authentication and is
                  not stored in Firestore.
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "10px",
                    marginTop:
                      "22px",
                  }}
                >
                  <button
                    type="button"
                    onClick={
                      closeAccountPanel
                    }
                    disabled={
                      creating
                    }
                    style={{
                      ...secondaryButton,
                      flex:
                        1,
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      creating ||
                      password.length <
                        6
                    }
                    style={{
                      ...primaryButton,
                      flex:
                        1,
                      opacity:
                        creating ||
                        password.length <
                          6
                          ? 0.55
                          : 1,
                    }}
                  >
                    {creating
                      ? "Creating Account..."
                      : "✓ Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* =====================================================
          SUCCESS MODAL
      ===================================================== */}

      {successData && (
        <div
          style={
            overlayStyle
          }
        >
          <div
            style={{
              ...modalStyle,
              maxWidth:
                "620px",
            }}
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
                    "64px",
                  height:
                    "64px",
                  borderRadius:
                    "50%",
                  background:
                    "#dcfce7",
                  color:
                    "#16a34a",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize:
                    "30px",
                  margin:
                    "0 auto 12px",
                }}
              >
                ✓
              </div>

              <h2
                style={{
                  margin:
                    0,
                  fontSize:
                    "24px",
                  fontWeight:
                    "850",
                }}
              >
                Account Created
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
                Save or share these
                credentials with the
                student now.
              </p>
            </div>

            {/* CREDENTIAL CARD */}

            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius:
                  "15px",
                padding:
                  "17px",
              }}
            >
              <CredentialRow
                label="Student"
                value={
                  successData.studentName
                }
              />

              <CredentialRow
                label="Enrollment"
                value={
                  successData.enrollment
                }
              />

              <CredentialRow
                label="Class"
                value={
                  successData.classDisplay
                }
              />

              <CredentialRow
                label="Login ID"
                value={
                  successData.email
                }
              />

              <div
                style={{
                  marginTop:
                    "13px",
                  padding:
                    "13px",
                  background:
                    "#fff7ed",
                  border:
                    "1px solid #fed7aa",
                  borderRadius:
                    "11px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "11px",
                    fontWeight:
                      "800",
                    color:
                      "#9a3412",
                    marginBottom:
                      "6px",
                  }}
                >
                  TEMPORARY PASSWORD
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                  }}
                >
                  <code
                    style={{
                      flex:
                        1,
                      fontSize:
                        "16px",
                      fontWeight:
                        "800",
                      letterSpacing:
                        "0.04em",
                      wordBreak:
                        "break-all",
                      color:
                        "#7c2d12",
                    }}
                  >
                    {successData.password}
                  </code>

                  <button
                    type="button"
                    onClick={
                      handleCopyPassword
                    }
                    style={
                      smallButton
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* MESSAGE PREVIEW */}

            <div
              style={{
                marginTop:
                  "16px",
              }}
            >
              <div
                style={
                  labelStyle
                }
              >
                READY-TO-SEND MESSAGE
              </div>

              <textarea
                readOnly
                value={
                  successData.credentialsMessage
                }
                style={{
                  width:
                    "100%",
                  minHeight:
                    "210px",
                  boxSizing:
                    "border-box",
                  border:
                    "1px solid #cbd5e1",
                  borderRadius:
                    "11px",
                  padding:
                    "12px",
                  resize:
                    "vertical",
                  fontFamily:
                    "Arial, sans-serif",
                  fontSize:
                    "13px",
                  lineHeight:
                    "1.5",
                  outline:
                    "none",
                }}
              />
            </div>

            {/* ACTIONS */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap:
                  "9px",
                marginTop:
                  "14px",
              }}
            >
              <button
                type="button"
                onClick={
                  handleCopyMessage
                }
                style={
                  secondaryButton
                }
              >
                📋 Copy Message
              </button>

              <button
                type="button"
                onClick={
                  handleShareDetails
                }
                style={
                  primaryButton
                }
              >
                ↗ Share Details
              </button>
            </div>

            <button
              type="button"
              onClick={
                closeSuccess
              }
              style={{
                width:
                  "100%",
                marginTop:
                  "10px",
                border:
                  "none",
                background:
                  "#0f172a",
                color:
                  "#ffffff",
                padding:
                  "12px",
                borderRadius:
                  "10px",
                cursor:
                  "pointer",
                fontWeight:
                  "750",
              }}
            >
              Done
            </button>

            <div
              style={{
                marginTop:
                  "13px",
                padding:
                  "10px",
                borderRadius:
                  "9px",
                background:
                  "#fef2f2",
                color:
                  "#991b1b",
                fontSize:
                  "11px",
                lineHeight:
                  "1.5",
              }}
            >
              ⚠️ This temporary
              password is shown only
              now. For security,
              Firebase does not allow
              the old password to be
              retrieved later.
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW ACCOUNT DETAILS MODAL
      ===================================================== */}

      {viewStudent && (
        <div
          style={
            overlayStyle
          }
          onMouseDown={
            closeViewDetails
          }
        >
          <div
            style={
              modalStyle
            }
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div
              style={
                modalHeaderStyle
              }
            >
              <div>
                <div
                  style={{
                    fontSize:
                      "12px",
                    color:
                      "#4f46e5",
                    fontWeight:
                      "800",
                    marginBottom:
                      "5px",
                  }}
                >
                  ACCOUNT DETAILS
                </div>

                <h2
                  style={{
                    margin:
                      0,
                    fontSize:
                      "22px",
                    fontWeight:
                      "850",
                  }}
                >
                  {getStudentName(
                    viewStudent
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeViewDetails
                }
                style={
                  closeButton
                }
              >
                ×
              </button>
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap:
                  "10px",
              }}
            >
              <DetailBox
                label="Enrollment"
                value={
                  getEnrollment(
                    viewStudent
                  ) ||
                  "—"
                }
              />

              <DetailBox
                label="Class"
                value={
                  getClassName(
                    viewStudent
                  ) ||
                  "—"
                }
              />

              <DetailBox
                label="Section"
                value={
                  getSection(
                    viewStudent
                  ) ||
                  "—"
                }
              />

              <DetailBox
                label="Mobile"
                value={
                  getMobile(
                    viewStudent
                  ) ||
                  "—"
                }
              />

              <DetailBox
                label="Login ID"
                value={
                  getEmail(
                    viewStudent
                  ) ||
                  "—"
                }
                full
              />

              <DetailBox
                label="Account Status"
                value={
                  viewStudent.accountStatus ===
                  "ACTIVE"
                    ? "ACTIVE"
                    : "NOT CREATED"
                }
              />

              <DetailBox
                label="First Login"
                value={
                  viewStudent.mustChangePassword
                    ? "New password required"
                    : "Completed"
                }
              />

              <DetailBox
                label="Account Created"
                value={formatDate(
                  viewStudent.accountCreatedAt
                )}
              />
            </div>

            <div
              style={{
                marginTop:
                  "17px",
                padding:
                  "13px",
                background:
                  "#eff6ff",
                border:
                  "1px solid #bfdbfe",
                borderRadius:
                  "11px",
                fontSize:
                  "12px",
                color:
                  "#1e40af",
                lineHeight:
                  "1.5",
              }}
            >
              🔐 The student's
              password cannot be viewed
              by the administrator. If
              the student forgets the
              password, use the password
              reset option.
            </div>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "9px",
                marginTop:
                  "18px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  handleSendPasswordReset(
                    viewStudent
                  )
                }
                disabled={
                  resetting
                }
                style={{
                  ...resetButton,
                  flex:
                    1,
                }}
              >
                {resetting
                  ? "Sending..."
                  : "🔑 Send Password Reset"}
              </button>

              <button
                type="button"
                onClick={
                  closeViewDetails
                }
                style={{
                  ...secondaryButton,
                  flex:
                    1,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          "17px",
        padding:
          "19px",
        boxShadow:
          "0 7px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
        }}
      >
        <div
          style={{
            color:
              "#64748b",
            fontSize:
              "12px",
            fontWeight:
              "700",
          }}
        >
          {title}
        </div>

        <div
          style={{
            width:
              "35px",
            height:
              "35px",
            borderRadius:
              "10px",
            background:
              "#eef2ff",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            fontSize:
              "17px",
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          fontSize:
            "29px",
          fontWeight:
            "850",
          margin:
            "10px 0 3px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color:
            "#94a3b8",
          fontSize:
            "12px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  active,
  firstLogin,
}) {
  if (!active) {
    return (
      <span
        style={{
          ...badgeStyle,
          background:
            "#fef3c7",
          color:
            "#92400e",
        }}
      >
        PENDING
      </span>
    );
  }

  if (firstLogin) {
    return (
      <span
        style={{
          ...badgeStyle,
          background:
            "#dbeafe",
          color:
            "#1d4ed8",
        }}
      >
        FIRST LOGIN
      </span>
    );
  }

  return (
    <span
      style={{
        ...badgeStyle,
        background:
          "#dcfce7",
        color:
          "#166534",
      }}
    >
      ACTIVE
    </span>
  );
}

/* =========================================================
   CREDENTIAL ROW
========================================================= */

function CredentialRow({
  label,
  value,
}) {
  return (
    <div
      style={{
        display:
          "flex",
        justifyContent:
          "space-between",
        gap:
          "15px",
        padding:
          "8px 0",
        borderBottom:
          "1px solid #e2e8f0",
        fontSize:
          "13px",
      }}
    >
      <span
        style={{
          color:
            "#64748b",
          fontWeight:
            "650",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          textAlign:
            "right",
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   DETAIL BOX
========================================================= */

function DetailBox({
  label,
  value,
  full = false,
}) {
  return (
    <div
      style={{
        gridColumn:
          full
            ? "1 / -1"
            : undefined,
        background:
          "#f8fafc",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          "11px",
        padding:
          "12px",
      }}
    >
      <div
        style={{
          color:
            "#94a3b8",
          fontSize:
            "11px",
          fontWeight:
            "750",
          marginBottom:
            "4px",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            "#334155",
          fontSize:
            "13px",
          fontWeight:
            "700",
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingState() {
  return (
    <div
      style={{
        padding:
          "65px 20px",
        textAlign:
          "center",
      }}
    >
      <div
        style={{
          width:
            "42px",
          height:
            "42px",
          border:
            "4px solid #e2e8f0",
          borderTop:
            "4px solid #4f46e5",
          borderRadius:
            "50%",
          margin:
            "0 auto 15px",
          animation:
            "studentAccountsSpin 0.8s linear infinite",
        }}
      />

      <div
        style={{
          fontWeight:
            "750",
          color:
            "#334155",
        }}
      >
        Loading student accounts...
      </div>

      <div
        style={{
          marginTop:
            "5px",
          color:
            "#94a3b8",
          fontSize:
            "12px",
        }}
      >
        Please wait
      </div>

      <style>
        {`
          @keyframes studentAccountsSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  search,
}) {
  return (
    <div
      style={{
        padding:
          "65px 20px",
        textAlign:
          "center",
      }}
    >
      <div
        style={{
          fontSize:
            "40px",
          marginBottom:
            "10px",
        }}
      >
        🔎
      </div>

      <div
        style={{
          fontWeight:
            "800",
          color:
            "#334155",
        }}
      >
        No students found
      </div>

      <div
        style={{
          marginTop:
            "5px",
          color:
            "#94a3b8",
          fontSize:
            "13px",
        }}
      >
        {search
          ? "Try another search term."
          : "Add a student profile first."}
      </div>
    </div>
  );
}

/* =========================================================
   COMMON STYLES
========================================================= */

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
  background:
    "#ffffff",
  color:
    "#0f172a",
};

const labelStyle = {
  display:
    "block",
  fontSize:
    "11px",
  fontWeight:
    "800",
  color:
    "#475569",
  marginBottom:
    "7px",
  letterSpacing:
    "0.04em",
};

const primaryButton = {
  border:
    "none",
  background:
    "#4f46e5",
  color:
    "#ffffff",
  padding:
    "10px 13px",
  borderRadius:
    "9px",
  cursor:
    "pointer",
  fontWeight:
    "750",
  fontSize:
    "12px",
};

const secondaryButton = {
  border:
    "1px solid #cbd5e1",
  background:
    "#ffffff",
  color:
    "#334155",
  padding:
    "10px 13px",
  borderRadius:
    "9px",
  cursor:
    "pointer",
  fontWeight:
    "700",
  fontSize:
    "12px",
};

const resetButton = {
  border:
    "1px solid #c7d2fe",
  background:
    "#eef2ff",
  color:
    "#4338ca",
  padding:
    "10px 13px",
  borderRadius:
    "9px",
  cursor:
    "pointer",
  fontWeight:
    "750",
  fontSize:
    "12px",
};

const smallButton = {
  border:
    "1px solid #fed7aa",
  background:
    "#ffffff",
  color:
    "#9a3412",
  padding:
    "7px 9px",
  borderRadius:
    "7px",
  cursor:
    "pointer",
  fontWeight:
    "750",
  fontSize:
    "11px",
};

const closeButton = {
  border:
    "none",
  background:
    "#f1f5f9",
  color:
    "#334155",
  width:
    "35px",
  height:
    "35px",
  borderRadius:
    "9px",
  cursor:
    "pointer",
  fontSize:
    "20px",
  lineHeight:
    "1",
};

const overlayStyle = {
  position:
    "fixed",
  inset:
    0,
  background:
    "rgba(15,23,42,0.62)",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  padding:
    "20px",
  zIndex:
    2000,
  overflowY:
    "auto",
};

const modalStyle = {
  width:
    "100%",
  maxWidth:
    "550px",
  background:
    "#ffffff",
  borderRadius:
    "20px",
  padding:
    "25px",
  boxShadow:
    "0 30px 80px rgba(0,0,0,0.25)",
  boxSizing:
    "border-box",
};

const modalHeaderStyle = {
  display:
    "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap:
    "15px",
  marginBottom:
    "20px",
};

const badgeStyle = {
  display:
    "inline-flex",
  padding:
    "5px 9px",
  borderRadius:
    "999px",
  fontSize:
    "10px",
  fontWeight:
    "800",
  letterSpacing:
    "0.03em",
};

const thStyle = {
  padding:
    "13px 16px",
  fontSize:
    "11px",
  color:
    "#64748b",
  fontWeight:
    "800",
  textTransform:
    "uppercase",
  letterSpacing:
    "0.04em",
};

const tdStyle = {
  padding:
    "14px 16px",
  fontSize:
    "13px",
  color:
    "#334155",
  verticalAlign:
    "middle",
};

/* =========================================================
   EXPORT
========================================================= */

export default StudentAccounts;