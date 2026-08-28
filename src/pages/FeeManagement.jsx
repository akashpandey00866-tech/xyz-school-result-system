import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";

function FeeManagement() {

  /* ===============================
            STATES
  =============================== */

  const [students, setStudents] = useState([]);

  const [feeSettings, setFeeSettings] = useState({});

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [feeStructures, setFeeStructures] = useState({});
  const [structureLoading, setStructureLoading] = useState(true);
  const [savingStructure, setSavingStructure] = useState(false);

  const [selectedClass, setSelectedClass] = useState("");
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [transportCollection, setTransportCollection] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyMethodFilter, setHistoryMethodFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");


  const [classFilter, setClassFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showStructure, setShowStructure] = useState(true);

  /* =========================================================
     SINGLE SOURCE OF TRUTH FOR ALL FEE CALCULATIONS
  ========================================================= */

  const getStudentFeeSnapshot = (student) => {
    const structure =
      feeStructures?.[`class-${student?.className}`];

    const structureAcademic =
      Number(structure?.tuitionFee || 0) +
      Number(structure?.examFee || 0) +
      Number(structure?.otherFee || 0);

    const structureTransport =
      Number(structure?.transportFee || 0);

    const legacyTotal = Number(
      feeSettings?.[`class${student?.className}`] || 0
    );

    const annualFee = structure
      ? structureAcademic
      : Number(student?.annualFee ?? legacyTotal ?? 0);

    const hasExplicitTransportAssignment =
      student?.transportEnabled === false ||
      student?.transportOpted === false ||
      student?.usesTransport === false;

    const studentTransportValue =
      student?.transportFee ??
      student?.transportCharge ??
      student?.transportationFee ??
      student?.transportAmount;

    // Fee Settings is the source of truth for class transportation charges.
    // Legacy student values such as 0 must not hide a configured class charge.
    const transportCharge = hasExplicitTransportAssignment
      ? 0
      : structure
        ? structureTransport
        : Number(studentTransportValue || 0);

    const academicPaid = Math.max(
      0,
      Number(student?.paidFee || 0)
    );

    const transportPaid = Math.max(
      0,
      Number(student?.transportPaid || 0)
    );

    const academicDue = Math.max(
      0,
      annualFee - academicPaid
    );

    const transportDue = Math.max(
      0,
      transportCharge - transportPaid
    );

    return {
      annualFee,
      transportCharge,
      academicPaid,
      academicDue,
      transportPaid,
      transportDue,
      totalPaid:
        academicPaid + transportPaid,
      totalDue:
        academicDue + transportDue,
      grandTotal:
        annualFee + transportCharge,
    };
  };

  const getPaymentHistory = (student) =>
    Array.isArray(student?.paymentHistory)
      ? student.paymentHistory
          .slice()
          .sort(
            (a, b) =>
              Number(b?.timestamp || 0) -
              Number(a?.timestamp || 0)
          )
      : [];

  const [showReports, setShowReports] = useState(false);

  /* ===============================
        REALTIME FIREBASE
  =============================== */

  useEffect(() => {

    const unsubscribeStudents = onSnapshot(

      collection(db, "students"),

      (snapshot) => {

        const data = snapshot.docs.map((doc) => ({

          id: doc.id,

          ...doc.data(),

        }));

        setStudents(data);

        setLoading(false);

      }

    );

    const unsubscribeFee = onSnapshot(

      doc(db, "settings", "feeSettings"),

      (snapshot) => {

        if (snapshot.exists()) {
          setFeeSettings(snapshot.data());
        } else {
          setFeeSettings({});
        }

      },

      (error) => {
        console.error("Fee settings listener error:", error);
        setFeeSettings({});
      }

    );

    const unsubscribeStructures = onSnapshot(

      collection(db, "feeStructures"),

      (snapshot) => {

        const nextStructures = {};

        snapshot.forEach((item) => {
          nextStructures[item.id] = {
            id: item.id,
            ...item.data(),
          };
        });

        setFeeStructures(nextStructures);
        setStructureLoading(false);
      },

      (error) => {
        console.error(
          "Fee structures listener error:",
          error
        );
        setFeeStructures({});
        setStructureLoading(false);
      }

    );

    return () => {

      unsubscribeStudents();
      unsubscribeFee();
      unsubscribeStructures();

    };

  }, []);

  /* ===============================
          SEARCH FILTER
  =============================== */

  const filteredStudents = useMemo(() => {

    const query = search.trim().toLowerCase();

    return students.filter((student) => {

      const value = (

        (student.name || "") +
        " " +
        (student.enrollmentNo || "") +
        " " +
        (student.className || "") +
        " " +
        (student.section || "")

      ).toLowerCase();

      if (query && !value.includes(query)) {
        return false;
      }

      if (
        classFilter !== "ALL" &&
        String(student.className || "") !==
          String(classFilter)
      ) {
        return false;
      }

      const fee = getStudentFeeSnapshot(student);

      const paidFee = fee.totalPaid;
      const dueFee = fee.totalDue;

      const status =
        dueFee <= 0
          ? "Paid"
          : paidFee > 0
          ? "Partial"
          : "Unpaid";

      if (
        statusFilter !== "ALL" &&
        status !== statusFilter
      ) {
        return false;
      }

      return true;

    });

  }, [
    students,
    search,
    classFilter,
    statusFilter,
    feeStructures,
    feeSettings,
  ]);

  /* ===============================
      LIVE SCHOOL STATISTICS
  =============================== */

  const totalStudents = students.length;

  const schoolFeeStats = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        const fee =
          getStudentFeeSnapshot(student);

        acc.academic += fee.annualFee;
        acc.transport += fee.transportCharge;
        acc.paid += fee.totalPaid;
        acc.due += fee.totalDue;

        return acc;
      },
      {
        academic: 0,
        transport: 0,
        paid: 0,
        due: 0,
      }
    );
  }, [
    students,
    feeStructures,
    feeSettings,
  ]);

  

  const totalSchoolFee =
    schoolFeeStats.academic +
    schoolFeeStats.transport;

  const totalCollected =
    schoolFeeStats.paid;

  const totalPending =
    schoolFeeStats.due;


  /* =========================================================
     FEE STRUCTURE + PAYMENT HELPERS
  ========================================================= */

  const classOptions = useMemo(() => {
    return [...new Set(
      students
        .map((student) => String(student.className || "").trim())
        .filter(Boolean)
    )].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [students]);

  const structureClasses = useMemo(() => {
    return classOptions.map((className) => ({
      className,
      id: `class-${className}`,
      data: feeStructures[`class-${className}`] || {
        className,
        tuitionFee: Number(feeSettings[`class${className}`] || 0),
        examFee: 0,
        transportFee: 0,
        otherFee: 0,
        total: Number(feeSettings[`class${className}`] || 0),
      },
    }));
  }, [classOptions, feeStructures, feeSettings]);

  const saveFeeStructure = async (className, values) => {
    setSavingStructure(true);

    try {
      const tuitionFee = Math.max(0, Number(values.tuitionFee || 0));
      const examFee = Math.max(0, Number(values.examFee || 0));
      const transportFee = Math.max(0, Number(values.transportFee || 0));
      const otherFee = Math.max(0, Number(values.otherFee || 0));
      const total = tuitionFee + examFee + transportFee + otherFee;

      await setDoc(
        doc(db, "feeStructures", `class-${className}`),
        {
          className: String(className),
          sessionName: "2026-27",
          tuitionFee,
          examFee,
          transportFee,
          otherFee,
          total,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Keep the existing settings document compatible with the current
      // FeeManagement calculation used elsewhere in the ERP.
      await setDoc(
        doc(db, "settings", "feeSettings"),
        {
          [`class${className}`]: total,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Fee structure save error:", error);
      window.alert(
        "Fee structure save nahi ho paya. Console check karein."
      );
    } finally {
      setSavingStructure(false);
    }
  };

  const openPayment = (student) => {
    setPaymentStudent(student);
    setPaymentAmount("");
    setPaymentMethod("Cash");
    setPaymentRemarks("");
    // Always open on Academic. A previous Transport selection must
    // never make a student with academic dues look fully paid.
    setTransportCollection(false);
  };

  const collectPayment = async () => {
    if (!paymentStudent || savingPayment) {
      return;
    }

    const selectedType =
      transportCollection
        ? "TRANSPORTATION"
        : "ACADEMIC";

    const amount =
      Number(paymentAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      window.alert(
        "Valid payment amount enter karein."
      );
      return;
    }

    const preview =
      getStudentFeeSnapshot(
        paymentStudent
      );

    const selectedDue =
      selectedType === "TRANSPORTATION"
        ? preview.transportDue
        : preview.academicDue;

    if (selectedDue <= 0) {
      window.alert(
        selectedType === "TRANSPORTATION"
          ? "Transportation fee fully paid hai."
          : "Academic fee fully paid hai."
      );
      return;
    }

    if (amount > selectedDue) {
      window.alert(
        `Maximum due ₹${selectedDue.toLocaleString(
          "en-IN"
        )} hai.`
      );
      return;
    }

    setSavingPayment(true);

    try {
      const now =
        new Date();

      const receiptNo =
        `XYZ-${now.getFullYear()}-` +
        `${String(
          paymentStudent.enrollmentNo ||
            "NA"
        ).replace(
          /[^a-zA-Z0-9]/g,
          ""
        )}-` +
        `${Date.now()
          .toString(36)
          .toUpperCase()}`;

      const basePayment = {
        amount,
        feeType: selectedType,
        date:
          now.toLocaleDateString(
            "en-GB"
          ),
        day:
          now.toLocaleDateString(
            "en-IN",
            { weekday: "long" }
          ),
        method:
          paymentMethod,
        receiptNo,
        receivedBy:
          "Admin",
        remarks:
          paymentRemarks.trim(),
        status:
          "SUCCESS",
        time:
          now.toLocaleTimeString(
            "en-IN",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }
          ),
        timestamp:
          Date.now(),
      };

      const studentRef =
        doc(
          db,
          "students",
          paymentStudent.id
        );

      let finalState = null;
      let finalFee = null;
      let savedPayment = null;

      await runTransaction(
        db,
        async (transaction) => {
          const snap =
            await transaction.get(
              studentRef
            );

          if (!snap.exists()) {
            throw new Error(
              "Student record nahi mila."
            );
          }

          const current =
            snap.data();

          const fee =
            getStudentFeeSnapshot(
              current
            );

          const currentDue =
            selectedType ===
            "TRANSPORTATION"
              ? fee.transportDue
              : fee.academicDue;

          if (amount > currentDue) {
            throw new Error(
              `Current due ₹${currentDue.toLocaleString(
                "en-IN"
              )} se zyada payment allowed nahi hai.`
            );
          }

          const academicPaid =
            fee.academicPaid +
            (selectedType ===
            "ACADEMIC"
              ? amount
              : 0);

          const transportPaid =
            fee.transportPaid +
            (selectedType ===
            "TRANSPORTATION"
              ? amount
              : 0);

          const academicDue =
            Math.max(
              0,
              fee.annualFee -
                academicPaid
            );

          const transportDue =
            Math.max(
              0,
              fee.transportCharge -
                transportPaid
            );

          const totalPaid =
            academicPaid +
            transportPaid;

          const totalDue =
            academicDue +
            transportDue;

          const history =
            Array.isArray(
              current.paymentHistory
            )
              ? current.paymentHistory
              : [];

          savedPayment = {
            ...basePayment,
            academicPaidBefore:
              fee.academicPaid,
            transportPaidBefore:
              fee.transportPaid,
            academicPaidAfter:
              academicPaid,
            academicDueAfter:
              academicDue,
            transportPaidAfter:
              transportPaid,
            transportDueAfter:
              transportDue,
            totalPaidAfter:
              totalPaid,
            totalDueAfter:
              totalDue,
          };

          finalState = {
            academicPaid,
            academicDue,
            transportPaid,
            transportDue,
            totalPaid,
            totalDue,
          };

          finalFee = fee;

          transaction.update(
            studentRef,
            {
              annualFee:
                fee.annualFee,
              paidFee:
                academicPaid,
              dueFee:
                academicDue,
              transportFee:
                fee.transportCharge,
              transportPaid:
                transportPaid,
              transportDue:
                transportDue,
              totalPaid,
              totalDue,
              paymentHistory: [
                ...history,
                savedPayment,
              ],
              lastPayment:
                basePayment.date,
              lastPaymentMethod:
                basePayment.method,
              updatedAt:
                serverTimestamp(),
            }
          );
        }
      );

      const receipt = {
        ...savedPayment,
        studentName:
          paymentStudent.name ||
          "",
        enrollmentNo:
          paymentStudent.enrollmentNo ||
          "",
        className:
          paymentStudent.className ||
          "",
        section:
          paymentStudent.section ||
          "",
        annualFee:
          finalFee.annualFee,
        transportCharge:
          finalFee.transportCharge,
        previousAcademicPaid:
          savedPayment.academicPaidBefore,
        previousTransportPaid:
          savedPayment.transportPaidBefore,
        academicPaidAfter:
          finalState.academicPaid,
        academicDueAfter:
          finalState.academicDue,
        transportPaidAfter:
          finalState.transportPaid,
        transportDueAfter:
          finalState.transportDue,
        totalPaidAfter:
          finalState.totalPaid,
        totalDueAfter:
          finalState.totalDue,
      };

      setLastReceipt(
        receipt
      );

      setPaymentStudent(
        null
      );
      setPaymentAmount(
        ""
      );
      setPaymentRemarks(
        ""
      );
      setPaymentMethod(
        "Cash"
      );
      setTransportCollection(
        false
      );

      await downloadReceipt(
        receipt
      );

      window.alert(
        `Payment successfully collected.\n\nReceipt No: ${receiptNo}`
      );
    } catch (error) {
      console.error(
        "Payment collection error:",
        error
      );

      window.alert(
        error?.message ||
        "Payment save nahi ho paya."
      );
    } finally {
      setSavingPayment(
        false
      );
    }
  };


  const buildProfessionalReceipt = async (
    receipt
  ) => {
    const pdf =
      new jsPDF({
        orientation:
          "portrait",
        unit: "mm",
        format: "a4",
      });

    const left = 15;
    const right = 195;

    pdf.setFillColor(
      15,
      118,
      110
    );
    pdf.rect(
      0,
      0,
      210,
      37,
      "F"
    );

    pdf.setTextColor(
      255,
      255,
      255
    );
    pdf.setFont(
      "helvetica",
      "bold"
    );
    pdf.setFontSize(
      20
    );
    pdf.text(
      "XYZ SCHOOL",
      105,
      14,
      { align: "center" }
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );
    pdf.setFontSize(
      9
    );
    pdf.text(
      "OFFICIAL FEE PAYMENT RECEIPT",
      105,
      21,
      { align: "center" }
    );

    pdf.setFontSize(
      8
    );
    pdf.text(
      "Academic Session 2026-27",
      105,
      28,
      { align: "center" }
    );

    pdf.setTextColor(
      35,
      35,
      35
    );
    pdf.setFont(
      "helvetica",
      "bold"
    );
    pdf.setFontSize(
      10
    );
    pdf.text(
      `Receipt No: ${receipt.receiptNo}`,
      left,
      47
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );
    pdf.text(
      `Date: ${receipt.date}`,
      right,
      47,
      { align: "right" }
    );

    pdf.setDrawColor(
      210,
      215,
      215
    );
    pdf.line(
      left,
      52,
      right,
      52
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );
    pdf.setFontSize(
      11
    );
    pdf.setTextColor(
      15,
      118,
      110
    );
    pdf.text(
      "STUDENT DETAILS",
      left,
      62
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );
    pdf.setFontSize(
      10
    );
    pdf.setTextColor(
      40,
      40,
      40
    );

    pdf.text(
      `Student Name: ${receipt.studentName}`,
      left,
      71
    );
    pdf.text(
      `Enrollment No: ${receipt.enrollmentNo}`,
      left,
      78
    );
    pdf.text(
      `Class: ${receipt.className || "-"}${
        receipt.section
          ? `-${receipt.section}`
          : ""
      }`,
      left,
      85
    );

    pdf.text(
      `Payment Method: ${receipt.method}`,
      right,
      71,
      { align: "right" }
    );
    pdf.text(
      `Payment Time: ${receipt.time}`,
      right,
      78,
      { align: "right" }
    );
    pdf.text(
      `Fee Type: ${receipt.feeType}`,
      right,
      85,
      { align: "right" }
    );

    const rows =
      receipt.feeType ===
      "TRANSPORTATION"
        ? [
            [
              "Transportation Charge",
              receipt.transportCharge,
            ],
            [
              "Previous Transport Paid",
              receipt.previousTransportPaid,
            ],
            [
              "Current Transport Payment",
              receipt.amount,
            ],
            [
              "Total Transport Paid",
              receipt.transportPaidAfter,
            ],
            [
              "Transportation Balance Due",
              receipt.transportDueAfter,
            ],
          ]
        : [
            [
              "Academic Annual Fee",
              receipt.annualFee,
            ],
            [
              "Previous Academic Paid",
              receipt.previousAcademicPaid,
            ],
            [
              "Current Academic Payment",
              receipt.amount,
            ],
            [
              "Total Academic Paid",
              receipt.academicPaidAfter,
            ],
            [
              "Academic Balance Due",
              receipt.academicDueAfter,
            ],
            [
              "Transportation Charge",
              receipt.transportCharge,
            ],
          ];

    const boxHeight =
      rows.length > 5
        ? 96
        : 88;

    pdf.setFillColor(
      240,
      247,
      246
    );
    pdf.roundedRect(
      left,
      95,
      180,
      boxHeight,
      3,
      3,
      "F"
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );
    pdf.setFontSize(
      11
    );
    pdf.setTextColor(
      15,
      118,
      110
    );
    pdf.text(
      "FEE SUMMARY",
      left + 6,
      104
    );

    let y = 115;

    rows.forEach(
      ([label, value], index) => {
        pdf.setFont(
          "helvetica",
          index >=
            rows.length - 2
            ? "bold"
            : "normal"
        );
        pdf.setFontSize(
          10
        );
        pdf.setTextColor(
          45,
          45,
          45
        );
        pdf.text(
          label,
          left + 7,
          y
        );
        pdf.text(
          `Rs. ${Number(
            value || 0
          ).toLocaleString(
            "en-IN"
          )}`,
          right - 7,
          y,
          { align: "right" }
        );
        y += 9;
      }
    );

    const statusY =
      rows.length > 5
        ? 199
        : 191;

    pdf.setFillColor(
      receipt.totalDueAfter <= 0
        ? 220
        : 255,
      receipt.totalDueAfter <= 0
        ? 252
        : 247,
      receipt.totalDueAfter <= 0
        ? 231
        : 237
    );

    pdf.roundedRect(
      left,
      statusY,
      180,
      16,
      3,
      3,
      "F"
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );
    pdf.setFontSize(
      10
    );
    pdf.setTextColor(
      receipt.totalDueAfter <= 0
        ? 22
        : 180,
      receipt.totalDueAfter <= 0
        ? 101
        : 83,
      receipt.totalDueAfter <= 0
        ? 52
        : 9
    );

    pdf.text(
      receipt.totalDueAfter <= 0
        ? "STATUS: FULLY PAID"
        : "STATUS: PAYMENT RECEIVED",
      105,
      statusY + 10,
      { align: "center" }
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );
    pdf.setFontSize(
      9
    );
    pdf.setTextColor(
      70,
      70,
      70
    );

    pdf.text(
      `Total Paid: Rs. ${Number(
        receipt.totalPaidAfter || 0
      ).toLocaleString(
        "en-IN"
      )}`,
      left,
      statusY + 27
    );

    pdf.text(
      `Total Outstanding: Rs. ${Number(
        receipt.totalDueAfter || 0
      ).toLocaleString(
        "en-IN"
      )}`,
      right,
      statusY + 27,
      { align: "right" }
    );

    let qrY =
      statusY + 38;

    if (receipt.remarks) {
      pdf.setFont(
        "helvetica",
        "bold"
      );
      pdf.setFontSize(
        9
      );
      pdf.text(
        "Remarks:",
        left,
        qrY
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.text(
        pdf.splitTextToSize(
          receipt.remarks,
          125
        ),
        left + 18,
        qrY
      );

      qrY += 15;
    }

    try {
      const qr =
        await QRCode.toDataURL(
          JSON.stringify({
            receiptNo:
              receipt.receiptNo,
            student:
              receipt.enrollmentNo,
            amount:
              receipt.amount,
            feeType:
              receipt.feeType,
            date:
              receipt.date,
          }),
          {
            width: 180,
            margin: 1,
          }
        );

      pdf.addImage(
        qr,
        "PNG",
        155,
        qrY,
        35,
        35
      );

      pdf.setFontSize(
        7
      );
      pdf.setTextColor(
        90,
        90,
        90
      );
      pdf.text(
        "Receipt Verification",
        172.5,
        qrY + 40,
        { align: "center" }
      );
    } catch (error) {
      console.warn(
        "QR generation skipped:",
        error
      );
    }

    const signatureY =
      Math.min(
        qrY + 52,
        267
      );

    pdf.setDrawColor(
      130,
      130,
      130
    );
    pdf.line(
      left,
      signatureY,
      left + 55,
      signatureY
    );
    pdf.line(
      right - 55,
      signatureY,
      right,
      signatureY
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );
    pdf.setFontSize(
      8
    );
    pdf.setTextColor(
      55,
      55,
      55
    );
    pdf.text(
      "School Office",
      left + 27.5,
      signatureY + 6,
      { align: "center" }
    );
    pdf.text(
      "Authorized Signatory",
      right - 27.5,
      signatureY + 6,
      { align: "center" }
    );

    pdf.setDrawColor(
      210,
      215,
      215
    );
    pdf.line(
      left,
      284,
      right,
      284
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );
    pdf.setFontSize(
      7.5
    );
    pdf.setTextColor(
      90,
      90,
      90
    );
    pdf.text(
      "This is a computer-generated official fee receipt.",
      105,
      291,
      { align: "center" }
    );
    pdf.text(
      "Please retain this receipt for your records.",
      105,
      295,
      { align: "center" }
    );

    return pdf;
  };

  const downloadReceipt = async (
    receipt
  ) => {
    if (!receipt) return;

    const pdf =
      await buildProfessionalReceipt(
        receipt
      );

    pdf.save(
      `fee-receipt-${receipt.receiptNo}.pdf`
    );
  };

  const printReceipt = async (
    receipt
  ) => {
    if (!receipt) return;

    const pdf =
      await buildProfessionalReceipt(
        receipt
      );

    const url =
      URL.createObjectURL(
        pdf.output("blob")
      );

    const printWindow =
      window.open(
        url,
        "_blank",
        "width=900,height=1100"
      );

    if (!printWindow) {
      URL.revokeObjectURL(
        url
      );
      window.alert(
        "Print window blocked hai. Browser popup allow karein."
      );
      return;
    }

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();

      setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        3000
      );
    };
  };


  const exportFeeCSV = () => {
    const rows = filteredStudents.map((student) => {
      const fee = getStudentFeeSnapshot(student);

      const paid = fee.totalPaid;
      const due = fee.totalDue;

      return [
        student.name || "",
        student.enrollmentNo || "",
        student.className || "",
        student.section || "",
        fee.annualFee,
        fee.transportCharge,
        paid,
        due,
        due === 0 ? "Paid" : paid === 0 ? "Unpaid" : "Partial",
      ];
    });

    const csv = [
      [
        "Student",
        "Enrollment",
        "Class",
        "Section",
        "Academic Fee",
        "Transport Charge",
        "Total Paid",
        "Total Due",
        "Status",
      ],
      ...rows,
    ]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      `fee-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ===============================
        LOADING SCREEN
  =============================== */

  if (loading) {

    return (

      <AdminLayout>

        <div className="flex items-center justify-center h-[80vh]">

          <div className="text-center">

            <div className="w-16 h-16 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>

            <h2 className="text-2xl font-bold text-green-700 mt-6">

              Loading Fee Records...

            </h2>

          </div>

        </div>

      </AdminLayout>

    );

  }

  /* ===============================
            RETURN
  =============================== */

  return (

    <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">

  {/* =========================
          PAGE HEADER
  ========================= */}

  <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">

    <div>

      <h1 className="text-4xl font-bold text-green-700">

        💰 Fee Management

      </h1>

      <p className="text-gray-500 mt-2">

        Live Fee Collection & Student Fee Management

      </p>

    </div>

    <div className="flex gap-3">

      <button

        onClick={() => window.location.reload()}

        className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl shadow"

      >

        🔄 Refresh

      </button>

      <button

        className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl shadow"

      >

        📊 Reports

      </button>

    </div>

  </div>

  {/* =========================
          SEARCH BAR
  ========================= */}

  <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">

    <div className="flex flex-col lg:flex-row justify-between gap-5">

      <input

        type="text"

        value={search}

        onChange={(e) => setSearch(e.target.value)}

        placeholder="Search by Name / Enrollment / Class"

        className="border rounded-xl px-5 py-4 lg:w-96 outline-none focus:ring-2 focus:ring-green-600"

      />

      <div className="flex gap-4">

        <div className="bg-green-100 rounded-xl px-6 py-4">

          <p className="text-gray-500">

            Database

          </p>

          <h3 className="font-bold text-green-700">

            🟢 Live

          </h3>

        </div>

        <div className="bg-blue-100 rounded-xl px-6 py-4">

          <p className="text-gray-500">

            Showing

          </p>

          <h3 className="font-bold text-blue-700">

            {filteredStudents.length}

          </h3>

        </div>

      </div>

    </div>

  </div>


  {/* =========================
         DASHBOARD CARDS
  ========================= */}

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Total Students

      </p>

      <h2 className="text-4xl font-bold text-blue-700 mt-3">

        {totalStudents}

      </h2>

    </div>

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Total School Fee

      </p>

      <h2 className="text-3xl font-bold text-green-700 mt-3">

        ₹ {totalSchoolFee.toLocaleString()}

      </h2>

    </div>

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Collected Fee

      </p>

      <h2 className="text-3xl font-bold text-blue-700 mt-3">

        ₹ {totalCollected.toLocaleString()}

      </h2>

    </div>

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <p className="text-gray-500">

        Pending Fee

      </p>

      <h2 className="text-3xl font-bold text-red-600 mt-3">

        ₹ {totalPending.toLocaleString()}

      </h2>

    </div>

  </div>


  {/* =========================================================
      REPORT / FILTER TOOLBAR
  ========================================================= */}

  <section className="mb-5 bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
        <div>
          <p className="text-sm font-black text-emerald-800">
            🟢 Firebase Live Sync
          </p>
          <p className="text-xs text-emerald-700">
            Fee, transport, paid/due aur payment history ek hi student record se sync hote hain.
          </p>
        </div>
        <span className="text-xs font-black text-emerald-700">
          LIVE
        </span>
      </div>

      {lastReceipt && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printReceipt(lastReceipt)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          >
            🖨️ Print Receipt
          </button>

          <button
            type="button"
            onClick={() => downloadReceipt(lastReceipt)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
          >
            ⬇️ Download Receipt
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 bg-white font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="ALL">All Classes</option>
          {classOptions.map((className) => (
            <option key={className} value={className}>
              Class {className}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 bg-white font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="ALL">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">

        <button
          type="button"
          onClick={exportFeeCSV}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
        >
          📥 Download Fee Excel
        </button>

        <button
          type="button"
          onClick={() => setShowReports((value) => !value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:border-indigo-300 hover:text-indigo-700"
        >
          📊 {showReports ? "Hide Summary" : "Show Summary"}
        </button>
      </div>
    </div>

    {showReports && (
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
        <MiniReport
          label="Showing"
          value={filteredStudents.length}
          tone="blue"
        />
        <MiniReport
          label="Paid"
          value={
            filteredStudents.filter((student) => {
              const fee =
              getStudentFeeSnapshot(student);

              return fee.totalDue <= 0;
            }).length
          }
          tone="green"
        />
        <MiniReport
          label="Partial"
          value={
            filteredStudents.filter((student) => {
              const fee =
                getStudentFeeSnapshot(student);

              return (
                fee.totalPaid > 0 &&
                fee.totalDue > 0
              );
            }).length
          }
          tone="amber"
        />
        <MiniReport
          label="Unpaid"
          value={
            filteredStudents.filter(
              (student) =>
                getStudentFeeSnapshot(student)
                  .totalPaid <= 0
            ).length
          }
          tone="red"
        />
      </div>
    )}
  </section>

  {/* =========================
         TABLE HEADER
  ========================= */}

  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

    <div className="bg-gradient-to-r from-green-700 to-green-900 text-white px-6 py-5">

      <h2 className="text-2xl font-bold">

        Student Fee Records

      </h2>

      <p className="text-green-100 mt-2">

        All fee calculations are synced automatically with Firebase.

      </p>

    </div>

    <div className="overflow-x-auto">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-4">Student</th>

            <th className="p-4">Class</th>

            <th className="p-4">Annual Fee</th>

            <th className="p-4">Paid</th>

            <th className="p-4">Due</th>

            <th className="p-4">Status</th>

            <th className="p-4">Action</th>

          </tr>

        </thead>

        <tbody>{filteredStudents.length === 0 ? (

  <tr>

    <td
      colSpan="7"
      className="text-center py-16"
    >

      <div className="flex flex-col items-center">

        <div className="text-6xl mb-4">
          🎓
        </div>

        <h2 className="text-2xl font-bold text-gray-600">

          No Students Found

        </h2>

        <p className="text-gray-500 mt-2">

          No student matches your search.

        </p>

      </div>

    </td>

  </tr>

) : (

  filteredStudents.map((student) => {

    const fee =
      getStudentFeeSnapshot(student);

    const annualFee =
      fee.annualFee;

    const paidFee =
      fee.totalPaid;

    const dueFee =
      fee.totalDue;

    const status =
      dueFee <= 0
        ? "Paid"
        : paidFee === 0
        ? "Unpaid"
        : "Partial";

    return (

      <tr
        key={student.id}
        className="border-b hover:bg-green-50 transition"
      >

        {/* Student */}

        <td className="p-4">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-full bg-green-700 text-white flex items-center justify-center font-bold">

              {student.name?.charAt(0).toUpperCase()}

            </div>

            <div>

              <h3 className="font-semibold">

                {student.name}

              </h3>

              <p className="text-sm text-gray-500">

                {student.enrollmentNo}

              </p>

            </div>

          </div>

        </td>

        {/* Class */}

        <td className="p-4">

          Class {student.className}-{student.section}

        </td>

        {/* Annual Fee */}

        <td className="p-4 font-bold text-blue-700">

          ₹ {annualFee.toLocaleString()}

        </td>

        {/* Paid */}

        <td className="p-4 font-bold text-green-700">

          ₹ {paidFee.toLocaleString()}

        </td>

        {/* Due */}

        <td className="p-4 font-bold text-red-700">

          ₹ {dueFee.toLocaleString()}

        </td>

        {/* Status */}

        <td className="p-4">

          {status === "Paid" && (

            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

              ✅ Paid

            </span>

          )}

          {status === "Partial" && (

            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">

              🟡 Partial

            </span>

          )}

          {status === "Unpaid" && (

            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">

              🔴 Unpaid

            </span>

          )}

        </td>

        {/* Action */}

        <td className="p-4">

          <div className="flex gap-2">

            <button
  type="button"
  onClick={() => openPayment(student)}
  className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-4 py-2 rounded-xl font-bold shadow-sm transition cursor-pointer"
>
  💰 Collect
</button>
<button
  type="button"
  onClick={() => {
    setHistoryStudent(student);
    setHistorySearch("");
    setHistoryMethodFilter("ALL");
    setHistoryStatusFilter("ALL");
  }}
  className="bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white px-4 py-2 rounded-xl font-bold shadow-sm transition cursor-pointer"
>
  📚 History
</button>


</div>

</td>

</tr>

            );
          })
        )}
      </tbody>

      </table>

    </div>

  </div>

  {/* Footer */}

  <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">

    <div className="flex flex-col md:flex-row justify-between items-center">

      <div>

        <h2 className="text-xl font-bold">

          Fee Management Summary

        </h2>

        <p className="text-gray-500 mt-2">

          All calculations are synced automatically with Firebase.

        </p>

      </div>

      <div className="mt-4 md:mt-0">

        <span className="bg-green-100 text-green-700 px-5 py-3 rounded-xl font-semibold">

          🟢 Live Sync Enabled

        </span>

      </div>

    </div>

  </div>


      {historyStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHistoryStudent(null);
          }}>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-200">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-300">Payment Ledger</p>
                  <h2 className="text-2xl font-black mt-1">{historyStudent.name}</h2>
                  <p className="text-sm text-slate-300 mt-1">{historyStudent.enrollmentNo} · Class {historyStudent.className || "-"}{historyStudent.section ? `-${historyStudent.section}` : ""}</p>
                </div>
                <button type="button" onClick={() => setHistoryStudent(null)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-xl font-bold">×</button>
              </div>
            </div>

            {lastReceipt && lastReceipt.enrollmentNo === historyStudent.enrollmentNo && (
              <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => printReceipt(lastReceipt)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700"
                >
                  🖨️ Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => downloadReceipt(lastReceipt)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700"
                >
                  ⬇️ Download Receipt
                </button>
              </div>
            )}

            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search receipt, date, remarks..."
                  className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400" />
                <select value={historyMethodFilter} onChange={(e) => setHistoryMethodFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold">
                  <option value="ALL">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {["ALL", "ACADEMIC", "TRANSPORTATION"].map((type) => (
                  <button key={type} type="button" onClick={() => setHistoryStatusFilter(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-black ${historyStatusFilter === type ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                    {type === "ALL" ? "All" : type === "ACADEMIC" ? "Academic" : "Transportation"}
                  </button>

                ))}
              </div>
            </div>

            <div className="max-h-[55vh] overflow-auto p-5">
              {(() => {
                const history =
                  getPaymentHistory(
                    historyStudent
                  );
                const filtered = history.filter((payment) => {
                  const type = payment.feeType || "ACADEMIC";
                  if (historyStatusFilter !== "ALL" && type !== historyStatusFilter) return false;
                  if (historyMethodFilter !== "ALL" && payment.method !== historyMethodFilter) return false;
                  const q = historySearch.trim().toLowerCase();
                  if (!q) return true;
                  return [payment.receiptNo, payment.date, payment.remarks]
                    .map((v) => String(v || "").toLowerCase())
                    .some((v) => v.includes(q));
                }).slice().reverse();

                const total = filtered.reduce(
                  (sum, p) =>
                    sum + Number(p.amount || 0),
                  0
                );

                const liveSnapshot =
                  getStudentFeeSnapshot(
                    historyStudent
                  );

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                        <p className="text-xs font-black text-emerald-600 uppercase">Records</p>
                        <p className="text-2xl font-black text-emerald-800">{filtered.length}</p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                        <p className="text-xs font-black text-blue-600 uppercase">Filtered Collection</p>
                        <p className="text-2xl font-black text-blue-800">₹{total.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-100 border border-slate-200 p-4">
                        <p className="text-xs font-black text-slate-600 uppercase">Current Total Due</p>
                        <p className="text-2xl font-black text-slate-800">
                          ₹{liveSnapshot.totalDue.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Academic ₹{liveSnapshot.academicDue.toLocaleString("en-IN")} ·
                          Transport ₹{liveSnapshot.transportDue.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {filtered.length ? filtered.map((payment, index) => (
                        <div key={payment.receiptNo || `${payment.timestamp}-${index}`}
                          className="rounded-2xl border border-slate-200 p-4 hover:border-emerald-200 hover:shadow-sm">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${payment.feeType === "TRANSPORTATION" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}>
                                  {payment.feeType === "TRANSPORTATION" ? "🚌 TRANSPORT" : "🎓 ACADEMIC"}
                                </span>
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black">
                                  ✓ {payment.status || "SUCCESS"}
                                </span>
                              </div>
                              <p className="font-black text-slate-800 mt-2">{payment.receiptNo || "Receipt"}</p>
                              <p className="text-xs text-slate-500 mt-1">{payment.date || "-"} · {payment.time || "-"} · {payment.method || "-"}</p>
                              {payment.remarks && <p className="text-xs text-slate-500 mt-2">Remark: {payment.remarks}</p>}
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-5">
                              <p className="text-xl font-black text-slate-900">₹{Number(payment.amount || 0).toLocaleString("en-IN")}</p>
                              <button type="button"
                                onClick={() => {
                                  const snapshot =
                                    getStudentFeeSnapshot(
                                      historyStudent
                                    );

                                  const receipt = {
                                    ...payment,
                                    studentName:
                                      historyStudent.name || "",
                                    enrollmentNo:
                                      historyStudent.enrollmentNo || "",
                                    className:
                                      historyStudent.className || "",
                                    section:
                                      historyStudent.section || "",
                                    annualFee:
                                      snapshot.annualFee,
                                    transportCharge:
                                      snapshot.transportCharge,
                                    previousAcademicPaid:
                                      Number(
                                        payment.academicPaidBefore ??
                                        Math.max(
                                          0,
                                          Number(payment.academicPaidAfter || 0) -
                                          (payment.feeType === "ACADEMIC"
                                            ? Number(payment.amount || 0)
                                            : 0)
                                        )
                                      ),
                                    previousTransportPaid:
                                      Number(
                                        payment.transportPaidBefore ??
                                        Math.max(
                                          0,
                                          Number(payment.transportPaidAfter || 0) -
                                          (payment.feeType === "TRANSPORTATION"
                                            ? Number(payment.amount || 0)
                                            : 0)
                                        )
                                      ),
                                    academicPaidAfter:
                                      Number(
                                        payment.academicPaidAfter ??
                                        snapshot.academicPaid
                                      ),
                                    academicDueAfter:
                                      Number(
                                        payment.academicDueAfter ??
                                        snapshot.academicDue
                                      ),
                                    transportPaidAfter:
                                      Number(
                                        payment.transportPaidAfter ??
                                        snapshot.transportPaid
                                      ),
                                    transportDueAfter:
                                      Number(
                                        payment.transportDueAfter ??
                                        snapshot.transportDue
                                      ),
                                    totalPaidAfter:
                                      Number(
                                        payment.totalPaidAfter ??
                                        snapshot.totalPaid
                                      ),
                                    totalDueAfter:
                                      Number(
                                        payment.totalDueAfter ??
                                        snapshot.totalDue
                                      ),
                                  };

                                  setLastReceipt(
                                    receipt
                                  );

                                  downloadReceipt(
                                    receipt
                                  );
                                }}
                                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
                                🧾 Generate Receipt
                              </button>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-14 text-center text-slate-500">
                          <div className="text-4xl">🧾</div>
                          <p className="font-black mt-3">No payment records found</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {paymentStudent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPaymentStudent(null);
            }
          }}
        >
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-100">
                    Fee Collection
                  </p>

                  <h2 className="text-2xl font-black mt-1">
                    Collect Student Fee
                  </h2>

                  <p className="text-sm text-emerald-100 mt-1">
                    {paymentStudent.name || "Student"} ·
                    {" "}Class {paymentStudent.className || "-"}
                    {paymentStudent.section
                      ? `-${paymentStudent.section}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPaymentStudent(null)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">

              {(() => {
                const feeSnapshot =
                  getStudentFeeSnapshot(
                    paymentStudent
                  );

                const annualFee =
                  feeSnapshot.annualFee;

                const paid =
                  feeSnapshot.academicPaid;

                const transportCharge =
                  feeSnapshot.transportCharge;

                const transportPaid =
                  feeSnapshot.transportPaid;

                const academicDue =
                  feeSnapshot.academicDue;

                const transportDue =
                  feeSnapshot.transportDue;

                const selectedDue =
                  transportCollection
                    ? transportDue
                    : academicDue;

                const totalOutstanding =
                  Math.max(0, academicDue) +
                  Math.max(0, transportDue);

                return (
                  <>
                    <div className="space-y-3">

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                          <p className="text-[11px] font-black text-blue-600 uppercase tracking-wide">
                            Academic Fee
                          </p>
                          <p className="text-xl font-black text-blue-800 mt-1">
                            ₹{annualFee.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-wide">
                            Academic Paid
                          </p>
                          <p className="text-xl font-black text-emerald-800 mt-1">
                            ₹{paid.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                          <p className="text-[11px] font-black text-red-600 uppercase tracking-wide">
                            Academic Due
                          </p>
                          <p className="text-xl font-black text-red-800 mt-1">
                            ₹{academicDue.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
                          <p className="text-[11px] font-black text-purple-600 uppercase tracking-wide">
                            Transport Charge
                          </p>
                          <p className="text-xl font-black text-purple-800 mt-1">
                            ₹{transportCharge.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                          <p className="text-[11px] font-black text-violet-600 uppercase tracking-wide">
                            Transport Paid
                          </p>
                          <p className="text-xl font-black text-violet-800 mt-1">
                            ₹{transportPaid.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4">
                          <p className="text-[11px] font-black text-orange-600 uppercase tracking-wide">
                            Transport Due
                          </p>
                          <p className="text-xl font-black text-orange-800 mt-1">
                            ₹{transportDue.toLocaleString("en-IN")}
                          </p>
                        </div>

                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-100 border border-slate-200 p-4">
                          <p className="text-[11px] font-black text-slate-600 uppercase tracking-wide">
                            Total Paid
                          </p>
                          <p className="text-2xl font-black text-slate-900 mt-1">
                            ₹{feeSnapshot.totalPaid.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-red-100 border border-red-200 p-4">
                          <p className="text-[11px] font-black text-red-700 uppercase tracking-wide">
                            Total Outstanding Due
                          </p>
                          <p className="text-2xl font-black text-red-900 mt-1">
                            ₹{feeSnapshot.totalDue.toLocaleString("en-IN")}
                          </p>
                          <p className="text-[11px] text-red-700 mt-1">
                            Academic ₹{academicDue.toLocaleString("en-IN")}
                            {" · "}
                            Transport ₹{transportDue.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                    </div>

                    {feeSnapshot.totalDue <= 0 ? (
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                        <p className="font-black text-emerald-700">
                          ✅ Fee Fully Paid
                        </p>
                        <p className="text-sm text-emerald-600 mt-1">
                          Is student ke liye academic aur transportation dono outstanding fees ₹0 hain.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <p className="font-black text-slate-800">Collection Type</p>
      <p className="text-xs text-slate-500 mt-1">Academic ya transportation payment select karein.</p>
    </div>
    <div className="flex gap-2">
      <button type="button" onClick={() => setTransportCollection(false)}
        className={`px-4 py-2 rounded-xl text-xs font-black ${!transportCollection ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
        🎓 Academic
      </button>
      <button type="button" onClick={() => setTransportCollection(true)}
        disabled={transportDue <= 0}
        className={`px-4 py-2 rounded-xl text-xs font-black ${transportCollection ? "bg-purple-600 text-white" : "bg-white border border-slate-200 text-slate-600"} ${transportDue <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}>
        🚌 Transportation {transportDue <= 0 ? "(Paid)" : ""}
      </button>
    </div>
  </div>
</div>

<div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            Payment Amount
                          </label>

                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500">
                              ₹
                            </span>

                            <input
                              type="number"
                              min="1"
                              max={selectedDue}
                              step="1"
                              value={paymentAmount}
                              onChange={(event) =>
                                setPaymentAmount(
                                  event.target.value
                                )
                              }
                              placeholder={`Maximum ₹${selectedDue.toLocaleString("en-IN")}`}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-4 text-lg font-bold outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                              autoFocus
                            />
                          </div>

                          <p className="text-xs text-slate-500 mt-2">
                            Maximum collectible:
                            {" "}
                            <b className="text-red-600">
                              ₹{selectedDue.toLocaleString("en-IN")}
                            </b>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            Payment Method
                          </label>

                          <select
                            value={paymentMethod}
                            onChange={(event) =>
                              setPaymentMethod(
                                event.target.value
                              )
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                          >
                            <option value="Cash">
                              💵 Cash
                            </option>
                            <option value="UPI">
                              📱 UPI
                            </option>
                            <option value="Bank Transfer">
                              🏦 Bank Transfer
                            </option>
                            <option value="Card">
                              💳 Card
                            </option>
                            <option value="Cheque">
                              🧾 Cheque
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            Remarks
                          </label>

                          <textarea
                            value={paymentRemarks}
                            onChange={(event) =>
                              setPaymentRemarks(
                                event.target.value
                              )
                            }
                            rows={3}
                            placeholder="Optional payment remarks..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 resize-none"
                          />
                        </div>

                        <div className="sticky bottom-0 -mx-6 px-6 pt-4 pb-1 bg-white/95 backdrop-blur border-t border-slate-200">
                          <div className="flex flex-col sm:flex-row gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                setPaymentStudent(null)
                              }
                              className="sm:w-1/3 rounded-2xl border border-slate-200 bg-white text-slate-700 py-3.5 font-black hover:bg-slate-50"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              disabled={
                                savingPayment ||
                                !paymentAmount ||
                                Number(paymentAmount) <= 0 ||
                                Number(paymentAmount) > selectedDue
                              }
                              onClick={collectPayment}
                              className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 font-black shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              {savingPayment
                                ? "Saving Payment..."
                                : "💰 Collect & Generate Receipt"}
                            </button>

                          </div>
                        </div>
                      </>
                    )}

                  </>
                );
              })()}

            </div>
          </div>
        </div>
      )}

</div>

</AdminLayout>

  );

}


function MiniReport({ label, value, tone }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${styles[tone] || styles.blue}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="text-2xl font-black mt-1">
        {value}
      </p>
    </div>
  );
}

export default FeeManagement;


    
