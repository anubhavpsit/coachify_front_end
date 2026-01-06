import { useState, type CSSProperties } from 'react';

interface User {
  name: string;
  profile_image?: string | null;
}

interface AvatarColor {
  bg: string;
  text: string;
}

interface AvatarProps {
  user: User;
  size?: number;
  color?: AvatarColor; // 👈 optional controlled color
  className?: string;
}

/* Default color palette */
const AVATAR_COLORS: AvatarColor[] = [
  { bg: "bg-primary-100", text: "text-primary-600" },
  { bg: "bg-success-100", text: "text-success-600" },
  { bg: "bg-danger-100", text: "text-danger-600" },
  { bg: "bg-warning-100", text: "text-warning-700" },
  { bg: "bg-info-100", text: "text-info-600" },
  { bg: "bg-purple-100", text: "text-purple-600" },
  { bg: "bg-pink-100", text: "text-pink-600" },
];

const getColorIndex = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
};

export default function Avatar({
  user,
  size = 64,
  color,
  className = "",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const hasValidImage =
    user.profile_image &&
    user.profile_image.trim() !== "" &&
    !imgError;

  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .map(w => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  // 👇 if color prop exists → use it, else generate
  const resolvedColor =
    color ?? AVATAR_COLORS[getColorIndex(user.name)];

  const avatarStyle: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    fontSize: Math.floor(size * 0.45),
    lineHeight: 1,
  };

  if (hasValidImage) {
    return (
      <img
        src={user.profile_image ?? undefined}
        alt={user.name}
        style={{ width: size, height: size, minWidth: size }}
        className={`rounded-circle object-fit-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span
      style={avatarStyle}
      className={`rounded-circle d-flex justify-content-center align-items-center fw-semibold ${resolvedColor.bg} ${resolvedColor.text} ${className}`}
    >
      {initials}
    </span>
  );
}
