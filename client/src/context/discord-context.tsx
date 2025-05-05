import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface DiscordContextType {
  isConnected: boolean;
  activeFunnyResponse: string | null;
  botStatus: {
    isOnline: boolean;
    activeStaff: number;
    staffOnline: number;
    openTickets: number;
  };
  triggerFunnyResponse: () => void;
}

const DiscordContext = createContext<DiscordContextType>({
  isConnected: false,
  activeFunnyResponse: null,
  botStatus: {
    isOnline: false,
    activeStaff: 0,
    staffOnline: 0,
    openTickets: 0
  },
  triggerFunnyResponse: () => {}
});

interface DiscordProviderProps {
  children: React.ReactNode;
}

const funnyResponses = [
  "Yetkili şu an çiğ köfte yiyor, azıcık sabır kral.",
  "Bu taleple FIFA'ya bile başvurabilirdin aq.",
  "Scoutlar seni izliyor, düzgün yaz da rezil olmayalım.",
  "Messi olsan bile sıranı beklemen lazım gardaş.",
  "Ronaldo musun olm sen, niye bu kadar acelen var?",
  "Hakem kararına itiraz ediyorsun da VAR'ı mı duymadın?"
];

export const DiscordProvider: React.FC<DiscordProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeFunnyResponse, setActiveFunnyResponse] = useState<string | null>(null);

  // Fetch bot status
  const { data: statusData } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const { data: statsData } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 60000 // Refetch every minute
  });

  useEffect(() => {
    // Update connection status based on API response
    if (statusData) {
      setIsConnected(statusData.botOnline || false);
    }
  }, [statusData]);

  // Function to trigger a random funny response
  const triggerFunnyResponse = () => {
    const randomIndex = Math.floor(Math.random() * funnyResponses.length);
    setActiveFunnyResponse(funnyResponses[randomIndex]);

    // Clear the response after 10 seconds
    setTimeout(() => {
      setActiveFunnyResponse(null);
    }, 10000);
  };

  // Auto-trigger funny responses periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      // 20% chance to show a funny response
      if (Math.random() < 0.2) {
        triggerFunnyResponse();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Construct bot status object
  const botStatus = {
    isOnline: statusData?.botOnline || false,
    activeStaff: statsData?.activeStaff || 3,
    staffOnline: statsData?.staffOnline || 2,
    openTickets: statsData?.openTickets || 0
  };

  return (
    <DiscordContext.Provider
      value={{
        isConnected,
        activeFunnyResponse,
        botStatus,
        triggerFunnyResponse
      }}
    >
      {children}
    </DiscordContext.Provider>
  );
};

export const useDiscord = () => useContext(DiscordContext);
