/* =========================================================
   RESULT ACTIONS
   Centralized UI action helpers
========================================================= */

export function createResultActions({
  controller,
}) {
  if (!controller) {
    throw new Error(
      "Result controller is required."
    );
  }


  const {
    result,
    permissions,

    create,
    update,
    delete: deleteResult,

    submit,
    verify,
    reject,
    publish,
    unpublish,

    loading,
    creating,
    updating,
    deleting,
    submitting,
    verifying,
    rejecting,
    publishing,
    unpublishing,

    error,
    success,
  } = controller;


  /* =======================================================
     ACTION STATE
  ======================================================= */

  const isBusy =
    loading ||
    creating ||
    updating ||
    deleting ||
    submitting ||
    verifying ||
    rejecting ||
    publishing ||
    unpublishing;


  /* =======================================================
     CAN ACTION
  ======================================================= */

  const can = {
    view:
      Boolean(
        permissions?.view
      ),

    edit:
      Boolean(
        permissions?.edit
      ),

    delete:
      Boolean(
        permissions?.edit
      ) &&
      !isBusy,

    submit:
      Boolean(
        permissions?.submit
      ) &&
      !isBusy,

    verify:
      Boolean(
        permissions?.verify
      ) &&
      !isBusy,

    reject:
      Boolean(
        permissions?.reject
      ) &&
      !isBusy,

    publish:
      Boolean(
        permissions?.publish
      ) &&
      !isBusy,

    unpublish:
      Boolean(
        permissions?.unpublish
      ) &&
      !isBusy,

    download:
      Boolean(
        permissions?.download
      ),

    print:
      Boolean(
        permissions?.print
      ),
  };


  /* =======================================================
     CREATE
  ======================================================= */

  const handleCreate =
    async (
      data
    ) => {
      return create(
        data
      );
    };


  /* =======================================================
     UPDATE
  ======================================================= */

  const handleUpdate =
    async (
      data
    ) => {

      if (
        !can.edit
      ) {
        throw new Error(
          "You are not authorized to edit this result."
        );
      }


      return update(
        data
      );
    };


  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete =
    async (
      resultId
    ) => {

      if (
        !can.delete
      ) {
        throw new Error(
          "You are not authorized to delete this result."
        );
      }


      return deleteResult(
        resultId ||
          result?.id
      );
    };


  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async () => {

      if (
        !can.submit
      ) {
        throw new Error(
          "You are not authorized to submit this result."
        );
      }


      return submit();
    };


  /* =======================================================
     VERIFY
  ======================================================= */

  const handleVerify =
    async () => {

      if (
        !can.verify
      ) {
        throw new Error(
          "Only Admin can verify this result."
        );
      }


      return verify();
    };


  /* =======================================================
     REJECT
  ======================================================= */

  const handleReject =
    async (
      reason
    ) => {

      if (
        !can.reject
      ) {
        throw new Error(
          "Only Admin can reject this result."
        );
      }


      return reject(
        reason
      );
    };


  /* =======================================================
     PUBLISH
  ======================================================= */

  const handlePublish =
    async () => {

      if (
        !can.publish
      ) {
        throw new Error(
          "Only Admin can publish this result."
        );
      }


      return publish();
    };


  /* =======================================================
     UNPUBLISH
  ======================================================= */

  const handleUnpublish =
    async (
      reason = ""
    ) => {

      if (
        !can.unpublish
      ) {
        throw new Error(
          "Only Admin can unpublish this result."
        );
      }


      return unpublish(
        reason
      );
    };


  /* =======================================================
     RETURN
  ======================================================= */

  return {
    result,

    permissions,

    can,

    isBusy,

    loading,

    creating,

    updating,

    deleting,

    submitting,

    verifying,

    rejecting,

    publishing,

    unpublishing,

    error,

    success,

    create:
      handleCreate,

    update:
      handleUpdate,

    delete:
      handleDelete,

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
  };
}
