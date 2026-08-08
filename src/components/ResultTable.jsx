function ResultTable({

  subjects = [],

  formData = {},

  handleChange,

}) {

  /* ===========================
      HELPERS
  ============================ */

  const getTheory = (subject) =>

    Number(

      formData?.[subject.subjectCode]?.theory || 0

    );

  const getPractical = (subject) =>

    Number(

      formData?.[subject.subjectCode]?.practical || 0

    );

  const getTotal = (subject) =>

    getTheory(subject) +

    getPractical(subject);

  const getStatus = (subject) => {

    const theory = getTheory(subject);

    const practical = getPractical(subject);

    const passTheory = Number(

      subject.passingTheory || 0

    );

    const passPractical = Number(

      subject.passingPractical || 0

    );

    if (

      theory === 0 &&

      practical === 0

    ) {

      return "-";

    }

    if (

      theory >= passTheory &&

      practical >= passPractical

    ) {

      return "PASS";

    }

    return "FAIL";

  };

  return (

    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">

      {/* ===========================
          HEADER
      ============================ */}

      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 mb-8">

        <div>

          <h2 className="text-3xl font-bold text-blue-700">

            📝 Subject Wise Marks Entry

          </h2>

          <p className="text-gray-500 mt-2">

            Enter Theory and Practical Marks.

          </p>

        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-4">

          <h3 className="font-bold text-blue-700">

            Total Subjects

          </h3>

          <p className="text-3xl font-bold">

            {subjects.length}

          </p>

        </div>

      </div>
            {/* ===========================
          MARKS TABLE
      ============================ */}

      <div className="overflow-x-auto rounded-2xl border border-gray-300">

        <table className="min-w-full">

          <thead className="bg-green-700 text-white">

            <tr>

              <th className="border p-4">

                Subject

              </th>

              <th className="border p-4">

                Code

              </th>

              <th className="border p-4">

                Theory

              </th>

              <th className="border p-4">

                Practical

              </th>

              <th className="border p-4">

                Total

              </th>

              <th className="border p-4">

                Status

              </th>

            </tr>

          </thead>

          <tbody>

            {

              subjects.map((subject) => (

                <tr

                  key={subject.id}

                  className="hover:bg-green-50 transition"

                >

                  {/* Subject Name */}

                  <td className="border p-4 font-semibold">

                    {subject.subjectName}

                  </td>

                  {/* Subject Code */}

                  <td className="border p-4 text-center">

                    {subject.subjectCode}

                  </td>

                  {/* Theory */}

                  <td className="border p-4">

                    <input

                      type="number"

                      min={0}

                      max={subject.theoryMarks}

                      value={

                        formData?.[subject.subjectCode]?.theory || ""

                      }

                      onChange={(e) =>

                        handleChange(

                          subject.subjectCode,

                          "theory",

                          e.target.value

                        )

                      }

                      className="w-full border rounded-lg p-2 text-center focus:ring-2 focus:ring-green-500 outline-none"

                    />

                    <div className="text-center text-xs text-gray-500 mt-2">

                      / {subject.theoryMarks}

                    </div>

                  </td>

                  {/* Practical */}

                  <td className="border p-4">

                    <input

                      type="number"

                      min={0}

                      max={subject.practicalMarks}

                      value={

                        formData?.[subject.subjectCode]?.practical || ""

                      }

                      onChange={(e) =>

                        handleChange(

                          subject.subjectCode,

                          "practical",

                          e.target.value

                        )

                      }

                      className="w-full border rounded-lg p-2 text-center focus:ring-2 focus:ring-green-500 outline-none"

                    />

                    <div className="text-center text-xs text-gray-500 mt-2">

                      / {subject.practicalMarks}

                    </div>

                  </td>
                                    {/* Total */}

                  <td className="border p-4 text-center">

                    <div className="text-2xl font-bold text-blue-700">

                      {getTotal(subject)}

                    </div>

                    <div className="text-xs text-gray-500 mt-1">

                      / {subject.totalMarks}

                    </div>

                  </td>

                  {/* Status */}

                  <td className="border p-4 text-center">

                    <span

                      className={`px-4 py-2 rounded-full text-sm font-semibold ${

                        getStatus(subject) === "PASS"

                          ? "bg-green-100 text-green-700"

                          : getStatus(subject) === "FAIL"

                          ? "bg-red-100 text-red-700"

                          : "bg-gray-100 text-gray-500"

                      }`}

                    >

                      {getStatus(subject)}

                    </span>

                  </td>

                </tr>

              ))

            }

          </tbody>

        </table>

      </div>
            {/* ===========================
          SUMMARY
      ============================ */}

      <div className="grid md:grid-cols-3 gap-5 mt-8">

        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">

          <h3 className="text-lg font-bold text-green-700">

            Theory Marks

          </h3>

          <p className="text-sm text-gray-600 mt-2">

            Enter marks according to the maximum theory marks configured in Subject Management.

          </p>

        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">

          <h3 className="text-lg font-bold text-blue-700">

            Practical Marks

          </h3>

          <p className="text-sm text-gray-600 mt-2">

            Leave Practical marks as 0 if the subject has no practical component.

          </p>

        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">

          <h3 className="text-lg font-bold text-orange-700">

            Automatic Calculation

          </h3>

          <p className="text-sm text-gray-600 mt-2">

            Total marks and PASS/FAIL status are calculated automatically while entering marks.

          </p>

        </div>

      </div>

      {/* ===========================
          INSTRUCTIONS
      ============================ */}

      <div className="mt-8 bg-gray-50 border rounded-2xl p-6">

        <h3 className="text-xl font-bold mb-4">

          Instructions

        </h3>

        <ul className="list-disc ml-5 space-y-2 text-gray-700">

          <li>

            Subjects are loaded automatically from Subject Management.

          </li>

          <li>

            Theory and Practical maximum marks come from Firestore.

          </li>

          <li>

            Total marks are calculated automatically.

          </li>

          <li>

            PASS / FAIL status updates automatically.

          </li>

          <li>

            Overall Percentage, Grade and Final Result are generated after clicking <b>Generate Result</b>.

          </li>

        </ul>

      </div>

    </div>

  );

}

export default ResultTable;