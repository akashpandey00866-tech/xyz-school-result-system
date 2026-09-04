/* =========================================================
   PROFESSIONAL RESULT PDF
   ---------------------------------------------------------
   Dynamic • A4 • Multi-page • Print Ready
========================================================= */

async function buildResultPdf(
  student,
  result,
  schoolSettings = {}
) {
  const summary = summarize(result);

  if (!summary.complete) {
    throw new Error(
      "Result PDF is available only after all required marks are complete."
    );
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const PAGE_W = 210;
  const PAGE_H = 297;

  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const COLORS = {
    navy: [15, 23, 42],
    slate: [71, 85, 105],
    muted: [100, 116, 139],
    light: [241, 245, 249],
    border: [203, 213, 225],
    white: [255, 255, 255],

    primary: [15, 118, 110],
    primaryDark: [6, 78, 59],

    success: [22, 163, 74],
    danger: [220, 38, 38],
    warning: [217, 119, 6],

    cyan: [8, 145, 178],
    indigo: [79, 70, 229],
  };

  const annual =
    result?.consolidated === true;

  const schoolName =
    schoolSettings.schoolName ||
    "XYZ PUBLIC SCHOOL";

  const schoolAddress =
    schoolSettings.schoolAddress ||
    schoolSettings.address ||
    "";

  const schoolPhone =
    schoolSettings.schoolPhone ||
    schoolSettings.phone ||
    "";

  const schoolEmail =
    schoolSettings.schoolEmail ||
    schoolSettings.email ||
    "";

  const schoolWebsite =
    schoolSettings.schoolWebsite ||
    schoolSettings.website ||
    "";

  const logo =
    schoolSettings.logoDataUrl ||
    schoolSettings.logoImage ||
    schoolSettings.logo ||
    null;

  const resultId =
    result?.id ||
    result?.resultId ||
    "N/A";

  const resultStatus =
    String(
      summary.status ||
        result?.status ||
        "PASS"
    ).toUpperCase();

  const percentage =
    Number(
      summary.percentage || 0
    );

  const grade =
    summary.grade ||
    result?.grade ||
    "—";

  const division =
    summary.division ||
    result?.division ||
    "—";

  const rank =
    result?.rank ??
    summary.rank ??
    "—";

  /* =======================================================
     HELPERS
  ======================================================= */

  const safe = (
    value,
    fallback = "—"
  ) => {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return fallback;
    }

    return String(value);
  };


  const numberValue = (
    value
  ) => {
    const n =
      Number(value);

    return Number.isFinite(n)
      ? n
      : 0;
  };


  const formatMarks = (
    value
  ) => {
    const n =
      numberValue(value);

    return Number.isInteger(n)
      ? String(n)
      : n.toFixed(2);
  };


  const setFont = (
    size = 8,
    style = "normal",
    color = COLORS.navy
  ) => {
    pdf.setFont(
      "helvetica",
      style
    );

    pdf.setFontSize(
      size
    );

    pdf.setTextColor(
      color[0],
      color[1],
      color[2]
    );
  };


  const drawRoundedBox = (
    x,
    y,
    w,
    h,
    fill,
    radius = 3,
    border = null
  ) => {
    pdf.setFillColor(
      fill[0],
      fill[1],
      fill[2]
    );

    if (border) {
      pdf.setDrawColor(
        border[0],
        border[1],
        border[2]
      );
      pdf.setLineWidth(
        0.25
      );
    } else {
      pdf.setDrawColor(
        fill[0],
        fill[1],
        fill[2]
      );
    }

    pdf.roundedRect(
      x,
      y,
      w,
      h,
      radius,
      radius,
      border ? "FD" : "F"
    );
  };


  const drawPageFrame = () => {
    pdf.setDrawColor(
      COLORS.border[0],
      COLORS.border[1],
      COLORS.border[2]
    );

    pdf.setLineWidth(
      0.35
    );

    pdf.rect(
      7,
      7,
      PAGE_W - 14,
      PAGE_H - 14
    );

    pdf.setLineWidth(
      0.15
    );

    pdf.setDrawColor(
      226,
      232,
      240
    );

    pdf.rect(
      9.5,
      9.5,
      PAGE_W - 19,
      PAGE_H - 19
    );
  };


  const drawFooter = (
    pageNumber,
    totalPages
  ) => {
    const y =
      PAGE_H - 12;

    pdf.setDrawColor(
      226,
      232,
      240
    );

    pdf.setLineWidth(
      0.25
    );

    pdf.line(
      MARGIN,
      y - 4,
      PAGE_W - MARGIN,
      y - 4
    );

    setFont(
      6.5,
      "normal",
      COLORS.muted
    );

    pdf.text(
      `Result ID: ${safe(resultId)}`,
      MARGIN,
      y
    );

    pdf.text(
      `Page ${pageNumber} of ${totalPages}`,
      PAGE_W / 2,
      y,
      {
        align: "center",
      }
    );

    pdf.text(
      "Computer-generated official academic record.",
      PAGE_W - MARGIN,
      y,
      {
        align: "right",
      }
    );
  };


  /* =======================================================
     HEADER
  ======================================================= */

  drawPageFrame();

  drawRoundedBox(
    10,
    10,
    PAGE_W - 20,
    38,
    COLORS.navy,
    4
  );

  /*
   * Accent strip
   */

  pdf.setFillColor(
    COLORS.primary[0],
    COLORS.primary[1],
    COLORS.primary[2]
  );

  pdf.rect(
    10,
    44,
    PAGE_W - 20,
    4,
    "F"
  );


  /*
   * Logo
   */

  if (logo) {
    await addImageSafely(
      pdf,
      logo,
      17,
      16,
      26,
      26
    );
  } else {
    drawRoundedBox(
      17,
      16,
      26,
      26,
      COLORS.white,
      4
    );

    setFont(
      10,
      "bold",
      COLORS.primaryDark
    );

    const initials =
      schoolName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map(
          (word) =>
            word[0]
        )
        .join("")
        .toUpperCase();

    pdf.text(
      initials || "XYZ",
      30,
      31,
      {
        align: "center",
      }
    );
  }


  /*
   * School information
   */

  setFont(
    17,
    "bold",
    COLORS.white
  );

  pdf.text(
    schoolName,
    105,
    20,
    {
      align: "center",
      maxWidth: 115,
    }
  );

  setFont(
    9,
    "bold",
    [226, 232, 240]
  );

  pdf.text(
    annual
      ? "FINAL ANNUAL MARKSHEET"
      : "OFFICIAL STUDENT MARKSHEET",
    105,
    28,
    {
      align: "center",
    }
  );

  setFont(
    6.5,
    "normal",
    [203, 213, 225]
  );

  const headerMeta = [
    annual
      ? "3 Examination Consolidation"
      : resultType(result),
    session(student),
  ]
    .filter(Boolean)
    .join("  •  ");

  pdf.text(
    headerMeta,
    105,
    34,
    {
      align: "center",
    }
  );

  const contact =
    [
      schoolAddress,
      schoolPhone,
      schoolEmail,
      schoolWebsite,
    ]
      .filter(Boolean)
      .join("  •  ");

  if (contact) {
    setFont(
      6,
      "normal",
      [203, 213, 225]
    );

    pdf.text(
      contact.slice(0, 145),
      105,
      40,
      {
        align: "center",
      }
    );
  }


  /*
   * Status badge
   */

  const statusColor =
    resultStatus === "PASS"
      ? COLORS.success
      : resultStatus === "FAIL"
      ? COLORS.danger
      : COLORS.warning;

  drawRoundedBox(
    166,
    15,
    34,
    14,
    statusColor,
    7
  );

  setFont(
    7,
    "bold",
    COLORS.white
  );

  pdf.text(
    resultStatus,
    183,
    23.5,
    {
      align: "center",
    }
  );


  /* =======================================================
     DOCUMENT TITLE
  ======================================================= */

  setFont(
    8,
    "bold",
    COLORS.muted
  );

  pdf.text(
    annual
      ? "CONSOLIDATED ACADEMIC PERFORMANCE"
      : "ACADEMIC PERFORMANCE STATEMENT",
    PAGE_W / 2,
    58,
    {
      align: "center",
    }
  );

  pdf.setDrawColor(
    COLORS.border[0],
    COLORS.border[1],
    COLORS.border[2]
  );

  pdf.line(
    58,
    61,
    152,
    61
  );


  /* =======================================================
     STUDENT INFORMATION
  ======================================================= */

  autoTable(
    pdf,
    {
      startY: 65,

      theme: "grid",

      head: [
        [
          "STUDENT INFORMATION",
          "DETAILS",
          "",
          "",
        ],
      ],

      body: [
        [
          "Student Name",
          studentName(student),
          "Enrollment No.",
          enrollment(student),
        ],
        [
          "Class",
          className(student),
          "Section",
          section(student),
        ],
        [
          "Academic Session",
          session(student),
          "Examination",
          resultTitle(result),
        ],
        [
          "Result ID",
          resultId,
          "Result Status",
          resultStatus,
        ],
      ],

      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        lineColor:
          COLORS.border,
        textColor:
          COLORS.navy,
        valign: "middle",
      },

      headStyles: {
        fillColor:
          COLORS.navy,
        textColor:
          COLORS.white,
        fontStyle: "bold",
        fontSize: 7,
      },

      columnStyles: {
        0: {
          cellWidth: 31,
          fontStyle: "bold",
          fillColor:
            [248, 250, 252],
        },

        1: {
          cellWidth: 62,
        },

        2: {
          cellWidth: 31,
          fontStyle: "bold",
          fillColor:
            [248, 250, 252],
        },

        3: {
          cellWidth: 58,
        },
      },

      margin: {
        left: MARGIN,
        right: MARGIN,
      },
    }
  );


  let y =
    (
      pdf.lastAutoTable
        ?.finalY ||
      92
    ) + 7;


  /* =======================================================
     SUBJECT TABLE
  ======================================================= */

  const subjects =
    Array.isArray(
      summary.subjects
    )
      ? summary.subjects
      : [];


  if (
    annual &&
    Array.isArray(
      result.sourceExams
    ) &&
    result.sourceExams.length > 0
  ) {
    const head = [
      "SUBJECT",
      ...result.sourceExams.map(
        (exam) =>
          safe(
            exam.title,
            "Exam"
          )
      ),
      "ANNUAL",
      "%",
      "GRADE",
      "STATUS",
    ];


    const body =
      result.subjects.map(
        (subject) => [
          safe(
            subject.name
          ),

          ...result.sourceExams.map(
            (exam) => {
              const row =
                subject.examRows?.find(
                  (item) =>
                    item.examId ===
                    exam.id
                );

              return row
                ? `${formatMarks(
                    row.obtainedMarks
                  )}/${formatMarks(
                    row.maxMarks
                  )}`
                : "—";
            }
          ),

          `${formatMarks(
            subject.obtained
          )}/${formatMarks(
            subject.maximum
          )}`,

          `${numberValue(
            subject.percentage
          ).toFixed(2)}%`,

          safe(
            subject.grade
          ),

          subject.passed
            ? "PASS"
            : "FAIL",
        ]
      );


    autoTable(
      pdf,
      {
        startY: y,

        theme: "grid",

        head: [head],

        body,

        styles: {
          fontSize: 6.2,
          cellPadding: 2.2,
          lineColor:
            COLORS.border,
          textColor:
            COLORS.navy,
          valign: "middle",
          overflow: "linebreak",
        },

        headStyles: {
          fillColor:
            COLORS.primaryDark,
          textColor:
            COLORS.white,
          fontStyle: "bold",
          fontSize: 5.9,
          halign: "center",
        },

        alternateRowStyles: {
          fillColor:
            [248, 250, 252],
        },

        columnStyles: {
          0: {
            cellWidth: 30,
            fontStyle: "bold",
          },
        },

        margin: {
          left: MARGIN,
          right: MARGIN,
        },

        didParseCell(data) {
          if (
            data.section ===
              "body" &&
            data.column.index ===
              head.length - 1
          ) {
            const value =
              String(
                data.cell.raw
              ).toUpperCase();

            if (
              value === "PASS"
            ) {
              data.cell.styles.textColor =
                COLORS.success;
              data.cell.styles.fontStyle =
                "bold";
            }

            if (
              value === "FAIL"
            ) {
              data.cell.styles.textColor =
                COLORS.danger;
              data.cell.styles.fontStyle =
                "bold";
            }
          }
        },
      }
    );
  } else {
    const body =
      subjects.map(
        (subject, index) => [
          String(
            subject.code ||
              index + 1
          ),

          safe(
            subject.name
          ),

          subject.theoryMax
            ? `${formatMarks(
                subject.theory
              )}/${formatMarks(
                subject.theoryMax
              )}`
            : "—",

          subject.practicalMax
            ? `${formatMarks(
                subject.practical
              )}/${formatMarks(
                subject.practicalMax
              )}`
            : "—",

          subject.internalMax
            ? `${formatMarks(
                subject.internal
              )}/${formatMarks(
                subject.internalMax
              )}`
            : "—",

          subject.projectMax
            ? `${formatMarks(
                subject.project
              )}/${formatMarks(
                subject.projectMax
              )}`
            : "—",

          `${formatMarks(
            subject.obtained
          )}/${formatMarks(
            subject.maximum
          )}`,

          `${numberValue(
            subject.percentage
          ).toFixed(2)}%`,

          safe(
            subject.grade
          ),

          subject.passed
            ? "PASS"
            : "FAIL",
        ]
      );


    autoTable(
      pdf,
      {
        startY: y,

        theme: "grid",

        head: [
          [
            "CODE",
            "SUBJECT",
            "THEORY",
            "PRACTICAL",
            "INTERNAL",
            "PROJECT",
            "TOTAL",
            "%",
            "GRADE",
            "STATUS",
          ],
        ],

        body,

        styles: {
          fontSize: 6.2,
          cellPadding: 2.3,
          lineColor:
            COLORS.border,
          textColor:
            COLORS.navy,
          valign: "middle",
          halign: "center",
        },

        headStyles: {
          fillColor:
            COLORS.primaryDark,
          textColor:
            COLORS.white,
          fontStyle: "bold",
          fontSize: 5.8,
        },

        alternateRowStyles: {
          fillColor:
            [248, 250, 252],
        },

        columnStyles: {
          0: {
            cellWidth: 13,
          },

          1: {
            cellWidth: 37,
            halign: "left",
            fontStyle: "bold",
          },

          2: {
            cellWidth: 20,
          },

          3: {
            cellWidth: 20,
          },

          4: {
            cellWidth: 20,
          },

          5: {
            cellWidth: 20,
          },

          6: {
            cellWidth: 20,
          },

          7: {
            cellWidth: 14,
          },

          8: {
            cellWidth: 13,
          },

          9: {
            cellWidth: 13,
          },
        },

        margin: {
          left: MARGIN,
          right: MARGIN,
        },

        didParseCell(data) {
          if (
            data.section ===
              "body" &&
            data.column.index === 9
          ) {
            const value =
              String(
                data.cell.raw
              ).toUpperCase();

            if (
              value === "PASS"
            ) {
              data.cell.styles.textColor =
                COLORS.success;
              data.cell.styles.fontStyle =
                "bold";
            }

            if (
              value === "FAIL"
            ) {
              data.cell.styles.textColor =
                COLORS.danger;
              data.cell.styles.fontStyle =
                "bold";
            }
          }
        },
      }
    );
  }


  y =
    (
      pdf.lastAutoTable
        ?.finalY ||
      y + 50
    ) + 7;


  /* =======================================================
     GRAND TOTAL STRIP
  ======================================================= */

  if (
    y > 195
  ) {
    pdf.addPage();
    drawPageFrame();
    y = 22;
  }


  drawRoundedBox(
    MARGIN,
    y,
    CONTENT_W,
    19,
    COLORS.light,
    3,
    COLORS.border
  );


  const totalItems = [
    [
      "OBTAINED",
      formatMarks(
        summary.obtained
      ),
    ],
    [
      "MAXIMUM",
      formatMarks(
        summary.maximum
      ),
    ],
    [
      "PERCENTAGE",
      `${percentage.toFixed(
        2
      )}%`,
    ],
    [
      "GRADE",
      grade,
    ],
    [
      "DIVISION",
      division,
    ],
  ];


  const boxW =
    CONTENT_W /
    totalItems.length;


  totalItems.forEach(
    ([label, value], index) => {
      const x =
        MARGIN +
        index * boxW;


      if (
        index > 0
      ) {
        pdf.setDrawColor(
          COLORS.border[0],
          COLORS.border[1],
          COLORS.border[2]
        );

        pdf.line(
          x,
          y + 4,
          x,
          y + 15
        );
      }


      setFont(
        5.5,
        "bold",
        COLORS.muted
      );

      pdf.text(
        label,
        x + boxW / 2,
        y + 7,
        {
          align: "center",
        }
      );


      setFont(
        10,
        "bold",
        COLORS.navy
      );

      pdf.text(
        safe(value),
        x + boxW / 2,
        y + 14,
        {
          align: "center",
        }
      );
    }
  );


  y += 26;


  /* =======================================================
     PERFORMANCE / RESULT SUMMARY
  ======================================================= */

  const passed =
    numberValue(
      summary.passedSubjects
    );

  const failed =
    Array.isArray(
      summary.failedSubjects
    )
      ? summary.failedSubjects.length
      : 0;


  const performance =
    percentage >= 90
      ? "Outstanding"
      : percentage >= 80
      ? "Excellent"
      : percentage >= 70
      ? "Very Good"
      : percentage >= 60
      ? "Good"
      : percentage >= 50
      ? "Average"
      : "Needs Improvement";


  drawRoundedBox(
    MARGIN,
    y,
    112,
    31,
    COLORS.white,
    3,
    COLORS.border
  );


  setFont(
    7,
    "bold",
    COLORS.navy
  );

  pdf.text(
    "ACADEMIC PERFORMANCE",
    MARGIN + 6,
    y + 8
  );


  setFont(
    13,
    "bold",
    percentage >= 33
      ? COLORS.success
      : COLORS.danger
  );

  pdf.text(
    performance,
    MARGIN + 6,
    y + 17
  );


  setFont(
    6.5,
    "normal",
    COLORS.muted
  );

  pdf.text(
    `${passed} subject(s) passed • ${failed} subject(s) failed`,
    MARGIN + 6,
    y + 25
  );


  drawRoundedBox(
    MARGIN + 118,
    y,
    CONTENT_W - 118,
    31,
    resultStatus === "PASS"
      ? [240, 253, 244]
      : [254, 242, 242],
    3,
    resultStatus === "PASS"
      ? [187, 247, 208]
      : [254, 202, 202]
  );


  setFont(
    6,
    "bold",
    COLORS.muted
  );

  pdf.text(
    "FINAL RESULT",
    MARGIN + 124,
    y + 8
  );


  setFont(
    14,
    "bold",
    statusColor
  );

  pdf.text(
    resultStatus,
    MARGIN + 124,
    y + 18
  );


  setFont(
    6.5,
    "normal",
    COLORS.muted
  );

  pdf.text(
    `Rank: ${safe(rank)}`,
    MARGIN + 124,
    y + 25
  );


  y += 38;


  /* =======================================================
     REMARKS
  ======================================================= */

  const remarks =
    result?.adminRemarks ||
    result?.teacherRemarks ||
    result?.remarks ||
    "";


  if (
    remarks
  ) {
    if (
      y > 235
    ) {
      pdf.addPage();
      drawPageFrame();
      y = 22;
    }


    drawRoundedBox(
      MARGIN,
      y,
      CONTENT_W,
      22,
      [248, 250, 252],
      3,
      COLORS.border
    );


    setFont(
      6,
      "bold",
      COLORS.muted
    );

    pdf.text(
      "TEACHER / ADMIN REMARKS",
      MARGIN + 6,
      y + 7
    );


    setFont(
      7,
      "normal",
      COLORS.navy
    );

    const remarkLines =
      pdf.splitTextToSize(
        String(
          remarks
        ),
        CONTENT_W - 12
      );


    pdf.text(
      remarkLines.slice(
        0,
        2
      ),
      MARGIN + 6,
      y + 14
    );


    y += 29;
  }


  /* =======================================================
     VERIFICATION QR
  ======================================================= */

  let qrAdded =
    false;


  if (
    schoolSettings.showQrOnResult !==
    false
  ) {
    try {
      const verifyUrl =
        `${window.location.origin}/verify-result?result=${encodeURIComponent(
          resultId
        )}&student=${encodeURIComponent(
          student?.id || ""
        )}&enrollment=${encodeURIComponent(
          enrollment(student)
        )}`;


      const qr =
        await QRCode.toDataURL(
          verifyUrl,
          {
            width: 400,
            margin: 1,
            errorCorrectionLevel:
              "H",
          }
        );


      if (
        y + 43 >
        PAGE_H - 20
      ) {
        pdf.addPage();
        drawPageFrame();
        y = 22;
      }


      qrAdded =
        await addImageSafely(
          pdf,
          qr,
          MARGIN,
          y,
          32,
          32
        );


      if (
        qrAdded
      ) {
        setFont(
          5.8,
          "bold",
          COLORS.muted
        );

        pdf.text(
          "SCAN TO VERIFY",
          MARGIN + 16,
          y + 38,
          {
            align: "center",
          }
        );
      }
    } catch (
      error
    ) {
      console.warn(
        "Result QR generation failed:",
        error
      );
    }
  }


  /* =======================================================
     SIGNATURE AREA
  ======================================================= */

  const signatureY =
    Math.max(
      y + 4,
      245
    );


  /*
   * Keep signature section inside
   * the A4 page.
   */

  const safeSignatureY =
    Math.min(
      signatureY,
      258
    );


  const teacherX =
    55;

  const principalX =
    125;

  const sealX =
    175;


  /*
   * Signature images
   */

  if (
    schoolSettings.showSignature !==
    false
  ) {
    await addImageSafely(
      pdf,
      schoolSettings.signatureDataUrl ||
        schoolSettings.signatureImage ||
        null,
      teacherX - 23,
      safeSignatureY - 17,
      46,
      13
    );
  }


  /*
   * Principal signature
   */

  await addImageSafely(
    pdf,
    schoolSettings.principalSignatureDataUrl ||
      schoolSettings.principalSignatureImage ||
      null,
    principalX - 23,
    safeSignatureY - 17,
    46,
    13
  );


  /*
   * School seal
   */

  if (
    schoolSettings.showSeal !==
    false
  ) {
    await addImageSafely(
      pdf,
      schoolSettings.sealDataUrl ||
        schoolSettings.sealImage ||
        null,
      sealX - 15,
      safeSignatureY - 20,
      30,
      18
    );
  }


  /*
   * Signature lines
   */

  pdf.setDrawColor(
    100,
    116,
    139
  );

  pdf.setLineWidth(
    0.3
  );


  pdf.line(
    25,
    safeSignatureY,
    85,
    safeSignatureY
  );


  pdf.line(
    95,
    safeSignatureY,
    155,
    safeSignatureY
  );


  pdf.line(
    160,
    safeSignatureY,
    190,
    safeSignatureY
  );


  setFont(
    6.5,
    "bold",
    COLORS.navy
  );

  pdf.text(
    "Class Teacher",
    teacherX,
    safeSignatureY + 6,
    {
      align: "center",
    }
  );


  pdf.text(
    "Principal",
    principalX,
    safeSignatureY + 6,
    {
      align: "center",
    }
  );


  pdf.text(
    "School Seal",
    sealX,
    safeSignatureY + 6,
    {
      align: "center",
    }
  );


  /* =======================================================
     PUBLISHED DATE
  ======================================================= */

  setFont(
    5.8,
    "normal",
    COLORS.muted
  );

  pdf.text(
    `Published: ${dateText(
      result?.publishedAt ||
        result?.updatedAt
    )}`,
    MARGIN,
    276
  );


  pdf.text(
    `Document ID: ${safe(
      resultId
    )}`,
    PAGE_W - MARGIN,
    276,
    {
      align: "right",
    }
  );


  /* =======================================================
     FOOTER
  ======================================================= */

  /*
   * Add temporary footer on first page.
   * Page numbers are finalized below.
   */

  const totalPages =
    pdf.getNumberOfPages();


  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    pdf.setPage(
      page
    );

    drawFooter(
      page,
      totalPages
    );
  }


  /* =======================================================
     METADATA
  ======================================================= */

  try {
    pdf.setProperties({
      title:
        `${schoolName} - Student Marksheet`,
      subject:
        annual
          ? "Final Annual Marksheet"
          : "Official Student Marksheet",
      author:
        schoolName,
      creator:
        "XYZ School ERP",
      keywords:
        `result, marksheet, ${resultId}`,
    });
  } catch {
    // Metadata is optional.
  }


  return pdf;
}