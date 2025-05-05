import React, { useState } from 'react';
import TicketPanel from '@/components/ticket-panel';
import TicketForm from '@/components/ticket-form';
import TicketChannel from '@/components/ticket-channel';
import TicketList from '@/components/ticket-list';
import TicketLog from '@/components/ticket-log';
import { useDiscord } from '@/context/discord-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MOCK_TICKETS, MOCK_STAFF, formatDiscordTimestamp } from '@/lib/discord-utils';

const Dashboard: React.FC = () => {
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showTicketChannel, setShowTicketChannel] = useState(false);
  const { isConnected, triggerFunnyResponse } = useDiscord();
  const { toast } = useToast();

  // Command execution handlers
  const executeTicketkurCommand = () => {
    if (!isConnected) {
      toast({
        title: 'Bot Çevrimdışı',
        description: 'Discord botu şu anda çevrimdışı. Lütfen daha sonra tekrar deneyin.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Komut Çalıştırıldı',
      description: '!ticketkur komutu başarıyla çalıştırıldı.',
    });
  };

  const handleCreateTicket = (category: string, description: string) => {
    setShowTicketForm(false);
    setShowTicketChannel(true);
    
    toast({
      title: 'Ticket Oluşturuldu',
      description: 'Yeni ticket başarıyla oluşturuldu!',
    });
    
    // Trigger a funny response after a short delay
    setTimeout(() => {
      triggerFunnyResponse();
    }, 5000);
  };

  // Sample ticket data for demonstration
  const ticketData = {
    id: 1,
    username: 'username',
    category: 'Transfer Talebi',
    categoryEmoji: '⚽',
    description: 'Ben Fenerbahçeye imza atmak istiyorum ama Beşiktaş scoutu peşimi bırakmıyor aq.',
    createdAt: formatDiscordTimestamp(new Date())
  };

  // Sample log data for demonstration
  const logData = {
    username: 'Yusuf',
    category: 'Sakatlık Bildirimi',
    description: 'Ayak bileğim çıktı ama topa devam ettim.',
    openTime: '14:30',
    closeTime: '15:02',
    assignedStaff: 'Caner'
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Mock Discord Header */}
      <div className="bg-secondary py-3 px-4 flex items-center border-b border-black">
        <div className="flex items-center">
          <div className="text-foreground font-bold mr-2 text-xl">
            <span className="text-primary mr-2">⚽</span>
            Futbol RP
          </div>
          <div className="text-muted-foreground">|</div>
          <div className="ml-2 text-muted-foreground">#genel</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Bot Status */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Bot Status: {isConnected ? 
              <span className="text-[#57F287]">Online</span> : 
              <span className="text-destructive">Offline</span>
            }
          </div>
          
          <div className="space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={executeTicketkurCommand}
            >
              .ticketkur
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTicketForm(true)}
            >
              Ticket Form (Demo)
            </Button>
          </div>
        </div>
        
        {/* Ticket Panel */}
        <TicketPanel />
        
        {/* Ticket Channel (hidden by default) */}
        {showTicketChannel && (
          <TicketChannel 
            ticket={ticketData} 
            staff={MOCK_STAFF}
          />
        )}
        
        {/* Command Entry for ticketlarım */}
        <div className="flex items-center mb-2 text-muted-foreground">
          <span className="bg-secondary px-2 py-1 rounded text-xs">.ticketlarım</span>
          <span className="ml-2 text-xs">komutu kullanıldı</span>
        </div>
        
        {/* Ticket List */}
        <TicketList tickets={MOCK_TICKETS} />
        
        {/* Command Entry for ticketlog */}
        <div className="flex items-center mb-2 text-muted-foreground">
          <span className="bg-secondary px-2 py-1 rounded text-xs">.ticketlog</span>
          <span className="ml-2 text-xs">komutu kullanıldı</span>
        </div>
        
        {/* Ticket Log */}
        <TicketLog log={logData} />
      </div>
      
      {/* Ticket Create Modal (conditionally rendered) */}
      {showTicketForm && (
        <TicketForm 
          onSubmit={handleCreateTicket}
          onCancel={() => setShowTicketForm(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
