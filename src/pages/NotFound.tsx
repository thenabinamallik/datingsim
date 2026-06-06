import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="text-center space-y-5 glass-card p-12 rounded-2xl animate-fade-in mx-4">
        <h1 className="text-7xl font-bold gradient-text font-display">404</h1>
        <p className="text-lg text-muted-foreground">
          This page doesn't exist
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-300 font-medium hover:shadow-lg hover:shadow-primary/25"
        >
          ← Go Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
