import Sidebar from "./Sidebar";

function AdminLayout({ children }) {

  return (

    <div className="flex min-h-screen bg-gray-100">

      <Sidebar />

      <main className="ml-72 flex-1">

        {/* Top Header */}

        <div className="bg-white shadow px-8 py-5 flex justify-between items-center">

          <div>

            <h1 className="text-2xl font-bold text-gray-800">

              XYZ School ERP

            </h1>

            <p className="text-gray-500">

              Welcome Admin

            </p>

          </div>

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-full bg-green-700 text-white flex items-center justify-center text-xl font-bold">

              A

            </div>

          </div>

        </div>

        <div className="p-8">

          {children}

        </div>

      </main>

    </div>

  );

}

export default AdminLayout;