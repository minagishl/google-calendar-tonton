import type { ReactNode } from "react";

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger" | "warning" | "other";
  children: ReactNode;
}

const getBackgroundColor = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case "danger":
      return "#dc3545";
    case "warning":
      return "#ff9800";
    case "other":
      return "#4285f4";
    default:
      return "#4CAF50";
  }
};

export const Button = ({
  onClick,
  disabled = false,
  variant = "primary",
  children,
}: ButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        backgroundColor: getBackgroundColor(variant),
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
};
