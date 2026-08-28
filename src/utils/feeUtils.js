export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
}

export function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function getStudentClassName(student) {
  return String(
    student?.className ??
      student?.class ??
      student?.class_name ??
      ""
  ).trim();
}

export function getStudentClassId(student) {
  return String(
    student?.classId ??
      student?.classID ??
      student?.class_id ??
      ""
  ).trim();
}

export function getStudentSection(student) {
  return String(
    student?.section ??
      student?.sectionName ??
      ""
  ).trim();
}

export function resolveAcademicFee(
  student,
  feeSettings = {},
  classes = []
) {
  const classId = getStudentClassId(student);
  const className = getStudentClassName(student);

  const classFees =
    feeSettings?.classFees &&
    typeof feeSettings.classFees === "object"
      ? feeSettings.classFees
      : {};

  if (
    classId &&
    classFees[classId] !== undefined
  ) {
    return toNumber(classFees[classId]);
  }

  const academicClass = Array.isArray(classes)
    ? classes.find((item) => {
        const itemId = String(
          item?.id ?? ""
        ).trim();

        const itemName = String(
          item?.name ??
            item?.className ??
            ""
        ).trim();

        return (
          (classId && itemId === classId) ||
          (
            className &&
            normalize(itemName) ===
              normalize(className)
          )
        );
      })
    : null;

  if (
    academicClass?.id &&
    classFees[academicClass.id] !== undefined
  ) {
    return toNumber(
      classFees[academicClass.id]
    );
  }

  if (
    className &&
    classFees[className] !== undefined
  ) {
    return toNumber(
      classFees[className]
    );
  }

  const matchingClassKey =
    Object.keys(classFees).find(
      (key) =>
        normalize(key) ===
        normalize(className)
    );

  if (matchingClassKey) {
    return toNumber(
      classFees[matchingClassKey]
    );
  }

  const numericMatch =
    className.match(/\d+/);

  if (numericMatch) {
    const legacyKey =
      `class${numericMatch[0]}`;

    if (
      feeSettings?.[legacyKey] !==
      undefined
    ) {
      return toNumber(
        feeSettings[legacyKey]
      );
    }
  }

  return toNumber(
    student?.annualFee ??
      student?.academicFee ??
      student?.totalAcademicFee ??
      student?.totalFee ??
      student?.feeAmount ??
      0
  );
}

export function resolveTransportFee(
  student,
  feeSettings = {},
  transportRoutes = []
) {
  const routeId = String(
    student?.transportRouteId ??
      student?.routeId ??
      student?.transportationRouteId ??
      ""
  ).trim();

  const routeCode = normalize(
    student?.transportRouteCode ??
      student?.routeCode ??
      ""
  );

  const routeName = normalize(
    student?.transportRouteName ??
      student?.routeName ??
      ""
  );

  const routes = Array.isArray(
    transportRoutes
  )
    ? transportRoutes
    : [];

  const route = routes.find(
    (item) => {
      const itemId = String(
        item?.id ?? ""
      ).trim();

      const itemCode = normalize(
        item?.code ??
          item?.routeCode ??
          ""
      );

      const itemName = normalize(
        item?.name ??
          item?.routeName ??
          ""
      );

      return (
        (routeId &&
          itemId === routeId) ||
        (routeCode &&
          itemCode === routeCode) ||
        (routeName &&
          itemName === routeName)
      );
    }
  );

  const routeFee =
    route?.fee ??
    route?.transportFee ??
    route?.monthlyFee ??
    route?.annualFee ??
    route?.charge ??
    route?.amount;

  if (
    route &&
    routeFee !== undefined
  ) {
    return toNumber(routeFee);
  }

  const transportSettings =
    feeSettings?.transportation ??
    feeSettings?.transport ??
    feeSettings?.transportationSettings ??
    {};

  const routeFees =
    transportSettings?.routeFees &&
    typeof transportSettings.routeFees ===
      "object"
      ? transportSettings.routeFees
      : {};

  if (
    routeId &&
    routeFees[routeId] !== undefined
  ) {
    return toNumber(
      routeFees[routeId]
    );
  }

  if (
    routeCode &&
    routeFees[routeCode] !== undefined
  ) {
    return toNumber(
      routeFees[routeCode]
    );
  }

  const studentTransportFee =
    student?.transportCharge ??
    student?.transportFee ??
    student?.transportationCharge ??
    student?.transportationFee ??
    student?.routeFee;

  return toNumber(
    studentTransportFee ?? 0
  );
}

export function resolvePaidAmount(
  student,
  type = "academic"
) {
  if (type === "transport") {
    return toNumber(
      student?.transportPaid ??
        student?.transportationPaid ??
        student?.transportPaidAmount ??
        0
    );
  }

  return toNumber(
    student?.academicPaid ??
      student?.paidFee ??
      student?.totalPaid ??
      student?.paidAmount ??
      0
  );
}

export function calculateStudentFees(
  student = {},
  feeSettings = {},
  classes = [],
  transportRoutes = []
) {
  const academicFee =
    resolveAcademicFee(
      student,
      feeSettings,
      classes
    );

  const transportFee =
    resolveTransportFee(
      student,
      feeSettings,
      transportRoutes
    );

  const academicPaid =
    resolvePaidAmount(
      student,
      "academic"
    );

  const transportPaid =
    resolvePaidAmount(
      student,
      "transport"
    );

  const academicDue = Math.max(
    academicFee -
      academicPaid,
    0
  );

  const transportDue = Math.max(
    transportFee -
      transportPaid,
    0
  );

  const totalFee =
    academicFee +
    transportFee;

  const totalPaid =
    academicPaid +
    transportPaid;

  const totalDue =
    academicDue +
    transportDue;

  return {
    academicFee,
    transportFee,

    academicPaid,
    transportPaid,

    academicDue,
    transportDue,

    totalFee,
    totalPaid,
    totalDue,

    isFullyPaid:
      totalDue <= 0,

    status:
      totalDue <= 0
        ? "PAID"
        : totalPaid > 0
          ? "PARTIAL"
          : "DUE"
  };
}

export function getFeeStatus(
  calculation
) {
  if (
    !calculation ||
    typeof calculation !== "object"
  ) {
    return "DUE";
  }

  return calculation.isFullyPaid
    ? "PAID"
    : calculation.totalPaid > 0
      ? "PARTIAL"
      : "DUE";
}

export function formatINR(value) {
  return `₹${toNumber(
    value
  ).toLocaleString("en-IN")}`;
}