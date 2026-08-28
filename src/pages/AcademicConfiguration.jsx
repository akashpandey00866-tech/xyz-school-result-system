import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";

/*
============================================================
ACADEMIC CONFIGURATION
============================================================

Firestore Collections:
1. academicSessions
2. classes
3. subjects
4. assessments
5. classSubjects

Flow:

Academic Session
      ↓
Classes + Sections
      ↓
Subjects
      ↓
Examinations
      ↓
Class-wise Subject Distribution
      ↓
Add Result

============================================================
*/

const EXAM_TYPES = [
  {
    key: "unit",
    name: "Unit Test",
    icon: "📝",
  },
  {
    key: "mid",
    name: "Mid Term",
    icon: "📖",
  },
  {
    key: "half",
    name: "Half Yearly",
    icon: "📚",
  },
  {
    key: "annual",
    name: "Annual Examination",
    icon: "🎓",
  },
  {
    key: "practical",
    name: "Practical",
    icon: "🧪",
  },
];

const SUBJECT_TYPES = [
  "Core",
  "Language",
  "Elective",
  "Practical",
  "Co-Curricular",
];

const EMPTY_SESSION = {
  name: "",
  startDate: "",
  endDate: "",
  description: "",
  makeActive: false,
};

const EMPTY_CLASS = {
  name: "",
  sections: ["A"],
  capacity: "",
};

const EMPTY_SUBJECT = {
  name: "",
  code: "",
  type: "Core",
  theoryMarks: "100",
  practicalMarks: "0",
  internalMarks: "0",
  projectMarks: "0",
  passingTheory: "33",
  passingPractical: "0",
};

const EMPTY_ASSESSMENT = {
  name: "",
  type: "annual",
  weightage: "100",
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getProgress(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(
    `${startDate}T00:00:00`
  ).getTime();

  const end = new Date(
    `${endDate}T00:00:00`
  ).getTime();

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const current = today.getTime();

  if (current <= start) return 0;

  if (current >= end) return 100;

  return Math.round(
    ((current - start) / (end - start)) * 100
  );
}

function nextSection(sections) {
  const used = new Set(
    sections.map((item) =>
      String(item).toUpperCase()
    )
  );

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(
      65 + i
    );

    if (!used.has(letter)) {
      return letter;
    }
  }

  return `S${sections.length + 1}`;
}

function compareClasses(a, b) {
  const aName = String(a?.name || "").trim();
  const bName = String(b?.name || "").trim();

  const aNumber = aName.match(/\d+/);
  const bNumber = bName.match(/\d+/);

  // Both numeric classes
  if (aNumber && bNumber) {
    const difference =
      Number(aNumber[0]) - Number(bNumber[0]);

    if (difference !== 0) {
      return difference;
    }
  }

  // Numeric classes before named classes
  if (aNumber && !bNumber) return -1;
  if (!aNumber && bNumber) return 1;

  // LKG, UKG, Nursery, etc.
  return aName.localeCompare(
    bName,
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    }
  );
}

function AcademicConfiguration() {
  /*
  ============================================================
  DATA
  ============================================================
  */

  const [sessions, setSessions] =
    useState([]);

  const [classes, setClasses] =
    useState([]);

  const [subjects, setSubjects] =
    useState([]);

  const [assessments, setAssessments] =
    useState([]);

  const [distributions, setDistributions] =
    useState([]);

  /*
  ============================================================
  UI
  ============================================================
  */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("overview");

  const [selectedSessionId, setSelectedSessionId] =
    useState("");

  const [selectedClassId, setSelectedClassId] =
    useState("");

  const [subjectSearch, setSubjectSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [confirmAction, setConfirmAction] =
    useState(null);

  /*
  ============================================================
  FORMS
  ============================================================
  */

  const [sessionForm, setSessionForm] =
    useState(EMPTY_SESSION);

  const [classForm, setClassForm] =
    useState(EMPTY_CLASS);

  const [subjectForm, setSubjectForm] =
    useState(EMPTY_SUBJECT);

  const [assessmentForm, setAssessmentForm] =
    useState(EMPTY_ASSESSMENT);

  /*
  ============================================================
  EDIT STATES
  ============================================================
  */

  const [editingSessionId, setEditingSessionId] =
    useState(null);

  const [editingClassId, setEditingClassId] =
    useState(null);

  const [editingSubjectId, setEditingSubjectId] =
    useState(null);

  const [editingAssessmentId, setEditingAssessmentId] =
    useState(null);

  /*
  ============================================================
  DISTRIBUTION
  ============================================================
  */

  const [selectedSubjects, setSelectedSubjects] =
    useState([]);

  /*
  ============================================================
  SESSION CLONE
  ============================================================
  */

  const [cloneSourceId, setCloneSourceId] =
    useState("");

  const [cloneTargetName, setCloneTargetName] =
    useState("");

  /*
  ============================================================
  DERIVED DATA
  ============================================================
  */

  const activeSession =
    sessions.find(
      (item) => item.active === true
    ) || null;

  const selectedSession =
    sessions.find(
      (item) =>
        item.id === selectedSessionId
    ) ||
    activeSession ||
    null;

  const sessionClasses = useMemo(() => {
    return classes
      .filter(
        (item) =>
          !item.sessionId ||
          item.sessionId ===
            selectedSession?.id
      )
      .sort(compareClasses);
  }, [classes, selectedSession]);

  const sessionSubjects = useMemo(() => {
    return subjects
      .filter(
        (item) =>
          !item.sessionId ||
          item.sessionId ===
            selectedSession?.id
      )
      .sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
      );
  }, [subjects, selectedSession]);

  const sessionAssessments =
    useMemo(() => {
      return assessments
        .filter(
          (item) =>
            !item.sessionId ||
            item.sessionId ===
              selectedSession?.id
        )
        .sort((a, b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(b.name || "")
          )
        );
    }, [assessments, selectedSession]);

  const filteredSubjects =
    useMemo(() => {
      const query =
        normalize(subjectSearch);

      if (!query) {
        return sessionSubjects;
      }

      return sessionSubjects.filter(
        (item) =>
          normalize(
            item.name
          ).includes(query) ||
          normalize(
            item.code
          ).includes(query)
      );
    }, [
      sessionSubjects,
      subjectSearch,
    ]);

  const selectedClass =
    sessionClasses.find(
      (item) =>
        item.id === selectedClassId
    ) || null;

  const currentDistribution =
    distributions.find(
      (item) =>
        item.classId ===
          selectedClassId &&
        item.sessionId ===
          selectedSession?.id
    ) || null;

  const selectedDistributionSubjects =
    sessionSubjects.filter(
      (item) =>
        selectedSubjects.includes(
          item.id
        )
    );

  const totalSections =
    sessionClasses.reduce(
      (total, item) =>
        total +
        (item.sections?.length || 0),
      0
    );

  const distributedClasses =
    distributions.filter(
      (item) =>
        item.sessionId ===
        selectedSession?.id
    ).length;

  const setupProgress =
    selectedSession
      ? Math.round(
          [
            true,
            sessionClasses.length > 0,
            sessionSubjects.length > 0,
            sessionAssessments.length > 0,
            distributedClasses > 0,
          ].filter(Boolean).length *
            20
        )
      : 0;

  /*
  ============================================================
  INITIAL LOAD
  ============================================================
  */

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (
      !selectedSessionId &&
      activeSession?.id
    ) {
      setSelectedSessionId(
        activeSession.id
      );
    }
  }, [
    activeSession?.id,
    selectedSessionId,
  ]);

  useEffect(() => {
    if (
      !selectedSessionId &&
      sessions.length > 0 &&
      !activeSession
    ) {
      setSelectedSessionId(
        sessions[0].id
      );
    }
  }, [
    sessions,
    selectedSessionId,
    activeSession,
  ]);

  useEffect(() => {
    setSelectedClassId("");
    setSelectedSubjects([]);
  }, [selectedSessionId]);

  useEffect(() => {
    if (
      currentDistribution &&
      Array.isArray(
        currentDistribution.subjectIds
      )
    ) {
      setSelectedSubjects(
        currentDistribution.subjectIds
      );
    } else {
      setSelectedSubjects([]);
    }
  }, [
    currentDistribution?.id,
    selectedClassId,
    selectedSessionId,
  ]);

  /*
  ============================================================
  LOAD DATA
  ============================================================
  */

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [
        sessionSnapshot,
        classSnapshot,
        subjectSnapshot,
        assessmentSnapshot,
        distributionSnapshot,
      ] = await Promise.all([
        getDocs(
          collection(
            db,
            "academicSessions"
          )
        ),

        getDocs(
          collection(
            db,
            "classes"
          )
        ),

        getDocs(
          collection(
            db,
            "subjects"
          )
        ),

        getDocs(
          collection(
            db,
            "assessments"
          )
        ),

        getDocs(
          collection(
            db,
            "classSubjects"
          )
        ),
      ]);

      const sessionData =
        sessionSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      const classData =
        classSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      const subjectData =
        subjectSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      const assessmentData =
        assessmentSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      const distributionData =
        distributionSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      sessionData.sort(
        (a, b) =>
          String(
            b.startDate || ""
          ).localeCompare(
            String(
              a.startDate || ""
            )
          )
      );

      classData.sort(
        compareClasses
      );

      setSessions(
        sessionData
      );

      setClasses(
        classData
      );

      setSubjects(
        subjectData
      );

      setAssessments(
        assessmentData
      );

      setDistributions(
        distributionData
      );

      const active =
        sessionData.find(
          (item) =>
            item.active === true
        );

      if (
        !selectedSessionId &&
        active
      ) {
        setSelectedSessionId(
          active.id
        );
      }
    } catch (err) {
      console.error(
        "Academic configuration load error:",
        err
      );

      setError(
        "Unable to load academic configuration. Check Firestore permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  ============================================================
  NOTIFICATIONS
  ============================================================
  */

  function clearNotice() {
    setMessage("");
    setError("");
  }

  function notify(text) {
    setMessage(text);
    setError("");

    window.setTimeout(
      () => setMessage(""),
      3500
    );
  }

  /*
  ============================================================
  SESSION
  ============================================================
  */

  async function saveSession(e) {
    e.preventDefault();

    clearNotice();

    const name =
      sessionForm.name.trim();

    if (!name) {
      setError(
        "Enter academic session name."
      );
      return;
    }

    if (
      !sessionForm.startDate ||
      !sessionForm.endDate
    ) {
      setError(
        "Select session start and end dates."
      );
      return;
    }

    if (
      sessionForm.endDate <
      sessionForm.startDate
    ) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    const duplicate =
      sessions.some(
        (item) =>
          item.id !==
            editingSessionId &&
          normalize(item.name) ===
            normalize(name)
      );

    if (duplicate) {
      setError(
        "This academic session already exists."
      );
      return;
    }

    try {
      setSaving(true);

      if (editingSessionId) {
        await updateDoc(
          doc(
            db,
            "academicSessions",
            editingSessionId
          ),
          {
            name,
            startDate:
              sessionForm.startDate,
            endDate:
              sessionForm.endDate,
            description:
              sessionForm.description.trim(),
            updatedAt:
              serverTimestamp(),
          }
        );

        notify(
          "Academic session updated successfully."
        );
      } else {
        const shouldBeActive =
          sessions.length === 0 ||
          sessionForm.makeActive === true;

        if (shouldBeActive) {
          await Promise.all(
            sessions
              .filter(
                (item) =>
                  item.active ===
                  true
              )
              .map((item) =>
                updateDoc(
                  doc(
                    db,
                    "academicSessions",
                    item.id
                  ),
                  {
                    active: false,
                    updatedAt:
                      serverTimestamp(),
                  }
                )
              )
          );
        }

        const ref =
          await addDoc(
            collection(
              db,
              "academicSessions"
            ),
            {
              name,
              startDate:
                sessionForm.startDate,
              endDate:
                sessionForm.endDate,
              description:
                sessionForm.description.trim(),
              active:
                shouldBeActive,
              createdAt:
                serverTimestamp(),
              updatedAt:
                serverTimestamp(),
            }
          );

        setSelectedSessionId(
          ref.id
        );

        notify(
          "Academic session created successfully."
        );
      }

      setSessionForm(
        EMPTY_SESSION
      );

      setEditingSessionId(
        null
      );

      await loadAll();
    } catch (err) {
      console.error(
        "Session save error:",
        err
      );

      setError(
        "Unable to save academic session."
      );
    } finally {
      setSaving(false);
    }
  }

  function editSession(item) {
    setEditingSessionId(
      item.id
    );

    setSessionForm({
      name:
        item.name || "",
      startDate:
        item.startDate || "",
      endDate:
        item.endDate || "",
      description:
        item.description || "",
      makeActive:
        false,
    });

    setActiveTab(
      "sessions"
    );
  }

  async function activateSession(
    session
  ) {
    try {
      setSaving(true);
      clearNotice();

      await Promise.all(
        sessions
          .filter(
            (item) =>
              item.id !==
              session.id
          )
          .map((item) =>
            item.active
              ? updateDoc(
                  doc(
                    db,
                    "academicSessions",
                    item.id
                  ),
                  {
                    active: false,
                    updatedAt:
                      serverTimestamp(),
                  }
                )
              : null
          )
      );

      await updateDoc(
        doc(
          db,
          "academicSessions",
          session.id
        ),
        {
          active: true,
          updatedAt:
            serverTimestamp(),
        }
      );

      setSelectedSessionId(
        session.id
      );

      await loadAll();

      notify(
        `${session.name} is now the active session.`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to activate session."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(
    session
  ) {
    try {
      setSaving(true);

      await deleteDoc(
        doc(
          db,
          "academicSessions",
          session.id
        )
      );

      if (
        selectedSessionId ===
        session.id
      ) {
        setSelectedSessionId(
          ""
        );
      }

      await loadAll();

      notify(
        "Academic session deleted."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to delete session."
      );
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  /*
  ============================================================
  CLASS
  ============================================================
  */

  async function saveClass(e) {
    e.preventDefault();

    clearNotice();

    if (!selectedSession) {
      setError(
        "Select an academic session first."
      );
      return;
    }

    const name =
      classForm.name.trim();

    const sections =
      classForm.sections
        .map((item) =>
          String(item)
            .trim()
            .toUpperCase()
        )
        .filter(Boolean);

    if (!name) {
      setError(
        "Enter class name."
      );
      return;
    }

    if (!sections.length) {
      setError(
        "Add at least one section."
      );
      return;
    }

    const duplicate =
      sessionClasses.some(
        (item) =>
          item.id !==
            editingClassId &&
          normalize(item.name) ===
            normalize(name)
      );

    if (duplicate) {
      setError(
        "This class already exists in the selected session."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        sections,
        capacity:
          Number(
            classForm.capacity
          ) || 0,
        sessionId:
          selectedSession.id,
        sessionName:
          selectedSession.name,
        updatedAt:
          serverTimestamp(),
      };

      if (editingClassId) {
        await updateDoc(
          doc(
            db,
            "classes",
            editingClassId
          ),
          payload
        );

        notify(
          "Class updated successfully."
        );
      } else {
        await addDoc(
          collection(
            db,
            "classes"
          ),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );

        notify(
          `${name} added successfully.`
        );
      }

      setClassForm(
        EMPTY_CLASS
      );

      setEditingClassId(
        null
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      setError(
        "Unable to save class."
      );
    } finally {
      setSaving(false);
    }
  }

  function editClass(item) {
    setEditingClassId(
      item.id
    );

    setClassForm({
      name:
        item.name || "",
      sections:
        item.sections?.length
          ? item.sections
          : ["A"],
      capacity:
        item.capacity || "",
    });

    setActiveTab(
      "classes"
    );
  }

  function addSection() {
    setClassForm(
      (previous) => ({
        ...previous,
        sections: [
          ...previous.sections,
          nextSection(
            previous.sections
          ),
        ],
      })
    );
  }

  function removeSection(
    index
  ) {
    setClassForm(
      (previous) => ({
        ...previous,
        sections:
          previous.sections
            .length <= 1
            ? previous.sections
            : previous.sections.filter(
                (_, i) =>
                  i !== index
              ),
      })
    );
  }

  function updateSection(
    index,
    value
  ) {
    setClassForm(
      (previous) => ({
        ...previous,
        sections:
          previous.sections.map(
            (item, i) =>
              i === index
                ? value.toUpperCase()
                : item
          ),
      })
    );
  }

  async function deleteClass(
    item
  ) {
    try {
      setSaving(true);

      await deleteDoc(
        doc(
          db,
          "classes",
          item.id
        )
      );

      await loadAll();

      notify(
        `${item.name} deleted.`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to delete class."
      );
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  /*
  ============================================================
  SUBJECT
  ============================================================
  */

  async function saveSubject(
    e
  ) {
    e.preventDefault();

    clearNotice();

    if (!selectedSession) {
      setError(
        "Select an academic session first."
      );
      return;
    }

    const name =
      subjectForm.name.trim();

    const code =
      subjectForm.code
        .trim()
        .toUpperCase();

    if (!name || !code) {
      setError(
        "Subject name and code are required."
      );
      return;
    }

    const duplicate =
      sessionSubjects.some(
        (item) =>
          item.id !==
            editingSubjectId &&
          (normalize(
            item.name
          ) ===
            normalize(name) ||
            normalize(
              item.code
            ) ===
              normalize(code))
      );

    if (duplicate) {
      setError(
        "Subject name or code already exists."
      );
      return;
    }

    const theory =
      Math.max(
        0,
        Number(
          subjectForm.theoryMarks
        ) || 0
      );

    const practical =
      Math.max(
        0,
        Number(
          subjectForm.practicalMarks
        ) || 0
      );

    const internal =
      Math.max(
        0,
        Number(
          subjectForm.internalMarks
        ) || 0
      );

    const project =
      Math.max(
        0,
        Number(
          subjectForm.projectMarks
        ) || 0
      );

    const maxMarks =
      theory +
      practical +
      internal +
      project;

    const passingTheory =
      Math.min(
        theory,
        Math.max(
          0,
          Number(
            subjectForm.passingTheory
          ) || 0
        )
      );

    const passingPractical =
      Math.min(
        practical,
        Math.max(
          0,
          Number(
            subjectForm.passingPractical
          ) || 0
        )
      );

    try {
      setSaving(true);

      const payload = {
        name,
        code,
        type:
          subjectForm.type,

        theoryMarks:
          theory,

        practicalMarks:
          practical,

        internalMarks:
          internal,

        projectMarks:
          project,

        maxMarks,

        passingTheory,

        passingPractical,

        passingMarks:
          passingTheory +
          passingPractical,

        sessionId:
          selectedSession.id,

        sessionName:
          selectedSession.name,

        status: "Active",

        updatedAt:
          serverTimestamp(),
      };

      if (
        editingSubjectId
      ) {
        await updateDoc(
          doc(
            db,
            "subjects",
            editingSubjectId
          ),
          payload
        );

        notify(
          "Subject updated successfully."
        );
      } else {
        await addDoc(
          collection(
            db,
            "subjects"
          ),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );

        notify(
          "Subject added successfully."
        );
      }

      setSubjectForm(
        EMPTY_SUBJECT
      );

      setEditingSubjectId(
        null
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      setError(
        "Unable to save subject."
      );
    } finally {
      setSaving(false);
    }
  }

  function editSubject(
    item
  ) {
    setEditingSubjectId(
      item.id
    );

    setSubjectForm({
      name:
        item.name || "",
      code:
        item.code || "",
      type:
        item.type || "Core",
      theoryMarks:
        String(
          item.theoryMarks ??
            item.maxMarks ??
            100
        ),
      practicalMarks:
        String(
          item.practicalMarks ??
            0
        ),
      internalMarks:
        String(
          item.internalMarks ??
            0
        ),
      projectMarks:
        String(
          item.projectMarks ??
            0
        ),
      passingTheory:
        String(
          item.passingTheory ??
            item.passingMarks ??
            33
        ),
      passingPractical:
        String(
          item.passingPractical ??
            0
        ),
    });

    setActiveTab(
      "subjects"
    );
  }

  async function deleteSubject(
    item
  ) {
    try {
      setSaving(true);

      await deleteDoc(
        doc(
          db,
          "subjects",
          item.id
        )
      );

      const affected =
        distributions.filter(
          (distribution) =>
            distribution.sessionId ===
              selectedSession?.id &&
            Array.isArray(
              distribution.subjectIds
            ) &&
            distribution.subjectIds.includes(
              item.id
            )
        );

      await Promise.all(
        affected.map(
          (distribution) =>
            updateDoc(
              doc(
                db,
                "classSubjects",
                distribution.id
              ),
              {
                subjectIds:
                  distribution.subjectIds.filter(
                    (id) =>
                      id !==
                      item.id
                  ),
                updatedAt:
                  serverTimestamp(),
              }
            )
        )
      );

      await loadAll();

      notify(
        `${item.name} deleted.`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to delete subject."
      );
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  /*
  ============================================================
  ASSESSMENT
  ============================================================
  */

  async function saveAssessment(
    e
  ) {
    e.preventDefault();

    clearNotice();

    if (!selectedSession) {
      setError(
        "Select an academic session first."
      );
      return;
    }

    const name =
      assessmentForm.name.trim();

    if (!name) {
      setError(
        "Enter examination name."
      );
      return;
    }

    const duplicate =
      sessionAssessments.some(
        (item) =>
          item.id !==
            editingAssessmentId &&
          normalize(
            item.name
          ) ===
            normalize(name)
      );

    if (duplicate) {
      setError(
        "This examination already exists."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        type:
          assessmentForm.type,
        weightage:
          Number(
            assessmentForm.weightage
          ) || 0,

        sessionId:
          selectedSession.id,

        sessionName:
          selectedSession.name,

        active: true,

        updatedAt:
          serverTimestamp(),
      };

      if (
        editingAssessmentId
      ) {
        await updateDoc(
          doc(
            db,
            "assessments",
            editingAssessmentId
          ),
          payload
        );

        notify(
          "Examination updated successfully."
        );
      } else {
        await addDoc(
          collection(
            db,
            "assessments"
          ),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );

        notify(
          "Examination created successfully."
        );
      }

      setAssessmentForm(
        EMPTY_ASSESSMENT
      );

      setEditingAssessmentId(
        null
      );

      await loadAll();
    } catch (err) {
      console.error(err);

      setError(
        "Unable to save examination."
      );
    } finally {
      setSaving(false);
    }
  }

  function editAssessment(
    item
  ) {
    setEditingAssessmentId(
      item.id
    );

    setAssessmentForm({
      name:
        item.name || "",
      type:
        item.type || "annual",
      weightage:
        String(
          item.weightage ??
            100
        ),
    });

    setActiveTab(
      "assessments"
    );
  }

  async function deleteAssessment(
    item
  ) {
    try {
      setSaving(true);

      await deleteDoc(
        doc(
          db,
          "assessments",
          item.id
        )
      );

      await loadAll();

      notify(
        "Examination removed."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to remove examination."
      );
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  /*
  ============================================================
  SUBJECT DISTRIBUTION
  ============================================================
  */

  function toggleSubject(
    subjectId
  ) {
    setSelectedSubjects(
      (previous) =>
        previous.includes(
          subjectId
        )
          ? previous.filter(
              (id) =>
                id !==
                subjectId
            )
          : [
              ...previous,
              subjectId,
            ]
    );
  }

  function selectAllSubjects() {
    setSelectedSubjects(
      sessionSubjects.map(
        (item) => item.id
      )
    );
  }

  function clearAllSubjects() {
    setSelectedSubjects([]);
  }

  async function saveDistribution() {
    clearNotice();

    if (!selectedSession) {
      setError(
        "Select an academic session first."
      );
      return;
    }

    if (!selectedClass) {
      setError(
        "Select a class first."
      );
      return;
    }

    if (
      selectedSubjects.length ===
      0
    ) {
      setError(
        "Select at least one subject."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        classId:
          selectedClass.id,

        className:
          selectedClass.name,

        sessionId:
          selectedSession.id,

        sessionName:
          selectedSession.name,

        subjectIds:
          selectedSubjects,

        subjectNames:
          selectedDistributionSubjects.map(
            (item) =>
              item.name
          ),

        updatedAt:
          serverTimestamp(),
      };

      if (
        currentDistribution
      ) {
        await updateDoc(
          doc(
            db,
            "classSubjects",
            currentDistribution.id
          ),
          payload
        );

        notify(
          "Class academic setup updated successfully."
        );
      } else {
        await addDoc(
          collection(
            db,
            "classSubjects"
          ),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );

        notify(
          "Class academic setup saved successfully."
        );
      }

      await loadAll();
    } catch (err) {
      console.error(
        "Distribution save error:",
        err
      );

      setError(
        "Unable to save class academic setup."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  ============================================================
  CLONE PREVIOUS SESSION
  ============================================================
  */

  async function cloneSessionSetup() {
    clearNotice();

    if (!cloneSourceId) {
      setError(
        "Select the session to copy."
      );
      return;
    }

    const targetName =
      cloneTargetName.trim();

    if (!targetName) {
      setError(
        "Enter new academic session name."
      );
      return;
    }

    const source =
      sessions.find(
        (item) =>
          item.id ===
          cloneSourceId
      );

    if (!source) {
      setError(
        "Source session not found."
      );
      return;
    }

    const duplicate =
      sessions.some(
        (item) =>
          normalize(item.name) ===
          normalize(targetName)
      );

    if (duplicate) {
      setError(
        "This target session already exists."
      );
      return;
    }

    try {
      setSaving(true);

      const targetRef =
        await addDoc(
          collection(
            db,
            "academicSessions"
          ),
          {
            name:
              targetName,

            startDate: "",
            endDate: "",

            description:
              `Academic setup copied from ${source.name}`,

            active: false,

            copiedFromSessionId:
              source.id,

            copiedFromSessionName:
              source.name,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

      const sourceClasses =
        classes.filter(
          (item) =>
            item.sessionId ===
            source.id
        );

      const sourceSubjects =
        subjects.filter(
          (item) =>
            item.sessionId ===
            source.id
        );

      const sourceAssessments =
        assessments.filter(
          (item) =>
            item.sessionId ===
            source.id
        );

      const sourceDistributions =
        distributions.filter(
          (item) =>
            item.sessionId ===
            source.id
        );

      const classMap =
        new Map();

      const subjectMap =
        new Map();

      /*
      ----------------------------
      COPY CLASSES
      ----------------------------
      */

      for (
        const item of sourceClasses
      ) {
        const ref =
          await addDoc(
            collection(
              db,
              "classes"
            ),
            {
              name:
                item.name,

              sections:
                item.sections ||
                ["A"],

              capacity:
                item.capacity ||
                0,

              sessionId:
                targetRef.id,

              sessionName:
                targetName,

              copiedFromId:
                item.id,

              createdAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            }
          );

        classMap.set(
          item.id,
          ref.id
        );
      }

      /*
      ----------------------------
      COPY SUBJECTS
      ----------------------------
      */

      for (
        const item of sourceSubjects
      ) {
        const ref =
          await addDoc(
            collection(
              db,
              "subjects"
            ),
            {
              name:
                item.name,

              code:
                item.code,

              type:
                item.type ||
                "Core",

              theoryMarks:
                item.theoryMarks ??
                item.maxMarks ??
                100,

              practicalMarks:
                item.practicalMarks ??
                0,

              internalMarks:
                item.internalMarks ??
                0,

              projectMarks:
                item.projectMarks ??
                0,

              maxMarks:
                item.maxMarks ??
                100,

              passingTheory:
                item.passingTheory ??
                item.passingMarks ??
                33,

              passingPractical:
                item.passingPractical ??
                0,

              passingMarks:
                item.passingMarks ??
                33,

              status:
                "Active",

              sessionId:
                targetRef.id,

              sessionName:
                targetName,

              copiedFromId:
                item.id,

              createdAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            }
          );

        subjectMap.set(
          item.id,
          ref.id
        );
      }

      /*
      ----------------------------
      COPY EXAMS
      ----------------------------
      */

      for (
        const item of sourceAssessments
      ) {
        await addDoc(
          collection(
            db,
            "assessments"
          ),
          {
            name:
              item.name,

            type:
              item.type,

            weightage:
              item.weightage ??
              100,

            active: true,

            sessionId:
              targetRef.id,

            sessionName:
              targetName,

            copiedFromId:
              item.id,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );
      }

      /*
      ----------------------------
      COPY DISTRIBUTION
      ----------------------------
      */

      for (
        const item of sourceDistributions
      ) {
        const newClassId =
          classMap.get(
            item.classId
          );

        if (!newClassId) {
          continue;
        }

        const newSubjectIds =
          (
            item.subjectIds ||
            []
          )
            .map(
              (id) =>
                subjectMap.get(
                  id
                )
            )
            .filter(Boolean);

        await addDoc(
          collection(
            db,
            "classSubjects"
          ),
          {
            classId:
              newClassId,

            className:
              item.className,

            sessionId:
              targetRef.id,

            sessionName:
              targetName,

            subjectIds:
              newSubjectIds,

            subjectNames:
              (
                item.subjectNames ||
                []
              ).filter(Boolean),

            copiedFromId:
              item.id,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );
      }

      await loadAll();

      setSelectedSessionId(
        targetRef.id
      );

      setCloneSourceId("");
      setCloneTargetName("");

      notify(
        `New session "${targetName}" created from ${source.name}.`
      );
    } catch (err) {
      console.error(
        "Session clone error:",
        err
      );

      setError(
        "Unable to clone academic setup."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  ============================================================
  LOADING
  ============================================================
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">

        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-10 text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-50 flex items-center justify-center text-3xl">
            🎓
          </div>

          <div className="w-10 h-10 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mx-auto mt-6" />

          <h2 className="text-xl font-black mt-5">
            Preparing Academic Setup
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            Loading sessions, classes,
            subjects and examinations...
          </p>

        </div>

      </div>
    );
  }

  /*
  ============================================================
  MAIN UI
  ============================================================
  */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

      <div className="max-w-[1500px] mx-auto">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-green-950 via-green-800 to-emerald-700 text-white shadow-xl p-6 md:p-8">

          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/5" />

          <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-7">

            <div>

              <p className="text-green-200 text-xs font-black uppercase tracking-[0.2em]">
                School ERP • Academic Engine
              </p>

              <h1 className="text-3xl md:text-4xl font-black mt-2">
                Academic Configuration
              </h1>

              <p className="text-green-100/80 max-w-2xl mt-3">
                Manage the complete academic
                structure from one place.
                Session, classes, subjects,
                examinations and result setup
                stay connected automatically.
              </p>

            </div>

            <div className="flex flex-col sm:flex-row gap-3">

              <select
                value={
                  selectedSessionId
                }
                onChange={(e) => {
                  setSelectedSessionId(
                    e.target.value
                  );
                  setSelectedClassId("");
                }}
                className="min-w-[230px] bg-white text-slate-800 rounded-xl px-4 py-3 font-bold outline-none"
              >

                <option value="">
                  Select Session
                </option>

                {sessions.map(
                  (session) => (
                    <option
                      key={
                        session.id
                      }
                      value={
                        session.id
                      }
                    >
                      {session.name}
                      {session.active
                        ? " • ACTIVE"
                        : ""}
                    </option>
                  )
                )}

              </select>

              {selectedSession &&
                !selectedSession.active && (
                  <button
                    type="button"
                    onClick={() =>
                      activateSession(
                        selectedSession
                      )
                    }
                    disabled={saving}
                    className="bg-white text-green-800 px-5 py-3 rounded-xl font-black hover:bg-green-50 disabled:opacity-50"
                  >
                    Make Active
                  </button>
                )}

            </div>

          </div>

        </header>

        {/* ====================================================
            ALERT
        ==================================================== */}

        {(message || error) && (
          <div
            className={`mt-5 rounded-2xl border px-5 py-4 font-semibold ${
              error
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {error || message}
          </div>
        )}

        {/* ====================================================
            STATISTICS
        ==================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-5">

          <Stat
            title="Classes"
            value={
              sessionClasses.length
            }
            icon="🏫"
          />

          <Stat
            title="Sections"
            value={
              totalSections
            }
            icon="👥"
          />

          <Stat
            title="Subjects"
            value={
              sessionSubjects.length
            }
            icon="📚"
          />

          <Stat
            title="Exams"
            value={
              sessionAssessments.length
            }
            icon="📝"
          />

          <Stat
            title="Configured Classes"
            value={
              distributedClasses
            }
            icon="⚡"
          />

        </div>

        {/* ====================================================
            NAVIGATION
        ==================================================== */}

        <nav className="mt-5 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex gap-2 overflow-x-auto">

          {[
            [
              "overview",
              "Overview",
              "📊",
            ],
            [
              "sessions",
              "Sessions",
              "📅",
            ],
            [
              "classes",
              "Classes",
              "🏫",
            ],
            [
              "subjects",
              "Subjects",
              "📚",
            ],
            [
              "assessments",
              "Exams",
              "📝",
            ],
            [
              "distribution",
              "Academic Setup",
              "⚡",
            ],
          ].map(
            ([
              id,
              label,
              icon,
            ]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setActiveTab(id)
                }
                className={`whitespace-nowrap px-4 py-3 rounded-xl font-black text-sm transition ${
                  activeTab === id
                    ? "bg-green-700 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {icon} {label}
              </button>
            )
          )}

        </nav>

        {/* ====================================================
            OVERVIEW
        ==================================================== */}

        {activeTab ===
          "overview" && (
          <Overview
            session={
              selectedSession
            }
            progress={
              setupProgress
            }
            stats={{
              classes:
                sessionClasses.length,
              sections:
                totalSections,
              subjects:
                sessionSubjects.length,
              exams:
                sessionAssessments.length,
              configured:
                distributedClasses,
              totalClasses:
                sessionClasses.length,
            }}
            goTo={
              setActiveTab
            }
          />
        )}

        {/* ====================================================
            SESSIONS
        ==================================================== */}

        {activeTab ===
          "sessions" && (
          <SessionManager
            sessions={
              sessions
            }
            form={
              sessionForm
            }
            setForm={
              setSessionForm
            }
            editingId={
              editingSessionId
            }
            saving={
              saving
            }
            onSubmit={
              saveSession
            }
            onEdit={
              editSession
            }
            onCancel={() => {
              setEditingSessionId(
                null
              );
              setSessionForm(
                EMPTY_SESSION
              );
            }}
            onActivate={
              activateSession
            }
            onDelete={(item) =>
              setConfirmAction(
                {
                  title:
                    `Delete ${item.name}?`,
                  text:
                    "This only removes the session record. Review related academic data before deleting.",
                  action:
                    () =>
                      deleteSession(
                        item
                      ),
                }
              )
            }
          />
        )}

        {/* ====================================================
            CLASSES
        ==================================================== */}

        {activeTab ===
          "classes" && (
          <ClassManager
            classes={
              sessionClasses
            }
            form={
              classForm
            }
            setForm={
              setClassForm
            }
            editingId={
              editingClassId
            }
            saving={
              saving
            }
            onSubmit={
              saveClass
            }
            onEdit={
              editClass
            }
            onAddSection={
              addSection
            }
            onRemoveSection={
              removeSection
            }
            onUpdateSection={
              updateSection
            }
            onCancel={() => {
              setEditingClassId(
                null
              );
              setClassForm(
                EMPTY_CLASS
              );
            }}
            onDelete={(item) =>
              setConfirmAction(
                {
                  title:
                    `Delete ${item.name}?`,
                  text:
                    "The class record will be removed.",
                  action:
                    () =>
                      deleteClass(
                        item
                      ),
                }
              )
            }
          />
        )}

        {/* ====================================================
            SUBJECTS
        ==================================================== */}

        {activeTab ===
          "subjects" && (
          <SubjectManager
            subjects={
              filteredSubjects
            }
            allSubjects={
              sessionSubjects
            }
            search={
              subjectSearch
            }
            setSearch={
              setSubjectSearch
            }
            form={
              subjectForm
            }
            setForm={
              setSubjectForm
            }
            editingId={
              editingSubjectId
            }
            saving={
              saving
            }
            onSubmit={
              saveSubject
            }
            onEdit={
              editSubject
            }
            onCancel={() => {
              setEditingSubjectId(
                null
              );
              setSubjectForm(
                EMPTY_SUBJECT
              );
            }}
            onDelete={(item) =>
              setConfirmAction(
                {
                  title:
                    `Delete ${item.name}?`,
                  text:
                    "The subject will also be removed from existing class subject mappings.",
                  action:
                    () =>
                      deleteSubject(
                        item
                      ),
                }
              )
            }
          />
        )}

        {/* ====================================================
            ASSESSMENTS
        ==================================================== */}

        {activeTab ===
          "assessments" && (
          <AssessmentManager
            assessments={
              sessionAssessments
            }
            form={
              assessmentForm
            }
            setForm={
              setAssessmentForm
            }
            editingId={
              editingAssessmentId
            }
            saving={
              saving
            }
            onSubmit={
              saveAssessment
            }
            onEdit={
              editAssessment
            }
            onCancel={() => {
              setEditingAssessmentId(
                null
              );
              setAssessmentForm(
                EMPTY_ASSESSMENT
              );
            }}
            onDelete={(item) =>
              setConfirmAction(
                {
                  title:
                    `Delete ${item.name}?`,
                  text:
                    "This assessment definition will be removed.",
                  action:
                    () =>
                      deleteAssessment(
                        item
                      ),
                }
              )
            }
          />
        )}

        {/* ====================================================
            DISTRIBUTION
        ==================================================== */}

        {activeTab ===
          "distribution" && (
          <DistributionManager
            session={
              selectedSession
            }
            classes={
              sessionClasses
            }
            subjects={
              sessionSubjects
            }
            selectedClassId={
              selectedClassId
            }
            setSelectedClassId={
              setSelectedClassId
            }
            selectedSubjects={
              selectedSubjects
            }
            setSelectedSubjects={
              setSelectedSubjects
            }
            toggleSubject={
              toggleSubject
            }
            selectAll={
              selectAllSubjects
            }
            clearAll={
              clearAllSubjects
            }
            save={
              saveDistribution
            }
            saving={
              saving
            }
            current={
              currentDistribution
            }
            distributions={
              distributions.filter(
                (item) =>
                  item.sessionId ===
                  selectedSession?.id
              )
            }
            sessions={
              sessions
            }
            cloneSourceId={
              cloneSourceId
            }
            setCloneSourceId={
              setCloneSourceId
            }
            cloneTargetName={
              cloneTargetName
            }
            setCloneTargetName={
              setCloneTargetName
            }
            cloneSetup={
              cloneSessionSetup
            }
          />
        )}

      </div>

      {/* ======================================================
          CONFIRM MODAL
      ====================================================== */}

      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.title
          }
          text={
            confirmAction.text
          }
          saving={
            saving
          }
          onCancel={() =>
            setConfirmAction(
              null
            )
          }
          onConfirm={
            confirmAction.action
          }
        />
      )}

    </div>
  );
}

/*
============================================================
OVERVIEW
============================================================
*/

function Overview({
  session,
  progress,
  stats,
  goTo,
}) {
  const steps = [
    [
      "sessions",
      "Academic Session",
      "Create or activate the academic year.",
      true,
      "📅",
    ],
    [
      "classes",
      "Classes & Sections",
      "Create classes and their sections.",
      stats.classes > 0,
      "🏫",
    ],
    [
      "subjects",
      "Subjects",
      "Create the subjects available in this session.",
      stats.subjects > 0,
      "📚",
    ],
    [
      "assessments",
      "Examinations",
      "Create the exams used by the result workflow.",
      stats.exams > 0,
      "📝",
    ],
    [
      "distribution",
      "Class Academic Setup",
      "Assign the right subjects to every class.",
      stats.totalClasses > 0 &&
        stats.configured >= stats.totalClasses,
      "⚡",
    ],
  ];

  const nextStep =
    steps.find((step) => !step[3]);

  return (
    <div className="mt-6 space-y-6">

      {/* ====================================================
          GUIDED SETUP HEADER
      ==================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-800 to-emerald-700 text-white rounded-3xl p-6 md:p-8 shadow-xl">

        <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-white/5" />
        <div className="absolute -left-20 -bottom-24 w-64 h-64 rounded-full bg-emerald-400/10" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">

          <div className="max-w-3xl">

            <p className="text-green-200 text-xs font-black uppercase tracking-[0.2em]">
              Simple Setup Wizard
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-2">
              Build your academic structure step by step
            </h2>

            <p className="text-green-100/80 mt-3 leading-6">
              Follow the sequence below. Every item is connected to the
              selected academic session, so you do not need to configure
              the same information repeatedly.
            </p>

            {session && (
              <div className="flex flex-wrap gap-2 mt-5">

                <span className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-sm font-black">
                  📅 {session.name}
                </span>

                {session.active && (
                  <span className="px-3 py-2 rounded-xl bg-emerald-400/20 border border-emerald-300/20 text-sm font-black">
                    ✓ Active Session
                  </span>
                )}

              </div>
            )}

          </div>

          <div className="w-full lg:w-64 bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">

            <div className="flex items-end justify-between">

              <div>
                <p className="text-xs text-green-200 font-bold">
                  Overall setup
                </p>

                <p className="text-4xl font-black mt-1">
                  {progress}%
                </p>
              </div>

              <span className="text-3xl">
                {progress === 100 ? "🎉" : "🚀"}
              </span>

            </div>

            <div className="h-2.5 bg-black/20 rounded-full overflow-hidden mt-4">

              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        </div>

      </section>

      {/* ====================================================
          NEXT ACTION
      ==================================================== */}

      {nextStep && (
        <section className="bg-white border border-green-200 rounded-3xl p-5 md:p-6 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div className="flex items-start gap-4">

              <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center text-2xl shrink-0">
                {nextStep[4]}
              </div>

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-green-700">
                  Recommended next step
                </p>

                <h3 className="text-xl font-black mt-1">
                  {nextStep[1]}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {nextStep[2]}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => goTo(nextStep[0])}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-black shadow-sm"
            >
              Continue →
            </button>

          </div>

        </section>
      )}

      {/* ====================================================
          SETUP STEPS
      ==================================================== */}

      <section>

        <div className="flex items-end justify-between gap-4 mb-4">

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Setup sequence
            </p>

            <h3 className="text-2xl font-black mt-1">
              Configure in this order
            </h3>

          </div>

          <p className="hidden md:block text-sm text-slate-500">
            Green = ready • Gray = needs setup
          </p>

        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">

          {steps.map(
            ([
              id,
              title,
              description,
              done,
              icon,
            ], index) => (
              <button
                key={id}
                type="button"
                onClick={() => goTo(id)}
                className={`relative text-left rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition ${
                  done
                    ? "bg-white border-green-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >

                {index < steps.length - 1 && (
                  <span className="hidden xl:block absolute top-10 -right-3 z-10 text-slate-300 text-xl">
                    →
                  </span>
                )}

                <div className="flex items-center justify-between">

                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-xl ${
                      done
                        ? "bg-green-600 text-white"
                        : "bg-white text-slate-500 border border-slate-200"
                    }`}
                  >
                    {done ? "✓" : icon}
                  </div>

                  <span className="text-xs font-black text-slate-400">
                    STEP {index + 1}
                  </span>

                </div>

                <h4 className="font-black mt-4">
                  {title}
                </h4>

                <p className="text-xs text-slate-500 mt-1 leading-5">
                  {description}
                </p>

                <div className="mt-4">

                  <Badge
                    text={done ? "Ready" : "Needs setup"}
                    green={done}
                  />

                </div>

              </button>
            )
          )}

        </div>

      </section>

      {/* ====================================================
          LIVE SUMMARY
      ==================================================== */}

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">

        <Stat
          title="Classes"
          value={stats.classes}
          icon="🏫"
        />

        <Stat
          title="Sections"
          value={stats.sections}
          icon="👥"
        />

        <Stat
          title="Subjects"
          value={stats.subjects}
          icon="📚"
        />

        <Stat
          title="Exams"
          value={stats.exams}
          icon="📝"
        />

        <Stat
          title="Configured"
          value={
            `${stats.configured}/${stats.totalClasses || 0}`
          }
          icon="⚡"
        />

      </section>

      {/* ====================================================
          HELP CARD
      ==================================================== */}

      <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

        <div className="flex items-start gap-4">

          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl shrink-0">
            💡
          </div>

          <div>

            <h3 className="font-black text-lg">
              How the setup connects
            </h3>

            <p className="text-sm text-slate-500 mt-1 leading-6">
              First create the session, then classes and subjects. After that
              create examinations and finally assign subjects class-wise.
              Teachers, attendance and result workflows can then use these
              dynamic assignments instead of hard-coded classes or subjects.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}

/*
============================================================
SESSION MANAGER
============================================================
*/


function SessionManager({
  sessions,
  form,
  setForm,
  editingId,
  saving,
  onSubmit,
  onEdit,
  onCancel,
  onActivate,
  onDelete,
}) {
  return (
    <div className="mt-6 space-y-6">

      <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

        <h2 className="text-2xl font-black">
          {editingId
            ? "Edit Academic Session"
            : "Create Academic Session"}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Session is the master academic context.
        </p>

        <form
          onSubmit={
            onSubmit
          }
          className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6"
        >

          <Field
            id="session-name"
            label="Session Name"
            placeholder="2026-27"
            value={
              form.name
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  name: value,
                })
              )
            }
          />

          <Field
            id="session-start"
            label="Start Date"
            type="date"
            value={
              form.startDate
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  startDate:
                    value,
                })
              )
            }
          />

          <Field
            id="session-end"
            label="End Date"
            type="date"
            value={
              form.endDate
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  endDate:
                    value,
                })
              )
            }
          />

          <Field
            id="session-description"
            label="Description"
            placeholder="Academic Year"
            value={
              form.description
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  description:
                    value,
                })
              )
            }
          />

          {!editingId && (
            <label className="md:col-span-2 xl:col-span-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 cursor-pointer">

              <input
                type="checkbox"
                checked={
                  form.makeActive ===
                  true
                }
                onChange={(e) =>
                  setForm(
                    (old) => ({
                      ...old,
                      makeActive:
                        e.target
                          .checked,
                    })
                  )
                }
                className="w-5 h-5"
              />

              <div>

                <p className="font-black">
                  Make this the active session
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Previous active session will become inactive.
                </p>

              </div>

            </label>
          )}

          <div className="md:col-span-2 xl:col-span-4 flex justify-end gap-3">

            {editingId && (
              <button
                type="button"
                onClick={
                  onCancel
                }
                className="px-5 py-3 rounded-xl bg-slate-100 font-bold"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving
              }
              className="px-6 py-3 rounded-xl bg-green-700 text-white font-black disabled:bg-slate-400"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Session"
                : "Create Session"}
            </button>

          </div>

        </form>

      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

        {sessions.length ===
        0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Empty
              title="No academic sessions"
              text="Create your first academic session."
            />
          </div>
        ) : (
          sessions.map(
            (session) => (
              <div
                key={
                  session.id
                }
                className={`bg-white border rounded-3xl p-5 shadow-sm ${
                  session.active
                    ? "border-green-400 ring-2 ring-green-50"
                    : "border-slate-200"
                }`}
              >

                <div className="flex justify-between gap-3">

                  <div>

                    <h3 className="text-xl font-black">
                      {
                        session.name
                      }
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {
                        session.description ||
                        "Academic Year"
                      }
                    </p>

                  </div>

                  <span
                    className={`px-3 py-1 rounded-full h-fit text-xs font-black ${
                      session.active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {session.active
                      ? "ACTIVE"
                      : "INACTIVE"}
                  </span>

                </div>

                <div className="mt-5 space-y-2 text-sm">

                  <InfoLine
                    label="Start"
                    value={formatDate(
                      session.startDate
                    )}
                  />

                  <InfoLine
                    label="End"
                    value={formatDate(
                      session.endDate
                    )}
                  />

                  <InfoLine
                    label="Progress"
                    value={`${getProgress(
                      session.startDate,
                      session.endDate
                    )}%`}
                  />

                </div>

                <div className="flex gap-2 mt-5">

                  {!session.active && (
                    <button
                      type="button"
                      onClick={() =>
                        onActivate(
                          session
                        )
                      }
                      className="flex-1 bg-green-50 text-green-700 rounded-xl py-2.5 font-black"
                    >
                      Activate
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onEdit(
                        session
                      )
                    }
                    className="flex-1 bg-slate-100 rounded-xl py-2.5 font-black"
                  >
                    Edit
                  </button>

                  {!session.active && (
                    <button
                      type="button"
                      onClick={() =>
                        onDelete(
                          session
                        )
                      }
                      className="px-4 bg-red-50 text-red-600 rounded-xl font-black"
                    >
                      Delete
                    </button>
                  )}

                </div>

              </div>
            )
          )
        )}

      </section>

    </div>
  );
}

/*
============================================================
CLASS MANAGER
============================================================
*/

function ClassManager({
  classes,
  form,
  setForm,
  editingId,
  saving,
  onSubmit,
  onEdit,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  onCancel,
  onDelete,
}) {
  return (
    <div className="mt-6 space-y-6">

      <section className="bg-white border rounded-3xl p-6 shadow-sm">

        <h2 className="text-2xl font-black">
          {editingId
            ? "Edit Class"
            : "Classes & Sections"}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Define class structure for the selected session.
        </p>

        <form
          onSubmit={
            onSubmit
          }
          className="mt-6"
        >

          <div className="grid lg:grid-cols-3 gap-4">

            <Field
              id="class-name"
              label="Class Name"
              placeholder="Class 10"
              value={
                form.name
              }
              onChange={(value) =>
                setForm(
                  (old) => ({
                    ...old,
                    name: value,
                  })
                )
              }
            />

            <Field
              id="class-capacity"
              label="Capacity / Section"
              type="number"
              placeholder="40"
              value={
                form.capacity
              }
              onChange={(value) =>
                setForm(
                  (old) => ({
                    ...old,
                    capacity:
                      value,
                  })
                )
              }
            />

            <div>

              <label className="block text-sm font-black mb-2">
                Sections
              </label>

              <div className="space-y-2">

                {form.sections.map(
                  (
                    section,
                    index
                  ) => (
                    <div
                      key={`${index}-${section}`}
                      className="flex gap-2"
                    >

                      <input
                        value={
                          section
                        }
                        onChange={(
                          e
                        ) =>
                          onUpdateSection(
                            index,
                            e.target
                              .value
                          )
                        }
                        className="flex-1 border rounded-xl px-4 py-3 uppercase outline-none focus:ring-2 focus:ring-green-500"
                      />

                      {form.sections
                        .length >
                        1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveSection(
                              index
                            )
                          }
                          className="px-4 rounded-xl bg-red-50 text-red-600 font-black"
                        >
                          ×
                        </button>
                      )}

                    </div>
                  )
                )}

                <button
                  type="button"
                  onClick={
                    onAddSection
                  }
                  className="text-sm text-green-700 font-black"
                >
                  + Add Section
                </button>

              </div>

            </div>

          </div>

          <div className="flex justify-end gap-3 mt-5">

            {editingId && (
              <button
                type="button"
                onClick={
                  onCancel
                }
                className="px-5 py-3 rounded-xl bg-slate-100 font-black"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving
              }
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-black disabled:bg-slate-400"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Class"
                : "Create Class"}
            </button>

          </div>

        </form>

      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

        {classes.length ===
        0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Empty
              title="No classes"
              text="Create classes for this academic session."
            />
          </div>
        ) : (
          classes.map(
            (item) => (
              <div
                key={
                  item.id
                }
                className="bg-white border rounded-3xl p-5 shadow-sm"
              >

                <div className="flex justify-between">

                  <div>

                    <h3 className="text-xl font-black">
                      {
                        item.name
                      }
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      Capacity:{" "}
                      {
                        item.capacity ||
                        "Not set"
                      }
                    </p>

                  </div>

                  <span className="text-2xl">
                    🏫
                  </span>

                </div>

                <div className="flex flex-wrap gap-2 mt-5">

                  {(
                    item.sections ||
                    []
                  ).map(
                    (section) => (
                      <span
                        key={
                          section
                        }
                        className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-black"
                      >
                        Section{" "}
                        {section}
                      </span>
                    )
                  )}

                </div>

                <div className="flex gap-2 mt-5">

                  <button
                    type="button"
                    onClick={() =>
                      onEdit(
                        item
                      )
                    }
                    className="flex-1 bg-blue-50 text-blue-700 rounded-xl py-2.5 font-black text-sm"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(
                        item
                      )
                    }
                    className="flex-1 bg-red-50 text-red-600 rounded-xl py-2.5 font-black text-sm"
                  >
                    Delete
                  </button>

                </div>

              </div>
            )
          )
        )}

      </section>

    </div>
  );
}

/*
============================================================
SUBJECT MANAGER
============================================================
*/

function SubjectManager({
  subjects,
  allSubjects,
  search,
  setSearch,
  form,
  setForm,
  editingId,
  saving,
  onSubmit,
  onEdit,
  onCancel,
  onDelete,
}) {
  const total =
    Number(
      form.theoryMarks
    ) +
    Number(
      form.practicalMarks
    ) +
    Number(
      form.internalMarks
    ) +
    Number(
      form.projectMarks
    );

  return (
    <div className="mt-6 space-y-6">

      <section className="bg-white border rounded-3xl p-6 shadow-sm">

        <div className="flex flex-col md:flex-row md:justify-between gap-4">

          <div>

            <h2 className="text-2xl font-black">
              {editingId
                ? "Edit Subject"
                : "Subject Management"}
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Theory + Practical + Internal + Project structure.
            </p>

          </div>

          <div className="bg-green-50 text-green-700 rounded-xl px-5 py-3 font-black">
            Total:{" "}
            {total}
          </div>

        </div>

        <form
          onSubmit={
            onSubmit
          }
          className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6"
        >

          <Field
            id="subject-name"
            label="Subject Name"
            placeholder="Mathematics"
            value={
              form.name
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  name: value,
                })
              )
            }
          />

          <Field
            id="subject-code"
            label="Subject Code"
            placeholder="MATH101"
            value={
              form.code
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  code:
                    value.toUpperCase(),
                })
              )
            }
          />

          <SelectField
            id="subject-type"
            label="Subject Type"
            value={
              form.type
            }
            options={
              SUBJECT_TYPES
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  type: value,
                })
              )
            }
          />

          <Field
            id="subject-theory"
            label="Theory Maximum"
            type="number"
            min="0"
            value={
              form.theoryMarks
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  theoryMarks:
                    value,
                })
              )
            }
          />

          <Field
            id="subject-practical"
            label="Practical Maximum"
            type="number"
            min="0"
            value={
              form.practicalMarks
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  practicalMarks:
                    value,
                })
              )
            }
          />

          <Field
            id="subject-internal"
            label="Internal Maximum"
            type="number"
            min="0"
            value={
              form.internalMarks
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  internalMarks:
                    value,
                })
              )
            }
          />

          <Field
            id="subject-project"
            label="Project Maximum"
            type="number"
            min="0"
            value={
              form.projectMarks
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  projectMarks:
                    value,
                })
              )
            }
          />

          <Field
            id="subject-pass-theory"
            label="Theory Passing"
            type="number"
            min="0"
            value={
              form.passingTheory
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  passingTheory:
                    value,
                })
              )
            }
          />

          <Field
            id="subject-pass-practical"
            label="Practical Passing"
            type="number"
            min="0"
            value={
              form.passingPractical
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  passingPractical:
                    value,
                })
              )
            }
          />

          <div className="md:col-span-2 xl:col-span-4 bg-slate-50 border rounded-2xl p-4">

            <p className="font-black">
              Assessment Structure
            </p>

            <div className="flex flex-wrap gap-2 mt-3">

              <Badge
                text={`Theory ${form.theoryMarks || 0}`}
              />

              <Badge
                text={`Practical ${form.practicalMarks || 0}`}
              />

              <Badge
                text={`Internal ${form.internalMarks || 0}`}
              />

              <Badge
                text={`Project ${form.projectMarks || 0}`}
              />

              <Badge
                text={`Total ${total}`}
                green
              />

            </div>

          </div>

          <div className="md:col-span-2 xl:col-span-4 flex justify-end gap-3">

            {editingId && (
              <button
                type="button"
                onClick={
                  onCancel
                }
                className="px-5 py-3 rounded-xl bg-slate-100 font-black"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving
              }
              className="px-6 py-3 rounded-xl bg-green-700 text-white font-black disabled:bg-slate-400"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Subject"
                : "Add Subject"}
            </button>

          </div>

        </form>

      </section>

      <section className="bg-white border rounded-3xl p-6 shadow-sm">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>

            <h2 className="text-2xl font-black">
              Subject Library
            </h2>

            <p className="text-sm text-slate-500">
              {
                allSubjects.length
              }{" "}
              subjects configured.
            </p>

          </div>

          <input
            id="subject-search"
            type="search"
            value={
              search
            }
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search subject or code..."
            className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 w-full md:w-80"
          />

        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">

          {subjects.map(
            (subject) => (
              <div
                key={
                  subject.id
                }
                className="border rounded-2xl p-5 hover:shadow-md transition"
              >

                <div className="flex justify-between">

                  <div>

                    <h3 className="font-black text-lg">
                      {
                        subject.name
                      }
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      {
                        subject.code
                      }{" "}
                      •{" "}
                      {
                        subject.type
                      }
                    </p>

                  </div>

                  <span className="text-2xl">
                    📚
                  </span>

                </div>

                <div className="flex flex-wrap gap-2 mt-4">

                  <Badge
                    text={`Total ${
                      subject.maxMarks ||
                      0
                    }`}
                  />

                  <Badge
                    text={`Theory ${
                      subject.theoryMarks ||
                      0
                    }`}
                  />

                  {Number(
                    subject.practicalMarks
                  ) >
                    0 && (
                    <Badge
                      text={`Practical ${subject.practicalMarks}`}
                    />
                  )}

                </div>

                <div className="flex gap-2 mt-5">

                  <button
                    type="button"
                    onClick={() =>
                      onEdit(
                        subject
                      )
                    }
                    className="flex-1 bg-blue-50 text-blue-700 rounded-xl py-2.5 font-black"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(
                        subject
                      )
                    }
                    className="flex-1 bg-red-50 text-red-600 rounded-xl py-2.5 font-black"
                  >
                    Delete
                  </button>

                </div>

              </div>
            )
          )}

        </div>

        {subjects.length ===
          0 && (
          <div className="mt-5">
            <Empty
              title="No subjects found"
              text="Add a subject or change your search."
            />
          </div>
        )}

      </section>

    </div>
  );
}

/*
============================================================
ASSESSMENT MANAGER
============================================================
*/

function AssessmentManager({
  assessments,
  form,
  setForm,
  editingId,
  saving,
  onSubmit,
  onEdit,
  onCancel,
  onDelete,
}) {
  return (
    <div className="mt-6 space-y-6">

      <section className="bg-white border rounded-3xl p-6 shadow-sm">

        <h2 className="text-2xl font-black">
          {editingId
            ? "Edit Examination"
            : "Examination Setup"}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Configure Unit Test, Mid Term,
          Half Yearly, Practical and Annual exams.
        </p>

        <div className="flex flex-wrap gap-2 mt-5">

          {EXAM_TYPES.map(
            (item) => (
              <button
                type="button"
                key={
                  item.key
                }
                onClick={() =>
                  setForm(
                    (old) => ({
                      ...old,
                      name:
                        item.name,
                      type:
                        item.key,
                    })
                  )
                }
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-green-50 hover:text-green-700 text-xs font-black"
              >
                {item.icon}{" "}
                {item.name}
              </button>
            )
          )}

        </div>

        <form
          onSubmit={
            onSubmit
          }
          className="grid md:grid-cols-3 gap-4 mt-6"
        >

          <Field
            id="assessment-name"
            label="Exam Name"
            placeholder="Annual Examination"
            value={
              form.name
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  name: value,
                })
              )
            }
          />

          <SelectField
            id="assessment-type"
            label="Exam Type"
            value={
              form.type
            }
            options={EXAM_TYPES.map(
              (item) =>
                item.key
            )}
            labels={Object.fromEntries(
              EXAM_TYPES.map(
                (item) => [
                  item.key,
                  `${item.icon} ${item.name}`,
                ]
              )
            )}
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  type: value,
                })
              )
            }
          />

          <Field
            id="assessment-weightage"
            label="Weightage %"
            type="number"
            min="0"
            max="100"
            value={
              form.weightage
            }
            onChange={(value) =>
              setForm(
                (old) => ({
                  ...old,
                  weightage:
                    value,
                })
              )
            }
          />

          <div className="md:col-span-3 flex justify-end gap-3">

            {editingId && (
              <button
                type="button"
                onClick={
                  onCancel
                }
                className="px-5 py-3 rounded-xl bg-slate-100 font-black"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving
              }
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-black disabled:bg-slate-400"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Exam"
                : "Create Exam"}
            </button>

          </div>

        </form>

      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">

        {assessments.length ===
        0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Empty
              title="No examinations"
              text="Create an examination to use it in the result workflow."
            />
          </div>
        ) : (
          assessments.map(
            (item) => {
              const type =
                EXAM_TYPES.find(
                  (x) =>
                    x.key ===
                    item.type
                );

              return (
                <div
                  key={
                    item.id
                  }
                  className="bg-white border rounded-2xl p-5 shadow-sm"
                >

                  <div className="flex justify-between">

                    <div>

                      <h3 className="font-black text-lg">
                        {
                          item.name
                        }
                      </h3>

                      <p className="text-sm text-slate-500 mt-1">
                        {
                          type?.name ||
                          item.type
                        }
                      </p>

                    </div>

                    <span className="text-2xl">
                      {
                        type?.icon ||
                        "📝"
                      }
                    </span>

                  </div>

                  <div className="mt-4">
                    <Badge
                      text={`Weightage ${
                        item.weightage ||
                        0
                      }%`}
                      green
                    />
                  </div>

                  <div className="flex gap-2 mt-5">

                    <button
                      type="button"
                      onClick={() =>
                        onEdit(
                          item
                        )
                      }
                      className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-xl font-black"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onDelete(
                          item
                        )
                      }
                      className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl font-black"
                    >
                      Delete
                    </button>

                  </div>

                </div>
              );
            }
          )
        )}

      </section>

    </div>
  );
}

/*
============================================================
DISTRIBUTION MANAGER
============================================================
*/

function DistributionManager({
  session,
  classes,
  subjects,
  selectedClassId,
  setSelectedClassId,
  selectedSubjects,
  setSelectedSubjects,
  toggleSubject,
  selectAll,
  clearAll,
  save,
  saving,
  current,
  distributions,
  sessions,
  cloneSourceId,
  setCloneSourceId,
  cloneTargetName,
  setCloneTargetName,
  cloneSetup,
}) {
  const [subjectSearch, setSubjectSearch] = useState("");

  const selectedClass =
    classes.find(
      (item) =>
        item.id === selectedClassId
    ) || null;

  const filteredSubjects = useMemo(() => {
    const query = normalize(subjectSearch);

    if (!query) return subjects;

    return subjects.filter(
      (subject) =>
        normalize(subject.name).includes(query) ||
        normalize(subject.code).includes(query) ||
        normalize(subject.type).includes(query)
    );
  }, [subjects, subjectSearch]);

  const selectedSubjectRecords = subjects.filter(
    (subject) =>
      selectedSubjects.includes(subject.id)
  );

  const allVisibleSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((subject) =>
      selectedSubjects.includes(subject.id)
    );

  const classSetupStatus = classes.map((item) => {
    const mapping =
      distributions.find(
        (distribution) =>
          distribution.classId === item.id
      ) || null;

    const count = Array.isArray(mapping?.subjectIds)
      ? mapping.subjectIds.length
      : 0;

    return {
      ...item,
      mapping,
      subjectCount: count,
    };
  });

  const configuredClassCount =
    classSetupStatus.filter(
      (item) => item.subjectCount > 0
    ).length;

  return (
    <div className="mt-6 space-y-6">

      {/* ====================================================
          SETUP HEADER
      ==================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-r from-purple-950 via-indigo-900 to-blue-800 text-white rounded-3xl p-6 md:p-8 shadow-xl">

        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div className="max-w-3xl">

            <p className="text-purple-200 text-xs font-black uppercase tracking-[0.2em]">
              Step 5 • Final Academic Mapping
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-2">
              Assign Subjects to Classes
            </h2>

            <p className="text-purple-100/80 mt-3 leading-6">
              Select a class, choose the subjects taught in that class,
              review the selection and save. This mapping becomes the
              source for the teacher, attendance and result workflows.
            </p>

          </div>

          <div className="bg-white/10 border border-white/10 rounded-2xl p-5 min-w-[210px]">

            <p className="text-xs text-purple-200 font-bold">
              Current Session
            </p>

            <p className="text-2xl font-black mt-1">
              {session?.name || "Not selected"}
            </p>

            {selectedClass && (
              <p className="text-sm text-purple-100 mt-2">
                Editing: <b>{selectedClass.name}</b>
              </p>
            )}

          </div>

        </div>

      </section>

      {/* ====================================================
          QUICK INSTRUCTIONS
      ==================================================== */}

      <section className="grid md:grid-cols-3 gap-4">

        {[
          ["1", "Choose class", "Select the class whose subjects you want to configure."],
          ["2", "Choose subjects", "Tick only the subjects actually taught to that class."],
          ["3", "Save setup", "Save once. Existing mapping will be updated instead of duplicated."],
        ].map(([number, title, text]) => (
          <div
            key={number}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
          >

            <div className="flex items-start gap-3">

              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black shrink-0">
                {number}
              </div>

              <div>
                <h3 className="font-black">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-5">
                  {text}
                </p>
              </div>

            </div>

          </div>
        ))}

      </section>

      {/* ====================================================
          CLASS SELECTOR
      ==================================================== */}

      <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

        <div className="flex flex-col lg:flex-row lg:items-end gap-5">

          <div className="flex-1">

            <label
              htmlFor="distribution-class"
              className="block text-sm font-black text-slate-700 mb-2"
            >
              1. Select Class
            </label>

            <select
              id="distribution-class"
              value={selectedClassId}
              onChange={(e) =>
                setSelectedClassId(e.target.value)
              }
              className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 font-bold"
            >

              <option value="">
                Select class...
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                  {" • "}
                  {(item.sections || []).join(", ")}
                </option>
              ))}

            </select>

          </div>

          <div className="lg:w-64">

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">

              <p className="text-xs text-slate-500 font-bold">
                Classes available
              </p>

              <p className="text-xl font-black mt-1">
                {classSetupStatus.length}
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* ====================================================
          ALL CLASS SETUP STATUS
      ==================================================== */}

      {classSetupStatus.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

            <div>
              <p className="text-xs text-purple-700 font-black uppercase tracking-wider">
                Live Setup Status
              </p>

              <h3 className="text-xl font-black mt-1">
                Class-wise subject assignment
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Quickly see which classes are configured before opening one.
              </p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-sm font-black">
              {configuredClassCount}/{classSetupStatus.length} configured
            </div>

          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-5">

            {classSetupStatus.map((item) => {
              const configured = item.subjectCount > 0;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedClassId(item.id)}
                  className={`text-left rounded-2xl border p-4 transition ${
                    selectedClassId === item.id
                      ? "border-purple-500 bg-purple-50 ring-2 ring-purple-100"
                      : configured
                      ? "border-green-200 bg-green-50/50 hover:border-green-300"
                      : "border-slate-200 hover:border-purple-200 hover:bg-slate-50"
                  }`}
                >

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <p className="font-black">
                        {item.name}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {(item.sections || []).join(", ") || "No sections"}
                      </p>
                    </div>

                    <span
                      className={`text-xs px-2 py-1 rounded-lg font-black ${
                        configured
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {configured ? "Ready" : "Pending"}
                    </span>

                  </div>

                  <p className="text-sm font-bold mt-4">
                    {item.subjectCount}{" "}
                    {item.subjectCount === 1 ? "subject" : "subjects"} assigned
                  </p>

                </button>
              );
            })}

          </div>

        </section>
      )}

      {selectedClass && (
        <>

          {/* ==================================================
              SELECTED CLASS SUMMARY
          ================================================== */}

          <section className="bg-white border border-purple-200 rounded-3xl p-6 shadow-sm">

            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

              <div>

                <p className="text-xs text-purple-700 font-black uppercase tracking-wider">
                  2. Configuring Class
                </p>

                <h2 className="text-3xl font-black mt-1">
                  {selectedClass.name}
                </h2>

                <div className="flex flex-wrap gap-2 mt-3">

                  <Badge
                    text={`Sections ${(selectedClass.sections || []).join(", ") || "—"}`}
                  />

                  <Badge
                    text={`Capacity ${selectedClass.capacity || 0}`}
                  />

                  <Badge
                    text={`${selectedSubjects.length} subjects assigned`}
                    green={selectedSubjects.length > 0}
                  />

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 min-w-[260px]">

                <div className="bg-purple-50 rounded-2xl p-4">
                  <p className="text-xs text-purple-600 font-bold">
                    Available
                  </p>
                  <p className="text-2xl font-black text-purple-800 mt-1">
                    {subjects.length}
                  </p>
                </div>

                <div className="bg-green-50 rounded-2xl p-4">
                  <p className="text-xs text-green-600 font-bold">
                    Selected
                  </p>
                  <p className="text-2xl font-black text-green-800 mt-1">
                    {selectedSubjects.length}
                  </p>
                </div>

              </div>

            </div>

          </section>

          {/* ==================================================
              SUBJECT PICKER
          ================================================== */}

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <div>

                <p className="text-xs text-purple-700 font-black uppercase tracking-wider">
                  3. Choose Subjects
                </p>

                <h3 className="text-2xl font-black mt-1">
                  Subjects taught in {selectedClass.name}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Search by subject name, code or type and tick the subjects
                  that belong to this class.
                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={selectAll}
                  className="px-4 py-2.5 rounded-xl bg-green-50 text-green-700 font-black text-sm hover:bg-green-100"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={clearAll}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-black text-sm hover:bg-red-100"
                >
                  Clear All
                </button>

              </div>

            </div>

            <div className="mt-5">

              <div className="relative">

                <input
                  id="academic-subject-search"
                  type="search"
                  value={subjectSearch}
                  onChange={(e) =>
                    setSubjectSearch(e.target.value)
                  }
                  placeholder="Search subject name, code or type..."
                  className="w-full border border-slate-300 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                />

                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>

              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">

              <p className="text-sm text-slate-500">
                Showing <b>{filteredSubjects.length}</b> of{" "}
                <b>{subjects.length}</b> subjects
              </p>

              <p className="text-sm font-black text-purple-700">
                {selectedSubjects.length} selected
              </p>

            </div>

            {filteredSubjects.length === 0 ? (
              <div className="mt-5">
                <Empty
                  title="No matching subjects"
                  text={
                    subjects.length === 0
                      ? "Create subjects first in the Subjects section."
                      : "Try a different subject name, code or type."
                  }
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-5">

                {filteredSubjects.map((subject) => {
                  const active =
                    selectedSubjects.includes(subject.id);

                  return (
                    <button
                      type="button"
                      key={subject.id}
                      onClick={() =>
                        toggleSubject(subject.id)
                      }
                      aria-pressed={active}
                      className={`text-left border rounded-2xl p-4 transition ${
                        active
                          ? "border-purple-500 bg-purple-50 ring-2 ring-purple-100"
                          : "border-slate-200 hover:border-purple-200 hover:bg-slate-50"
                      }`}
                    >

                      <div className="flex justify-between gap-3">

                        <div className="min-w-0">

                          <p className="font-black truncate">
                            {active ? "✓ " : "○ "}
                            {subject.name}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            {subject.code || "No code"}
                          </p>

                        </div>

                        <span className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 h-fit shrink-0">
                          {subject.type || "Core"}
                        </span>

                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">

                        <Badge
                          text={`Total ${subject.maxMarks || 0}`}
                        />

                        {Number(subject.practicalMarks) > 0 && (
                          <Badge
                            text={`Practical ${subject.practicalMarks}`}
                          />
                        )}

                      </div>

                    </button>
                  );
                })}

              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-slate-100">

              <button
                type="button"
                onClick={() => {
                  const visibleIds =
                    filteredSubjects.map(
                      (subject) => subject.id
                    );

                  if (allVisibleSelected) {
                    setSelectedSubjects(
                      (previous) =>
                        previous.filter(
                          (id) =>
                            !visibleIds.includes(id)
                        )
                    );
                  } else {
                    setSelectedSubjects(
                      (previous) =>
                        Array.from(
                          new Set([
                            ...previous,
                            ...visibleIds,
                          ])
                        )
                    );
                  }
                }}
                className="text-sm font-black text-purple-700"
              >
                {allVisibleSelected
                  ? "Unselect visible"
                  : "Select visible"}
              </button>

              <span className="text-xs text-slate-400">
                Tip: search first, then select or unselect only the visible subjects.
              </span>

            </div>

          </section>

          {/* ==================================================
              REVIEW
          ================================================== */}

          <section className="bg-white border border-green-200 rounded-3xl p-6 shadow-sm">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>

                <p className="text-xs text-green-700 font-black uppercase tracking-wider">
                  4. Review & Save
                </p>

                <h3 className="text-2xl font-black mt-1">
                  {selectedClass.name} Academic Setup
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Review the selected subjects before saving.
                </p>

              </div>

              <div className="flex items-center gap-3">

                <div className="text-right">

                  <p className="text-xs text-slate-500">
                    Selected
                  </p>

                  <p className="text-2xl font-black text-green-700">
                    {selectedSubjects.length}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={save}
                  disabled={
                    saving ||
                    selectedSubjects.length === 0
                  }
                  className="bg-green-700 hover:bg-green-800 text-white px-7 py-3 rounded-xl font-black disabled:bg-slate-400 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving
                    ? "Saving..."
                    : current
                    ? "Update Academic Setup"
                    : "Save Academic Setup"}
                </button>

              </div>

            </div>

            {selectedSubjectRecords.length === 0 ? (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-semibold">
                Select at least one subject before saving this class.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-5">

                {selectedSubjectRecords.map((subject, index) => (
                  <div
                    key={subject.id}
                    className="border border-green-100 bg-green-50/60 rounded-2xl p-4"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <p className="text-xs text-green-700 font-black">
                          SUBJECT {index + 1}
                        </p>

                        <p className="font-black mt-1">
                          {subject.name}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {subject.code || "No code"} •{" "}
                          {subject.type || "Core"}
                        </p>

                      </div>

                      <button
                        type="button"
                        title={`Remove ${subject.name}`}
                        onClick={() =>
                          toggleSubject(subject.id)
                        }
                        className="w-8 h-8 rounded-lg bg-white text-red-600 border border-red-100 font-black"
                      >
                        ×
                      </button>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </section>
        </>
      )}

      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {!selectedClass && (
        <section className="bg-white border border-dashed border-purple-300 rounded-3xl p-10 text-center shadow-sm">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center text-3xl">
            🏫
          </div>

          <h3 className="text-2xl font-black mt-4">
            Start with a class
          </h3>

          <p className="text-slate-500 max-w-xl mx-auto mt-2">
            Select a class above. Its sections and the available subjects
            for the selected academic session will appear automatically.
          </p>

        </section>
      )}

      {/* ====================================================
          SESSION CLONE
      ==================================================== */}

      <section className="bg-white border border-blue-200 rounded-3xl p-6 shadow-sm">

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">

          <div>

            <p className="text-xs text-blue-700 font-black uppercase tracking-wider">
              Optional • New Academic Year
            </p>

            <h2 className="text-2xl font-black mt-1">
              Create Next Session from Existing Setup
            </h2>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-6">
              Copy classes, subjects, examinations and class-wise subject
              assignments into a new academic session. The source session
              remains unchanged and the new session gets its own IDs.
            </p>

          </div>

          <div className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-black">
            Smart Migration
          </div>

        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-6">

          <SelectField
            id="clone-source"
            label="Copy From"
            value={cloneSourceId}
            options={sessions.map(
              (item) => item.id
            )}
            labels={Object.fromEntries(
              sessions.map(
                (item) => [
                  item.id,
                  item.name,
                ]
              )
            )}
            onChange={setCloneSourceId}
          />

          <Field
            id="clone-target"
            label="New Session Name"
            placeholder="2027-28"
            value={cloneTargetName}
            onChange={setCloneTargetName}
          />

          <div className="flex items-end">

            <button
              type="button"
              onClick={cloneSetup}
              disabled={saving}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-3 font-black disabled:bg-slate-400"
            >
              {saving
                ? "Creating..."
                : "Create New Session"}
            </button>

          </div>

        </div>

      </section>

    </div>
  );
}

/*
============================================================
COMMON COMPONENTS
============================================================
*/


function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  min,
  max,
}) {
  return (
    <div>

      <label
        htmlFor={id}
        className="block text-sm font-black text-slate-700 mb-2"
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
        min={min}
        max={max}
        className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />

    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  labels = {},
  onChange,
}) {
  return (
    <div>

      <label
        htmlFor={id}
        className="block text-sm font-black text-slate-700 mb-2"
      >
        {label}
      </label>

      <select
        id={id}
        name={id}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
      >

        <option value="">
          Select...
        </option>

        {options.map(
          (option) => (
            <option
              key={
                option
              }
              value={
                option
              }
            >
              {
                labels[
                  option
                ] ||
                option
              }
            </option>
          )
        )}

      </select>

    </div>
  );
}

function Stat({
  title,
  value,
  icon,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex justify-between items-center">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="text-3xl font-black mt-2">
            {value}
          </p>

        </div>

        <span className="text-2xl">
          {icon}
        </span>

      </div>

    </div>
  );
}

function Badge({
  text,
  green = false,
}) {
  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
        green
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {text}
    </span>
  );
}

function InfoLine({
  label,
  value,
}) {
  return (
    <div className="flex justify-between gap-4">

      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-bold text-slate-700">
        {value}
      </span>

    </div>
  );
}

function Empty({
  title,
  text,
}) {
  return (
    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-10 text-center">

      <div className="text-4xl">
        📭
      </div>

      <h3 className="font-black text-xl mt-3">
        {title}
      </h3>

      <p className="text-sm text-slate-500 mt-1">
        {text}
      </p>

    </div>
  );
}

function ConfirmModal({
  title,
  text,
  onCancel,
  onConfirm,
  saving,
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">

        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl">
          ⚠️
        </div>

        <h2 className="text-xl font-black mt-5">
          {title}
        </h2>

        <p className="text-slate-500 mt-2">
          {text}
        </p>

        <div className="flex gap-3 mt-6">

          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              saving
            }
            className="flex-1 bg-slate-100 py-3 rounded-xl font-black"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              saving
            }
            className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black disabled:bg-slate-400"
          >
            {saving
              ? "Processing..."
              : "Continue"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default AcademicConfiguration;