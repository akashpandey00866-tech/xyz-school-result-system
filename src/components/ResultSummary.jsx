function ResultSummary({

  result,

  performance,

  remarks,

}) {

  if (!result) return null;

  return (

    <div className="space-y-6 mb-8">

      {/* ===========================
          RESULT SUMMARY
      =========================== */}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">

        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">

          <div>

            <h2 className="text-3xl font-bold text-green-700">

              📊 Result Summary

            </h2>

            <p className="text-gray-500 mt-2">

              Overall Academic Performance

            </p>

          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3">

            <p className="font-semibold text-green-700">

              {result.status}

            </p>

          </div>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">

          <Card

            title="Subjects"

            value={result.totalSubjects}

            bg="bg-blue-50"

            color="text-blue-700"

          />

          <Card

            title="Obtained"

            value={result.obtainedMarks}

            bg="bg-green-50"

            color="text-green-700"

          />

          <Card

            title="Maximum"

            value={result.maximumMarks}

            bg="bg-orange-50"

            color="text-orange-700"

          />

          <Card

            title="Percentage"

            value={`${result.percentage}%`}

            bg="bg-yellow-50"

            color="text-yellow-700"

          />

          <Card

            title="Grade"

            value={result.grade}

            bg="bg-purple-50"

            color="text-purple-700"

          />

          <Card

            title="Result"

            value={result.status}

            bg={

              result.status === "PASS"

                ? "bg-green-50"

                : "bg-red-50"

            }

            color={

              result.status === "PASS"

                ? "text-green-700"

                : "text-red-700"

            }

          />

        </div>

      </div>
            {/* ===========================
          PERFORMANCE ANALYSIS
      =========================== */}

      <div className="grid lg:grid-cols-3 gap-6">

        <Card

          title="Performance"

          value={performance?.level || "-"}

          bg="bg-blue-50"

          color="text-blue-700"

        />

        <Card

          title="Failed Subjects"

          value={result.failedSubjects?.length || 0}

          bg="bg-red-50"

          color="text-red-700"

        />

        <Card

          title="Division"

          value={result.division || "-"}

          bg="bg-green-50"

          color="text-green-700"

        />

      </div>

      {/* ===========================
          FAILED SUBJECTS
      =========================== */}

      {

        result.failedSubjects?.length > 0 && (

          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">

            <h2 className="text-xl font-bold text-red-700 mb-4">

              Failed Subjects

            </h2>

            <div className="flex flex-wrap gap-3">

              {

              result.failedSubjects.map((item) => (

  <span

    key={item.subjectCode}

    className="px-4 py-2 rounded-full bg-red-600 text-white"

  >

    {item.subjectName}

  </span>

))  

              }

            </div>

          </div>

        )

      }

      {/* ===========================
          TEACHER REMARKS
      =========================== */}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">

        <h2 className="text-2xl font-bold text-green-700 mb-4">

          📝 Teacher Remarks

        </h2>

        <textarea

          rows={5}

          readOnly

          value={remarks || ""}

          className="w-full rounded-xl border p-4 bg-gray-50"

        />

      </div>
            {/* ===========================
          RESULT ANALYSIS
      =========================== */}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">

        <h2 className="text-2xl font-bold text-blue-700 mb-5">

          📈 Result Analysis

        </h2>

        <div className="space-y-5">

          <div>

            <div className="flex justify-between mb-2">

              <span className="font-medium">

                Percentage

              </span>

              <span className="font-bold">

                {result.percentage}%

              </span>

            </div>

            <div className="w-full bg-gray-200 rounded-full h-4">

              <div

                className={`h-4 rounded-full ${

                  result.status === "PASS"

                    ? "bg-green-600"

                    : "bg-red-600"

                }`}

                style={{

                  width: `${Math.min(result.percentage, 100)}%`,

                }}

              ></div>

            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-5">

            <div className="bg-gray-50 rounded-xl p-4 border">

              <p className="text-gray-500">

                Obtained Marks

              </p>

              <h3 className="text-3xl font-bold text-green-700 mt-2">

                {result.obtainedMarks}

              </h3>

            </div>

            <div className="bg-gray-50 rounded-xl p-4 border">

              <p className="text-gray-500">

                Maximum Marks

              </p>

              <h3 className="text-3xl font-bold text-blue-700 mt-2">

                {result.maximumMarks}

              </h3>

            </div>

          </div>

        </div>

      </div>
          </div>

  );

}

function Card({

  title,

  value,

  bg,

  color,

}) {

  return (

    <div

      className={`${bg} border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition`}

    >

      <p className="text-sm text-gray-500 font-medium">

        {title}

      </p>

      <h2

        className={`text-3xl font-bold mt-3 ${color}`}

      >

        {value}

      </h2>

    </div>

  );

}

export default ResultSummary;