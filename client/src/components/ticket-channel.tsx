import React from 'react';
import BotAvatar from './bot-avatar';
import UserAvatar from './user-avatar';
import { Button } from '@/components/ui/button';
import { useDiscord } from '@/context/discord-context';

interface TicketChannelProps {
  ticket: {
    id: number;
    username: string;
    category: string;
    categoryEmoji: string;
    description: string;
    createdAt: string;
  };
  staff: Array<{
    id: number;
    username: string;
    avatar: string;
  }>;
}

const TicketChannel: React.FC<TicketChannelProps> = ({ ticket, staff }) => {
  const { activeFunnyResponse } = useDiscord();

  return (
    <div className="mb-6">
      <div className="text-muted-foreground text-sm mb-2">
        <span className="mr-1">🎫</span> 
        <span className="text-muted-foreground">ticket-{ticket.username.toLowerCase()}</span> kanalı oluşturuldu
      </div>
      
      {/* Ticket Embed */}
      <div className="discord-embed p-4">
        <div className="flex items-start">
          {/* Bot Avatar */}
          <BotAvatar className="flex-shrink-0 mr-4" />
          
          {/* Embed Content */}
          <div className="flex-1">
            {/* Embed Header */}
            <div className="text-white font-bold text-lg mb-2">
              🎫 Yeni Ticket
            </div>
            
            {/* Embed Line */}
            <div className="border-b border-muted my-2"></div>
            
            {/* Ticket Info */}
            <div className="space-y-2 mb-4">
              <div className="flex">
                <div className="w-28 text-muted-foreground">👤 Açan:</div>
                <div className="text-foreground">@{ticket.username}</div>
              </div>
              
              <div className="flex">
                <div className="w-28 text-muted-foreground">📂 Kategori:</div>
                <div className="text-foreground">{ticket.categoryEmoji} {ticket.category}</div>
              </div>
              
              <div className="flex">
                <div className="w-28 text-muted-foreground">📝 Açıklama:</div>
                <div className="text-foreground">"{ticket.description}"</div>
              </div>
              
              <div className="flex">
                <div className="w-28 text-muted-foreground">📆 Açılış:</div>
                <div className="text-foreground">{ticket.createdAt}</div>
              </div>
            </div>
            
            {/* Staff Section */}
            <div className="mb-4">
              <div className="text-muted-foreground mb-2">👮‍♂️ Yetkili Ekibi:</div>
              <div className="avatar-group flex">
                {staff.map((s) => (
                  <UserAvatar 
                    key={s.id}
                    avatarUrl={s.avatar}
                    username={s.username}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            
            {/* Button Row */}
            <div className="flex flex-wrap gap-2">
              <Button className="discord-button success">
                <span className="mr-2">✅</span> Yanıtla
              </Button>
              
              <Button variant="destructive" className="discord-button danger">
                <span className="mr-2">❌</span> Ticket Kapat
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auto Response - shown when activeFunnyResponse is active */}
      {activeFunnyResponse && (
        <div className="mt-4 bg-secondary rounded-md p-3 text-foreground italic text-sm">
          <span className="text-primary mr-2">🤖</span>
          "{activeFunnyResponse}"
        </div>
      )}
    </div>
  );
};

export default TicketChannel;
