import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BotAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BotAvatar: React.FC<BotAvatarProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const avatarSize = sizeClasses[size];

  return (
    <Avatar className={`${avatarSize} ${className}`}>
      <AvatarImage
        src="https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80"
        alt="Bot Avatar"
      />
      <AvatarFallback className="bg-primary text-primary-foreground">BOT</AvatarFallback>
    </Avatar>
  );
};

export default BotAvatar;
