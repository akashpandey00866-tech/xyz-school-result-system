import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

import { db } from "../config/firebase";
import LoadingButton from "../components/LoadingButton";
import AdminLayout from "../layouts/AdminLayout";

function AddStudent() {

  /* =====================================================
     LOADING
  ===================================================== */

  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  /* =====================================================
     STUDENT
  ===================================================== */

  const [student, setStudent] = useState({

    name: "",
    enrollmentNo: "",

    fatherName: "",
    motherName: "",

    dob: "",
    gender: "",

    className: "",
    section: "",

    email: "",
    mobile: "",

    address: "",

    password: "",

    status: "Active",

  });

  /* =====================================================
     LOAD CLASSES FROM ACADEMIC CONFIGURATION
  ===================================================== */

  useEffect(() => {

    loadClasses();

  }, []);

  async function loadClasses() {

    try {

      setClassesLoading(true);

      const snapshot = await getDocs(
        collection(db, "classes")
      );

      const classList = [];

      snapshot.forEach((classDoc) => {

        const data = classDoc.data();

        if (data.status === false) {
          return;
        }

        classList.push({

          id: classDoc.id,

          name:
            data.name ||
            data.className ||
            data.title ||
            "",

          sections:
            Array.isArray(data.sections)
              ? data.sections
              : [],

        });

      });

      /* =========================================
         SORT CLASSES
         Nursery → LKG → UKG → Class 1 → Class 2...
      ========================================= */

      classList.sort((a, b) => {

        const getOrder = (name) => {

          const value =
            String(name)
              .trim()
              .toLowerCase();

          const specialOrder = {

            "pre nursery": 0,
            "pre-nursery": 0,
            nursery: 1,
            lkg: 2,
            ukg: 3,

          };

          if (
            Object.prototype.hasOwnProperty.call(
              specialOrder,
              value
            )
          ) {
            return specialOrder[value];
          }

          const numberMatch =
            value.match(/\d+/);

          if (numberMatch) {

            return (
              10 +
              Number(numberMatch[0])
            );

          }

          return 100;

        };

        return (
          getOrder(a.name) -
          getOrder(b.name)
        );

      });

      setClasses(classList);

    }

    catch (error) {

      console.error(
        "Unable to load classes:",
        error
      );

      alert(
        "Unable to load classes from Academic Configuration."
      );

    }

    finally {

      setClassesLoading(false);

    }

  }

  /* =====================================================
     HANDLE CHANGE
  ===================================================== */

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setStudent({

      ...student,

      [name]: value,

    });

  };

  /* =====================================================
     RESET
  ===================================================== */

  const resetForm = () => {

    setStudent({

      name: "",
      enrollmentNo: "",

      fatherName: "",
      motherName: "",

      dob: "",
      gender: "",

      className: "",
      section: "",

      email: "",
      mobile: "",

      address: "",

      password: "",

      status: "Active",

    });

  };

  /* =====================================================
     GET FEE KEY
  ===================================================== */

  function getFeeKey(className) {

    const value =
      String(className || "")
        .trim()
        .toLowerCase();

    /*

      Class 1
      class 1
      1

      → class1

    */

    const numberMatch =
      value.match(/\d+/);

    if (numberMatch) {

      return `class${numberMatch[0]}`;

    }

    /*

      LKG → lkg
      UKG → ukg
      Nursery → nursery

    */

    return value
      .replace(/^class\s*/i, "")
      .replace(/[^a-z0-9]/g, "");

  }

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (
      !student.name.trim() ||
      !student.enrollmentNo.trim() ||
      !student.className ||
      !student.section ||
      !student.email.trim()
    ) {

      alert(
        "Please fill all required fields."
      );

      return;

    }

    try {

      setLoading(true);

      /* =========================================
         FETCH FEE SETTINGS
      ========================================= */

      const feeRef = doc(
        db,
        "settings",
        "feeSettings"
      );

      const feeSnap =
        await getDoc(feeRef);

      if (!feeSnap.exists()) {

        alert(
          "Fee Settings not found."
        );

        return;

      }

      const feeData =
        feeSnap.data();

      const feeKey =
        getFeeKey(
          student.className
        );

      const annualFee =
        Number(
          feeData[feeKey]
        ) || 0;

      if (annualFee <= 0) {

        alert(
          `Fee not found for ${student.className}. Please configure its fee first.`
        );

        return;

      }

      /* =========================================
         STUDENT DATA
      ========================================= */

      const studentData = {

        ...student,

        annualFee,

        paidFee: 0,

        dueFee: annualFee,

        paymentHistory: [],

        admissionDate:
          new Date()
            .toLocaleDateString(
              "en-IN"
            ),

        createdAt:
          new Date(),

        isArchived: false,

      };

      /* =========================================
         SAVE STUDENT
      ========================================= */

      await addDoc(

        collection(
          db,
          "students"
        ),

        studentData

      );

      alert(
        "✅ Student Added Successfully"
      );

      resetForm();

    }

    catch (error) {

      console.error(
        "Add Student Error:",
        error
      );

      alert(
        error.message
      );

    }

    finally {

      setLoading(false);

    }

  };

  /* =====================================================
     GET SELECTED CLASS
  ===================================================== */

  const selectedClass =
    classes.find(
      (item) =>
        item.name ===
        student.className
    );

  const availableSections =
    selectedClass?.sections?.length
      ? selectedClass.sections
      : [
          "A",
          "B",
          "C",
          "D",
        ];

  /* =====================================================
     UI
  ===================================================== */

  return (

    <AdminLayout>

      <div className="max-w-7xl mx-auto">

        {/* =========================================
            HEADER
        ========================================= */}

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 flex justify-between items-center">

          <div>

            <h1 className="text-4xl font-bold text-green-700">

              👨‍🎓 Student Admission

            </h1>

            <p className="text-gray-500 mt-2">

              Add a new student to the School ERP System

            </p>

          </div>

          <div className="hidden md:block bg-green-100 px-6 py-4 rounded-xl">

            <h2 className="text-green-700 font-bold">

              Session

            </h2>

            <p className="text-xl font-bold">

              2026 - 2027

            </p>

          </div>

        </div>

        {/* =========================================
            FORM
        ========================================= */}

        <div className="bg-white rounded-2xl shadow-xl p-8">

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >

            {/* STUDENT NAME */}

            <input
              type="text"
              name="name"
              value={student.name}
              onChange={handleChange}
              placeholder="Student Name *"
              className="border rounded-xl p-3"
              required
            />

            {/* ENROLLMENT */}

            <input
              type="text"
              name="enrollmentNo"
              value={student.enrollmentNo}
              onChange={handleChange}
              placeholder="Enrollment Number *"
              className="border rounded-xl p-3"
              required
            />

            {/* FATHER */}

            <input
              type="text"
              name="fatherName"
              value={student.fatherName}
              onChange={handleChange}
              placeholder="Father Name"
              className="border rounded-xl p-3"
            />

            {/* MOTHER */}

            <input
              type="text"
              name="motherName"
              value={student.motherName}
              onChange={handleChange}
              placeholder="Mother Name"
              className="border rounded-xl p-3"
            />

            {/* DOB */}

            <input
              type="date"
              name="dob"
              value={student.dob}
              onChange={handleChange}
              className="border rounded-xl p-3"
            />

            {/* GENDER */}

            <select
              name="gender"
              value={student.gender}
              onChange={handleChange}
              className="border rounded-xl p-3"
            >

              <option value="">
                Select Gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

              <option value="Other">
                Other
              </option>

            </select>

            {/* =====================================
                DYNAMIC CLASS
            ===================================== */}

            <select
              name="className"
              value={student.className}
              onChange={(e) => {

                setStudent({

                  ...student,

                  className:
                    e.target.value,

                  section: "",

                });

              }}
              className="border rounded-xl p-3"
              required
              disabled={classesLoading}
            >

              <option value="">

                {classesLoading
                  ? "Loading Classes..."
                  : "Select Class"}

              </option>

              {classes.map((item) => (

                <option
                  key={item.id}
                  value={item.name}
                >

                  {item.name}

                </option>

              ))}

            </select>

            {/* =====================================
                DYNAMIC SECTION
            ===================================== */}

            <select
              name="section"
              value={student.section}
              onChange={handleChange}
              className="border rounded-xl p-3"
              required
            >

              <option value="">
                Select Section
              </option>

              {availableSections.map(
                (section) => (

                  <option
                    key={section}
                    value={section}
                  >

                    {section}

                  </option>

                )
              )}

            </select>

            {/* EMAIL */}

            <input
              type="email"
              name="email"
              value={student.email}
              onChange={handleChange}
              placeholder="Email Address *"
              className="border rounded-xl p-3"
              required
            />

            {/* MOBILE */}

            <input
              type="text"
              name="mobile"
              value={student.mobile}
              onChange={handleChange}
              placeholder="Mobile Number"
              className="border rounded-xl p-3"
            />

            {/* ADDRESS */}

            <textarea
              name="address"
              value={student.address}
              onChange={handleChange}
              rows="3"
              placeholder="Address"
              className="md:col-span-2 border rounded-xl p-3 resize-none"
            />

            {/* STATUS */}

            <select
              name="status"
              value={student.status}
              onChange={handleChange}
              className="md:col-span-2 border rounded-xl p-3"
            >

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>

            </select>

            {/* BUTTONS */}

            <div className="md:col-span-2 flex gap-4 mt-4">

              <LoadingButton
                type="submit"
                loading={loading}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white"
              >

                💾 Save Student

              </LoadingButton>

              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl"
              >

                🔄 Reset Form

              </button>

            </div>

          </form>

        </div>

      </div>

    </AdminLayout>

  );

}

export default AddStudent;