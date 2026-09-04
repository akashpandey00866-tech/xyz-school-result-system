import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createResult,
  updateResult,
  deleteResult,
  getResult,
  getAuthorizedResult,
  listResults,
} from "../services/resultService";

import {
  submitResult as submitWorkflow,
  verifyResult as verifyWorkflow,
  rejectResult as rejectWorkflow,
  publishResult as publishWorkflow,
  unpublishResult as unpublishWorkflow,
} from "../services/resultWorkflowService";

import {
  getResultPermissions,
} from "../security/ResultPermissions";


/* =========================================================
   EMPTY PERMISSIONS
========================================================= */

const EMPTY_PERMISSIONS = {
  view: false,
  edit: false,
  submit: false,
  verify: false,
  reject: false,
  publish: false,
  unpublish: false,
  download: false,
  print: false,

  visibility: {
    verify: false,
    reject: false,
    publish: false,
    unpublish: false,
  },
};


/* =========================================================
   ERROR NORMALIZER
========================================================= */

function getErrorMessage(
  error
) {
  if (
    error?.message
  ) {
    return error.message;
  }

  return "Something went wrong.";
}


/* =========================================================
   MAIN CONTROLLER
========================================================= */

export default function useResultController({
  actor,
  resultId = null,
  autoLoad = true,
  includeDrafts = true,
} = {}) {

  /* =======================================================
     DATA
  ======================================================= */

  const [
    result,
    setResult,
  ] = useState(null);


  const [
    results,
    setResults,
  ] = useState([]);


  /* =======================================================
     STATES
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(
    Boolean(
      autoLoad &&
      resultId
    )
  );


  const [
    listLoading,
    setListLoading,
  ] = useState(false);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    creating,
    setCreating,
  ] = useState(false);


  const [
    updating,
    setUpdating,
  ] = useState(false);


  const [
    deleting,
    setDeleting,
  ] = useState(false);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    verifying,
    setVerifying,
  ] = useState(false);


  const [
    rejecting,
    setRejecting,
  ] = useState(false);


  const [
    publishing,
    setPublishing,
  ] = useState(false);


  const [
    unpublishing,
    setUnpublishing,
  ] = useState(false);


  /* =======================================================
     FEEDBACK
  ======================================================= */

  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  /* =======================================================
     ROLE
  ======================================================= */

  const role =
    String(
      actor?.role || ""
    )
      .trim()
      .toLowerCase();


  /* =======================================================
     PERMISSIONS
  ======================================================= */

  const permissions =
    useMemo(() => {

      if (
        !actor ||
        !result
      ) {
        return EMPTY_PERMISSIONS;
      }


      const permissionData =
        getResultPermissions(
          actor,
          result
        );


      return {
        ...permissionData,

        visibility: {
          verify:
            Boolean(
              permissionData.verify
            ),

          reject:
            Boolean(
              permissionData.reject
            ),

          publish:
            Boolean(
              permissionData.publish
            ),

          unpublish:
            Boolean(
              permissionData.unpublish
            ),
        },
      };

    }, [
      actor,
      result,
    ]);


  /* =======================================================
     LOAD SINGLE RESULT
  ======================================================= */

  const loadResult =
    useCallback(
      async ({
        silent = false,
      } = {}) => {

        if (
          !actor?.uid ||
          !resultId
        ) {
          setResult(null);

          if (!silent) {
            setLoading(false);
          }

          return null;
        }


        try {

          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }


          setError("");


          const data =
            await getAuthorizedResult(
              actor,
              resultId
            );


          /*
           * Extra student protection.
           */

          if (
            role === "student" &&
            String(
              data?.status || ""
            ).toLowerCase() !==
              "published"
          ) {
            setResult(null);

            throw new Error(
              "This result is not published yet."
            );
          }


          if (
            !includeDrafts &&
            role === "student" &&
            String(
              data?.status || ""
            ).toLowerCase() !==
              "published"
          ) {
            setResult(null);

            return null;
          }


          setResult(data);

          return data;

        } catch (
          loadError
        ) {

          setResult(null);

          setError(
            getErrorMessage(
              loadError
            )
          );

          return null;

        } finally {

          if (silent) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }

      },
      [
        actor,
        resultId,
        role,
        includeDrafts,
      ]
    );


  /* =======================================================
     AUTO LOAD
  ======================================================= */

  useEffect(() => {

    if (
      autoLoad &&
      resultId
    ) {
      loadResult();
    }

  }, [
    autoLoad,
    resultId,
    loadResult,
  ]);


  /* =======================================================
     LOAD RESULT LIST
  ======================================================= */

  const loadResults =
    useCallback(
      async (filters = {}) => {

        if (!actor?.uid) {
          setResults([]);

          return [];
        }


        try {

          setListLoading(true);
          setError("");


          const data =
            await listResults({
              actor,

              ...filters,
            });


          setResults(
            Array.isArray(data)
              ? data
              : []
          );


          return data;

        } catch (
          listError
        ) {

          setError(
            getErrorMessage(
              listError
            )
          );

          setResults([]);

          return [];

        } finally {

          setListLoading(false);
        }

      },
      [
        actor,
      ]
    );


  /* =======================================================
     REFRESH
  ======================================================= */

  const refresh =
    useCallback(
      async () => {

        setSuccess("");

        return loadResult({
          silent: true,
        });

      },
      [
        loadResult,
      ]
    );


  /* =======================================================
     CREATE
  ======================================================= */

  const handleCreate =
    useCallback(
      async (
        data
      ) => {

        try {

          setCreating(true);
          setError("");
          setSuccess("");


          const created =
            await createResult(
              actor,
              data
            );


          setResult(
            created
          );


          setSuccess(
            "Result created successfully."
          );


          return created;

        } catch (
          createError
        ) {

          setError(
            getErrorMessage(
              createError
            )
          );

          throw createError;

        } finally {

          setCreating(false);
        }

      },
      [
        actor,
      ]
    );


  /* =======================================================
     UPDATE
  ======================================================= */

  const handleUpdate =
    useCallback(
      async (
        data
      ) => {

        if (!result?.id) {
          throw new Error(
            "Result is not loaded."
          );
        }


        try {

          setUpdating(true);
          setError("");
          setSuccess("");


          const updated =
            await updateResult(
              actor,
              result.id,
              data
            );


          setResult(
            updated
          );


          setSuccess(
            "Result updated successfully."
          );


          return updated;

        } catch (
          updateError
        ) {

          setError(
            getErrorMessage(
              updateError
            )
          );

          throw updateError;

        } finally {

          setUpdating(false);
        }

      },
      [
        actor,
        result,
      ]
    );


  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete =
    useCallback(
      async (
        targetResultId =
          result?.id
      ) => {

        if (!targetResultId) {
          throw new Error(
            "Result ID is required."
          );
        }


        try {

          setDeleting(true);
          setError("");
          setSuccess("");


          await deleteResult(
            actor,
            targetResultId
          );


          if (
            targetResultId ===
            result?.id
          ) {
            setResult(null);
          }


          setResults(
            (previous) =>
              previous.filter(
                (item) =>
                  item.id !==
                  targetResultId
              )
          );


          setSuccess(
            "Result deleted successfully."
          );


          return true;

        } catch (
          deleteError
        ) {

          setError(
            getErrorMessage(
              deleteError
            )
          );

          throw deleteError;

        } finally {

          setDeleting(false);
        }

      },
      [
        actor,
        result,
      ]
    );


  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    useCallback(
      async () => {

        if (!result?.id) {
          throw new Error(
            "Result is not loaded."
          );
        }


        try {

          setSubmitting(true);
          setError("");
          setSuccess("");


          const response =
            await submitWorkflow(
              result.id
            );


          await loadResult({
            silent: true,
          });


          setSuccess(
            "Result submitted successfully for Admin verification."
          );


          return response;

        } catch (
          submitError
        ) {

          setError(
            getErrorMessage(
              submitError
            )
          );

          throw submitError;

        } finally {

          setSubmitting(false);
        }

      },
      [
        result,
        loadResult,
      ]
    );


  /* =======================================================
     VERIFY
  ======================================================= */

  const handleVerify =
    useCallback(
      async () => {

        if (!result?.id) {
          throw new Error(
            "Result is not loaded."
          );
        }


        try {

          setVerifying(true);
          setError("");
          setSuccess("");


          const response =
            await verifyWorkflow(
              result.id
            );


          await loadResult({
            silent: true,
          });


          setSuccess(
            "Result verified successfully."
          );


          return response;

        } catch (
          verifyError
        ) {

          setError(
            getErrorMessage(
              verifyError
            )
          );

          throw verifyError;

        } finally {

          setVerifying(false);
        }

      },
      [
        result,
        loadResult,
      ]
    );


  /* =======================================================
     REJECT
  ======================================================= */

  const handleReject =
    useCallback(
      async (
        reason
      ) => {

        if (!result?.id) {
          throw new Error(
            "Result is not loaded."
          );
        }


        const cleanReason =
          String(
            reason || ""
          ).trim();


        if (!cleanReason) {
          const validationError =
            new Error(
              "Rejection reason is required."
            );

          setError(
            validationError.message
          );

          throw validationError;
        }


        try {

          setRejecting(true);
          setError("");
          setSuccess("");


          const response =
            await rejectWorkflow(
              result.id,
              cleanReason
            );


          await loadResult({
            silent: true,
          });


          setSuccess(
            "Result rejected and returned for correction."
          );


          return response;

        } catch (
          rejectError
        ) {

          setError(
            getErrorMessage(
              rejectError
            )
          );

          throw rejectError;

        } finally {

          setRejecting(false);
        }

      },
      [
        result,
        loadResult,
      ]
    );


  /* =======================================================
     PUBLISH
  ======================================================= */

  const handlePublish =
    useCallback(
      async () => {

        if (!result?.id) {
          throw new Error(
            "Result is not loaded."
          );
        }


        try {

          setPublishing(true);
          setError("");
          setSuccess("");


          const response =
            await publishWorkflow(
              result.id
            );


          await loadResult({
            silent: true,
          });


          setSuccess(
            "Result published successfully. Students can now view it."
          );


          return response;

        } catch (
          publishError
        ) {

          setError(
            getErrorMessage(
              publishError
            )
          );

          throw publishError;

        } finally {

          setPublishing(false);
        }

      },
      [
        result,
        loadResult,
      ]
    );


  /* =======================================================
     UNPUBLISH
  ======================================================= */

  const handleUnpublish =
    useCallback(
      async (
        reason = ""
      ) => {

        if (!result?.id) {
          throw new Error(
            "Result is not loaded."
          );
        }


        try {

          setUnpublishing(true);
          setError("");
          setSuccess("");


          const response =
            await unpublishWorkflow(
              result.id,
              reason
            );


          await loadResult({
            silent: true,
          });


          setSuccess(
            "Result unpublished successfully."
          );


          return response;

        } catch (
          unpublishError
        ) {

          setError(
            getErrorMessage(
              unpublishError
            )
          );

          throw unpublishError;

        } finally {

          setUnpublishing(false);
        }

      },
      [
        result,
        loadResult,
      ]
    );


  /* =======================================================
     CLEAR FEEDBACK
  ======================================================= */

  const clearFeedback =
    useCallback(() => {

      setError("");
      setSuccess("");

    }, []);


  /* =======================================================
     BUSY STATE
  ======================================================= */

  const isBusy =
    loading ||
    listLoading ||
    refreshing ||
    creating ||
    updating ||
    deleting ||
    submitting ||
    verifying ||
    rejecting ||
    publishing ||
    unpublishing;


  /* =======================================================
     RETURN
  ======================================================= */

  return {

    /* -----------------------------------------------
       DATA
    ----------------------------------------------- */

    result,

    results,

    resultId,

    actor,

    role,


    /* -----------------------------------------------
       LOADING
    ----------------------------------------------- */

    loading,

    listLoading,

    refreshing,

    creating,

    updating,

    deleting,

    submitting,

    verifying,

    rejecting,

    publishing,

    unpublishing,

    isBusy,


    /* -----------------------------------------------
       FEEDBACK
    ----------------------------------------------- */

    error,

    success,


    /* -----------------------------------------------
       PERMISSIONS
    ----------------------------------------------- */

    permissions,


    /* -----------------------------------------------
       LOAD
    ----------------------------------------------- */

    loadResult,

    loadResults,

    refresh,


    /* -----------------------------------------------
       CRUD
    ----------------------------------------------- */

    create:
      handleCreate,

    update:
      handleUpdate,

    delete:
      handleDelete,


    /* -----------------------------------------------
       WORKFLOW
    ----------------------------------------------- */

    submit:
      handleSubmit,

    verify:
      handleVerify,

    reject:
      handleReject,

    publish:
      handlePublish,

    unpublish:
      handleUnpublish,


    /* -----------------------------------------------
       UI
    ----------------------------------------------- */

    clearFeedback,
  };
}

