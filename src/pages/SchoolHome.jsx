import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { ThemeSwitcher, useTheme } from "../context/ThemeContext";

/*
  XYZ PUBLIC SCHOOL — PUBLIC FRONTEND / LANDING PAGE

  This page is intentionally separate from Login.jsx.

  Sections:
  - School branding
  - About the school
  - Academic approach
  - Facilities
  - Faculty snapshot
  - Admissions
  - Online application
  - Document verification
  - Contact
  - Login

  School information is loaded from:
      settings/schoolSettings

  Faculty fallback order:
      faculty -> teachers -> users(role=teacher)

  IMPORTANT:
  The image URLs below are generic school/facility reference photos
  from public school sites. Replace them with your school's own
  licensed or AI-generated images before production deployment.
*/

const IMAGE_URLS = {
  hero:
    "https://maxfortpitampura.com/wp-content/uploads/2025/08/New-Project-49.png",

  campus:
    "https://bharathicbse.com/wp-content/uploads/2019/11/home-1-600x493.jpg",

  facilities:
    "https://snis.org.in/images/facilities.jpg",

  innovation:
    "https://kr.taacschool.in/_next/image?q=75&url=%2Fimg%2Fhigh-school%2Finnovation.png&w=1920",

  learning:
    "https://www.stprayagpublicschool.co.in/images/primary-n-middle/facilities_s1.jpg",

  library:
    "https://meruinternationalschool.com/miyapur-school-admissions-2026-27/assets/images/advantage.png",
};

const DEFAULT_SCHOOL = {
  schoolName: "XYZ PUBLIC SCHOOL",
  tagline:
    "Smart • Secure • Connected School ERP",
  address:
    "Your School Address, India",
  city:
    "India",
  phone:
    "+91 00000 00000",
  alternatePhone:
    "",
  email:
    "office@xyzpublicschool.edu",
  website:
    "",
  principalName:
    "Principal",
  affiliation:
    "Academic Institution",
  affiliationNo:
    "",
  establishedYear:
    "2020",
  about:
    "A future-ready learning environment where academic excellence, character, technology and co-curricular development work together.",
  mission:
    "To provide a safe, inclusive and future-ready education that develops knowledge, confidence, discipline and responsible citizenship.",
  vision:
    "To nurture curious, capable and compassionate learners prepared for a changing world.",
  admissionOpen:
    true,
  admissionSession:
    "2026–27",
  logoUrl:
    "",
};

/* ==========================================================
   HELPERS
========================================================== */

function text(value, fallback = "") {
  const result =
    String(value ?? "").trim();

  return result || fallback;
}

function normalize(value) {
  return text(
    value
  ).toLowerCase();
}

function fullAddress(school) {
  return [
    school.address,
    school.city,
    school.state,
    school.pincode,
  ]
    .map((item) =>
      text(item, "")
    )
    .filter(Boolean)
    .join(", ");
}

function initials(name) {
  const words =
    text(
      name,
      "XYZ"
    )
      .split(/\s+/)
      .filter(Boolean);

  return words
    .slice(0, 2)
    .map(
      (word) =>
        word[0]
          ?.toUpperCase() || ""
    )
    .join("");
}

function facilityIcon(name) {
  const value =
    normalize(name);

  if (value.includes("lab")) {
    return "🧪";
  }

  if (
    value.includes("sport") ||
    value.includes("play") ||
    value.includes("ground")
  ) {
    return "🏅";
  }

  if (
    value.includes("library") ||
    value.includes("book")
  ) {
    return "📚";
  }

  if (
    value.includes("computer") ||
    value.includes("technology") ||
    value.includes("ai")
  ) {
    return "💻";
  }

  if (
    value.includes("music") ||
    value.includes("art")
  ) {
    return "🎨";
  }

  return "🏫";
}

/* ==========================================================
   MAIN
========================================================== */

export default function SchoolHome() {
  const { isDark } = useTheme();

  const [
    school,
    setSchool,
  ] = useState(
    DEFAULT_SCHOOL
  );

  const [
    faculty,
    setFaculty,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    showAllFaculty,
    setShowAllFaculty,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSchool() {
      try {
        const schoolSnap =
          await getDoc(
            doc(
              db,
              "settings",
              "schoolSettings"
            )
          );

        const schoolData =
          schoolSnap.exists()
            ? schoolSnap.data()
            : {};

        let facultyData = [];

        /*
          Try a dedicated faculty collection first.
        */
        try {
          const facultySnap =
            await getDocs(
              query(
                collection(
                  db,
                  "faculty"
                ),
                limit(
                  12
                )
              )
            );

          facultyData =
            facultySnap.docs.map(
              (item) => ({
                id:
                  item.id,
                ...item.data(),
              })
            );
        } catch {
          facultyData = [];
        }

        /*
          Fallback to teachers.
        */
        if (
          !facultyData.length
        ) {
          try {
            const teacherSnap =
              await getDocs(
                query(
                  collection(
                    db,
                    "teachers"
                  ),
                  limit(
                    12
                  )
                )
              );

            facultyData =
              teacherSnap.docs.map(
                (item) => ({
                  id:
                    item.id,
                  ...item.data(),
                })
              );
          } catch {
            facultyData = [];
          }
        }

        /*
          Final fallback to users with teacher role.
        */
        if (
          !facultyData.length
        ) {
          try {
            const userSnap =
              await getDocs(
                query(
                  collection(
                    db,
                    "users"
                  ),
                  where(
                    "role",
                    "==",
                    "teacher"
                  ),
                  limit(
                    12
                  )
                )
              );

            facultyData =
              userSnap.docs.map(
                (item) => ({
                  id:
                    item.id,
                  ...item.data(),
                })
              );
          } catch {
            facultyData = [];
          }
        }

        if (
          active
        ) {
          setSchool({
            ...DEFAULT_SCHOOL,
            ...schoolData,
          });

          setFaculty(
            facultyData
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Public school frontend:",
          error
        );

        if (
          active
        ) {
          setSchool(
            DEFAULT_SCHOOL
          );

          setFaculty([]);
        }
      } finally {
        if (
          active
        ) {
          setLoading(
            false
          );
        }
      }
    }

    loadSchool();

    return () => {
      active = false;
    };
  }, []);

  const visibleFaculty =
    useMemo(
      () =>
        showAllFaculty
          ? faculty
          : faculty.slice(
              0,
              4
            ),
      [
        faculty,
        showAllFaculty,
      ]
    );

  const facilities = [
    {
      title:
        "Smart Classrooms",
      text:
        "Technology-enabled learning spaces designed for interactive teaching and focused learning.",
      image:
        IMAGE_URLS.hero,
      icon:
        "🖥️",
    },
    {
      title:
        "Science & Innovation Labs",
      text:
        "Hands-on environments for experiments, STEM learning, practical projects and curiosity.",
      image:
        IMAGE_URLS.innovation,
      icon:
        "🧪",
    },
    {
      title:
        "Library & Reading",
      text:
        "A structured reading environment that supports independent study, reference work and discovery.",
      image:
        IMAGE_URLS.library,
      icon:
        "📚",
    },
    {
      title:
        "Sports & Activities",
      text:
        "Balanced development through team sports, fitness, creativity and co-curricular activities.",
      image:
        IMAGE_URLS.campus,
      icon:
        "🏅",
    },
  ];

  return (
    <div className="school-home">

      <style>{styles}</style>

      {/* ====================================================
          NAVBAR
      ==================================================== */}

      <header className="top-nav">

        <div className="nav-inner">

          <Link
            to="/"
            className="brand"
          >

            <div className="brand-logo">

              {school.logoUrl ? (
                <img
                  src={
                    school.logoUrl
                  }
                  alt={
                    school.schoolName
                  }
                />
              ) : (
                <span>
                  {initials(
                    school.schoolName
                  )}
                </span>
              )}

            </div>

            <div>

              <strong>
                {
                  school.schoolName
                }
              </strong>

              <small>
                SCHOOL ERP
              </small>

            </div>

          </Link>

          <nav className="nav-links">

            <a href="#about">
              About
            </a>

            <a href="#facilities">
              Facilities
            </a>

            <a href="#faculty">
              Faculty
            </a>

            <a href="#admissions">
              Admissions
            </a>

            <a href="#verify">
              Verification
            </a>

          </nav>

          <div className="nav-actions">

            <ThemeSwitcher compact />

            <Link
              to="/login"
              className="nav-login"
            >
              Login
            </Link>

            <a
              href="#admissions"
              className="nav-admission"
            >
              Apply Online
            </a>

          </div>

        </div>

      </header>

      {/* ====================================================
          HERO
      ==================================================== */}

      <main>

        <section className="hero">

          <div className="hero-overlay" />

          <div className="hero-inner">

            <div className="hero-copy">

              <span className="eyebrow">
                {school.admissionOpen
                  ? `ADMISSIONS OPEN • ${school.admissionSession}`
                  : "ACADEMIC YEAR • SCHOOL ERP"}
              </span>

              <h1>
                Building
                <span>
                  confident
                </span>{" "}
                learners for the future.
              </h1>

              <p>
                {
                  school.about
                }
              </p>

              <div className="hero-actions">

                <a
                  href="#admissions"
                  className="primary-btn"
                >
                  Start Online Admission
                  <span>
                    →
                  </span>
                </a>

                <a
                  href="#about"
                  className="secondary-btn"
                >
                  Explore School
                </a>

              </div>

              <div className="hero-trust">

                <span>
                  ✓ Secure digital records
                </span>

                <span>
                  ✓ Online admission
                </span>

                <span>
                  ✓ Document verification
                </span>

              </div>

            </div>

            <div className="hero-panel">

              <div className="floating-card card-top">

                <b>
                  🎓
                </b>

                <div>
                  <small>
                    Learning
                  </small>

                  <strong>
                    Academic + Skills
                  </strong>
                </div>

              </div>

              <div className="floating-card card-bottom">

                <b>
                  🔐
                </b>

                <div>
                  <small>
                    Student ERP
                  </small>

                  <strong>
                    Secure & Connected
                  </strong>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            QUICK INFORMATION
        ================================================== */}

        <section className="quick-info">

          <div className="quick-grid">

            <div className="quick-card">
              <span>
                📍
              </span>
              <div>
                <small>
                  Campus
                </small>
                <strong>
                  {
                    fullAddress(
                      school
                    ) ||
                    "School Campus"
                  }
                </strong>
              </div>
            </div>

            <div className="quick-card">
              <span>
                📞
              </span>
              <div>
                <small>
                  Contact
                </small>
                <strong>
                  {
                    school.phone
                  }
                </strong>
              </div>
            </div>

            <div className="quick-card">
              <span>
                ✉️
              </span>
              <div>
                <small>
                  Email
                </small>
                <strong>
                  {
                    school.email
                  }
                </strong>
              </div>
            </div>

            <div className="quick-card">
              <span>
                🗓️
              </span>
              <div>
                <small>
                  Admissions
                </small>
                <strong>
                  {school.admissionOpen
                    ? `Open • ${school.admissionSession}`
                    : "Currently Closed"}
                </strong>
              </div>
            </div>

          </div>

        </section>

        {/* ==================================================
            ABOUT
        ================================================== */}

        <section
          id="about"
          className="section section-white"
        >

          <div className="two-col">

            <div>

              <span className="section-label">
                OUR SCHOOL
              </span>

              <h2>
                A school designed
                around the learner.
              </h2>

              <p className="lead">
                {
                  school.about
                }
              </p>

              <div className="about-points">

                <div>
                  <b>
                    01
                  </b>
                  <span>
                    <strong>
                      Academic Excellence
                    </strong>
                    Focused teaching, structured
                    assessments and continuous
                    academic support.
                  </span>
                </div>

                <div>
                  <b>
                    02
                  </b>
                  <span>
                    <strong>
                      Character & Confidence
                    </strong>
                    Discipline, responsibility,
                    communication and leadership
                    are part of everyday learning.
                  </span>
                </div>

                <div>
                  <b>
                    03
                  </b>
                  <span>
                    <strong>
                      Future Ready Skills
                    </strong>
                    Technology, problem solving,
                    creativity and collaboration
                    complement core academics.
                  </span>
                </div>

              </div>

            </div>

            <div className="about-visual">

              <img
                src={
                  IMAGE_URLS.campus
                }
                alt="Modern school campus"
              />

              <div className="about-badge">

                <strong>
                  {school.establishedYear ||
                    "20+"}
                </strong>

                <span>
                  Years of
                  learning & growth
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            MISSION / VISION
        ================================================== */}

        <section className="mission-band">

          <div className="mission-grid">

            <article>

              <span>
                OUR VISION
              </span>

              <h3>
                {
                  school.vision
                }
              </h3>

            </article>

            <article>

              <span>
                OUR MISSION
              </span>

              <h3>
                {
                  school.mission
                }
              </h3>

            </article>

            <article>

              <span>
                SCHOOL
              </span>

              <h3>
                {school.affiliation ||
                  "Future-ready education"}
              </h3>

            </article>

          </div>

        </section>

        {/* ==================================================
            FACILITIES
        ================================================== */}

        <section
          id="facilities"
          className="section section-light"
        >

          <div className="section-heading">

            <div>

              <span className="section-label">
                CAMPUS & FACILITIES
              </span>

              <h2>
                Spaces that make
                learning come alive.
              </h2>

            </div>

            <p>
              A balanced learning environment
              combines classrooms, practical
              work, reading, technology, activity
              and physical development.
            </p>

          </div>

          <div className="facility-grid">

            {facilities.map(
              (
                item
              ) => (
                <article
                  className="facility-card"
                  key={
                    item.title
                  }
                >

                  <div className="facility-image">

                    <img
                      src={
                        item.image
                      }
                      alt={
                        item.title
                      }
                      loading="lazy"
                    />

                    <span>
                      {
                        item.icon
                      }
                    </span>

                  </div>

                  <div className="facility-content">

                    <h3>
                      {
                        item.title
                      }
                    </h3>

                    <p>
                      {
                        item.text
                      }
                    </p>

                  </div>

                </article>
              )
            )}

          </div>

        </section>

        {/* ==================================================
            FACULTY
        ================================================== */}

        <section
          id="faculty"
          className="section section-white"
        >

          <div className="section-heading">

            <div>

              <span className="section-label">
                FACULTY & LEADERSHIP
              </span>

              <h2>
                Experienced people.
                Meaningful teaching.
              </h2>

            </div>

            <p>
              Teacher profiles are loaded from
              the school's ERP records when available.
            </p>

          </div>

          {loading ? (
            <div className="loading-row">
              Loading faculty information…
            </div>
          ) : visibleFaculty.length ? (

            <div className="faculty-grid">

              {visibleFaculty.map(
                (
                  member
                ) => {
                  const name =
                    member.name ||
                    member.fullName ||
                    member.teacherName ||
                    "Faculty Member";

                  const qualification =
                    member.qualification ||
                    member.qualifications ||
                    member.degree ||
                    "Qualified Educator";

                  const designation =
                    member.designation ||
                    member.position ||
                    member.role ||
                    "Faculty";

                  return (
                    <article
                      className="faculty-card"
                      key={
                        member.id ||
                        name
                      }
                    >

                      <div className="faculty-photo">

                        {member.photoUrl ||
                        member.photo ||
                        member.profilePhoto ? (
                          <img
                            src={
                              member.photoUrl ||
                              member.photo ||
                              member.profilePhoto
                            }
                            alt={
                              name
                            }
                          />
                        ) : (
                          <span>
                            {initials(
                              name
                            )}
                          </span>
                        )}

                      </div>

                      <div>

                        <h3>
                          {
                            name
                          }
                        </h3>

                        <p className="faculty-role">
                          {
                            designation
                          }
                        </p>

                        <p className="faculty-qualification">
                          {
                            qualification
                          }
                        </p>

                        {member.experience && (
                          <span className="experience">
                            {
                              member.experience
                            }
                          </span>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          ) : (

            <div className="empty-faculty">

              <span>
                👨‍🏫
              </span>

              <h3>
                Faculty information
              </h3>

              <p>
                Faculty profiles will appear here
                automatically once maintained in the
                school ERP.
              </p>

            </div>

          )}

          {faculty.length > 4 && (
            <div className="center-action">

              <button
                type="button"
                onClick={() =>
                  setShowAllFaculty(
                    (
                      value
                    ) =>
                      !value
                  )
                }
              >
                {showAllFaculty
                  ? "Show Less"
                  : `View All Faculty (${faculty.length})`}
              </button>

            </div>
          )}

        </section>

        {/* ==================================================
            ADMISSION
        ================================================== */}

        <section
          id="admissions"
          className="admission-section"
        >

          <div className="admission-copy">

            <span className="section-label light">
              ONLINE ADMISSIONS
            </span>

            <h2>
              Apply from anywhere.
              Track everything digitally.
            </h2>

            <p>
              Submit your admission application,
              upload documents and track verification
              without repeated visits for every step.
            </p>

            <div className="admission-steps">

              <div>
                <b>
                  01
                </b>
                <span>
                  Complete Application
                </span>
              </div>

              <div>
                <b>
                  02
                </b>
                <span>
                  Upload Documents
                </span>
              </div>

              <div>
                <b>
                  03
                </b>
                <span>
                  School Verification
                </span>
              </div>

              <div>
                <b>
                  04
                </b>
                <span>
                  Admission Decision
                </span>
              </div>

            </div>

            <div className="admission-actions">

              <Link
                to="/online-admission"
                className="white-btn"
              >
                Apply Online
                →
              </Link>

              <Link
                to="/admission-status"
                className="outline-btn"
              >
                Check Application
              </Link>

            </div>

          </div>

          <div className="admission-image">

            <img
              src={
                IMAGE_URLS.learning
              }
              alt="Students learning"
              loading="lazy"
            />

            <div className="admission-note">

              <strong>
                🔐 Secure Document Flow
              </strong>

              <span>
                Upload → Review → Verify → Track
              </span>

            </div>

          </div>

        </section>

        {/* ==================================================
            VERIFICATION
        ================================================== */}

        <section
          id="verify"
          className="section section-light"
        >

          <div className="verify-box">

            <div>

              <span className="section-label">
                DOCUMENT VERIFICATION
              </span>

              <h2>
                Verify an application
                or school document.
              </h2>

              <p>
                Use the application number or
                verification reference printed on your
                official document to check its current
                status.
              </p>

            </div>

            <div className="verify-actions">

              <Link
                to="/verify-admission"
                className="primary-btn"
              >
                Verify Admission
                →
              </Link>

              <Link
                to="/verify-result"
                className="secondary-outline"
              >
                Verify Result
              </Link>

              <Link
                to="/verify-fee-receipt"
                className="secondary-outline"
              >
                Verify Fee Receipt
              </Link>

            </div>

          </div>

        </section>

        {/* ==================================================
            CONTACT
        ================================================== */}

        <section
          id="contact"
          className="section section-white"
        >

          <div className="contact-grid">

            <div>

              <span className="section-label">
                CONTACT THE SCHOOL
              </span>

              <h2>
                We are here to help.
              </h2>

              <p className="lead">
                For admissions, academics,
                transportation or student support,
                contact the school office.
              </p>

              <div className="contact-list">

                <div>
                  <span>
                    📍
                  </span>
                  <div>
                    <small>
                      Address
                    </small>
                    <strong>
                      {fullAddress(
                        school
                      ) ||
                        "School address"}
                    </strong>
                  </div>
                </div>

                <div>
                  <span>
                    📞
                  </span>
                  <div>
                    <small>
                      Phone
                    </small>
                    <strong>
                      {
                        school.phone
                      }
                    </strong>
                  </div>
                </div>

                <div>
                  <span>
                    ✉️
                  </span>
                  <div>
                    <small>
                      Email
                    </small>
                    <strong>
                      {
                        school.email
                      }
                    </strong>
                  </div>
                </div>

              </div>

            </div>

            <div className="contact-card">

              <span>
                QUICK ACCESS
              </span>

              <Link
                to="/login"
              >
                🔐 School ERP Login
              </Link>

              <Link
                to="/online-admission"
              >
                📝 Online Admission
              </Link>

              <Link
                to="/admission-status"
              >
                📋 Application Status
              </Link>

              <Link
                to="/verify-admission"
              >
                ✅ Document Verification
              </Link>

              <a
                href={`mailto:${school.email}`}
              >
                ✉️ Email School Office
              </a>

              <a
                href={`tel:${school.phone}`}
              >
                📞 Call School Office
              </a>

            </div>

          </div>

        </section>

      </main>

      {/* ====================================================
          FOOTER
      ==================================================== */}

      <footer className="site-footer">

        <div className="footer-grid">

          <div>

            <div className="footer-brand">

              <div className="footer-logo">
                {initials(
                  school.schoolName
                )}
              </div>

              <div>

                <strong>
                  {
                    school.schoolName
                  }
                </strong>

                <span>
                  Smart School ERP
                </span>

              </div>

            </div>

            <p>
              {
                school.tagline ||
                DEFAULT_SCHOOL.tagline
              }
            </p>

          </div>

          <div>

            <strong>
              Explore
            </strong>

            <a href="#about">
              About
            </a>

            <a href="#facilities">
              Facilities
            </a>

            <a href="#faculty">
              Faculty
            </a>

          </div>

          <div>

            <strong>
              Services
            </strong>

            <Link to="/login">
              ERP Login
            </Link>

            <Link to="/online-admission">
              Admissions
            </Link>

            <Link to="/verify-admission">
              Verification
            </Link>

          </div>

          <div>

            <strong>
              School Office
            </strong>

            <span>
              {
                school.phone
              }
            </span>

            <span>
              {
                school.email
              }
            </span>

            <span>
              {fullAddress(
                school
              )}
            </span>

          </div>

        </div>

        <div className="footer-bottom">

          <span>
            ©{" "}
            {new Date().getFullYear()}{" "}
            {
              school.schoolName
            }
          </span>

          <span>
            Secure School ERP • Online Services
          </span>

        </div>

      </footer>

    </div>
  );
}

/* ==========================================================
   STYLES
========================================================== */

const styles = `
  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    color: var(--school-text);
    background: var(--school-bg);
  }

  a {
    text-decoration: none;
  }

  .school-home {
    min-height: 100vh;
    background: var(--school-bg);
  }

  .top-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: color-mix(in srgb, var(--school-card) 92%, transparent);
    border-bottom: 1px solid rgba(226,232,240,.85);
    backdrop-filter: blur(18px);
  }

  .nav-inner {
    width: min(1240px, calc(100% - 32px));
    margin: 0 auto;
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    color: var(--school-text);
    min-width: 230px;
  }

  .brand-logo {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--school-primary),
        var(--school-primary-dark)
      );
    font-weight: 950;
  }

  .brand-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: white;
  }

  .brand strong {
    display: block;
    font-size: 13px;
    font-weight: 950;
    letter-spacing: -.02em;
  }

  .brand small {
    display: block;
    margin-top: 2px;
    color: var(--school-primary);
    font-size: 7px;
    font-weight: 950;
    letter-spacing: .2em;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 22px;
  }

  .nav-links a {
    color: var(--school-muted);
    font-size: 11px;
    font-weight: 800;
  }

  .nav-links a:hover {
    color: var(--school-primary);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-login,
  .nav-admission {
    padding: 10px 13px;
    border-radius: 11px;
    font-size: 10px;
    font-weight: 900;
  }

  .nav-login {
    color: var(--school-text);
    background: var(--school-bg);
    border: 1px solid var(--school-border);
  }

  .nav-admission {
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--school-primary),
        var(--school-primary-dark)
      );
  }

  .hero {
    position: relative;
    min-height: 650px;
    display: flex;
    align-items: stretch;
    overflow: hidden;
    background:
      linear-gradient(
        90deg,
        rgba(2,6,23,.92) 0%,
        rgba(2,6,23,.78) 42%,
        rgba(2,6,23,.25) 75%,
        rgba(2,6,23,.05) 100%
      ),
      url("${IMAGE_URLS.hero}")
      center / cover
      no-repeat;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        circle at 16% 18%,
        rgba(16,185,129,.22),
        transparent 28%
      );
  }

  .hero-inner {
    position: relative;
    z-index: 2;
    width: min(1240px, calc(100% - 32px));
    margin: 0 auto;
    min-height: 650px;
    display: grid;
    grid-template-columns: 1.1fr .9fr;
    align-items: center;
    gap: 50px;
  }

  .hero-copy {
    max-width: 650px;
  }

  .eyebrow,
  .section-label {
    display: inline-block;
    color: var(--school-accent);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: .2em;
  }

  .hero h1 {
    margin: 16px 0 16px;
    color: white;
    font-size: clamp(42px, 6vw, 74px);
    line-height: .98;
    font-weight: 950;
    letter-spacing: -.055em;
  }

  .hero h1 span {
    color: var(--school-accent);
  }

  .hero-copy > p {
    max-width: 610px;
    margin: 0;
    color: #cbd5e1;
    font-size: 15px;
    line-height: 1.75;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 27px;
  }

  .primary-btn,
  .secondary-btn,
  .secondary-outline,
  .white-btn,
  .outline-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 950;
  }

  .primary-btn {
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--school-primary),
        var(--school-primary-dark)
      );
    box-shadow:
      0 15px 35px rgba(5,150,105,.25);
  }

  .secondary-btn {
    color: white;
    border: 1px solid rgba(255,255,255,.22);
    background: rgba(255,255,255,.07);
  }

  .hero-trust {
    display: flex;
    flex-wrap: wrap;
    gap: 13px;
    margin-top: 21px;
    color: #a7f3d0;
    font-size: 9px;
    font-weight: 750;
  }

  .hero-panel {
    position: relative;
    min-height: 430px;
  }

  .floating-card {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 14px;
    border-radius: 17px;
    border: 1px solid rgba(255,255,255,.16);
    background: rgba(15,23,42,.66);
    box-shadow: 0 25px 60px rgba(0,0,0,.25);
    backdrop-filter: blur(14px);
  }

  .floating-card b {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: rgba(16,185,129,.16);
    font-size: 17px;
  }

  .floating-card small {
    display: block;
    color: #94a3b8;
    font-size: 8px;
    font-weight: 800;
  }

  .floating-card strong {
    display: block;
    margin-top: 3px;
    color: white;
    font-size: 11px;
  }

  .card-top {
    top: 15%;
    right: 2%;
  }

  .card-bottom {
    right: 18%;
    bottom: 13%;
  }

  .quick-info {
    position: relative;
    z-index: 4;
    margin-top: -38px;
  }

  .quick-grid {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    display: grid;
    grid-template-columns:
      repeat(4, 1fr);
    overflow: hidden;
    border-radius: 18px;
    background: var(--school-card);
    box-shadow:
      0 25px 60px rgba(15,23,42,.12);
    border: 1px solid var(--school-border);
  }

  .quick-card {
    display: flex;
    gap: 10px;
    padding: 19px;
    border-right: 1px solid var(--school-border);
  }

  .quick-card:last-child {
    border-right: none;
  }

  .quick-card > span {
    width: 33px;
    height: 33px;
    flex: 0 0 33px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: var(--school-soft);
    font-size: 15px;
  }

  .quick-card small {
    display: block;
    color: #94a3b8;
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .quick-card strong {
    display: block;
    margin-top: 4px;
    color: var(--school-text);
    font-size: 10px;
    line-height: 1.5;
  }

  .section {
    padding: 92px 0;
  }

  .section-white {
    background: white;
  }

  .section-light {
    background: var(--school-bg);
  }

  .two-col,
  .section-heading,
  .contact-grid {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
  }

  .two-col {
    display: grid;
    grid-template-columns:
      1fr 1fr;
    align-items: center;
    gap: 75px;
  }

  .section h2 {
    max-width: 700px;
    margin: 12px 0 14px;
    color: var(--school-text);
    font-size: clamp(31px, 4vw, 52px);
    line-height: 1.02;
    font-weight: 950;
    letter-spacing: -.045em;
  }

  .lead {
    color: var(--school-muted);
    font-size: 13px;
    line-height: 1.8;
  }

  .about-points {
    margin-top: 28px;
    display: grid;
    gap: 13px;
  }

  .about-points > div {
    display: grid;
    grid-template-columns: 35px 1fr;
    gap: 11px;
    align-items: start;
    padding: 13px 0;
    border-top: 1px solid var(--school-border);
  }

  .about-points b {
    color: var(--school-primary);
    font-size: 10px;
    font-weight: 950;
  }

  .about-points strong {
    display: block;
    margin-bottom: 3px;
    color: var(--school-text);
    font-size: 11px;
  }

  .about-points span {
    color: var(--school-muted);
    font-size: 10px;
    line-height: 1.55;
  }

  .about-visual {
    position: relative;
  }

  .about-visual img {
    width: 100%;
    aspect-ratio: 4/4.6;
    object-fit: cover;
    border-radius: 28px;
    box-shadow:
      0 25px 70px rgba(15,23,42,.16);
  }

  .about-badge {
    position: absolute;
    left: -24px;
    bottom: 25px;
    width: 155px;
    padding: 16px;
    border-radius: 17px;
    background: var(--school-card);
    box-shadow:
      0 20px 50px rgba(15,23,42,.16);
  }

  .about-badge strong {
    display: block;
    color: var(--school-primary);
    font-size: 28px;
    font-weight: 950;
  }

  .about-badge span {
    display: block;
    margin-top: 2px;
    color: var(--school-muted);
    font-size: 9px;
    line-height: 1.5;
  }

  .mission-band {
    padding: 68px 0;
    background:
      linear-gradient(
        135deg,
        #022c22,
        var(--school-primary-dark)
      );
    color: white;
  }

  .mission-grid {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    display: grid;
    grid-template-columns:
      repeat(3,1fr);
    gap: 1px;
    background: rgba(255,255,255,.12);
    border-radius: 22px;
    overflow: hidden;
  }

  .mission-grid article {
    padding: 30px;
    background: rgba(255,255,255,.035);
  }

  .mission-grid span {
    color: var(--school-primary-light);
    font-size: 8px;
    font-weight: 950;
    letter-spacing: .2em;
  }

  .mission-grid h3 {
    margin: 13px 0 0;
    color: white;
    font-size: 17px;
    line-height: 1.55;
    font-weight: 800;
  }

  .section-heading {
    display: grid;
    grid-template-columns: 1fr 360px;
    align-items: end;
    gap: 35px;
    margin-bottom: 35px;
  }

  .section-heading > p {
    color: var(--school-muted);
    font-size: 11px;
    line-height: 1.7;
  }

  .facility-grid {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    display: grid;
    grid-template-columns:
      repeat(4,1fr);
    gap: 15px;
  }

  .facility-card {
    overflow: hidden;
    border-radius: 19px;
    border: 1px solid var(--school-border);
    background: var(--school-card);
    box-shadow:
      0 12px 30px rgba(15,23,42,.04);
  }

  .facility-image {
    position: relative;
    height: 185px;
    overflow: hidden;
  }

  .facility-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition:
      transform .35s ease;
  }

  .facility-card:hover img {
    transform: scale(1.04);
  }

  .facility-image > span {
    position: absolute;
    top: 11px;
    left: 11px;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255,255,255,.9);
    backdrop-filter: blur(5px);
    font-size: 15px;
  }

  .facility-content {
    padding: 15px;
  }

  .facility-content h3 {
    margin: 0;
    color: var(--school-text);
    font-size: 13px;
    font-weight: 950;
  }

  .facility-content p {
    margin: 7px 0 0;
    color: var(--school-muted);
    font-size: 9.5px;
    line-height: 1.65;
  }

  .faculty-grid {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    display: grid;
    grid-template-columns:
      repeat(4,1fr);
    gap: 15px;
  }

  .faculty-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: 17px;
    background: var(--school-bg);
    border: 1px solid var(--school-border);
  }

  .faculty-photo {
    width: 58px;
    height: 58px;
    flex: 0 0 58px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--school-primary),
        var(--school-primary-dark)
      );
    font-size: 14px;
    font-weight: 950;
  }

  .faculty-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .faculty-card h3 {
    margin: 0;
    color: var(--school-text);
    font-size: 11px;
    font-weight: 950;
  }

  .faculty-role {
    margin: 4px 0 0;
    color: var(--school-primary);
    font-size: 8px;
    font-weight: 900;
  }

  .faculty-qualification {
    margin: 3px 0 0;
    color: var(--school-muted);
    font-size: 8.5px;
    line-height: 1.45;
  }

  .experience {
    display: inline-block;
    margin-top: 5px;
    padding: 3px 6px;
    border-radius: 99px;
    background: var(--school-soft);
    color: var(--school-primary-dark);
    font-size: 7px;
    font-weight: 900;
  }

  .loading-row,
  .empty-faculty {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    padding: 45px;
    border-radius: 19px;
    border: 1px dashed #cbd5e1;
    text-align: center;
    color: var(--school-muted);
    background: var(--school-bg);
    font-size: 11px;
  }

  .empty-faculty span {
    display: block;
    font-size: 28px;
    margin-bottom: 8px;
  }

  .empty-faculty h3 {
    margin: 0;
    color: var(--school-text);
    font-size: 15px;
  }

  .empty-faculty p {
    margin: 5px 0 0;
    font-size: 10px;
  }

  .center-action {
    display: flex;
    justify-content: center;
    margin-top: 24px;
  }

  .center-action button {
    border: none;
    border-radius: 11px;
    padding: 11px 15px;
    background: var(--school-soft);
    color: var(--school-primary-dark);
    font-size: 10px;
    font-weight: 900;
    cursor: pointer;
  }

  .admission-section {
    width: min(1240px, calc(100% - 32px));
    min-height: 470px;
    margin: 20px auto;
    overflow: hidden;
    display: grid;
    grid-template-columns:
      1fr .9fr;
    border-radius: 28px;
    background:
      linear-gradient(
        135deg,
        #022c22,
        #065f46
      );
    color: white;
  }

  .admission-copy {
    padding: 65px;
  }

  .section-label.light {
    color: var(--school-primary-light);
  }

  .admission-copy h2 {
    max-width: 600px;
    margin: 13px 0;
    color: white;
    font-size: clamp(31px, 4vw, 52px);
    line-height: 1.04;
    font-weight: 950;
    letter-spacing: -.045em;
  }

  .admission-copy > p {
    max-width: 540px;
    color: #cbd5e1;
    font-size: 12px;
    line-height: 1.75;
  }

  .admission-steps {
    display: grid;
    grid-template-columns:
      repeat(2,1fr);
    gap: 8px;
    margin-top: 25px;
  }

  .admission-steps > div {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px;
    border-radius: 11px;
    background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.08);
  }

  .admission-steps b {
    color: var(--school-primary-light);
    font-size: 8px;
  }

  .admission-steps span {
    color: white;
    font-size: 9px;
    font-weight: 850;
  }

  .admission-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 23px;
  }

  .white-btn {
    color: var(--school-primary-dark);
    background: white;
  }

  .outline-btn {
    color: white;
    border: 1px solid rgba(255,255,255,.2);
    background: rgba(255,255,255,.04);
  }

  .admission-image {
    position: relative;
    min-height: 470px;
  }

  .admission-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: .72;
  }

  .admission-note {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 23px;
    padding: 14px;
    border-radius: 15px;
    background: rgba(2,44,34,.84);
    border: 1px solid rgba(255,255,255,.12);
    backdrop-filter: blur(10px);
  }

  .admission-note strong {
    display: block;
    color: white;
    font-size: 10px;
  }

  .admission-note span {
    display: block;
    margin-top: 3px;
    color: #a7f3d0;
    font-size: 8.5px;
  }

  .verify-box {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    display: grid;
    grid-template-columns:
      1fr 1fr;
    gap: 35px;
    align-items: center;
    padding: 38px;
    border-radius: 24px;
    background: var(--school-card);
    border: 1px solid var(--school-border);
    box-shadow:
      0 15px 45px rgba(15,23,42,.05);
  }

  .verify-box h2 {
    margin-bottom: 8px;
    font-size: 31px;
  }

  .verify-box p {
    max-width: 560px;
    margin: 0;
    color: var(--school-muted);
    font-size: 11px;
    line-height: 1.7;
  }

  .verify-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .secondary-outline {
    color: var(--school-text);
    border: 1px solid var(--school-border);
    background: var(--school-bg);
  }

  .contact-grid {
    display: grid;
    grid-template-columns:
      1.1fr .9fr;
    gap: 70px;
    align-items: center;
  }

  .contact-list {
    display: grid;
    gap: 11px;
    margin-top: 25px;
  }

  .contact-list > div {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .contact-list > div > span {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: var(--school-soft);
  }

  .contact-list small {
    display: block;
    color: #94a3b8;
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .contact-list strong {
    display: block;
    margin-top: 4px;
    color: var(--school-text);
    font-size: 10px;
    line-height: 1.5;
  }

  .contact-card {
    padding: 23px;
    border-radius: 21px;
    background:
      linear-gradient(
        135deg,
        var(--school-bg),
        #f0fdf4
      );
    border: 1px solid var(--school-border);
  }

  .contact-card > span {
    display: block;
    margin-bottom: 11px;
    color: var(--school-primary);
    font-size: 8px;
    font-weight: 950;
    letter-spacing: .18em;
  }

  .contact-card a {
    display: block;
    padding: 11px 0;
    border-top: 1px solid var(--school-border);
    color: var(--school-text);
    font-size: 10px;
    font-weight: 850;
  }

  .site-footer {
    padding: 48px 0 20px;
    color: #cbd5e1;
    background: #020617;
  }

  .footer-grid {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    display: grid;
    grid-template-columns:
      1.5fr 1fr 1fr 1.2fr;
    gap: 40px;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .footer-logo {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--school-primary),
        var(--school-primary-dark)
      );
    font-size: 10px;
    font-weight: 950;
  }

  .footer-brand strong {
    display: block;
    color: white;
    font-size: 11px;
  }

  .footer-brand span {
    display: block;
    margin-top: 2px;
    color: var(--school-accent);
    font-size: 7px;
    font-weight: 900;
    letter-spacing: .13em;
  }

  .footer-grid > div > p {
    max-width: 330px;
    margin-top: 15px;
    color: var(--school-muted);
    font-size: 9px;
    line-height: 1.65;
  }

  .footer-grid > div > strong {
    display: block;
    margin-bottom: 10px;
    color: white;
    font-size: 9px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .12em;
  }

  .footer-grid > div > a,
  .footer-grid > div > span {
    display: block;
    margin-top: 8px;
    color: #94a3b8;
    font-size: 9px;
    line-height: 1.5;
  }

  .footer-bottom {
    width: min(1120px, calc(100% - 32px));
    margin: 35px auto 0;
    padding-top: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    border-top: 1px solid rgba(255,255,255,.08);
    color: var(--school-muted);
    font-size: 8px;
  }

  @media (max-width: 1000px) {
    .nav-links {
      display: none;
    }

    .quick-grid,
    .facility-grid,
    .faculty-grid {
      grid-template-columns:
        repeat(2,1fr);
    }

    .hero-inner {
      grid-template-columns: 1fr;
    }

    .hero-panel {
      display: none;
    }

    .two-col,
    .section-heading,
    .contact-grid,
    .verify-box,
    .admission-section {
      grid-template-columns: 1fr;
    }

    .admission-copy {
      padding: 42px 35px;
    }

    .admission-image {
      min-height: 350px;
    }

    .footer-grid {
      grid-template-columns:
        repeat(2,1fr);
    }
  }

  @media (max-width: 620px) {
    .nav-inner {
      min-height: 66px;
    }

    .brand {
      min-width: auto;
    }

    .nav-actions .nav-admission {
      display: none;
    }

    .hero,
    .hero-inner {
      min-height: 620px;
    }

    .hero h1 {
      font-size: 43px;
    }

    .quick-grid,
    .facility-grid,
    .faculty-grid,
    .mission-grid {
      grid-template-columns:
        1fr;
    }

    .quick-card {
      border-right: 0;
      border-bottom: 1px solid var(--school-border);
    }

    .quick-card:last-child {
      border-bottom: 0;
    }

    .section {
      padding: 70px 0;
    }

    .about-badge {
      left: 12px;
    }

    .admission-steps {
      grid-template-columns: 1fr;
    }

    .footer-grid {
      grid-template-columns: 1fr;
    }

    .footer-bottom {
      flex-direction: column;
      align-items: flex-start;
    }
  }


  [data-mode="dark"] .top-nav {
    background: rgba(15,23,42,.92);
  }

  [data-mode="dark"] .brand-logo img {
    background: #ffffff;
  }

  [data-mode="dark"] .secondary-outline,
  [data-mode="dark"] .nav-login {
    color: var(--school-text);
  }
`;

