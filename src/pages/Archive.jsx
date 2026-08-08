import AdminLayout from "../layouts/AdminLayout";

function Archive() {

  return (

    <AdminLayout>

      <div className="max-w-7xl mx-auto p-8">

        {/* Header */}

        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl shadow-lg p-8 mb-8">

          <h1 className="text-4xl font-bold">

            📦 Archive Management

          </h1>

          <p className="text-gray-300 mt-3">

            Restore or permanently delete archived students and results.

          </p>

        </div>

        {/* Statistics */}

        <div className="grid md:grid-cols-4 gap-6">

          <div className="bg-white rounded-2xl shadow-lg p-6">

            <p className="text-gray-500">

              Archived Students

            </p>

            <h2 className="text-4xl font-bold text-blue-700 mt-2">

              0

            </h2>

          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">

            <p className="text-gray-500">

              Archived Results

            </p>

            <h2 className="text-4xl font-bold text-green-700 mt-2">

              0

            </h2>

          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">

            <p className="text-gray-500">

              Restored

            </p>

            <h2 className="text-4xl font-bold text-orange-600 mt-2">

              0

            </h2>

          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">

            <p className="text-gray-500">

              Deleted

            </p>

            <h2 className="text-4xl font-bold text-red-600 mt-2">

              0

            </h2>

          </div>

        </div>
                {/* Search */}

        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">

          <div className="flex flex-col md:flex-row gap-4">

            <input
              type="text"
              placeholder="Search Archived Student / Result..."
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700"
            />

            <button className="bg-green-700 hover:bg-green-800 text-white px-8 rounded-xl">

              Search

            </button>

          </div>

        </div>



        {/* Archived Students */}

        <div className="bg-white rounded-2xl shadow-lg mt-8">

          <div className="p-6 border-b">

            <h2 className="text-2xl font-bold">

              👨‍🎓 Archived Students

            </h2>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-100">

                <tr>

                  <th className="p-4 text-left">Enrollment</th>

                  <th className="p-4 text-left">Student</th>

                  <th className="p-4 text-left">Class</th>

                  <th className="p-4 text-center">Restore</th>

                  <th className="p-4 text-center">Delete</th>

                </tr>

              </thead>

              <tbody>

                <tr>

                  <td className="p-6 text-center text-gray-500" colSpan="5">

                    No Archived Students Found

                  </td>

                </tr>

              </tbody>

            </table>

          </div>

        </div>



        {/* Archived Results */}

        <div className="bg-white rounded-2xl shadow-lg mt-8">

          <div className="p-6 border-b">

            <h2 className="text-2xl font-bold">

              📄 Archived Results

            </h2>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-100">

                <tr>

                  <th className="p-4 text-left">Enrollment</th>

                  <th className="p-4 text-left">Student</th>

                  <th className="p-4 text-left">Class</th>

                  <th className="p-4 text-center">Restore</th>

                  <th className="p-4 text-center">Delete</th>

                </tr>

              </thead>

              <tbody>

                <tr>

                  <td className="p-6 text-center text-gray-500" colSpan="5">

                    No Archived Results Found

                  </td>

                </tr>

              </tbody>

            </table>

          </div>

        </div>



      </div>

    </AdminLayout>

  );

}

export default Archive;