import type { ReactNode } from "react";

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger" | "warning" | "other";
  children: ReactNode;
  minimize?: boolean;
  icon?: ReactNode;
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
  minimize = false,
  icon,
}: ButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: minimize ? "8px" : "8px 16px",
        backgroundColor: getBackgroundColor(variant),
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: minimize ? "0" : "8px",
        opacity: disabled ? 0.7 : 1,
        width: minimize ? "36px" : "auto",
        height: minimize ? "36px" : "auto",
      }}
    >
      {minimize ? icon : children}
    </button>
  );
};
