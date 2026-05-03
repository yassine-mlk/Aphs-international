import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface User {
  id: string;
  full_name: string;
}

interface AvatarStackProps {
  users: User[];
  max?: number;
  size?: number;
}

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'
];

const getAvatarColor = (name: string) => {
  if (!name) return colors[0];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return colors[colorIndex];
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

const AvatarStack: React.FC<AvatarStackProps> = ({ users = [], max = 3, size = 28 }) => {
  if (!users || users.length === 0) return null;

  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length > max ? users.length - max : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <div className="flex -space-x-2 overflow-hidden">
              {visibleUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="inline-block rounded-full ring-2 ring-white"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: getAvatarColor(user.full_name),
                    zIndex: visibleUsers.length - index,
                  }}
                >
                  <div className="flex items-center justify-center h-full w-full text-white font-bold text-[10px] select-none">
                    {getInitials(user.full_name)}
                  </div>
                </div>
              ))}
              {remainingCount > 0 && (
                <div
                  className="inline-block rounded-full ring-2 ring-white bg-gray-200"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    zIndex: 0,
                  }}
                >
                  <div className="flex items-center justify-center h-full w-full text-gray-600 font-bold text-[10px] select-none">
                    +{remainingCount}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-1">
            {users.map((user) => (
              <span key={user.id} className="text-xs">{user.full_name}</span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AvatarStack;
