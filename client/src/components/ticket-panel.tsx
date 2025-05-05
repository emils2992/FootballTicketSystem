import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import BotAvatar from './bot-avatar';
import { useDiscord } from '@/context/discord-context';
import { useToast } from '@/hooks/use-toast';

const TicketPanel: React.FC = () => {
  const { botStatus } = useDiscord();
  const { toast } = useToast();
  
  // Get ticket categories
  const { data: categories } = useQuery({
    queryKey: ['/api/categories']
  });

  // Command execution simulation
  const executeCommand = (command: string) => {
    toast({
      title: 'Command Executed',
      description: `${command} komutu kullanıldı`,
      duration: 3000,
    });
  };

  // Format current time
  const currentTime = new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="space-y-4">
      {/* Command execution indicator */}
      <div className="flex items-center mb-2 text-muted-foreground">
        <span className="bg-secondary px-2 py-1 rounded text-xs">.ticketkur</span>
        <span className="ml-2 text-xs">komutu kullanıldı</span>
      </div>

      {/* Ticket Panel Embed */}
      <div className="discord-embed p-4 mb-4">
        <div className="flex items-start">
          {/* Bot Avatar */}
          <BotAvatar className="flex-shrink-0 mr-4" />
          
          {/* Embed Content */}
          <div className="flex-1">
            {/* Embed Header */}
            <div className="text-white font-bold text-lg mb-2">
              🎟️ Futbol RP Ticket Paneli
            </div>
            
            {/* Embed Line */}
            <div className="border-b border-muted my-2"></div>
            
            {/* Embed Body */}
            <div className="text-foreground mb-3">
              Bir sorun, talep veya delikanlı gibi açıklaman mı var?
              <p className="mt-2">👇 Aşağıdaki seçeneklerle bir ticket oluşturabilirsin.</p>
            </div>
            
            {/* Active Staff Section */}
            <div className="bg-muted bg-opacity-50 p-3 rounded-md mb-3">
              <div className="font-bold mb-2">📸 Aktif Yetkililer:</div>
              <div className="flex mb-2">
                <code className="bg-muted px-2 py-1 rounded text-sm mr-2">@Yusuf</code>
                <code className="bg-muted px-2 py-1 rounded text-sm mr-2">@Caner</code>
                <code className="bg-muted px-2 py-1 rounded text-sm">@Ali</code>
              </div>
              
              {/* Staff Status */}
              <div className="text-[#57F287] text-sm">
                <i className="fas fa-circle text-xs mr-1"></i> Online: {botStatus.staffOnline}/{botStatus.activeStaff}
              </div>
            </div>
            
            {/* Last Update */}
            <div className="text-muted-foreground text-sm mb-4">
              💼 Son Güncelleme: Bugün, saat {currentTime}
            </div>
            
            {/* Button Row */}
            <div className="flex flex-wrap gap-2">
              <Button 
                className="discord-button primary" 
                onClick={() => executeCommand('ticket create')}
              >
                <span className="mr-2">📬</span> Ticket Oluştur
              </Button>
              
              <Button 
                variant="secondary" 
                className="discord-button" 
                onClick={() => executeCommand('ticket list')}
              >
                <span className="mr-2">🗂️</span> Ticketlarım
              </Button>
              
              <Button 
                variant="destructive" 
                className="discord-button danger" 
                onClick={() => executeCommand('ticket close')}
              >
                <span className="mr-2">❌</span> Ticket Kapat
              </Button>
            </div>
            
            {/* Embed Footer */}
            <div className="text-muted-foreground text-xs mt-4 flex items-center">
              <span>Görkemli Ticket Sistemi | Prefix: . | by SeninBot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketPanel;
