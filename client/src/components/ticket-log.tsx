import React from 'react';
import BotAvatar from './bot-avatar';

interface TicketLogProps {
  log: {
    username: string;
    category: string;
    description: string;
    openTime: string;
    closeTime?: string;
    assignedStaff?: string;
  };
}

const TicketLog: React.FC<TicketLogProps> = ({ log }) => {
  const currentDate = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="discord-embed p-4 mb-4">
      <div className="flex items-start">
        {/* Bot Avatar */}
        <BotAvatar className="flex-shrink-0 mr-4" />
        
        {/* Embed Content */}
        <div className="flex-1">
          {/* Embed Header */}
          <div className="text-white font-bold text-lg mb-2">
            📁 Ticket Özeti - #ticket-{log.username}
          </div>
          
          {/* Embed Line */}
          <div className="border-b border-muted my-2"></div>
          
          {/* Ticket Log Info */}
          <div className="space-y-2 mb-4">
            <div className="flex">
              <div className="w-28 text-muted-foreground">👤 Açan:</div>
              <div className="text-foreground">@{log.username}</div>
            </div>
            
            <div className="flex">
              <div className="w-28 text-muted-foreground">🎯 Konu:</div>
              <div className="text-foreground">{log.category}</div>
            </div>
            
            <div className="flex">
              <div className="w-28 text-muted-foreground">📝 Açıklama:</div>
              <div className="text-foreground">"{log.description}"</div>
            </div>
            
            <div className="flex">
              <div className="w-28 text-muted-foreground">⏱️ Süreler:</div>
              <div className="text-foreground">
                Açıldı: {log.openTime}
                {log.closeTime && ` | Kapatıldı: ${log.closeTime}`}
              </div>
            </div>
            
            {log.assignedStaff && (
              <div className="flex">
                <div className="w-28 text-muted-foreground">👮‍♂️ İlgilenen:</div>
                <div className="text-foreground">@{log.assignedStaff}</div>
              </div>
            )}
          </div>
          
          {/* Embed Footer */}
          <div className="text-muted-foreground text-xs mt-4 flex items-center">
            <span>Ticket Log Sistemi • {currentDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketLog;
