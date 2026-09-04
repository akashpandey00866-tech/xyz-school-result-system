import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import { db } from "../config/firebase";

function FeeManagement() {
  const getStudentFeeSnapshot = useCallback(
    (student) => {
      const annualFee = Number(
        feeStructures?.[`class-${student?.className}`]?.total ??
        feeSettings?.[`class${student?.className}`] ??
        student?.annualFee ??
        0
      );

      const transportCharge = Number(
        student?.transportFee ??
        student?.transportCharge ??
        student?.transportationFee ??
        student?.transportAmount ??
        0
      );

      const academicPaid = Number(
        student?.paidFee || 0
      );

      const transportPaid = Number(
        student?.transportPaid || 0
      );

      const academicDue = Math.max(
        0,
        annualFee - academicPaid
      );

      const transportDue = Math.max(
        0,
        transportCharge - transportPaid
      );

      const totalPaid =
        academicPaid + transportPaid;

      const totalDue =
        academicDue + transportDue;

      return {
        annualFee,
        transportCharge,
        academicPaid,
        academicDue,
        transportPaid,
        transportDue,
        totalPaid,
        totalDue,
      };
    },
    [feeStructures, feeSettings]
  );

  const getPaymentHistory = useCallback(
    (student) => {
      if (
        !Array.isArray(student?.paymentHistory)
      ) {
        return [];
      }

      return student.paymentHistory
        .slice()
        .sort(
          (a, b) =>
            Number(b?.timestamp || 0) -
            Number(a?.timestamp || 0)
        );
    },
    []
  );



  const navigate = useNavigate();

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

      const annualFee = Number(
        feeStructures[
          `class-${student.className}`
        ]?.total ??
        feeSettings[
          `class${student.className}`
        ] ??
        student.annualFee ??
        0
      );

      const paidFee = Number(
        student.paidFee || 0
      );

      const dueFee = Math.max(
        0,
        annualFee - paidFee
      );

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

  const totalSchoolFee = students.reduce(

    (sum, student) => {

      const annualFee = Number(

        feeStructures[
          `class-${student.className}`
        ]?.total ??
        feeSettings[
          `class${student.className}`
        ] ??
        student.annualFee ??
        0

      );

      return sum + annualFee;

    },

    0

  );

  const totalCollected = students.reduce(

    (sum, student) => {

      return (

        sum +

        Number(student.paidFee || 0)

      );

    },

    0

  );

  const totalPending =

    totalSchoolFee - totalCollected;


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
  };

  const collectPayment = async () => {
    if (!paymentStudent || savingPayment) return;

    const snapshot =
      getStudentFeeSnapshot(paymentStudent);

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert(
        "Valid payment amount enter karein."
      );
      return;
    }

    const collectionType =
      transportCollection
        ? "TRANSPORTATION"
        : "ACADEMIC";

    const selectedDue =
      collectionType === "TRANSPORTATION"
        ? snapshot.transportDue
        : snapshot.academicDue;

    if (selectedDue <= 0) {
      window.alert(
        collectionType === "TRANSPORTATION"
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
      const now = new Date();

      const receiptNo =
        `XYZ-${now.getFullYear()}-` +
        `${String(
          paymentStudent.enrollmentNo || "NA"
        ).replace(/[^a-zA-Z0-9]/g, "")}-` +
        `${Date.now().toString(36).toUpperCase()}`;

      const payment = {
        amount,
        feeType: collectionType,
        date: now.toLocaleDateString("en-GB"),
        day: now.toLocaleDateString("en-IN", {
          weekday: "long",
        }),
        method: paymentMethod,
        receiptNo,
        receivedBy: "Admin",
        remarks: paymentRemarks.trim(),
        status: "SUCCESS",
        time: now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        timestamp: Date.now(),
        academicPaidBefore:
          snapshot.academicPaid,
        academicDueBefore:
          snapshot.academicDue,
        transportPaidBefore:
          snapshot.transportPaid,
        transportDueBefore:
          snapshot.transportDue,
      };

      const history = getPaymentHistory(
        paymentStudent
      );

      let academicPaid =
        snapshot.academicPaid;

      let transportPaid =
        snapshot.transportPaid;

      if (
        collectionType === "TRANSPORTATION"
      ) {
        transportPaid += amount;
      } else {
        academicPaid += amount;
      }

      const academicDue = Math.max(
        0,
        snapshot.annualFee - academicPaid
      );

      const transportDue = Math.max(
        0,
        snapshot.transportCharge -
          transportPaid
      );

      const totalPaid =
        academicPaid + transportPaid;

      const totalDue =
        academicDue + transportDue;

      const updatedPayment = {
        ...payment,
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

      await updateDoc(
        doc(
          db,
          "students",
          paymentStudent.id
        ),
        {
          annualFee:
            snapshot.annualFee,
          paidFee:
            academicPaid,
          dueFee:
            academicDue,
          transportFee:
            snapshot.transportCharge,
          transportPaid:
            transportPaid,
          transportDue:
            transportDue,
          paymentHistory: [
            ...history,
            updatedPayment,
          ],
          lastPayment:
            payment.date,
          lastPaymentMethod:
            payment.method,
          totalPaid,
          totalDue,
          updatedAt:
            serverTimestamp(),
        }
      );

      const receipt = {
        ...updatedPayment,
        studentName:
          paymentStudent.name || "",
        enrollmentNo:
          paymentStudent.enrollmentNo || "",
        className:
          paymentStudent.className || "",
        section:
          paymentStudent.section || "",
        annualFee:
          snapshot.annualFee,
        transportCharge:
          snapshot.transportCharge,
        previousPaid:
          collectionType ===
          "TRANSPORTATION"
            ? snapshot.transportPaid
            : snapshot.academicPaid,
        paidAfter:
          collectionType ===
          "TRANSPORTATION"
            ? transportPaid
            : academicPaid,
        dueAfter:
          collectionType ===
          "TRANSPORTATION"
            ? transportDue
            : academicDue,
        totalPaidAfter:
          totalPaid,
        totalDueAfter:
          totalDue,
      };

      setLastReceipt(receipt);

      setPaymentStudent(null);
      setPaymentAmount("");
      setPaymentRemarks("");
      setPaymentMethod("Cash");
      setTransportCollection(false);

      try {
        await generateProfessionalReceipt(
          receipt
        );
      } catch (receiptError) {
        console.error(
          "Receipt generation failed after payment save:",
          receiptError
        );

        window.alert(
          `Payment successfully saved.\nReceipt No: ${receiptNo}\nPDF receipt generate nahi ho payi.`
        );

        return;
      }

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
      setSavingPayment(false);
    }
  };


  const generateProfessionalReceipt = async (receipt) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const left = 15;
    const right = 195;
    const center = pageWidth / 2;

    const money = (value) =>
      `₹ ${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const text = (value, fallback = "—") =>
      value === undefined || value === null || String(value).trim() === ""
        ? fallback
        : String(value);

    const safeFilePart = (value) =>
      String(value || "Receipt").replace(/[^a-zA-Z0-9_-]/g, "_");

    const schoolName = text(
      receipt.schoolName || feeSettings?.schoolName || "XYZ PUBLIC SCHOOL"
    );
    const schoolAddress = text(
      receipt.schoolAddress || feeSettings?.schoolAddress || "",
      ""
    );
    const schoolPhone = text(
      receipt.schoolPhone || feeSettings?.schoolPhone || "",
      ""
    );
    const schoolEmail = text(
      receipt.schoolEmail || feeSettings?.schoolEmail || "",
      ""
    );
    const session = text(
      receipt.session || receipt.academicSession || "2026-27"
    );

    const receiptNo = text(
      receipt.receiptNo || receipt.receiptNumber,
      "RECEIPT"
    );
    const studentName = text(receipt.studentName || receipt.name, "Student");
    const enrollmentNo = text(receipt.enrollmentNo || receipt.rollNumber);
    const classSection = `${text(receipt.className || receipt.class, "—")}${
      receipt.section ? ` / ${receipt.section}` : ""
    }`;
    const paymentDate = text(receipt.date, "—");
    const paymentTime = text(receipt.time, "—");
    const paymentMethod = text(receipt.method || receipt.paymentMethod, "Cash");
    const feeType = text(receipt.feeType, "ACADEMIC");

    const annualFee = Number(receipt.annualFee || 0);
    const transportCharge = Number(receipt.transportCharge || 0);
    const currentPayment = Number(receipt.amount || 0);
    const previousPaid = Number(receipt.previousPaid || 0);
    const paidAfter = Number(
      receipt.paidAfter ?? receipt.totalPaidAfter ?? previousPaid + currentPayment
    );
    const dueAfter = Math.max(
      0,
      Number(
        receipt.dueAfter ??
          receipt.totalDueAfter ??
          annualFee + transportCharge - paidAfter
      )
    );

    const totalFee =
      feeType === "TRANSPORTATION"
        ? transportCharge
        : annualFee + transportCharge;

    const status = dueAfter <= 0 ? "FULLY PAID" : "PAYMENT RECEIVED";

    /* =====================================================
       PROFESSIONAL A4 RECEIPT FRAME
       ===================================================== */
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setDrawColor(15, 118, 110);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(7, 7, 196, 283, 4, 4, "S");

    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(10, 10, 190, 277, 3, 3, "S");

    /* =====================================================
       HEADER
       ===================================================== */
    pdf.setFillColor(6, 78, 59);
    pdf.roundedRect(10, 10, 190, 40, 3, 3, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);
    pdf.text(schoolName.toUpperCase(), center, 22, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text("OFFICIAL FEE PAYMENT RECEIPT", center, 29, {
      align: "center",
    });

    pdf.setFontSize(7);
    pdf.text(`Academic Session: ${session}`, center, 35, {
      align: "center",
    });

    const contactLine = [schoolAddress, schoolPhone, schoolEmail]
      .filter(Boolean)
      .join("  •  ");

    if (contactLine) {
      pdf.setFontSize(6.5);
      pdf.text(contactLine.slice(0, 125), center, 42, {
        align: "center",
      });
    }

    /* =====================================================
       RECEIPT META
       ===================================================== */
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.text("RECEIPT NO.", left, 61);
    pdf.text("PAYMENT DATE", right, 61, { align: "right" });

    pdf.setFontSize(11.5);
    pdf.text(receiptNo, left, 68);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.text(paymentDate, right, 68, { align: "right" });

    pdf.setDrawColor(226, 232, 240);
    pdf.line(left, 74, right, 74);

    /* =====================================================
       STUDENT DETAILS
       ===================================================== */
    pdf.setFillColor(240, 253, 250);
    pdf.roundedRect(left, 81, 180, 47, 3, 3, "F");

    pdf.setTextColor(6, 95, 70);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("STUDENT DETAILS", left + 6, 90);

    const detailY = 100;
    const col1 = left + 6;
    const col2 = 108;

    const drawDetail = (label, value, x, y) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(label.toUpperCase(), x, y);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(value).slice(0, 42), x, y + 6);
    };

    drawDetail("Student Name", studentName, col1, detailY);
    drawDetail("Enrollment No.", enrollmentNo, col2, detailY);
    drawDetail("Class / Section", classSection, col1, detailY + 17);
    drawDetail("Payment Method", paymentMethod, col2, detailY + 17);

    /* =====================================================
       FEE BREAKDOWN
       ===================================================== */
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("FEE BREAKDOWN", left, 141);

    const rows =
      feeType === "TRANSPORTATION"
        ? [
            ["Transportation Charge", transportCharge],
            ["Previous Transport Paid", previousPaid],
            ["Current Transport Payment", currentPayment],
            ["Total Transport Paid", paidAfter],
            ["Transportation Balance Due", dueAfter],
          ]
        : [
            ["Annual Academic Fee", annualFee],
            ...(transportCharge > 0
              ? [["Transportation Charge", transportCharge]]
              : []),
            ["Total Fee", totalFee],
            ["Previous Paid", previousPaid],
            ["Current Payment", currentPayment],
            ["Total Paid After Payment", paidAfter],
            ["Balance Due After Payment", dueAfter],
          ];

    const tableTop = 147;
    const rowH = 8.2;
    const tableBottom = tableTop + (rows.length + 1) * rowH;

    pdf.setFillColor(15, 118, 110);
    pdf.roundedRect(left, tableTop, 180, rowH, 2, 2, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("FEE COMPONENT", left + 6, tableTop + 5.3);
    pdf.text("AMOUNT", right - 6, tableTop + 5.3, { align: "right" });

    rows.forEach(([label, value], index) => {
      const y = tableTop + rowH * (index + 1);

      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(left, y, 180, rowH, "F");
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(left, y + rowH, right, y + rowH);

      pdf.setFont("helvetica", index >= rows.length - 2 ? "bold" : "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text(label, left + 6, y + 5.3);
      pdf.text(money(value), right - 6, y + 5.3, { align: "right" });
    });

    pdf.setDrawColor(203, 213, 225);
    pdf.rect(left, tableTop, 180, tableBottom - tableTop, "S");

    /* =====================================================
       PAYMENT STATUS + AMOUNT HIGHLIGHT
       ===================================================== */
    const statusY = tableBottom + 9;

    pdf.setFillColor(
      dueAfter <= 0 ? 220 : 239,
      dueAfter <= 0 ? 252 : 246,
      dueAfter <= 0 ? 231 : 255
    );
    pdf.roundedRect(left, statusY, 180, 25, 3, 3, "F");

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("CURRENT PAYMENT", left + 7, statusY + 8);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(6, 95, 70);
    pdf.text(money(currentPayment), left + 7, statusY + 18);

    pdf.setFontSize(8);
    pdf.setTextColor(22, 101, 52);
    pdf.text(`STATUS: ${status}`, right - 7, statusY + 11, {
      align: "right",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Time: ${paymentTime}`, right - 7, statusY + 18, {
      align: "right",
    });

    /* =====================================================
       REMARKS
       ===================================================== */
    let footerBaseY = statusY + 34;
    if (receipt.remarks) {
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(left, footerBaseY, 180, 18, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(71, 85, 105);
      pdf.text("REMARKS", left + 5, footerBaseY + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);
      const remarkLines = pdf.splitTextToSize(String(receipt.remarks), 155);
      pdf.text(remarkLines.slice(0, 2), left + 28, footerBaseY + 6);
      footerBaseY += 25;
    }

    /* =====================================================
       QR VERIFICATION
       ===================================================== */
    const qrY = Math.min(footerBaseY, 226);
    try {
      const payload = JSON.stringify({
        type: "FEE_RECEIPT",
        receiptNo,
        enrollmentNo,
        amount: currentPayment,
        feeType,
        date: paymentDate,
        status,
      });

      const qr = await QRCode.toDataURL(payload, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      pdf.addImage(qr, "PNG", 158, qrY, 29, 29);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text("RECEIPT DATA", 172.5, qrY + 33, { align: "center" });
    } catch (qrError) {
      console.warn("Receipt QR generation skipped:", qrError);
    }

    /* =====================================================
       AUTHORIZATION
       ===================================================== */
    const signatureY = Math.min(qrY + 34, 258);

    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.35);
    pdf.line(left + 4, signatureY + 13, left + 59, signatureY + 13);
    pdf.line(right - 59, signatureY + 13, right - 4, signatureY + 13);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(30, 41, 59);
    pdf.text("School Office", left + 31.5, signatureY + 19, {
      align: "center",
    });
    pdf.text("Authorized Signatory", right - 31.5, signatureY + 19, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Signature", left + 31.5, signatureY + 24, {
      align: "center",
    });
    pdf.text("Signature / Seal", right - 31.5, signatureY + 24, {
      align: "center",
    });

    /* =====================================================
       FOOTER
       ===================================================== */
    pdf.setDrawColor(226, 232, 240);
    pdf.line(left, 279, right, 279);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Computer-generated official fee receipt.", left, 285);
    pdf.text("Please retain this receipt for your records.", right, 285, {
      align: "right",
    });

    pdf.setFontSize(6);
    pdf.text(`Receipt ID: ${receiptNo}`, center, 289, {
      align: "center",
    });

    pdf.save(`Fee_Receipt_${safeFilePart(receiptNo)}.pdf`);
  };

  const exportFeeCSV = () => {
    const rows = filteredStudents.map((student) => {
      const annualFee = Number(
        student.annualFee ??
        feeStructures[`class-${student.className}`]?.total ??
        feeSettings[`class${student.className}`] ??
        0
      );
      const paid = Number(student.paidFee || 0);
      const due = Math.max(0, annualFee - paid);

      return [
        student.name || "",
        student.enrollmentNo || "",
        student.className || "",
        student.section || "",
        annualFee,
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
        "Annual Fee",
        "Paid",
        "Due",
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


  {/* =========================================================
      FEE STRUCTURE
  ========================================================= */}

  <section className="mb-8 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
    <div className="p-6 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 border-b border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
            Academic Fee Setup
          </p>
          <h2 className="text-2xl font-black text-gray-900 mt-1">
            💰 Class-wise Fee Structure
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Set annual fees once. Student calculations update automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowStructure((value) => !value)}
          className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:border-indigo-300 hover:text-indigo-700"
        >
          {showStructure ? "Hide Structure" : "Show Structure"}
        </button>
      </div>
    </div>

    {showStructure && (
      <div className="p-6">
        {structureLoading ? (
          <div className="py-10 text-center text-gray-500">
            Loading fee structures...
          </div>
        ) : structureClasses.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
            <p className="font-bold text-gray-600">
              No classes found from student records.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {structureClasses.map(({ className, data }) => (
              <FeeStructureEditor
                key={className}
                className={className}
                initial={data}
                saving={savingStructure}
                onSave={saveFeeStructure}
              />
            ))}
          </div>
        )}
      </div>
    )}
  </section>

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

        {lastReceipt && (
          <button
            type="button"
            onClick={() =>
              generateProfessionalReceipt(lastReceipt)
            }
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          >
            🧾 Download Last Receipt
          </button>
        )}

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
              const annual = Number(
                student.annualFee ??
                feeStructures[`class-${student.className}`]?.total ??
                feeSettings[`class${student.className}`] ??
                0
              );
              return Number(student.paidFee || 0) >= annual;
            }).length
          }
          tone="green"
        />
        <MiniReport
          label="Partial"
          value={
            filteredStudents.filter((student) => {
              const annual = Number(
                student.annualFee ??
                feeStructures[`class-${student.className}`]?.total ??
                feeSettings[`class${student.className}`] ??
                0
              );
              const paid = Number(student.paidFee || 0);
              return paid > 0 && paid < annual;
            }).length
          }
          tone="amber"
        />
        <MiniReport
          label="Unpaid"
          value={
            filteredStudents.filter(
              (student) => Number(student.paidFee || 0) <= 0
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

    const annualFee =
      Number(
        student.annualFee ??
        feeStructures[`class-${student.className}`]?.total ??
        feeSettings[`class${student.className}`] ??
        0
      );

    const paidFee =
      Number(student.paidFee || 0);

    const dueFee =
      Math.max(0, annualFee - paidFee);

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


<button
  onClick={() => navigate(`/payment-history/${student.id}`)}
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
>
  📜 History
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
                                onClick={() => generateProfessionalReceipt({
                                  ...payment,
                                  studentName: historyStudent.name,
                                  enrollmentNo: historyStudent.enrollmentNo,
                                  className: historyStudent.className,
                                  section: historyStudent.section,
                                  annualFee: Number(historyStudent.annualFee || 0),
                                  transportCharge: Number(historyStudent.transportFee || historyStudent.transportCharge || 0),
                                  previousPaid: 0,
                                  paidAfter: Number(payment.amount || 0),
                                  dueAfter: 0,
                                })}
                                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
                                🧾 Receipt
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
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

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

            <div className="p-6 space-y-5">

              {(() => {
                const annualFee = Number(
                  feeStructures[
                    `class-${paymentStudent.className}`
                  ]?.total ??
                  feeSettings[
                    `class${paymentStudent.className}`
                  ] ??
                  paymentStudent.annualFee ??
                  0
                );

                const paid = Number(
                  paymentStudent.paidFee || 0
                );

                const transportCharge = Number(
                  paymentStudent.transportFee ??
                  paymentStudent.transportCharge ??
                  paymentStudent.transportationFee ??
                  paymentStudent.transportAmount ??
                  0
                );
                const transportPaid = Number(paymentStudent.transportPaid || 0);
                const academicDue = Math.max(0, annualFee - paid);
                const transportDue = Math.max(0, transportCharge - transportPaid);
                const due = transportCollection ? transportDue : academicDue;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase">
                          Annual Fee
                        </p>
                        <p className="text-xl font-black text-blue-800 mt-1">
                          ₹{annualFee.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
                        <p className="text-xs font-bold text-purple-600 uppercase">
                          Transport Charge
                        </p>
                        <p className="text-xl font-black text-purple-800 mt-1">
                          ₹{transportCharge.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                        <p className="text-xs font-bold text-emerald-600 uppercase">
                          Paid
                        </p>
                        <p className="text-xl font-black text-emerald-800 mt-1">
                          ₹{paid.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                        <p className="text-xs font-bold text-red-600 uppercase">
                          Due
                        </p>
                        <p className="text-xl font-black text-red-800 mt-1">
                          ₹{due.toLocaleString("en-IN")}
                        </p>
                      </div>

                    </div>

                    {due <= 0 ? (
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                        <p className="font-black text-emerald-700">
                          ✅ Fee Fully Paid
                        </p>
                        <p className="text-sm text-emerald-600 mt-1">
                          Is student ke liye koi outstanding fee nahi hai.
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
        className={`px-4 py-2 rounded-xl text-xs font-black ${transportCollection ? "bg-purple-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
        🚌 Transportation
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
                              max={due}
                              step="1"
                              value={paymentAmount}
                              onChange={(event) =>
                                setPaymentAmount(
                                  event.target.value
                                )
                              }
                              placeholder={`Maximum ₹${due.toLocaleString("en-IN")}`}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-4 text-lg font-bold outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                              autoFocus
                            />
                          </div>

                          <p className="text-xs text-slate-500 mt-2">
                            Maximum collectible:
                            {" "}
                            <b className="text-red-600">
                              ₹{due.toLocaleString("en-IN")}
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

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">

                          <button
                            type="button"
                            onClick={() =>
                              setPaymentStudent(null)
                            }
                            className="flex-1 rounded-2xl border border-slate-200 bg-white text-slate-700 py-3.5 font-black hover:bg-slate-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            disabled={
                              savingPayment ||
                              !paymentAmount ||
                              Number(paymentAmount) <= 0 ||
                              Number(paymentAmount) > due
                            }
                            onClick={collectPayment}
                            className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 font-black shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {savingPayment
                              ? "Saving Payment..."
                              : "💰 Collect Fee"}
                          </button>

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


function FeeStructureEditor({
  className,
  initial,
  saving,
  onSave,
}) {
  const [values, setValues] = useState({
    tuitionFee: Number(initial?.tuitionFee || 0),
    examFee: Number(initial?.examFee || 0),
    transportFee: Number(initial?.transportFee || 0),
    otherFee: Number(initial?.otherFee || 0),
  });

  useEffect(() => {
    setValues({
      tuitionFee: Number(initial?.tuitionFee || 0),
      examFee: Number(initial?.examFee || 0),
      transportFee: Number(initial?.transportFee || 0),
      otherFee: Number(initial?.otherFee || 0),
    });
  }, [
    initial?.tuitionFee,
    initial?.examFee,
    initial?.transportFee,
    initial?.otherFee,
  ]);

  const total =
    Number(values.tuitionFee || 0) +
    Number(values.examFee || 0) +
    Number(values.transportFee || 0) +
    Number(values.otherFee || 0);

  const update = (key, value) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-gray-400">
            Annual Structure
          </p>
          <h3 className="text-xl font-black text-indigo-700">
            Class {className}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-black text-emerald-700">
            ₹{total.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {[
        ["tuitionFee", "Tuition Fee"],
        ["examFee", "Exam Fee"],
        ["transportFee", "Transport Fee"],
        ["otherFee", "Other Fee"],
      ].map(([key, label]) => (
        <label key={key} className="block mb-3">
          <span className="text-xs font-bold text-gray-600">
            {label}
          </span>
          <input
            type="number"
            min="0"
            value={values[key]}
            onChange={(e) => update(key, e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      ))}

      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(className, values)}
        className="w-full mt-1 rounded-xl bg-indigo-600 text-white py-3 font-bold hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "💾 Save Class Fee"}
      </button>
    </div>
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


    
