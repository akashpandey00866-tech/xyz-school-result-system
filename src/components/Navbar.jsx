import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          XYZ School
        </h1>

        <div className="flex gap-6">
          <Link
            to="/"
            className="hover:text-yellow-300 transition"
          >
            Home
          </Link>

          <Link
            to="/student-login"
            className="hover:text-yellow-300 transition"
          >
            Student
          </Link>

          <Link
            to="/admin-login"
            className="hover:text-yellow-300 transition"
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;