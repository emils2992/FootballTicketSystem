import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  avatarUrl?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  avatarUrl, 
  username = "User", 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const avatarSize = sizeClasses[size];
  
  // Get initials for the fallback
  const initials = username
    .split(' ')
    .map(name => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Avatar className={`${avatarSize} ${className}`}>
      <AvatarImage
        src={avatarUrl}
        alt={username}
      />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
