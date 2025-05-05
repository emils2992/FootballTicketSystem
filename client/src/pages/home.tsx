import { useState } from "react";
import TicketPanel from "@/components/discord/TicketPanel";
import TicketModal from "@/components/discord/TicketModal";
import TicketChannel from "@/components/discord/TicketChannel";
import TicketList from "@/components/discord/TicketList";
import TicketLog from "@/components/discord/TicketLog";
import { STAFF_MEMBERS } from "@/lib/discordConfig";

export default function Home() {
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showTicketChannel, setShowTicketChannel] = useState(false);
  const [showTicketList, setShowTicketList] = useState(false);
  const [showTicketLog, setShowTicketLog] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<string | null>(null);

  const handleCommand = (command: string) => {
    setCurrentCommand(command);
    
    switch (command) {
      case "!ticketkur":
        setShowTicketModal(false);
        setShowTicketChannel(false);
        setShowTicketList(false);
        setShowTicketLog(false);
        break;
      case "!ticketlarım":
        setShowTicketList(true);
        setShowTicketChannel(false);
        setShowTicketLog(false);
        break;
      case "!ticketlog":
        setShowTicketLog(true);
        setShowTicketChannel(false);
        break;
      default:
        break;
    }
  };

  const handleCreateTicket = () => {
    setShowTicketModal(true);
  };

  const handleCloseModal = () => {
    setShowTicketModal(false);
  };

  const handleSubmitTicket = () => {
    setShowTicketModal(false);
    setShowTicketChannel(true);
  };

  const handleCloseTicket = () => {
    setShowTicketChannel(false);
  };

  const handleViewTicket = () => {
    setShowTicketChannel(true);
    // Scroll to the channel view
    setTimeout(() => {
      document.getElementById("ticket-channel-view")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const onlineCount = STAFF_MEMBERS.filter(staff => staff.isOnline).length;
  const totalStaff = STAFF_MEMBERS.length;

  return (
    <div className="flex flex-col min-h-screen bg-[#36393F] text-[#DCDDDE]">
      {/* Mock Discord Header */}
      <div className="bg-[#2F3136] py-3 px-4 flex items-center border-b border-black">
        <div className="flex items-center">
          <div className="text-[#DCDDDE] font-bold mr-2 text-xl">
            <i className="fas fa-futbol mr-2 text-[#5865F2]"></i>
            Futbol RP
          </div>
          <div className="text-[#72767D]">|</div>
          <div className="ml-2 text-[#8e9297]">#genel</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Command Display Section */}
        {currentCommand && (
          <div className="flex items-center mb-2 text-[#72767D]">
            <span className="bg-[#2F3136] px-2 py-1 rounded text-xs">{currentCommand}</span>
            <span className="ml-2 text-xs">komutu kullanıldı</span>
          </div>
        )}

        {/* Interactive Buttons for Demo */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => handleCommand("!ticketkur")} 
            className="bg-[#5865F2] px-3 py-2 rounded hover:bg-[#4752C4] text-white text-sm"
          >
            !ticketkur
          </button>
          <button 
            onClick={() => handleCommand("!ticketlarım")} 
            className="bg-[#4F545C] px-3 py-2 rounded hover:bg-[#686D73] text-white text-sm"
          >
            !ticketlarım
          </button>
          <button 
            onClick={() => handleCommand("!ticketlog")} 
            className="bg-[#4F545C] px-3 py-2 rounded hover:bg-[#686D73] text-white text-sm"
          >
            !ticketlog
          </button>
        </div>

        {/* Ticket Panel */}
        {currentCommand === "!ticketkur" && (
          <TicketPanel 
            onCreateTicket={handleCreateTicket} 
            staffMembers={STAFF_MEMBERS}
            onlineCount={onlineCount}
            totalStaff={totalStaff}
          />
        )}

        {/* Ticket Modal */}
        {showTicketModal && (
          <TicketModal 
            onClose={handleCloseModal} 
            onSubmit={handleSubmitTicket} 
          />
        )}

        {/* Ticket Channel View */}
        {showTicketChannel && (
          <div id="ticket-channel-view">
            <TicketChannel 
              onCloseTicket={handleCloseTicket} 
              staffMembers={STAFF_MEMBERS}
            />
          </div>
        )}

        {/* Ticket List */}
        {showTicketList && (
          <TicketList 
            onViewTicket={handleViewTicket} 
          />
        )}

        {/* Ticket Log */}
        {showTicketLog && (
          <TicketLog />
        )}
      </div>
    </div>
  );
}
