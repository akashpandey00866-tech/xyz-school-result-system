import Navbar from "../components/Navbar";

function StudentLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default StudentLayout;