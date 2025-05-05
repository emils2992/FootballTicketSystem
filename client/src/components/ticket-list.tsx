import React from 'react';
import BotAvatar from './bot-avatar';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: number;
  category: {
    name: string;
    emoji: string;
  };
  status: string;
}

interface TicketListProps {
  tickets: Ticket[];
}

const TicketList: React.FC<TicketListProps> = ({ tickets }) => {
  const { toast } = useToast();

  const handleTicketClick = (ticket: Ticket) => {
    if (ticket.status === 'open') {
      toast({
        title: 'Ticket Açıldı',
        description: `#ticket-${ticket.id} kanalına yönlendiriliyorsunuz...`,
        duration: 3000,
      });
    } else {
      toast({
        title: 'Kapalı Ticket',
        description: 'Bu ticket kapatılmış ve artık erişilemez.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return (
    <div className="discord-embed p-4 mb-4">
      <div className="flex items-start">
        {/* Bot Avatar */}
        <BotAvatar className="flex-shrink-0 mr-4" />
        
        {/* Embed Content */}
        <div className="flex-1">
          {/* Embed Header */}
          <div className="text-white font-bold text-lg mb-2">
            📋 Ticketlarım
          </div>
          
          {/* Embed Line */}
          <div className="border-b border-muted my-2"></div>
          
          {/* Tickets List */}
          <div className="space-y-2 mb-4">
            {tickets.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <i className="fas fa-ticket-alt text-2xl mb-2"></i>
                <p>Hiç ticket oluşturmamışsın delikanlı.</p>
              </div>
            ) : (
              tickets.map((ticket, index) => (
                <div 
                  key={ticket.id}
                  className="ticket-list-item flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <div className="flex items-center">
                    <div className="mr-2">{index + 1}.</div>
                    <div className="text-foreground">
                      {ticket.category.emoji} {ticket.category.name}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs 
                    ${ticket.status === 'open' 
                      ? 'text-[#57F287] bg-[#57F287] bg-opacity-20' 
                      : 'text-destructive bg-destructive bg-opacity-20'}`}
                  >
                    {ticket.status === 'open' ? 'Açık' : 'Kapalı'}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Embed Footer */}
          <div className="text-muted-foreground text-xs mt-4 flex items-center">
            <span>Açık ticketlara tıklayarak gidebilirsiniz</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketList;
