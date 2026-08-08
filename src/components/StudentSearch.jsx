import { Search } from "lucide-react";

function StudentSearch({
  searchText,
  setSearchText,
  students,
  loading,
  onSelectStudent,
  message,
}) {

  const handleKeyDown = (e) => {

    if (e.key === "Enter" && students.length > 0) {

      onSelectStudent(students[0]);

    }

  };

  const handleReset = () => {

    setSearchText("");

    onSelectStudent(null);

  };

  return (

    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">

        <div>

          <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">

            <Search size={28} />

            Search Student

          </h2>

          <p className="text-gray-500 mt-2">

            Search by Enrollment Number, Student Name or Mobile Number

          </p>

        </div>

      </div>

      {/* Search Box */}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        <div className="relative md:col-span-4">

          <Search

            size={20}

            className="absolute left-4 top-4 text-gray-400"

          />

          <input

            type="text"

            autoComplete="off"

            spellCheck={false}

            placeholder="Search by Enrollment No / Student Name / Mobile"

            value={searchText}

            onChange={(e) =>

              setSearchText(e.target.value)

            }

            onKeyDown={handleKeyDown}

            className="w-full pl-12 border-2 border-gray-300 rounded-xl p-4 outline-none focus:border-green-600 transition"

          />

        </div>

        <button

          onClick={handleReset}

          className="bg-gray-700 hover:bg-gray-800 text-white rounded-xl font-semibold transition"

        >

          Reset

        </button>

      </div>

      {/* Search Result */}

      {

        searchText && (

          <div className="mt-6 border rounded-xl overflow-hidden">

            {

              loading ? (

                <div className="p-6 text-center">

                  <div className="animate-pulse text-green-700 font-semibold">

                    Searching Students...

                  </div>

                </div>

              )

              :

              students.length > 0 ? (

                students.map((student) => (

                  <button

                    key={student.id}

                    onClick={() =>

                      onSelectStudent(student)

                    }

                    className="w-full text-left px-5 py-4 border-b hover:bg-green-50 transition"

                  >

                    <div className="flex justify-between items-center">

                      <div>

                        <h3 className="font-bold text-gray-800">

                          {student.studentName}

                        </h3>

                        <p className="text-sm text-gray-500">

                          Enrollment : {student.enrollmentNo}

                        </p>

                        <p className="text-sm text-gray-500">

                          Mobile : {student.mobile}

                        </p>

                      </div>

                      <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs font-semibold">

                        Select

                      </div>

                    </div>

                  </button>

                ))

              )

              :

              (

                <div className="p-8 text-center">

                  <p className="text-red-600 font-semibold text-lg">

                    No Student Found

                  </p>

                  <p className="text-gray-500 mt-2">

                    Try another Enrollment Number, Student Name or Mobile Number.

                  </p>

                </div>

              )

            }

          </div>

        )

      }

      {/* Message */}

      {

        message && (

          <div className="mt-6 rounded-xl border-l-4 border-blue-600 bg-blue-50 p-4">

            <p className="text-gray-700 font-medium">

              {message}

            </p>

          </div>

        )

      }

      {/* Tips */}

      <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-5">

        <h3 className="font-bold text-gray-700 mb-3">

          Search Tips

        </h3>

        <ul className="list-disc ml-5 text-gray-600 space-y-2">

          <li>Search using Enrollment Number.</li>

          <li>Search using Student Name.</li>

          <li>Search using Mobile Number.</li>

          <li>Partial search is also supported.</li>

          <li>Press <b>Enter</b> to automatically select the first student.</li>

        </ul>

      </div>

    </div>

  );

}

export default StudentSearch;