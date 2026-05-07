import { useEffect } from "react";

interface ErrorToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

function ErrorToast({ message, isVisible, onClose, duration = 3000 }: ErrorToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);  // cleanup if component unmounts
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div style={{ position: "fixed", bottom: "1rem", right: "1rem", zIndex: 9999 }}>
      <div className="toast show d-block">
        <div className="toast-header">
          <strong className="me-auto">Notice</strong>
          <button className="btn-close" onClick={onClose} aria-label="Close" />
        </div>
        <div className="toast-body">
          {message}
        </div>
      </div>
    </div>
  );
}

export default ErrorToast;