const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center">

        <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin"></div>

        <p className="mt-5 text-xl font-semibold text-white animate-pulse">
          Loading...
        </p>

      </div>
    </div>
  );
};

export default PageLoader;