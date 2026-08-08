

function LoadingButton({
  children,
  loading = false,
  type = "button",
  onClick,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
     {loading ? (
  <>
    <span className="animate-pulse">⏳</span>
    Saving...
  </>
) : (
  children
)} 
    </button>
  );
}

export default LoadingButton;