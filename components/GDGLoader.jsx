// React import
import React from "react";

// Loader Component
const DWASFWLoader = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute h-6 w-6 rounded-full border-2 border-primary/40 border-b-primary animate-spin [animation-direction:reverse]" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
        Loading...
      </p>
    </div>
  );
};

export default DWASFWLoader;

