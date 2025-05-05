import React, { useState } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface TicketFormProps {
  onSubmit: (category: string, description: string) => void;
  onCancel: () => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ onSubmit, onCancel }) => {
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const { toast } = useToast();

  // Get categories from the API
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories']
  });

  const handleSubmit = () => {
    if (!category) {
      toast({
        title: 'Kategori Gerekli',
        description: 'Lütfen bir kategori seçin',
        variant: 'destructive',
      });
      return;
    }

    if (description.length < 10) {
      toast({
        title: 'Yetersiz Açıklama',
        description: 'Açıklama en az 10 karakter olmalıdır',
        variant: 'destructive',
      });
      return;
    }

    onSubmit(category, description);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-4">
        <h2 className="text-lg font-bold mb-4">Yeni Ticket Oluştur</h2>
        
        {/* Category Dropdown */}
        <div className="mb-4">
          <label className="block text-muted-foreground mb-2 text-sm">Konu Seçimi</label>
          <Select onValueChange={setCategory} value={category}>
            <SelectTrigger>
              <SelectValue placeholder="Bir kategori seçin..." />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading">Yükleniyor...</SelectItem>
              ) : (
                categories?.map((cat: { id: number, name: string, emoji: string }) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.emoji} {cat.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        {/* Description Textarea */}
        <div className="mb-4">
          <label className="block text-muted-foreground mb-2 text-sm">Açıklama</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none bg-secondary text-foreground focus:ring-primary"
            placeholder="Açıklamanı kısa ve net yaz kardeşim..."
            rows={4}
          />
        </div>
        
        {/* Modal Buttons */}
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="secondary" onClick={onCancel}>İptal</Button>
          <Button onClick={handleSubmit}>Oluştur</Button>
        </div>
      </div>
    </div>
  );
};

export default TicketForm;
