function StudentProfile({
  student,
  session,
  examName,
}) {

  if (!student) return null;

  const studentName =
    student.studentName ||
    student.name ||
    "Unknown Student";

  const firstLetter =
    studentName.charAt(0).toUpperCase();

  const dueFee =
    Number(student.dueFee || 0);

  const status =
    student.status || "Active";

  return (

    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">

      <div className="flex flex-col xl:flex-row gap-8">

        {/* Avatar */}

        <div className="w-full xl:w-72 flex flex-col items-center">

          <div className="w-36 h-36 rounded-full bg-gradient-to-r from-green-600 to-blue-700 text-white flex items-center justify-center text-6xl font-bold shadow-lg">

            {firstLetter}

          </div>

          <h2 className="mt-5 text-2xl font-bold text-center">

            {studentName}

          </h2>

          <p className="text-gray-500">

            Enrollment No.

          </p>

          <p className="font-semibold">

            {student.enrollmentNo}

          </p>

          <span
            className={`mt-4 px-4 py-2 rounded-full text-sm font-semibold ${
              status === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status}
          </span>

        </div>

        {/* Details */}

        <div className="flex-1">

          <h2 className="text-3xl font-bold text-green-700 mb-6">

            Student Information

          </h2>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

            <Input
              label="Student Name"
              value={studentName}
            />

            <Input
              label="Enrollment Number"
              value={student.enrollmentNo}
            />

            <Input
              label="Roll Number"
              value={student.rollNo}
            />

            <Input
              label="Class"
              value={student.className}
            />

            <Input
              label="Section"
              value={student.section}
            />

            <Input
              label="Father Name"
              value={student.fatherName}
            />

            <Input
              label="Mother Name"
              value={student.motherName}
            />

            <Input
              label="Gender"
              value={student.gender}
            />

            <Input
              label="Date of Birth"
              value={student.dob}
            />

            <Input
              label="Mobile"
              value={student.mobile}
            />

            <Input
              label="Email"
              value={student.email}
            />

            <Input
              label="Blood Group"
              value={student.bloodGroup}
            />

            <Input
              label="House"
              value={student.house}
            />

            <Input
              label="Admission Date"
              value={student.admissionDate}
            />

            <Input
              label="Address"
              value={student.address}
            />

          </div>

          {/* Summary */}

          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5 mt-8">

            <Card
              title="Academic Session"
              value={session}
              bg="bg-green-50"
              color="text-green-700"
            />

            <Card
              title="Exam"
              value={examName}
              bg="bg-blue-50"
              color="text-blue-700"
            />

            <Card
              title="Attendance"
              value={`${student.attendance || 0}%`}
              bg="bg-indigo-50"
              color="text-indigo-700"
            />

            <Card
              title="Result Status"
              value={
                student.publishStatus ||
                "Draft"
              }
              bg="bg-yellow-50"
              color="text-yellow-700"
            />

            <Card
              title="Fee Status"
              value={
                dueFee > 0
                  ? "Pending"
                  : "Paid"
              }
              bg={
                dueFee > 0
                  ? "bg-red-50"
                  : "bg-green-50"
              }
              color={
                dueFee > 0
                  ? "text-red-600"
                  : "text-green-700"
              }
            />

          </div>

        </div>

      </div>

    </div>

  );

}

function Input({ label, value }) {

  return (

    <div>

      <label className="text-sm font-medium text-gray-500">

        {label}

      </label>

      <input

        value={value || "-"}

        disabled

        className="w-full mt-2 rounded-xl border bg-gray-100 p-3 text-gray-700"

      />

    </div>

  );

}

function Card({

  title,

  value,

  color,

  bg,

}) {

  return (

    <div className={`${bg} rounded-xl border p-5`}>

      <p className="text-sm text-gray-500">

        {title}

      </p>

      <h2 className={`text-xl font-bold mt-2 ${color}`}>

        {value}

      </h2>

    </div>

  );

}

export default StudentProfile;