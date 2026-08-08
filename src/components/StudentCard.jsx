import { useNavigate } from "react-router-dom";

function StudentCard({ student, onDelete }) {
  const navigate = useNavigate();

  const colors = [
    "bg-green-600",
    "bg-blue-600",
    "bg-purple-600",
    "bg-red-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];

  const avatarColor =
    colors[
      (student.name?.charCodeAt(0) || 0) % colors.length
    ];

  return (
    <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">

      <div className="flex items-center gap-4">

        {/* Avatar */}
        <div
          className={`w-20 h-20 rounded-full ${avatarColor} text-white flex items-center justify-center text-3xl font-bold`}
        >
          {student.name
            ? student.name.charAt(0).toUpperCase()
            : "?"}
        </div>

        {/* Student Details */}
        <div className="flex-1">

          <h2 className="text-xl font-bold">
            {student.name}
          </h2>

          <p className="text-gray-600">
            Enrollment: {student.enrollmentNo}
          </p>

          <p className="text-gray-600">
            Class: {student.className}
          </p>

          <p className="text-gray-600">
            Section: {student.section}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={() => navigate(`/edit-student/${student.id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            >
              ✏️ Edit
            </button>

            <button
              onClick={() => navigate(`/collect-fee/${student.id}`)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
            >
              💰 Collect
            </button>

            <button
              onClick={() => navigate(`/payment-history/${student.id}`)}
              className="bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg"
            >
              📜 History
            </button>

            <button
              onClick={() => onDelete(student.id)}
              className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentCard;